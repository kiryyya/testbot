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

// Функция для создания таблицы при первом запуске
const createTable = async () => {
  try {
    const query = `
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
    
    await pool.query(query);
    console.log('✅ Таблица user_data создана или уже существует');
  } catch (error) {
    console.error('❌ Ошибка при создании таблицы:', error);
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
