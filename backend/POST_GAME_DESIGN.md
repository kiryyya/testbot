# Дизайн игровой системы по постам

## Проблема
Сейчас игровая система глобальная - один игрок имеет один прогресс для всего сообщества. Нужно сделать так, чтобы каждый пост мог иметь свою игровую настройку, а игроки могли играть на разных постах независимо.

## Новая структура БД

### 1. Таблица `post_game_settings` - Настройки игры для постов
```sql
CREATE TABLE post_game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id INTEGER NOT NULL UNIQUE,           -- ID поста VK
  game_enabled BOOLEAN DEFAULT false,        -- Включена ли игра для этого поста
  attempts_per_player INTEGER DEFAULT 5,     -- Попыток на игрока для этого поста
  lives_per_player INTEGER DEFAULT 100,      -- Жизней на игрока для этого поста
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Таблица `post_players` - Игроки по постам
```sql
CREATE TABLE post_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id INTEGER NOT NULL,                  -- ID поста
  vk_user_id INTEGER NOT NULL,               -- ID пользователя VK
  user_name VARCHAR(255),                    -- Имя пользователя
  profile_photo VARCHAR(500),                -- Фото профиля
  attempts_left INTEGER DEFAULT 5,           -- Оставшиеся попытки для этого поста
  lives_count INTEGER DEFAULT 100,           -- Жизни для этого поста
  total_score INTEGER DEFAULT 0,             -- Очки для этого поста
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, vk_user_id)               -- Один игрок = один прогресс на пост
);
```

### 3. Таблица `post_events` - События по постам
```sql
CREATE TABLE post_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id INTEGER NOT NULL,                  -- ID поста
  vk_message_id INTEGER NOT NULL UNIQUE,    -- ID сообщения VK
  vk_user_id INTEGER NOT NULL,               -- ID пользователя VK
  player_id UUID NOT NULL,                   -- Ссылка на игрока поста
  event_type VARCHAR(50) DEFAULT 'wall_comment',
  message_text TEXT NOT NULL,
  score_earned INTEGER DEFAULT 0,
  attempts_used INTEGER DEFAULT 0,
  lives_used INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES post_players(id) ON DELETE CASCADE
);
```

## Логика работы

### При получении комментария:
1. **Проверяем настройки поста**: `SELECT game_enabled FROM post_game_settings WHERE post_id = ?`
2. **Если игра отключена** - обычный автоответ без игровой логики
3. **Если игра включена**:
   - Находим/создаем игрока для этого поста: `findOrCreatePostPlayer(post_id, vk_user_id)`
   - Проверяем попытки игрока для этого поста
   - Рассчитываем урон и обновляем статистику
   - Отправляем ответ с игровой статистикой

### API эндпоинты:

#### Управление настройками постов:
- `GET /api/posts/:postId/game` - Получить настройки игры для поста
- `PUT /api/posts/:postId/game` - Обновить настройки игры для поста
- `GET /api/posts/game` - Получить все посты с игровыми настройками

#### Игровая статистика по постам:
- `GET /api/posts/:postId/players` - Игроки конкретного поста
- `GET /api/posts/:postId/events` - События конкретного поста
- `GET /api/posts/:postId/stats` - Статистика поста

## Миграция данных

### Из старой системы в новую:
1. **Глобальные настройки** → **Настройки по умолчанию** для новых постов
2. **Существующие игроки** → **Игроки для всех активных постов**
3. **Существующие события** → **События с привязкой к постам**

## Преимущества новой системы:

1. **Гибкость**: Каждый пост может иметь свою игровую настройку
2. **Независимость**: Игроки могут играть на разных постах отдельно
3. **Масштабируемость**: Легко добавлять новые посты с играми
4. **Контроль**: Админ может управлять играми по постам индивидуально
5. **Статистика**: Детальная статистика по каждому посту

## Примеры использования:

### Сценарий 1: Глобальная игра
- Админ включает игру для всех постов
- Все новые посты автоматически получают игровые настройки
- Игроки играют на всех постах с общим прогрессом

### Сценарий 2: Селективная игра
- Админ включает игру только для определенных постов
- Игроки играют только на выбранных постах
- Каждый пост имеет независимую игровую логику

### Сценарий 3: Смешанный режим
- Некоторые посты с игрой, некоторые без
- Игроки могут играть на разных постах с разным прогрессом
- Гибкое управление игровым контентом
