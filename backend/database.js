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
    // Таблица пользовательских данных
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
    
    // Таблица для VK сообщений
    const vkMessagesQuery = `
      CREATE TABLE IF NOT EXISTS vk_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vk_message_id INTEGER NOT NULL,
        vk_user_id INTEGER NOT NULL,
        user_name VARCHAR(255),
        message_text TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'message',
        peer_id INTEGER,
        conversation_message_id INTEGER,
        timestamp INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vk_message_id)
      );
    `;

    // Таблица для статистики лайков постов
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

    // Добавляем дефолтные настройки автоответов
    const defaultSettingsQuery = `
      INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
      VALUES 
        ('auto_reply_enabled', 'true', 'boolean', 'Включены ли автоответы на комментарии'),
        ('auto_reply_text', 'удачно', 'string', 'Текст для автоответов на комментарии')
      ON CONFLICT (setting_key) DO NOTHING;
    `;
    
    await pool.query(userDataQuery);
    console.log('✅ Таблица user_data создана или уже существует');
    
    await pool.query(vkMessagesQuery);
    console.log('✅ Таблица vk_messages создана или уже существует');
    
    await pool.query(vkLikesQuery);
    console.log('✅ Таблица vk_post_likes создана или уже существует');

    await pool.query(adminSettingsQuery);
    console.log('✅ Таблица admin_settings создана или уже существует');

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

module.exports = {
  pool,
  createTable,
  testConnection
};
