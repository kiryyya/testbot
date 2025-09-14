const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'marketing_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Функция для создания таблиц при первом запуске
const createTable = async () => {
  try {
    // Таблица игроков VK
    const vkPlayersQuery = `
      CREATE TABLE IF NOT EXISTS vk_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vk_user_id INTEGER NOT NULL UNIQUE,
        user_name VARCHAR(255),
        profile_photo VARCHAR(500),
        attempts_left INTEGER DEFAULT 5,
        lives_count INTEGER DEFAULT 100,
        total_score INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица событий/комментариев
    const vkEventsQuery = `
      CREATE TABLE IF NOT EXISTS vk_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vk_message_id INTEGER NOT NULL UNIQUE,
        vk_user_id INTEGER NOT NULL,
        player_id UUID NOT NULL,
        post_id INTEGER,
        event_type VARCHAR(50) DEFAULT 'wall_comment',
        message_text TEXT NOT NULL,
        score_earned INTEGER DEFAULT 0,
        attempts_used INTEGER DEFAULT 0,
        lives_used INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES vk_players(id) ON DELETE CASCADE
      );
    `;

    // Таблица для статистики лайков постов (оставляем для совместимости)
    const vkLikesQuery = `
      CREATE TABLE IF NOT EXISTS vk_post_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id INTEGER NOT NULL,
        likes_count INTEGER DEFAULT 0,
        last_liker_id INTEGER,
        last_like_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id)
      );
    `;

    // Таблица для настроек администратора
    const adminSettingsQuery = `
      CREATE TABLE IF NOT EXISTS admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица старых пользователей (оставляем для совместимости)
    const userDataQuery = `
      CREATE TABLE IF NOT EXISTS user_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Создаем индексы для быстрого поиска
    const indexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_vk_players_vk_user_id ON vk_players(vk_user_id);
      CREATE INDEX IF NOT EXISTS idx_vk_events_vk_user_id ON vk_events(vk_user_id);
      CREATE INDEX IF NOT EXISTS idx_vk_events_player_id ON vk_events(player_id);
      CREATE INDEX IF NOT EXISTS idx_vk_events_timestamp ON vk_events(timestamp);
    `;

    // Добавляем дефолтные настройки автоответов
    const defaultSettingsQuery = `
      INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
      VALUES 
        ('auto_reply_enabled', 'true', 'boolean', 'Включены ли автоответы на комментарии'),
        ('auto_reply_text', 'удачно', 'string', 'Текст для автоответов на комментарии'),
        ('game_enabled', 'true', 'boolean', 'Включена ли игровая система'),
        ('default_attempts', '5', 'number', 'Количество попыток для новых игроков'),
        ('default_lives', '100', 'number', 'Количество жизней для новых игроков')
      ON CONFLICT (setting_key) DO NOTHING;
    `;
    
    await pool.query(vkPlayersQuery);
    console.log('✅ Таблица vk_players создана или уже существует');
    
    await pool.query(vkEventsQuery);
    console.log('✅ Таблица vk_events создана или уже существует');
    
    await pool.query(vkLikesQuery);
    console.log('✅ Таблица vk_post_likes создана или уже существует');

    await pool.query(adminSettingsQuery);
    console.log('✅ Таблица admin_settings создана или уже существует');

    await pool.query(userDataQuery);
    console.log('✅ Таблица user_data создана или уже существует');

    await pool.query(indexesQuery);
    console.log('✅ Индексы созданы');

    await pool.query(defaultSettingsQuery);
    console.log('✅ Дефолтные настройки добавлены');
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error);
  }
};

// Функция для тестирования подключения
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Успешное подключение к PostgreSQL');
    client.release();
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    console.log('Убедитесь, что PostgreSQL запущен и настройки в config.env корректны');
  }
};

// Функция для поиска или создания игрока VK
const findOrCreateVkPlayer = async (vkUserId, userName = null, profilePhoto = null) => {
  try {
    // Проверяем, существует ли игрок
    const checkQuery = `
      SELECT * FROM vk_players 
      WHERE vk_user_id = $1
    `;
    const checkResult = await pool.query(checkQuery, [vkUserId]);
    
    if (checkResult.rows.length > 0) {
      // Игрок существует, обновляем время последней активности
      const updateQuery = `
        UPDATE vk_players 
        SET last_activity = CURRENT_TIMESTAMP,
            user_name = COALESCE($2, user_name),
            profile_photo = COALESCE($3, profile_photo),
            updated_at = CURRENT_TIMESTAMP
        WHERE vk_user_id = $1
        RETURNING *
      `;
      const updateResult = await pool.query(updateQuery, [vkUserId, userName, profilePhoto]);
      console.log(`🎮 Игрок VK ${vkUserId} найден и обновлен`);
      return updateResult.rows[0];
    } else {
      // Создаем нового игрока с дефолтными значениями
      const createQuery = `
        INSERT INTO vk_players (
          vk_user_id, user_name, profile_photo, 
          attempts_left, lives_count, total_score
        )
        VALUES ($1, $2, $3, 5, 100, 0)
        RETURNING *
      `;
      const createResult = await pool.query(createQuery, [
        vkUserId, 
        userName || `VK User ${vkUserId}`, 
        profilePhoto
      ]);
      console.log(`🆕 Новый игрок VK ${vkUserId} создан с 5 попытками и 100 жизнями`);
      return createResult.rows[0];
    }
  } catch (error) {
    console.error('❌ Ошибка при поиске/создании игрока VK:', error);
    throw error;
  }
};

// Функция для создания события/комментария
const createVkEvent = async (eventData) => {
  try {
    const {
      vkMessageId,
      vkUserId,
      playerId,
      postId,
      eventType = 'wall_comment',
      messageText,
      scoreEarned = 0,
      attemptsUsed = 0,
      livesUsed = 0,
      timestamp
    } = eventData;

    const query = `
      INSERT INTO vk_events (
        vk_message_id, vk_user_id, player_id, post_id,
        event_type, message_text, score_earned, 
        attempts_used, lives_used, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (vk_message_id) DO NOTHING
      RETURNING *
    `;

    const values = [
      vkMessageId, vkUserId, playerId, postId,
      eventType, messageText, scoreEarned,
      attemptsUsed, livesUsed, timestamp
    ];

    const result = await pool.query(query, values);
    
    if (result.rows.length > 0) {
      console.log(`📝 Событие ${eventType} сохранено для игрока ${vkUserId}`);
      return result.rows[0];
    } else {
      console.log(`⚠️ Событие ${vkMessageId} уже существует, пропускаем`);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка при создании события VK:', error);
    throw error;
  }
};

// Функция для обновления статистики игрока
const updatePlayerStats = async (playerId, attemptsUsed = 0, livesUsed = 0, scoreEarned = 0) => {
  try {
    const query = `
      UPDATE vk_players 
      SET 
        attempts_left = GREATEST(0, attempts_left - $2),
        lives_count = GREATEST(0, lives_count - $3),
        total_score = total_score + $4,
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [playerId, attemptsUsed, livesUsed, scoreEarned]);
    
    if (result.rows.length > 0) {
      const player = result.rows[0];
      console.log(`📊 Статистика игрока обновлена: попытки ${player.attempts_left}, жизни ${player.lives_count}, очки ${player.total_score}`);
      return player;
    }
    return null;
  } catch (error) {
    console.error('❌ Ошибка при обновлении статистики игрока:', error);
    throw error;
  }
};

// Функция для получения топ игроков
const getTopPlayers = async (limit = 10) => {
  try {
    const query = `
      SELECT 
        vk_user_id, user_name, total_score, 
        attempts_left, lives_count, 
        created_at, last_activity
      FROM vk_players 
      WHERE is_active = true
      ORDER BY total_score DESC, created_at ASC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении топа игроков:', error);
    throw error;
  }
};

// Функция для получения событий игрока
const getPlayerEvents = async (playerId, limit = 50) => {
  try {
    const query = `
      SELECT * FROM vk_events 
      WHERE player_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [playerId, limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении событий игрока:', error);
    throw error;
  }
};

// Функция для расчета случайного урона жизней
const calculateRandomDamage = () => {
  // Случайный урон от 1 до 25 жизней
  const minDamage = 1;
  const maxDamage = 25;
  const damage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
  
  console.log(`🎲 Случайный урон рассчитан: ${damage} жизней`);
  return damage;
};

// Функция для проверки условий победы
const checkVictoryConditions = (player) => {
  const hasUsedAllAttempts = player.attempts_left <= 0;
  const hasLost100Lives = player.lives_count <= 0; // Когда жизни закончились, значит потрачено 100+
  
  console.log(`🏆 Проверка условий победы:`, {
    user_id: player.vk_user_id,
    attempts_left: player.attempts_left,
    lives_count: player.lives_count,
    hasUsedAllAttempts,
    hasLost100Lives,
    isVictory: hasUsedAllAttempts && hasLost100Lives
  });
  
  return hasUsedAllAttempts && hasLost100Lives;
};

module.exports = {
  pool,
  createTable,
  testConnection,
  findOrCreateVkPlayer,
  createVkEvent,
  updatePlayerStats,
  getTopPlayers,
  getPlayerEvents,
  calculateRandomDamage,
  checkVictoryConditions
};
