# 🔧 Настройка VK Callback API - Полное руководство

## 📋 Что такое VK Callback API?

**Callback API** - это механизм ВКонтакте для получения уведомлений о событиях в сообществе (новые сообщения, комментарии, лайки и т.д.) на ваш сервер в реальном времени.

---

## ❓ Можно ли настроить автоматически?

### ✅ Частично автоматизируемо:

1. **Можно программно через API:**
   - `groups.setCallbackServer` - установить URL сервера
   - `groups.setCallbackSettings` - выбрать типы событий
   - `groups.getCallbackConfirmationCode` - получить код подтверждения

2. **❌ Нельзя автоматизировать:**
   - Первичная настройка требует **ручного создания Access Token** администратором сообщества
   - Пользователь должен **вручную дать права** на управление сообществом

---

## 🎯 Как это работает?

### Вариант 1: Ручная настройка (текущий подход)

Администратор сообщества **вручную** настраивает в VK:

1. Заходит в **Управление сообществом**
2. **Работа с API** → **Callback API**
3. Добавляет **URL сервера**: `https://your-domain.com/vk/callback`
4. Вводит **код подтверждения** (из вашего config.env)
5. Выбирает **типы событий**: `wall_reply_new`, `message_new`, и т.д.

**Минусы:**
- Нужно делать для каждого сообщества вручную
- Требует технических знаний

---

### Вариант 2: Полуавтоматическая настройка (рекомендуется)

Пользователь авторизуется через **VK ID** и дает права, ваш сервис настраивает автоматически.

#### 🔑 Шаг 1: Получение Access Token с правами

Пользователь должен авторизоваться через **VK OAuth** с запросом прав:

```javascript
const REQUIRED_SCOPE = [
  'groups',           // Доступ к управлению сообществами
  'messages',         // Доступ к сообщениям
  'manage'            // Управление сообществом
].join(',');

// URL для авторизации
const authUrl = `https://oauth.vk.com/authorize?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=${REQUIRED_SCOPE}&response_type=code&v=5.199`;
```

#### 📡 Шаг 2: Автоматическая настройка через API

После получения токена с нужными правами:

```javascript
// 1. Получить код подтверждения
const confirmationCode = await vkApi('groups.getCallbackConfirmationCode', {
  group_id: communityId,
  access_token: userAccessToken
});

// 2. Установить URL сервера
await vkApi('groups.setCallbackServer', {
  group_id: communityId,
  url: 'https://your-domain.com/vk/callback',
  title: 'Main Server',
  secret_key: SECRET_KEY,
  access_token: userAccessToken
});

// 3. Настроить типы событий
await vkApi('groups.setCallbackSettings', {
  group_id: communityId,
  api_version: '5.199',
  message_new: 1,
  wall_reply_new: 1,
  like_add: 1,
  like_remove: 1,
  access_token: userAccessToken
});
```

---

## 🚀 Реализация в вашем проекте

### Архитектура:

```
Пользователь (Админ сообщества)
    ↓
Авторизация через VK OAuth (с правами groups + manage)
    ↓
Ваш сервис получает Access Token
    ↓
Список сообществ пользователя (getUserManagedGroups)
    ↓
Пользователь выбирает сообщество
    ↓
Нажимает "Подключить Callback API"
    ↓
Ваш backend автоматически:
  1. Получает confirmation code
  2. Устанавливает callback URL
  3. Настраивает типы событий
  4. Сохраняет настройки в community_settings
    ↓
✅ Готово! Callback API работает
```

---

## 💡 Рекомендуемое решение для вашего проекта:

### 1. **Добавить кнопку на странице сообщества**

```tsx
// В CommunityDetailPage.tsx
<button onClick={() => setupCallbackAPI(community.id)}>
  🔗 Подключить Callback API
</button>
```

### 2. **Backend endpoint для автонастройки**

```javascript
// POST /api/communities/:communityId/setup-callback
app.post('/api/communities/:communityId/setup-callback', async (req, res) => {
  const { communityId } = req.params;
  const { userAccessToken } = req.body; // Токен пользователя с правами
  
  try {
    // 1. Получаем confirmation code
    const confirmRes = await axios.get('https://api.vk.com/method/groups.getCallbackConfirmationCode', {
      params: {
        group_id: communityId,
        access_token: userAccessToken,
        v: '5.199'
      }
    });
    
    const confirmationCode = confirmRes.data.response.code;
    
    // 2. Устанавливаем callback server
    await axios.post('https://api.vk.com/method/groups.setCallbackServer', null, {
      params: {
        group_id: communityId,
        url: process.env.CALLBACK_URL, // https://your-domain.com/vk/callback
        title: 'Main Server',
        secret_key: process.env.VK_SECRET_KEY,
        access_token: userAccessToken,
        v: '5.199'
      }
    });
    
    // 3. Настраиваем события
    await axios.post('https://api.vk.com/method/groups.setCallbackSettings', null, {
      params: {
        group_id: communityId,
        api_version: '5.199',
        message_new: 1,
        wall_reply_new: 1,
        wall_post_new: 1,
        like_add: 1,
        like_remove: 1,
        access_token: userAccessToken,
        v: '5.199'
      }
    });
    
    // 4. Сохраняем confirmation code в БД
    await setCommunitySettings(communityId, {
      ...existingSettings,
      confirmation_code: confirmationCode,
      callback_configured: true
    });
    
    res.json({ 
      success: true, 
      message: 'Callback API успешно настроен!',
      confirmationCode 
    });
    
  } catch (error) {
    console.error('Ошибка настройки Callback API:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});
```

### 3. **Обновить VK OAuth для запроса нужных прав**

В VKAuth.jsx нужно запросить дополнительные права:

```javascript
const config = {
  app: 54125757,
  redirectUrl: 'http://localhost',
  scope: 'groups,manage,messages' // ← Добавить эти права
};
```

### 4. **Добавить поле confirmation_code в таблицу**

```sql
ALTER TABLE community_settings 
ADD COLUMN confirmation_code VARCHAR(255),
ADD COLUMN callback_configured BOOLEAN DEFAULT false;
```

---

## 🎯 Итоговый UX для пользователя:

1. **Авторизуется** через VK ID (с расширенными правами)
2. **Видит свои сообщества** на странице `/communities`
3. **Открывает сообщество** → видит кнопку "🔗 Подключить Callback API"
4. **Нажимает кнопку** → все настраивается автоматически за 2-3 секунды
5. **Видит статус** "✅ Callback API подключен"
6. **Готово!** Бот начинает отвечать на комментарии

---

## ⚠️ Важные моменты:

### Безопасность:
- ❌ Никогда не храните Access Token пользователя в открытом виде
- ✅ Шифруйте токены в БД
- ✅ Запрашивайте минимально необходимые права
- ✅ Используйте HTTPS для Callback URL

### Ограничения VK API:
- Токен пользователя имеет **срок действия** (обычно несколько часов)
- После истечения нужно **обновлять токен** (используйте refresh token)
- Некоторые методы требуют **прав администратора** сообщества

### Альтернатива:
Если автоматизация слишком сложна, можно:
1. Создать **пошаговую инструкцию** с скриншотами
2. Сделать **видео-гайд** для пользователей
3. Предоставить **тестовое сообщество** для демонстрации

---

## 📚 Полезные ссылки:

- [VK API: groups.setCallbackServer](https://dev.vk.com/method/groups.setCallbackServer)
- [VK API: groups.setCallbackSettings](https://dev.vk.com/method/groups.setCallbackSettings)
- [VK API: groups.getCallbackConfirmationCode](https://dev.vk.com/method/groups.getCallbackConfirmationCode)
- [VK OAuth: Получение прав доступа](https://dev.vk.com/ru/api/access-token/getting-started)
- [VK Callback API документация](https://dev.vk.com/ru/api/callback/getting-started)

