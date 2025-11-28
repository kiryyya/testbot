/**
 * Миграция: Добавление полей для рассылки в таблицу scheduled_posts
 * 
 * Запуск: node backend/migrations/add-broadcast-fields-to-posts.js
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
    console.log('🚀 Начинаем миграцию: добавление полей рассылки в scheduled_posts...\n');
    
    await client.query('BEGIN');
    
    // Проверяем, существует ли таблица
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'scheduled_posts'
    `);
    
    if (checkTable.rows.length === 0) {
      console.log('❌ Таблица scheduled_posts не существует. Сначала выполните миграцию add-scheduled-posts.js');
      await client.query('ROLLBACK');
      return;
    }
    
    // Проверяем, существуют ли уже поля
    const checkFields = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scheduled_posts' 
        AND column_name IN ('broadcast_enabled', 'broadcast_message_text', 'broadcast_scheduled_at', 'broadcast_delay_minutes')
    `);
    
    const existingFields = checkFields.rows.map(row => row.column_name);
    
    if (existingFields.length === 4) {
      console.log('✅ Все поля рассылки уже существуют, миграция не требуется');
      await client.query('COMMIT');
      return;
    }
    
    // Добавляем поля, если их нет
    console.log('📋 Добавление полей для рассылки...');
    
    if (!existingFields.includes('broadcast_enabled')) {
      await client.query(`
        ALTER TABLE scheduled_posts 
        ADD COLUMN broadcast_enabled BOOLEAN DEFAULT false;
      `);
      console.log('✅ Добавлено поле broadcast_enabled');
    }
    
    if (!existingFields.includes('broadcast_message_text')) {
      await client.query(`
        ALTER TABLE scheduled_posts 
        ADD COLUMN broadcast_message_text TEXT;
      `);
      console.log('✅ Добавлено поле broadcast_message_text');
    }
    
    if (!existingFields.includes('broadcast_scheduled_at')) {
      await client.query(`
        ALTER TABLE scheduled_posts 
        ADD COLUMN broadcast_scheduled_at TIMESTAMP;
      `);
      console.log('✅ Добавлено поле broadcast_scheduled_at');
    }
    
    if (!existingFields.includes('broadcast_delay_minutes')) {
      await client.query(`
        ALTER TABLE scheduled_posts 
        ADD COLUMN broadcast_delay_minutes INTEGER;
      `);
      console.log('✅ Добавлено поле broadcast_delay_minutes');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Миграция успешно завершена!');
    console.log('\n📊 Добавлены поля:');
    console.log('   - broadcast_enabled (BOOLEAN)');
    console.log('   - broadcast_message_text (TEXT)');
    console.log('   - broadcast_scheduled_at (TIMESTAMP)');
    console.log('   - broadcast_delay_minutes (INTEGER)');
    
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

