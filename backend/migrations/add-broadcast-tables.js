/**
 * Миграция: Добавление таблиц для авторассылок
 * 
 * Этот скрипт добавляет следующие таблицы:
 * - community_members - участники сообществ
 * - broadcast_campaigns - кампании рассылок
 * - broadcast_logs - логи отправки сообщений
 * 
 * Запуск: node backend/migrations/add-broadcast-tables.js
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
    console.log('🚀 Начинаем миграцию: добавление таблиц для авторассылок...\n');
    
    await client.query('BEGIN');
    
    // 1. Таблица для хранения участников сообществ
    console.log('📋 Создание таблицы community_members...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id BIGINT NOT NULL,
        vk_user_id INTEGER NOT NULL,
        user_name VARCHAR(255),
        profile_photo VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        can_send_message BOOLEAN DEFAULT true,
        last_message_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(community_id, vk_user_id)
      );
    `);
    console.log('✅ Таблица community_members создана');
    
    // Индексы для community_members
    console.log('📊 Создание индексов для community_members...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_community_members_community_id 
      ON community_members(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_community_members_vk_user_id 
      ON community_members(vk_user_id);
    `);
    console.log('✅ Индексы для community_members созданы');
    
    // 2. Таблица для рассылок
    console.log('📋 Создание таблицы broadcast_campaigns...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcast_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id BIGINT NOT NULL,
        message_text TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Таблица broadcast_campaigns создана');
    
    // Индексы для broadcast_campaigns
    console.log('📊 Создание индексов для broadcast_campaigns...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_community_id 
      ON broadcast_campaigns(community_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status 
      ON broadcast_campaigns(status);
    `);
    console.log('✅ Индексы для broadcast_campaigns созданы');
    
    // 3. Таблица для логов рассылок
    console.log('📋 Создание таблицы broadcast_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcast_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL,
        vk_user_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES broadcast_campaigns(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Таблица broadcast_logs создана');
    
    // Индексы для broadcast_logs
    console.log('📊 Создание индексов для broadcast_logs...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_logs_campaign_id 
      ON broadcast_logs(campaign_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_broadcast_logs_vk_user_id 
      ON broadcast_logs(vk_user_id);
    `);
    console.log('✅ Индексы для broadcast_logs созданы');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Миграция успешно завершена!');
    console.log('\n📊 Созданные таблицы:');
    console.log('   - community_members');
    console.log('   - broadcast_campaigns');
    console.log('   - broadcast_logs');
    
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

