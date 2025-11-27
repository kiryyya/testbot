# Миграции базы данных

## Миграция: Добавление таблиц для авторассылок

Эта миграция добавляет таблицы для модуля авторассылок:
- `community_members` - участники сообществ
- `broadcast_campaigns` - кампании рассылок
- `broadcast_logs` - логи отправки сообщений

## Запуск миграции

### Способ 1: Через npm скрипт (рекомендуется)

```bash
cd backend
npm run migrate:broadcast
```

### Способ 2: Напрямую через node

```bash
cd backend
node migrations/add-broadcast-tables.js
```

## Что делает миграция

1. Создает таблицу `community_members` для хранения участников сообществ
2. Создает таблицу `broadcast_campaigns` для хранения кампаний рассылок
3. Создает таблицу `broadcast_logs` для логирования отправки сообщений
4. Создает необходимые индексы для оптимизации запросов

## Безопасность

- Миграция использует транзакции (BEGIN/COMMIT/ROLLBACK)
- Если произойдет ошибка, все изменения будут откачены
- Использует `CREATE TABLE IF NOT EXISTS` - безопасно запускать несколько раз
- Использует `CREATE INDEX IF NOT EXISTS` - индексы не создадутся повторно

## Проверка результата

После выполнения миграции можно проверить созданные таблицы:

```sql
-- Проверить таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('community_members', 'broadcast_campaigns', 'broadcast_logs');

-- Проверить структуру таблицы
\d community_members
\d broadcast_campaigns
\d broadcast_logs
```

## Откат миграции (если нужно)

Если нужно удалить созданные таблицы:

```sql
DROP TABLE IF EXISTS broadcast_logs CASCADE;
DROP TABLE IF EXISTS broadcast_campaigns CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
```

**Внимание:** Это удалит все данные из этих таблиц!

