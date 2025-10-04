# 🔐 Правильный OAuth Flow для работы с сообществами ВКонтакте

## ❗️ Важное открытие!

**VK ID SDK (который сейчас используется) НЕ предоставляет токен для управления сообществами!**

Текущий подход с `@vkid/sdk` дает только **пользовательский токен** с ограниченными правами.
Для работы с Callback API нужен **токен сообщества** или **расширенный пользовательский токен** с правами `groups` и `manage`.

---

## 🎯 Правильный подход: OAuth Authorization Code Flow

### Архитектура решения:

```
1. Пользователь заходит на страницу сообщества
   ↓
2. Нажимает "Подключить Callback API"
   ↓
3. Перенаправляется на VK OAuth с запросом прав: groups, manage
   ↓
4. ВКонтакте показывает окно с запросом доступа:
   "Приложение запрашивает доступ к управлению вашими сообществами"
   ↓
5. Пользователь разрешает доступ
   ↓
6. VK перенаправляет обратно с "code" в URL
   ↓
7. Backend обменивает "code" на access_token
   ↓
8. Backend автоматически настраивает Callback API
   ↓
9. ✅ Готово!
```

---

## 📝 Реализация

### 1. OAuth URL для получения прав

```javascript
const VK_APP_ID = 54125757; // Ваш App ID
const REDIRECT_URI = 'http://localhost/auth/vk/callback'; // URL для возврата после авторизации

// ВАЖНО: Используем актуальный метод авторизации VK
// - НЕ используем display=page (устарел)
// - Используем scope=manage (включает права на управление сообществами)
const authUrl = `https://oauth.vk.com/authorize?` +
  `client_id=${VK_APP_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `scope=manage&` + // ← КЛЮЧЕВОЕ ПРАВО! (включает groups)
  `response_type=code&` + // ← Получаем code, а не token (безопаснее)
  `v=5.199`;

// Перенаправляем пользователя на этот URL
window.location.href = authUrl;
```

### 2. Backend endpoint для обмена code на token

```javascript
// POST /api/auth/vk/exchange-code
app.post('/api/auth/vk/exchange-code', async (req, res) => {
  const { code, communityId } = req.body;
  
  try {
    // Обмениваем code на access_token
    const tokenResponse = await axios.get('https://oauth.vk.com/access_token', {
      params: {
        client_id: process.env.VK_APP_ID,
        client_secret: process.env.VK_APP_SECRET, // ← Нужен Secret Key!
        redirect_uri: process.env.VK_REDIRECT_URI,
        code: code
      }
    });
    
    const { access_token, expires_in, user_id } = tokenResponse.data;
    
    // Теперь у нас есть токен с правами groups и manage!
    // Автоматически настраиваем Callback API
    await setupCallbackAPI(communityId, access_token);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### 3. Frontend компонент с OAuth Flow

```tsx
const CallbackSetup: React.FC<CallbackSetupProps> = ({ communityId }) => {
  
  const handleOAuthFlow = () => {
    // Сохраняем communityId в localStorage для использования после redirect
    localStorage.setItem('pending_community_setup', communityId.toString());
    
    // Формируем OAuth URL с актуальными параметрами
    const VK_APP_ID = 54125757;
    const REDIRECT_URI = `${window.location.origin}/auth/vk/callback`;
    
    // ВАЖНО: Используем актуальный метод авторизации VK
    // - НЕ используем display=page (устарел)
    // - Используем scope=manage (включает права на управление сообществами)
    const authUrl = `https://oauth.vk.com/authorize?` +
      `client_id=${VK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=manage&` +
      `response_type=code&` +
      `v=5.199`;
    
    // Перенаправляем пользователя на VK OAuth
    window.location.href = authUrl;
  };
  
  return (
    <button onClick={handleOAuthFlow}>
      🚀 Подключить Callback API
    </button>
  );
};
```

### 4. Callback страница (после OAuth)

```tsx
// /auth/vk/callback
const VKAuthCallbackPage: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const communityId = localStorage.getItem('pending_community_setup');
    
    if (code && communityId) {
      // Отправляем code на backend
      fetch('http://localhost:5001/api/auth/vk/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, communityId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Очищаем localStorage
          localStorage.removeItem('pending_community_setup');
          
          // Перенаправляем обратно на страницу сообщества
          window.location.href = `/communities/${communityId}`;
        }
      });
    }
  }, []);
  
  return <div>Настройка Callback API...</div>;
};
```

---

## 🔑 Важные моменты

### 1. **Нужен VK App Secret Key**

Для обмена `code` на `access_token` требуется **Secret Key** приложения.

Где взять:
1. Зайдите в [настройки приложения VK](https://vk.com/apps?act=manage)
2. Выберите ваше приложение (App ID: 54125757)
3. В разделе "Настройки" найдите "Защищённый ключ"
4. Добавьте его в `config.env`:
   ```
   VK_APP_ID=54125757
   VK_APP_SECRET=ваш_secret_key
   VK_REDIRECT_URI=http://localhost/auth/vk/callback
   ```

### 2. **Настройка Redirect URI в VK**

В настройках приложения ВКонтакте нужно добавить **Authorized redirect URI**:
- Для разработки: `http://localhost/auth/vk/callback`
- Для продакшена: `https://yourdomain.com/auth/vk/callback`

### 3. **Scope (права доступа)**

Для управления Callback API нужны права:
- `manage` — расширенные права управления (включает `groups`)

**ВАЖНО:** Используйте `scope=manage` вместо `scope=groups,manage`!
- ❌ Неправильно: `scope=groups,manage` (может вызвать ошибку)
- ✅ Правильно: `scope=manage` (включает все необходимые права)

Полный список прав: [VK API Scopes](https://dev.vk.com/ru/reference/access-rights)

### 4. **response_type: code vs token**

- `response_type=code` — **РЕКОМЕНДУЕТСЯ** (безопаснее, токен не попадает в браузер)
- `response_type=token` — токен сразу в URL (небезопасно для продакшена)

---

## 🎨 UX Flow для пользователя

### Шаг 1: Пользователь видит страницу сообщества
```
┌──────────────────────────────────┐
│  🏠 Сообщество "Test Group"      │
│                                  │
│  📊 Информация                   │
│  ⚙️ Настройки                    │
│                                  │
│  🔗 Callback API                 │
│  ❌ Не настроено                 │
│                                  │
│  [🚀 Подключить Callback API]   │
└──────────────────────────────────┘
```

### Шаг 2: Нажимает кнопку → Перенаправление на VK
```
┌──────────────────────────────────┐
│         ВКОНТАКТЕ                │
│                                  │
│  Приложение "Your App" запрашива-│
│  ет доступ к:                    │
│                                  │
│  ✓ Управление сообществами       │
│  ✓ Расширенные права             │
│                                  │
│  [Разрешить]   [Отмена]          │
└──────────────────────────────────┘
```

### Шаг 3: Разрешает → Возврат → Автонастройка
```
┌──────────────────────────────────┐
│  ⏳ Настройка Callback API...    │
│                                  │
│  1. ✅ Получение токена          │
│  2. ✅ Настройка сервера         │
│  3. ✅ Настройка событий         │
│                                  │
│  Перенаправление...              │
└──────────────────────────────────┘
```

### Шаг 4: Готово!
```
┌──────────────────────────────────┐
│  🏠 Сообщество "Test Group"      │
│                                  │
│  🔗 Callback API                 │
│  ✅ Подключено                   │
│                                  │
│  📋 Код подтверждения: 75e6aef1  │
│  🌐 URL: https://...             │
│                                  │
│  События:                        │
│  ✓ message_new                   │
│  ✓ wall_reply_new                │
│  ✓ like_add/remove               │
│                                  │
│  [🔄 Перенастроить]              │
└──────────────────────────────────┘
```

---

## 📚 Альтернативные подходы

### Подход 1: Использовать VK Mini App
Если ваше приложение работает внутри VK, можно использовать VK Bridge:
```javascript
vkBridge.send('VKWebAppGetCommunityToken', {
  app_id: 54125757,
  group_id: communityId,
  scope: 'manage'
});
```

### Подход 2: Ручное создание токена
Админ сообщества вручную создает токен:
1. Заходит в "Управление сообществом" → "Работа с API" → "Ключи доступа"
2. Создает ключ с правами "Управление сообществом"
3. Вставляет токен в интерфейс вашего приложения

---

## 🚀 Итого: Что нужно сделать

### Backend:
1. ✅ Добавить `VK_APP_SECRET` в config.env
2. ✅ Создать endpoint `/api/auth/vk/exchange-code`
3. ✅ Endpoint должен обменивать code на token
4. ✅ Автоматически настраивать Callback API после получения token

### Frontend:
1. ✅ Обновить `CallbackSetup` компонент для OAuth Flow
2. ✅ Создать страницу `/auth/vk/callback` для обработки возврата
3. ✅ Сохранять `communityId` в localStorage перед redirect

### VK Settings:
1. ✅ Добавить Redirect URI в настройках приложения VK
2. ✅ Получить Secret Key приложения

---

## ⚠️ Частые проблемы и их решения

### Ошибка: "Выбранный способ авторизации не доступен для приложения"

**Причина:** Использование устаревших параметров OAuth авторизации.

**Решение:**
1. ❌ Удалите параметр `display=page` из OAuth URL
2. ✅ Используйте `scope=manage` вместо `scope=groups,manage`
3. ✅ Убедитесь, что в настройках приложения VK:
   - Добавлен правильный Redirect URI
   - Приложение не находится в режиме "Только для разработчиков"
   - У приложения есть необходимые права доступа

**Правильный OAuth URL:**
```javascript
const authUrl = `https://oauth.vk.com/authorize?` +
  `client_id=${VK_APP_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `scope=manage&` + // Без display=page!
  `response_type=code&` +
  `v=5.199`;
```

### Ошибка: "Invalid redirect_uri"

**Решение:**
- Добавьте Redirect URI в настройках приложения VK
- URL должен совпадать точно (включая протокол и порт)

---

## 🔗 Полезные ссылки

- [VK OAuth Documentation](https://dev.vk.com/ru/api/access-token/getting-started)
- [VK API Methods: groups.setCallbackServer](https://dev.vk.com/method/groups.setCallbackServer)
- [VK Callback API Guide](https://dev.vk.com/ru/api/callback/getting-started)
- [VK API Scopes](https://dev.vk.com/ru/reference/access-rights)

