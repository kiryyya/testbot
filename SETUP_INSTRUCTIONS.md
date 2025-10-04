# 📝 Инструкция по настройке OAuth и добавлению сообществ

## ✅ Что было реализовано:

### 1. **Правильный OAuth Flow для VK**
- Пользователь теперь авторизуется через настоящий OAuth 2.0
- ВКонтакте показывает окно с запросом прав на управление сообществами
- Backend автоматически обменивает `code` на `access_token`

### 2. **Новая система добавления сообществ**
- Сообщества больше не загружаются автоматически
- Пользователь видит кнопку "Добавить сообщество"
- Выбирает сообщество из dropdown
- После авторизации сообщество добавляется в БД

### 3. **Автоматическая настройка Callback API**
- После добавления сообщества автоматически настраивается:
  - Confirmation code
  - Callback server URL
  - Типы событий (message_new, wall_reply_new, etc.)
  - Сохранение токена в БД

---

## 🔧 Требуемые настройки

### Шаг 1: Получить VK App Secret

1. Зайдите в [настройки VK приложения](https://vk.com/apps?act=manage)
2. Выберите приложение с App ID `54125757`
3. Перейдите в раздел "Настройки"
4. Скопируйте "Защищённый ключ" (Secret Key)
5. Добавьте в `backend/config.env`:
   ```
   VK_APP_SECRET=ваш_secret_key_здесь
   ```

### Шаг 2: Настроить Redirect URI в VK

1. В настройках VK приложения найдите "Authorized redirect URIs"
2. Добавьте следующие URL:
   - Для разработки: `http://localhost/auth/vk/callback`
   - Для продакшена: `https://yourdomain.com/auth/vk/callback`
3. Сохраните изменения

### Шаг 3: Обновить переменные окружения

Проверьте `backend/config.env`:
```env
# VK OAuth Configuration
VK_APP_ID=54125757
VK_APP_SECRET=ВАТТРЕБУЕТСЯ_ПОЛУЧИТЬ_ИЗ_НАСТРОЕК_VK  # ← Замените на реальный
VK_REDIRECT_URI=http://localhost/auth/vk/callback

# Callback API Configuration
CALLBACK_URL=https://testbot-api.loca.lt/vk/callback
```

### Шаг 4: Создать таблицу в БД

Таблица создастся автоматически при запуске backend, либо выполните вручную:

```sql
CREATE TABLE IF NOT EXISTS user_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  community_id BIGINT NOT NULL,
  community_name VARCHAR(500),
  community_photo VARCHAR(500),
  access_token TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_user_communities_user_id 
ON user_communities(user_id);

CREATE INDEX IF NOT EXISTS idx_user_communities_community_id 
ON user_communities(community_id);

-- Добавить новые поля в community_settings (если еще не добавлены)
ALTER TABLE community_settings 
ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS callback_configured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS callback_url TEXT;
```

---

## 🚀 Как это работает для пользователя

### 1. Пользователь заходит на страницу `/communities`

```
┌────────────────────────────────┐
│  Мои сообщества                │
│                                │
│  [+ Добавить сообщество]       │
│                                │
│  📭 Сообществ пока нет         │
│  Нажмите кнопку "Добавить      │
│  сообщество" чтобы начать      │
└────────────────────────────────┘
```

### 2. Нажимает "Добавить сообщество"

Открывается модальное окно со списком управляемых сообществ:

```
┌────────────────────────────────┐
│  Добавить сообщество       [×] │
├────────────────────────────────┤
│                                │
│  Выберите сообщество:          │
│                                │
│  ┌──────────────────────────┐  │
│  │ 📷 Test Community        │  │
│  │ ID: 232533026            │  │
│  │ 1,234 подписчиков     ✓  │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ 📷 Another Group         │  │
│  │ ID: 123456789            │  │
│  └──────────────────────────┘  │
│                                │
├────────────────────────────────┤
│  [Отмена]        [Продолжить]  │
└────────────────────────────────┘
```

### 3. Выбирает сообщество → Нажимает "Продолжить"

Перенаправляется на VK OAuth:

```
┌────────────────────────────────┐
│         ВКОНТАКТЕ              │
│                                │
│  Приложение "Your App"         │
│  запрашивает доступ к:         │
│                                │
│  ✓ Управление сообществами     │
│  ✓ Расширенные права           │
│                                │
│  [Разрешить]     [Отмена]      │
└────────────────────────────────┘
```

### 4. Разрешает доступ → Возврат на сайт

Показывается страница обработки:

```
┌────────────────────────────────┐
│  ⏳ Обработка авторизации...   │
│                                │
│  ✅ Получение токена доступа   │
│  ⏳ Настройка Callback API     │
│  ⏳ Сохранение настроек         │
│                                │
│  Подождите, мы настраиваем всё │
│  автоматически...              │
└────────────────────────────────┘
```

### 5. Автоматическая настройка завершена

Перенаправление обратно на `/communities`:

```
┌────────────────────────────────┐
│  Мои сообщества                │
│                                │
│  [+ Добавить сообщество]       │
│                                │
│  ┌──────────────────────────┐  │
│  │ 📷 Test Community    [×] │  │
│  │ ID: 232533026            │  │
│  │ 1,234 подписчиков        │  │
│  │                          │  │
│  │ 🔗 Callback API: ✅      │  │
│  │ [Открыть →]              │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

---

## 📊 Что происходит на backend

### При клике "Продолжить":

1. **Frontend** сохраняет `communityId` в `localStorage`
2. Формирует OAuth URL с правами `groups,manage`
3. Перенаправляет на `https://oauth.vk.com/authorize`

### После разрешения доступа:

1. VK перенаправляет на `/auth/vk/callback?code=...`
2. **VKAuthCallbackPage** извлекает `code` из URL
3. Отправляет `POST /api/auth/vk/exchange-code`:
   ```json
   {
     "code": "abc123...",
     "userId": "12345",
     "communityId": 232533026
   }
   ```

### Backend обрабатывает запрос:

1. Обменивает `code` на `access_token` через VK OAuth API
2. Получает информацию о сообществе (`name`, `photo`)
3. Сохраняет в таблицу `user_communities`:
   ```sql
   INSERT INTO user_communities (
     user_id, community_id, community_name, 
     community_photo, access_token
   )
   ```
4. Автоматически настраивает Callback API:
   - `groups.getCallbackConfirmationCode`
   - `groups.setCallbackServer`
   - `groups.setCallbackSettings`
5. Сохраняет настройки в `community_settings`

---

## 🔍 API Endpoints

### Получить сообщества пользователя
```http
GET /api/user/:userId/communities
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "12345",
      "community_id": 232533026,
      "community_name": "Test Community",
      "community_photo": "https://...",
      "access_token": "vk1.a...",
      "added_at": "2025-10-03T12:00:00Z"
    }
  ]
}
```

### Обмен OAuth code на token
```http
POST /api/auth/vk/exchange-code
```

**Body:**
```json
{
  "code": "abc123...",
  "userId": "12345",
  "communityId": 232533026
}
```

**Response:**
```json
{
  "success": true,
  "message": "Сообщество успешно добавлено и настроено!",
  "data": {
    "communityId": 232533026,
    "communityName": "Test Community"
  }
}
```

### Удалить сообщество
```http
DELETE /api/user/:userId/communities/:communityId
```

---

## 🛠 Troubleshooting

### Ошибка: "VK_APP_SECRET не найден"
- Убедитесь что добавили Secret Key в `config.env`
- Перезапустите backend

### Ошибка: "invalid_grant"
- Redirect URI не совпадает с настройками VK
- Проверьте `VK_REDIRECT_URI` в config.env
- Проверьте настройки в VK приложении

### Ошибка: "Access denied"
- Пользователь отклонил запрос прав
- Попросите повторить попытку

### Сообщество не появляется после авторизации
- Проверьте консоль браузера на ошибки
- Проверьте backend логи
- Убедитесь что таблица `user_communities` создана

---

## 📚 Полезные ссылки

- [VK OAuth Documentation](https://dev.vk.com/ru/api/access-token/getting-started)
- [VK Callback API](https://dev.vk.com/ru/api/callback/getting-started)
- [VK App Settings](https://vk.com/apps?act=manage)

---

## ✨ Итого

✅ OAuth Flow реализован правильно  
✅ Пользователь видит окно запроса прав  
✅ Сообщества добавляются по выбору  
✅ Callback API настраивается автоматически  
✅ Все данные хранятся в БД  

**Осталось только:**
1. Получить VK App Secret
2. Добавить Redirect URI в VK
3. Обновить config.env
4. Запустить серверы!

