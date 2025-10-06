# 📝 Railway URLs и переменные окружения

**Заполните этот файл по мере деплоя для удобства**

---

## 🔗 Публичные URL

### Backend URL
```
https://_____________________________.up.railway.app
```
_(Получите на шаге 3.3 после генерации домена для Backend)_

### Frontend URL
```
https://_____________________________.up.railway.app
```
_(Получите на шаге 4.4 после генерации домена для Frontend)_

---

## 🔑 API Keys

### OpenAI API Key
```
sk-proj-_____________________________________________
```
_(Получите на https://platform.openai.com/api-keys)_

### VK App Secret (уже есть)
```
HnHBHmxYLzSXpIgLUuxM
```

### VK App ID (уже есть)
```
54125757
```

---

## ⚙️ Backend Environment Variables

Скопируйте эти переменные в Railway → Backend → Variables:

```env
NODE_ENV=production

VK_APP_ID=54125757

VK_APP_SECRET=HnHBHmxYLzSXpIgLUuxM

OPENAI_API_KEY=<ваш_ключ_из_блока_выше>

CALLBACK_URL=https://<ваш_backend_url>/vk/callback

VK_REDIRECT_URI=https://<ваш_frontend_url>/auth/vk/callback

FRONTEND_URL=https://<ваш_frontend_url>
```

**⚠️ Заполните:**
- `OPENAI_API_KEY` - ваш ключ OpenAI
- `CALLBACK_URL` - замените `<ваш_backend_url>` на реальный Backend URL
- `VK_REDIRECT_URI` - замените `<ваш_frontend_url>` на реальный Frontend URL
- `FRONTEND_URL` - замените `<ваш_frontend_url>` на реальный Frontend URL

---

## 🎨 Frontend Environment Variables

Скопируйте эти переменные в Railway → Frontend → Variables:

```env
REACT_APP_API_URL=https://<ваш_backend_url>/api

REACT_APP_VK_APP_ID=54125757
```

**⚠️ Заполните:**
- `REACT_APP_API_URL` - замените `<ваш_backend_url>` на реальный Backend URL

---

## 🔐 VK App Settings

### Authorized Redirect URI
Добавьте в VK Apps Manager → Settings:
```
https://<ваш_frontend_url>/auth/vk/callback
```

### VK Callback API Server URL
Добавьте в каждом сообществе VK → Управление → API → Callback API:
```
https://<ваш_backend_url>/vk/callback
```

---

## ✅ Чеклист заполнения

- [ ] Backend URL записан
- [ ] Frontend URL записан
- [ ] OpenAI API Key получен и записан
- [ ] Backend Environment Variables заполнены и сохранены в Railway
- [ ] Frontend Environment Variables заполнены и сохранены в Railway
- [ ] VK Redirect URI добавлен в VK Apps
- [ ] VK Callback API URL настроен в сообществах
- [ ] Backend пересобран (Redeploy) после обновления переменных
- [ ] Frontend пересобран (Redeploy) после обновления переменных

---

## 🔗 Быстрые ссылки

- **Railway Dashboard:** https://railway.app/dashboard
- **VK Apps Manager:** https://vk.com/apps?act=manage
- **OpenAI API Keys:** https://platform.openai.com/api-keys
- **GitHub Repo:** https://github.com/kiryyya/testbot

---

**💡 Совет:** Сохраните этот файл локально, не коммитьте с заполненными данными!

