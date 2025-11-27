const cron = require('node-cron');
const { getScheduledCampaigns, updateBroadcastCampaign, getScheduledPosts } = require('./database');
const { sendBroadcastMessages } = require('./broadcast');
const { publishScheduledPost } = require('./postPublisher');
const { pool } = require('./database');

/**
 * Планировщик для отложенных рассылок
 * Проверяет каждую минуту запланированные рассылки и запускает их
 */
class BroadcastScheduler {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Запустить планировщик
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Планировщик уже запущен');
      return;
    }

    console.log('🕐 Запуск планировщика отложенных рассылок...');
    
    // Запускаем проверку каждую минуту
    this.cronJob = cron.schedule('* * * * *', async () => {
      // Проверяем запланированные посты
      await this.checkAndPublishScheduledPosts();
      // Проверяем запланированные рассылки
      await this.checkAndRunScheduledCampaigns();
    });

    this.isRunning = true;
    console.log('✅ Планировщик запущен (проверка каждую минуту)');
  }

  /**
   * Остановить планировщик
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('🛑 Планировщик остановлен');
    }
  }

  /**
   * Проверить и опубликовать запланированные посты
   */
  async checkAndPublishScheduledPosts() {
    try {
      const scheduledPosts = await getScheduledPosts();
      
      if (scheduledPosts.length === 0) {
        return; // Нет запланированных постов
      }

      console.log(`📅 Найдено ${scheduledPosts.length} запланированных постов для публикации`);

      for (const post of scheduledPosts) {
        try {
          console.log(`🚀 Публикация запланированного поста ${post.id} (запланировано на ${post.scheduled_at})`);
          
          // Публикуем пост асинхронно
          publishScheduledPost(post).then(result => {
            console.log(`✅ Запланированный пост ${post.id} опубликован:`, result);
          }).catch(error => {
            console.error(`❌ Ошибка в запланированном посте ${post.id}:`, error);
          });

        } catch (error) {
          console.error(`❌ Ошибка при публикации запланированного поста ${post.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка в планировщике постов:', error);
    }
  }

  /**
   * Проверить и запустить запланированные рассылки
   */
  async checkAndRunScheduledCampaigns() {
    try {
      const scheduledCampaigns = await getScheduledCampaigns();
      
      if (scheduledCampaigns.length === 0) {
        return; // Нет запланированных рассылок
      }

      console.log(`📅 Найдено ${scheduledCampaigns.length} запланированных рассылок для запуска`);

      for (const campaign of scheduledCampaigns) {
        try {
          console.log(`🚀 Запуск запланированной рассылки ${campaign.id} (запланировано на ${campaign.scheduled_at})`);
          
          // Получаем access_token сообщества
          const communityData = await pool.query(
            'SELECT access_token FROM user_communities WHERE community_id = $1',
            [campaign.community_id]
          );

          if (!communityData.rows || communityData.rows.length === 0) {
            console.error(`❌ Сообщество ${campaign.community_id} не найдено для рассылки ${campaign.id}`);
            await updateBroadcastCampaign(campaign.id, {
              status: 'failed'
            });
            continue;
          }

          const accessToken = communityData.rows[0].access_token;

          // Запускаем рассылку асинхронно
          sendBroadcastMessages(
            campaign.community_id,
            accessToken,
            campaign.message_text,
            campaign.id
          ).then(result => {
            console.log(`✅ Запланированная рассылка ${campaign.id} завершена:`, result);
          }).catch(error => {
            console.error(`❌ Ошибка в запланированной рассылке ${campaign.id}:`, error);
          });

        } catch (error) {
          console.error(`❌ Ошибка при запуске запланированной рассылки ${campaign.id}:`, error);
          await updateBroadcastCampaign(campaign.id, {
            status: 'failed'
          });
        }
      }
    } catch (error) {
      console.error('❌ Ошибка в планировщике рассылок:', error);
    }
  }
}

// Создаем единственный экземпляр планировщика
const scheduler = new BroadcastScheduler();

module.exports = scheduler;

