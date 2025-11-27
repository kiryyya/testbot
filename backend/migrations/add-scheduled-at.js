/**
 * Миграция: Добавление поля scheduled_at в таблицу broadcast_campaigns
 * 
 * Запуск: node backend/migrations/add-scheduled-at.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

// Конфигурация подключения к PostgreSQL
const pool = new Pool(
  process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'marketing_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      }
);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Начинаем миграцию: добавление поля scheduled_at...\n');
    
    await client.query('BEGIN');
    
    // Проверяем, существует ли поле
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'broadcast_campaigns' 
        AND column_name = 'scheduled_at'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Поле scheduled_at уже существует, миграция не требуется');
      await client.query('COMMIT');
      return;
    }
    
    // Добавляем поле scheduled_at
    console.log('📋 Добавление поля scheduled_at...');
    await client.query(`
      ALTER TABLE broadcast_campaigns 
      ADD COLUMN scheduled_at TIMESTAMP
    `);
    console.log('✅ Поле scheduled_at добавлено');
    
    // Создаем индекс для оптимизации запросов
    console.log('📊 Создание индекса для scheduled_at...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_scheduled_at 
      ON broadcast_campaigns(scheduled_at) 
      WHERE scheduled_at IS NOT NULL
    `);
    console.log('✅ Индекс создан');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Миграция успешно завершена!');
    console.log('\n📊 Добавлено:');
    console.log('   - Поле scheduled_at в таблице broadcast_campaigns');
    console.log('   - Индекс для оптимизации запросов');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Ошибка при выполнении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запуск миграции
runMigration()
  .then(() => {
    console.log('\n🎉 Миграция завершена успешно!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Критическая ошибка миграции:', error);
    process.exit(1);
  });

