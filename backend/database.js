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
      CREATE INDEX IF NOT EXISTS idx_post_game_settings_post_id ON post_game_settings(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_players_post_id ON post_players(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_players_vk_user_id ON post_players(vk_user_id);
      CREATE INDEX IF NOT EXISTS idx_post_players_post_user ON post_players(post_id, vk_user_id);
      CREATE INDEX IF NOT EXISTS idx_post_events_post_id ON post_events(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_events_vk_user_id ON post_events(vk_user_id);
      CREATE INDEX IF NOT EXISTS idx_post_events_player_id ON post_events(player_id);
      CREATE INDEX IF NOT EXISTS idx_post_events_timestamp ON post_events(timestamp);
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

    // Таблица настроек для каждого сообщества
    const communitySettingsQuery = `
      CREATE TABLE IF NOT EXISTS community_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id BIGINT NOT NULL UNIQUE,
        auto_reply_enabled BOOLEAN DEFAULT true,
        auto_reply_text TEXT DEFAULT 'удачно',
        game_enabled BOOLEAN DEFAULT true,
        default_attempts INTEGER DEFAULT 5,
        default_lives INTEGER DEFAULT 100,
        vk_access_token TEXT,
        confirmation_code VARCHAR(255),
        secret_key VARCHAR(255),
        callback_configured BOOLEAN DEFAULT false,
        callback_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Миграции для добавления новых колонок в существующую таблицу
    const addMissingColumns = `
      DO $$ 
      BEGIN
        -- Добавляем confirmation_code если его нет
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'community_settings' AND column_name = 'confirmation_code'
        ) THEN
          ALTER TABLE community_settings ADD COLUMN confirmation_code VARCHAR(255);
        END IF;
        
        -- Добавляем secret_key если его нет
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'community_settings' AND column_name = 'secret_key'
        ) THEN
          ALTER TABLE community_settings ADD COLUMN secret_key VARCHAR(255);
        END IF;
        
        -- Добавляем callback_configured если его нет
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'community_settings' AND column_name = 'callback_configured'
        ) THEN
          ALTER TABLE community_settings ADD COLUMN callback_configured BOOLEAN DEFAULT false;
        END IF;
        
        -- Добавляем callback_url если его нет
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'community_settings' AND column_name = 'callback_url'
        ) THEN
          ALTER TABLE community_settings ADD COLUMN callback_url TEXT;
        END IF;
      END $$;
    `;

    await pool.query(communitySettingsQuery);
    console.log('✅ Таблица community_settings создана или уже существует');
    
    await pool.query(addMissingColumns);
    console.log('✅ Миграция: добавлены недостающие колонки (confirmation_code, secret_key, callback_configured, callback_url)');

    // Таблица для связи пользователей и их добавленных сообществ
    const userCommunitiesQuery = `
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
    `;
    
    await pool.query(userCommunitiesQuery);
    console.log('✅ Таблица user_communities создана или уже существует');

    await pool.query(userDataQuery);
    console.log('✅ Таблица user_data создана или уже существует');

    // Таблица настроек игры для постов
    const postGameSettingsQuery = `
      CREATE TABLE IF NOT EXISTS post_game_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id TEXT NOT NULL UNIQUE,
        game_enabled BOOLEAN DEFAULT false,
        attempts_per_player INTEGER DEFAULT 5,
        lives_per_player INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Таблица игроков по постам
    const postPlayersQuery = `
      CREATE TABLE IF NOT EXISTS post_players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id TEXT NOT NULL,
        vk_user_id INTEGER NOT NULL,
        user_name VARCHAR(255),
        profile_photo VARCHAR(500),
        attempts_left INTEGER DEFAULT 5,
        lives_count INTEGER DEFAULT 100,
        total_score INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, vk_user_id)
      );
    `;

    // Таблица событий по постам
    const postEventsQuery = `
      CREATE TABLE IF NOT EXISTS post_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id TEXT NOT NULL,
        vk_message_id INTEGER NOT NULL UNIQUE,
        vk_user_id INTEGER NOT NULL,
        player_id UUID NOT NULL,
        event_type VARCHAR(50) DEFAULT 'wall_comment',
        message_text TEXT NOT NULL,
        score_earned INTEGER DEFAULT 0,
        attempts_used INTEGER DEFAULT 0,
        lives_used INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES post_players(id) ON DELETE CASCADE
      );
    `;

    await pool.query(postGameSettingsQuery);
    console.log('✅ Таблица post_game_settings создана или уже существует');

    await pool.query(postPlayersQuery);
    console.log('✅ Таблица post_players создана или уже существует');

    await pool.query(postEventsQuery);
    console.log('✅ Таблица post_events создана или уже существует');
    
    // Миграция: изменение типа post_id с INTEGER на TEXT
    const migratePostIdToText = `
      DO $$
      BEGIN
        -- Изменяем тип post_id в post_game_settings
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'post_game_settings' 
          AND column_name = 'post_id' 
          AND data_type = 'integer'
        ) THEN
          ALTER TABLE post_game_settings ALTER COLUMN post_id TYPE TEXT USING post_id::TEXT;
          RAISE NOTICE 'Миграция: post_game_settings.post_id изменен на TEXT';
        END IF;
        
        -- Изменяем тип post_id в post_players
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'post_players' 
          AND column_name = 'post_id' 
          AND data_type = 'integer'
        ) THEN
          ALTER TABLE post_players ALTER COLUMN post_id TYPE TEXT USING post_id::TEXT;
          RAISE NOTICE 'Миграция: post_players.post_id изменен на TEXT';
        END IF;
        
        -- Изменяем тип post_id в post_events
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'post_events' 
          AND column_name = 'post_id' 
          AND data_type = 'integer'
        ) THEN
          ALTER TABLE post_events ALTER COLUMN post_id TYPE TEXT USING post_id::TEXT;
          RAISE NOTICE 'Миграция: post_events.post_id изменен на TEXT';
        END IF;
      END $$;
    `;
    
    await pool.query(migratePostIdToText);
    console.log('✅ Миграция: post_id изменен на TEXT во всех таблицах');

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

// Функция для расчета урона жизней (фиксированный урон 20 жизней за попытку)
const calculateDamage = () => {
  const damage = 20; // Фиксированный урон 20 жизней за попытку
  console.log(`🎯 Урон за попытку: ${damage} жизней`);
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

// ===== НОВЫЕ ФУНКЦИИ ДЛЯ ИГРЫ ПО ПОСТАМ =====

// Функция для получения настроек игры поста
const getPostGameSettings = async (postId) => {
  try {
    const query = `
      SELECT * FROM post_game_settings 
      WHERE post_id = $1
    `;
    const result = await pool.query(query, [postId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Ошибка при получении настроек игры поста:', error);
    return null;
  }
};

// Функция для создания/обновления настроек игры поста
const setPostGameSettings = async (postId, gameEnabled, attemptsPerPlayer = 5, livesPerPlayer = 100) => {
  try {
    const query = `
      INSERT INTO post_game_settings (post_id, game_enabled, attempts_per_player, lives_per_player)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (post_id) 
      DO UPDATE SET 
        game_enabled = $2,
        attempts_per_player = $3,
        lives_per_player = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [postId, gameEnabled, attemptsPerPlayer, livesPerPlayer]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка при настройке игры поста:', error);
    return null;
  }
};

// Функция для поиска или создания игрока поста
const findOrCreatePostPlayer = async (postId, vkUserId, userName = null, profilePhoto = null) => {
  try {
    // Проверяем, существует ли игрок для этого поста
    const checkQuery = `
      SELECT * FROM post_players 
      WHERE post_id = $1 AND vk_user_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [postId, vkUserId]);

    if (checkResult.rows.length > 0) {
      // Игрок существует, обновляем время последней активности
      const updateQuery = `
        UPDATE post_players 
        SET last_activity = CURRENT_TIMESTAMP,
            user_name = COALESCE($3, user_name),
            profile_photo = COALESCE($4, profile_photo),
            updated_at = CURRENT_TIMESTAMP
        WHERE post_id = $1 AND vk_user_id = $2
        RETURNING *
      `;
      const updateResult = await pool.query(updateQuery, [postId, vkUserId, userName, profilePhoto]);
      return updateResult.rows[0];
    } else {
      // Создаем нового игрока для этого поста
      const createQuery = `
        INSERT INTO post_players (
          post_id, vk_user_id, user_name, profile_photo, 
          attempts_left, lives_count, total_score
        )
        VALUES ($1, $2, $3, $4, 5, 100, 0)
        RETURNING *
      `;
      const createResult = await pool.query(createQuery, [postId, vkUserId, userName, profilePhoto]);
      return createResult.rows[0];
    }
  } catch (error) {
    console.error('❌ Ошибка при поиске/создании игрока поста:', error);
    return null;
  }
};

// Функция для создания события поста
const createPostEvent = async (eventData) => {
  try {
    const {
      vkMessageId,
      vkUserId,
      playerId,
      postId,
      eventType = 'wall_comment',
      messageText,
      scoreEarned = 1,
      attemptsUsed = 1,
      livesUsed = 20,
      timestamp
    } = eventData;

    const query = `
      INSERT INTO post_events (
        vk_message_id, vk_user_id, player_id, post_id,
        event_type, message_text, score_earned, 
        attempts_used, lives_used, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (vk_message_id) DO NOTHING
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      vkMessageId, vkUserId, playerId, postId,
      eventType, messageText, scoreEarned,
      attemptsUsed, livesUsed, timestamp
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка при создании события поста:', error);
    return null;
  }
};

// Функция для обновления статистики игрока поста
const updatePostPlayerStats = async (playerId, attemptsUsed = 0, livesUsed = 0, scoreEarned = 0) => {
  try {
    const query = `
      UPDATE post_players 
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
      console.log(`📊 Статистика игрока поста обновлена: попытки ${player.attempts_left}, жизни ${player.lives_count}, очки ${player.total_score}`);
      return player;
    }
    return null;
  } catch (error) {
    console.error('❌ Ошибка при обновлении статистики игрока поста:', error);
    return null;
  }
};

// Функция для получения топ игроков поста
const getPostTopPlayers = async (postId, limit = 10) => {
  try {
    const query = `
      SELECT 
        vk_user_id, user_name, total_score, 
        attempts_left, lives_count, 
        created_at, last_activity
      FROM post_players 
      WHERE post_id = $1 AND is_active = true
      ORDER BY total_score DESC, created_at ASC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [postId, limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении топа игроков поста:', error);
    return [];
  }
};

// Функция для получения событий поста
const getPostEvents = async (postId, limit = 50) => {
  try {
    const query = `
      SELECT * FROM post_events 
      WHERE post_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [postId, limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении событий поста:', error);
    return [];
  }
};

// ==========================================
// Функции для работы с настройками сообществ
// ==========================================

/**
 * Получить настройки конкретного сообщества
 */
const getCommunitySettings = async (communityId) => {
  try {
    const query = `
      SELECT * FROM community_settings 
      WHERE community_id = $1
    `;
    
    const result = await pool.query(query, [communityId]);
    
    if (result.rows.length === 0) {
      // Возвращаем дефолтные настройки если нет записи
      return {
        community_id: communityId,
        auto_reply_enabled: true,
        auto_reply_text: 'удачно',
        game_enabled: true,
        default_attempts: 5,
        default_lives: 100,
        vk_access_token: null
      };
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка при получении настроек сообщества:', error);
    throw error;
  }
};

/**
 * Создать или обновить настройки сообщества
 */
const setCommunitySettings = async (communityId, settings) => {
  try {
    const {
      auto_reply_enabled,
      auto_reply_text,
      game_enabled,
      default_attempts,
      default_lives,
      vk_access_token,
      confirmation_code,
      secret_key,
      callback_configured,
      callback_url
    } = settings;

    const query = `
      INSERT INTO community_settings (
        community_id, 
        auto_reply_enabled, 
        auto_reply_text, 
        game_enabled, 
        default_attempts, 
        default_lives,
        vk_access_token,
        confirmation_code,
        secret_key,
        callback_configured,
        callback_url,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (community_id) 
      DO UPDATE SET
        auto_reply_enabled = COALESCE(EXCLUDED.auto_reply_enabled, community_settings.auto_reply_enabled),
        auto_reply_text = COALESCE(EXCLUDED.auto_reply_text, community_settings.auto_reply_text),
        game_enabled = COALESCE(EXCLUDED.game_enabled, community_settings.game_enabled),
        default_attempts = COALESCE(EXCLUDED.default_attempts, community_settings.default_attempts),
        default_lives = COALESCE(EXCLUDED.default_lives, community_settings.default_lives),
        vk_access_token = COALESCE(EXCLUDED.vk_access_token, community_settings.vk_access_token),
        confirmation_code = COALESCE(EXCLUDED.confirmation_code, community_settings.confirmation_code),
        secret_key = COALESCE(EXCLUDED.secret_key, community_settings.secret_key),
        callback_configured = COALESCE(EXCLUDED.callback_configured, community_settings.callback_configured),
        callback_url = COALESCE(EXCLUDED.callback_url, community_settings.callback_url),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      communityId,
      auto_reply_enabled,
      auto_reply_text,
      game_enabled,
      default_attempts,
      default_lives,
      vk_access_token,
      confirmation_code,
      secret_key,
      callback_configured,
      callback_url
    ]);

    console.log('✅ Настройки сообщества обновлены:', {
      community_id: communityId,
      ...settings
    });

    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка при сохранении настроек сообщества:', error);
    throw error;
  }
};

/**
 * Добавить сообщество для пользователя
 */
const addUserCommunity = async (userId, communityId, communityName, communityPhoto, accessToken) => {
  try {
    console.log('💾 addUserCommunity вызван:');
    console.log('   userId:', userId, 'тип:', typeof userId);
    console.log('   communityId:', communityId, 'тип:', typeof communityId);
    console.log('   communityName:', communityName);
    console.log('   communityPhoto:', communityPhoto);
    console.log('   accessToken:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
    
    const query = `
      INSERT INTO user_communities (
        user_id,
        community_id,
        community_name,
        community_photo,
        access_token
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, community_id)
      DO UPDATE SET
        community_name = EXCLUDED.community_name,
        community_photo = EXCLUDED.community_photo,
        access_token = EXCLUDED.access_token
      RETURNING *
    `;
    
    const params = [
      userId,
      communityId,
      communityName,
      communityPhoto,
      accessToken
    ];
    
    console.log('   SQL параметры:', params);
    
    const result = await pool.query(query, params);
    
    console.log('✅ Сообщество добавлено для пользователя:', {
      user_id: userId,
      community_id: communityId,
      result: result.rows[0]
    });
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка при добавлении сообщества для пользователя:', error);
    throw error;
  }
};

/**
 * Получить все сообщества пользователя
 */
const getUserCommunities = async (userId) => {
  try {
    console.log('🔍 getUserCommunities вызван');
    console.log('   userId:', userId, 'тип:', typeof userId);
    
    const query = `
      SELECT * FROM user_communities
      WHERE user_id = $1
      ORDER BY added_at DESC
    `;
    
    console.log('   SQL запрос:', query);
    console.log('   Параметры:', [userId]);
    
    const result = await pool.query(query, [userId]);
    
    console.log('   Результат из БД:', result.rows.length, 'строк');
    console.log('   Данные:', JSON.stringify(result.rows, null, 2));
    
    return result.rows;
  } catch (error) {
    console.error('❌ Ошибка при получении сообществ пользователя:', error);
    throw error;
  }
};

/**
 * Удалить сообщество пользователя
 */
const removeUserCommunity = async (userId, communityId) => {
  try {
    const query = `
      DELETE FROM user_communities
      WHERE user_id = $1 AND community_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, communityId]);
    
    console.log('✅ Сообщество удалено для пользователя:', {
      user_id: userId,
      community_id: communityId
    });
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Ошибка при удалении сообщества пользователя:', error);
    throw error;
  }
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
  calculateDamage,
  checkVictoryConditions,
  // Новые функции для игры по постам
  getPostGameSettings,
  setPostGameSettings,
  findOrCreatePostPlayer,
  createPostEvent,
  updatePostPlayerStats,
  getPostTopPlayers,
  getPostEvents,
  // Функции для работы с настройками сообществ
  getCommunitySettings,
  setCommunitySettings,
  // Функции для работы с сообществами пользователей
  addUserCommunity,
  getUserCommunities,
  removeUserCommunity
};
