# Руководство по интеграции T-Pay

## Текущая реализация (тестовый режим)

### Способ 1: Прямое пополнение (direct)
Используется для мгновенного зачисления средств в тестовом режиме.

**Процесс:**
1. Пользователь выбирает сумму и нажимает "Пополнить"
2. Frontend вызывает `apiService.depositBalance()`
3. Backend создает транзакцию и мгновенно подтверждает её (мок)
4. Баланс обновляется сразу

### Способ 2: Редирект на T-Pay (redirect)
Используется для редиректа на платежную форму T-Pay.

**Процесс:**
1. Пользователь выбирает сумму и способ оплаты "Редирект на T-Pay"
2. Frontend вызывает `apiService.initiatePayment()`
3. Backend создает транзакцию и возвращает `paymentUrl` (мок)
4. Frontend должен выполнить редирект на `paymentUrl`

## Реальная интеграция T-Pay

### Шаг 1: Получение API ключей
1. Зарегистрируйтесь в личном кабинете T-Pay: https://developer.tbank.ru
2. Получите в Т-Бизнес при заведении терминала:
   - `TerminalKey` - Идентификатор терминала (обязательно)
   - `Password` - Пароль для создания подписи запросов (обязательно)
   - `API Token` - Bearer токен для авторизации (если требуется)

**Важно:** Согласно документации https://developer.tbank.ru/eacq/api/init используется:
- Endpoint: `POST https://securepay.tinkoff.ru/v2/Init`
- Авторизация: Bearer API Token (в заголовке Authorization)
- Обязательные параметры: TerminalKey, Amount (в копейках), OrderId, Token (подпись)

### Шаг 2: Обновление backend (server.js)

#### 2.1. Добавить переменные окружения

Создайте файл `backend/config.env` или добавьте в `.env`:

```env
# Режим работы (true = тестовый API, false = production API)
TPAY_TEST_MODE=true

# Обязательные параметры (нужны для обоих режимов)
TPAY_TERMINAL_KEY=your_terminal_key
TPAY_PASSWORD=your_password
TPAY_API_TOKEN=your_api_token

# URL для callback уведомлений
TPAY_NOTIFICATION_URL=https://yourdomain.com/api/payments/tpay-callback

# URL для возврата пользователя
TPAY_RETURN_URL=https://yourdomain.com/payment/success

# URL API (опционально, по умолчанию используются правильные URL)
# Тестовый: https://rest-api-test.tinkoff.ru/v2/Init
# Production: https://securepay.tinkoff.ru/v2/Init
TPAY_TEST_API_URL=https://rest-api-test.tinkoff.ru/v2/Init
TPAY_API_URL=https://securepay.tinkoff.ru/v2/Init
```

**Важно:**
- В тестовом режиме (`TPAY_TEST_MODE=true`) используется тестовый API: `https://rest-api-test.tinkoff.ru/v2/Init`
- В production режиме используется: `https://securepay.tinkoff.ru/v2/Init`
- Если не указаны `TPAY_TERMINAL_KEY` и `TPAY_PASSWORD`, система вернет мок-данные

**Важно:** 
- `TerminalKey` и `Password` получаются в Т-Бизнес при заведении терминала
- `API Token` используется для Bearer авторизации (если требуется)
- В тестовом режиме (`TPAY_TEST_MODE=true`) реальные ключи не нужны

#### 2.2. Функция инициализации платежа

**Реализация уже обновлена в `server.js` согласно документации!**

Код использует правильный формат согласно https://developer.tbank.ru/eacq/api/init:

1. **Endpoint:** `POST https://securepay.tinkoff.ru/v2/Init`
2. **Авторизация:** Bearer API Token (если указан `TPAY_API_TOKEN`)
3. **Параметры запроса:**
   - `TerminalKey` - идентификатор терминала
   - `Amount` - сумма в копейках
   - `OrderId` - уникальный идентификатор заказа
   - `Token` - подпись запроса (SHA-256 хеш от всех параметров + Password)
   - `Description` - описание заказа
   - `SuccessURL` / `FailURL` - URL для возврата пользователя
   - `NotificationURL` - URL для callback уведомлений

4. **Ответ от T-Pay:**
   - `PaymentURL` - URL для редиректа пользователя на платежную форму
   - `PaymentId` - идентификатор платежа
   - `Success` - статус успешности запроса

**Как работает:**
- Если `TPAY_TEST_MODE=true` → возвращаются мок-данные
- Если `TPAY_TEST_MODE=false` и указаны ключи → реальный вызов T-Pay API
- Подпись создается функцией `createTPayToken()` согласно документации

#### 2.3. Обновить frontend для редиректа

```typescript
// В TopUpBalance.tsx, метод handleDeposit

if (paymentMethod === 'redirect') {
  const response = await apiService.initiatePayment({
    userId,
    amount,
    returnUrl: `${window.location.origin}/payment/success`,
    description: `Пополнение счета на ${amount} ₽`
  });

  if (response.success && response.data?.paymentUrl) {
    // Редирект на платежную форму T-Pay
    window.location.href = response.data.paymentUrl;
  } else {
    setError(response.message || 'Ошибка инициализации платежа');
  }
}
```

### Шаг 3: Обработка callback от T-Pay

T-Pay отправляет callback на указанный URL после завершения платежа.

#### 3.1. Создать endpoint для callback

```javascript
// В server.js

app.post('/api/payments/tpay-callback', async (req, res) => {
  try {
    const { OrderId, PaymentId, Status, Amount, Signature } = req.body;
    
    // Валидация подписи
    const callbackParams = {
      OrderId,
      PaymentId,
      Status,
      Amount
    };
    
    const expectedSignature = createTPaySignature(
      callbackParams,
      process.env.TPAY_SECRET_KEY
    );
    
    if (Signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Неверная подпись callback'
      });
    }
    
    // Находим транзакцию по OrderId
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE payment_id = $1 OR id::text = $1',
      [OrderId.replace('ORDER_', '')]
    );
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Транзакция не найдена'
      });
    }
    
    const transaction = transactionResult.rows[0];
    
    // Обновляем статус транзакции
    let newStatus = 'pending';
    if (Status === 'SUCCESS' || Status === 'COMPLETED') {
      newStatus = 'completed';
    } else if (Status === 'FAILED' || Status === 'CANCELLED') {
      newStatus = 'failed';
    }
    
    await updateTransactionStatus(transaction.id, newStatus, PaymentId);
    
    // Если платеж успешен, обновляем баланс
    if (newStatus === 'completed' && transaction.status !== 'completed') {
      await updateUserBalance(transaction.user_id, transaction.amount, 'add');
    }
    
    // Возвращаем успешный ответ T-Pay
    res.json({
      success: true,
      message: 'Callback обработан'
    });
  } catch (error) {
    console.error('Ошибка обработки callback T-Pay:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обработки callback'
    });
  }
});
```

#### 3.2. Обработка возврата пользователя (ReturnUrl)

```javascript
// В server.js

app.get('/payment/success', async (req, res) => {
  try {
    const { OrderId, Status } = req.query;
    
    if (!OrderId) {
      return res.redirect('/?payment=error');
    }
    
    // Находим транзакцию
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE payment_id = $1 OR id::text = $1',
      [OrderId.replace('ORDER_', '')]
    );
    
    if (transactionResult.rows.length === 0) {
      return res.redirect('/?payment=not_found');
    }
    
    const transaction = transactionResult.rows[0];
    
    if (Status === 'SUCCESS' || Status === 'COMPLETED') {
      // Перенаправляем на страницу успеха
      res.redirect(`/?payment=success&amount=${transaction.amount}`);
    } else {
      // Перенаправляем на страницу ошибки
      res.redirect(`/?payment=failed&reason=${Status}`);
    }
  } catch (error) {
    console.error('Ошибка обработки возврата:', error);
    res.redirect('/?payment=error');
  }
});
```

### Шаг 4: Проверка статуса платежа

Можно периодически проверять статус платежей через T-Pay API:

```javascript
// В server.js

app.get('/api/payments/:transactionId/status', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Получаем транзакцию
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Транзакция не найдена'
      });
    }
    
    const transaction = transactionResult.rows[0];
    
    // Вызов T-Pay API для проверки статуса
    const tpayParams = {
      MerchantId: process.env.TPAY_MERCHANT_ID,
      OrderId: transaction.payment_id || `ORDER_${transaction.id}`,
      Timestamp: new Date().toISOString()
    };
    
    const signature = createTPaySignature(tpayParams, process.env.TPAY_SECRET_KEY);
    tpayParams.Signature = signature;
    
    const statusResponse = await axios.post(
      `${process.env.TPAY_API_URL}/GetPaymentStatus`,
      tpayParams
    );
    
    // Обновляем статус в БД
    if (statusResponse.data.Status !== transaction.status) {
      await updateTransactionStatus(
        transaction.id,
        statusResponse.data.Status.toLowerCase(),
        statusResponse.data.PaymentId
      );
      
      // Если платеж успешен, обновляем баланс
      if (statusResponse.data.Status === 'COMPLETED' && transaction.status !== 'completed') {
        await updateUserBalance(transaction.user_id, transaction.amount, 'add');
      }
    }
    
    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: statusResponse.data.Status,
        amount: transaction.amount
      }
    });
  } catch (error) {
    console.error('Ошибка проверки статуса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки статуса платежа'
    });
  }
});
```

## Важные моменты

1. **Безопасность:**
   - Всегда проверяйте подпись в callback
   - Храните секретный ключ в переменных окружения
   - Используйте HTTPS для всех запросов

2. **Обработка ошибок:**
   - Обрабатывайте все возможные статусы платежей
   - Логируйте все транзакции
   - Уведомляйте пользователя о статусе платежа

3. **Тестирование:**
   - Используйте тестовую среду T-Pay перед production
   - Проверяйте все сценарии (успех, отмена, ошибка)
   - Тестируйте callback обработку

4. **Мониторинг:**
   - Отслеживайте статусы всех транзакций
   - Настройте уведомления о failed транзакциях
   - Ведите логи всех операций

## Текущий статус

✅ Реализовано:
- База данных для транзакций
- API endpoints для инициализации платежей
- Frontend компонент для пополнения
- Мок-реализация для тестирования

⏳ Требуется для production:
- Интеграция с реальным T-Pay API
- Обработка callback от T-Pay
- Проверка подписей запросов
- Обработка всех статусов платежей

