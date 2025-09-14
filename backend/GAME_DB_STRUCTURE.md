# Структура игровой базы данных

## Обзор системы

Новая система автоматически создает игроков и отслеживает их активность в комментариях ВКонтакте.

## Таблицы базы данных

### 1. `vk_players` - Игроки VK
Основная таблица с информацией об игроках.

```sql
CREATE TABLE vk_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vk_user_id INTEGER NOT NULL UNIQUE,     -- ID пользователя ВК
  user_name VARCHAR(255),                  -- Имя пользователя
  profile_photo VARCHAR(500),              -- Ссылка на фото профиля
  attempts_left INTEGER DEFAULT 5,         -- Оставшиеся попытки
  lives_count INTEGER DEFAULT 100,         -- Количество жизней
  total_score INTEGER DEFAULT 0,           -- Общий счет
  last_activity TIMESTAMP DEFAULT NOW(),   -- Последняя активность
  is_active BOOLEAN DEFAULT true,          -- Активен ли игрок
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `vk_events` - События/Комментарии
Таблица с событиями игроков (комментарии, действия).

```sql
CREATE TABLE vk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vk_message_id INTEGER NOT NULL UNIQUE,  -- ID сообщения VK
  vk_user_id INTEGER NOT NULL,            -- ID пользователя VK
  player_id UUID NOT NULL,                -- Ссылка на игрока
  post_id INTEGER,                        -- ID поста VK
  event_type VARCHAR(50) DEFAULT 'wall_comment',
  message_text TEXT NOT NULL,             -- Текст комментария
  score_earned INTEGER DEFAULT 0,         -- Заработанные очки
  attempts_used INTEGER DEFAULT 0,        -- Использованные попытки
  lives_used INTEGER DEFAULT 0,           -- Использованные жизни
  timestamp INTEGER NOT NULL,             -- Unix timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (player_id) REFERENCES vk_players(id)
);
```

## Логика работы

### При получении комментария:
1. **Проверка игрока**: Ищем игрока по `vk_user_id`
2. **Создание игрока**: Если не найден, создаем с начальными параметрами:
   - `attempts_left = 5`
   - `lives_count = 100`
   - `total_score = 0`
3. **Создание события**: Сохраняем комментарий в `vk_events`
4. **Обновление статистики**: Обновляем счетчики игрока
5. **Автоответ**: Отправляем ответ с текущей статистикой

### Начальные параметры нового игрока:
- 🎮 **Попытки**: 5
- 💜 **Жизни**: 100
- ⭐ **Очки**: 0

### При каждом комментарии:
- Попытки: -1
- Очки: +1
- Жизни: без изменений (пока)

## API Эндпоинты

### Игроки
- `GET /api/players/top?limit=10` - Топ игроков
- `GET /api/players/:vkUserId` - Данные конкретного игрока

### События
- `GET /api/events?limit=50&offset=0` - Список событий

### Статистика
- `GET /api/game/stats` - Общая статистика игровой системы

## Связи между таблицами

```
vk_players (1) --> (N) vk_events
   |                      |
   id  <-- player_id ------+
```

## Индексы для производительности

```sql
CREATE INDEX idx_vk_players_vk_user_id ON vk_players(vk_user_id);
CREATE INDEX idx_vk_events_vk_user_id ON vk_events(vk_user_id);
CREATE INDEX idx_vk_events_player_id ON vk_events(player_id);
CREATE INDEX idx_vk_events_timestamp ON vk_events(timestamp);
```

## Функции базы данных

### `findOrCreateVkPlayer(vkUserId, userName, profilePhoto)`
- Ищет игрока по VK ID
- Если не найден, создает нового с дефолтными параметрами
- Обновляет время последней активности

### `createVkEvent(eventData)`
- Создает новое событие
- Предотвращает дубликаты по `vk_message_id`

### `updatePlayerStats(playerId, attemptsUsed, livesUsed, scoreEarned)`
- Обновляет статистику игрока
- Использует GREATEST() для предотвращения отрицательных значений

### `getTopPlayers(limit)`
- Возвращает топ игроков по очкам

### `getPlayerEvents(playerId, limit)`
- Возвращает последние события игрока
