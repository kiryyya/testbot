# ⚡ Быстрый старт: Деплой на Railway за 15 минут

## 🎯 Краткая инструкция

### 1. Подготовка (2 минуты)
```bash
# Закоммитьте изменения
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Railway Setup (3 минуты)
1. Зайдите на [railway.app](https://railway.app) и авторизуйтесь через GitHub
2. Создайте новый проект → "Deploy from GitHub repo"
3. Выберите репозиторий `testbot`

### 3. Backend (5 минут)
1. **Добавьте PostgreSQL:**
   - Нажмите "+ New" → "Database" → "PostgreSQL"

2. **Настройте Backend сервис:**
   - Settings → Root Directory: `backend`
   - Settings → Generate Domain (сохраните URL!)

3. **Добавьте Variables:**
   ```env
   NODE_ENV=production
   VK_APP_ID=54125757
   VK_APP_SECRET=ваш_секрет
   OPENAI_API_KEY=ваш_ключ
   FRONTEND_URL=https://будет-после-деплоя-frontend.up.railway.app
   VK_REDIRECT_URI=https://будет-после-деплоя-frontend.up.railway.app/auth/vk/callback
   CALLBACK_URL=https://ваш-backend-url.up.railway.app/vk/callback
   ```

### 4. Frontend (3 минуты)
1. **Добавьте Frontend:**
   - Нажмите "+ New" → "GitHub Repo" → выберите тот же `testbot`

2. **Настройте Frontend сервис:**
   - Settings → Root Directory: `frontend`
   - Settings → Generate Domain (сохраните URL!)

3. **Добавьте Variables:**
   ```env
   REACT_APP_API_URL=https://ваш-backend-url.up.railway.app/api
   REACT_APP_VK_APP_ID=54125757
   ```

### 5. Обновите Backend Variables (2 минуты)
Вернитесь в Backend и обновите:
```env
FRONTEND_URL=https://реальный-frontend-url.up.railway.app
VK_REDIRECT_URI=https://реальный-frontend-url.up.railway.app/auth/vk/callback
```

Redeploy оба сервиса!

### 6. VK Settings (2 минуты)
1. [VK Apps Manager](https://vk.com/apps?act=manage) → ваше приложение
2. Settings → Authorized redirect URIs → добавьте:
   ```
   https://ваш-frontend.up.railway.app/auth/vk/callback
   ```

---

## ✅ Проверка

1. **Backend:** `https://your-backend.up.railway.app` → должен показать JSON
2. **Frontend:** `https://your-frontend.up.railway.app` → должен открыться сайт
3. **OAuth:** Попробуйте добавить сообщество
4. **Callback:** Отправьте комментарий в VK → бот должен ответить

---

## 🆘 Нужна помощь?

Полная документация: [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)

---

**⏱️ Готово за 15 минут!** 🚀

