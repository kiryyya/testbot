/**
 * Миграция: Добавление таблицы scheduled_posts для запланированных постов
 * 
 * Запуск: node backend/migrations/add-scheduled-posts.js
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
    console.log('🚀 Начинаем миграцию: добавление таблицы scheduled_posts...\n');
    
    await client.query('BEGIN');
    
    // Проверяем, существует ли таблица
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'scheduled_posts'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ Таблица scheduled_posts уже существует, миграция не требуется');
      await client.query('COMMIT');
      return;
    }
    
    // Создаем таблицу scheduled_posts
    console.log('📋 Создание таблицы scheduled_posts...');
    await client.query(`
      CREATE TABLE scheduled_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id BIGINT NOT NULL,
        post_text TEXT NOT NULL,
        attachments TEXT,
        scheduled_at TIMESTAMP NOT NULL,
        published_at TIMESTAMP,
        vk_post_id TEXT,
        status VARCHAR(50) DEFAULT 'scheduled',
        game_enabled BOOLEAN DEFAULT false,
        attempts_per_player INTEGER DEFAULT 3,
        lives_per_player INTEGER DEFAULT 100,
        prize_keyword VARCHAR(50) DEFAULT 'приз',
        promo_codes TEXT[] DEFAULT '{}',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Таблица scheduled_posts создана');
    
    // Создаем индексы
    console.log('📊 Создание индексов...');
    await client.query(`
      CREATE INDEX idx_scheduled_posts_community_id 
      ON scheduled_posts(community_id);
    `);
    await client.query(`
      CREATE INDEX idx_scheduled_posts_status 
      ON scheduled_posts(status);
    `);
    await client.query(`
      CREATE INDEX idx_scheduled_posts_scheduled_at 
      ON scheduled_posts(scheduled_at) 
      WHERE scheduled_at IS NOT NULL;
    `);
    console.log('✅ Индексы созданы');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Миграция успешно завершена!');
    console.log('\n📊 Создано:');
    console.log('   - Таблица scheduled_posts');
    console.log('   - Индексы для оптимизации запросов');
    
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

