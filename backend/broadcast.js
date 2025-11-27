const axios = require('axios');
const {
  getActiveCommunityMembers,
  createBroadcastCampaign,
  updateBroadcastCampaign,
  addBroadcastLog,
  getBroadcastCampaign
} = require('./database');

/**
 * Массовая отправка сообщений от имени сообщества с дебаунсом 500мс
 * @param {number} communityId - ID сообщества
 * @param {string} accessToken - Access token сообщества
 * @param {string} messageText - Текст сообщения
 * @param {string} campaignId - ID кампании рассылки (опционально)
 * @returns {Promise<{sent: number, failed: number, total: number}>}
 */
const sendBroadcastMessages = async (communityId, accessToken, messageText, campaignIdParam = null) => {
  try {
    console.log(`📤 Начинаем рассылку для сообщества ${communityId}...`);
    
    // Создаем кампанию если не передана
    let campaign;
    let campaignId;
    if (campaignIdParam) {
      campaign = await getBroadcastCampaign(campaignIdParam);
      if (!campaign) {
        throw new Error('Кампания не найдена');
      }
      campaignId = campaignIdParam;
    } else {
      campaign = await createBroadcastCampaign(communityId, messageText);
      campaignId = campaign.id;
    }
    
    // Обновляем статус на "running"
    await updateBroadcastCampaign(campaignId, {
      status: 'running',
      started_at: new Date()
    });
    
    // Получаем список получателей из БД
    const recipients = await getActiveCommunityMembers(communityId);
    const totalRecipients = recipients.length;
    
    console.log(`📊 Всего получателей для рассылки: ${totalRecipients}`);
    
    if (totalRecipients === 0) {
      await updateBroadcastCampaign(campaignId, {
        status: 'failed'
      });
      throw new Error('Нет получателей для рассылки. Сначала выполните синхронизацию участников.');
    }
    
    // Обновляем total_recipients
    await updateBroadcastCampaign(campaignId, {
      total_recipients: totalRecipients
    });
    
    let sentCount = 0;
    let failedCount = 0;
    
    // Цикл по всем пользователям из БД с дебаунсом 500мс
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Генерируем случайный ID для сообщения (требование VK API)
        const randomId = Math.floor(Math.random() * 2147483647);
        
        // Отправляем сообщение от имени сообщества
        const response = await axios.post('https://api.vk.com/method/messages.send', null, {
          params: {
            access_token: accessToken,
            v: '5.199',
            user_id: recipient.vk_user_id,
            random_id: randomId,
            message: messageText
          }
        });
        
        if (response.data.response) {
          sentCount++;
          await addBroadcastLog(campaignId, recipient.vk_user_id, 'sent');
          
          // Обновляем счетчики каждые 10 сообщений
          if (sentCount % 10 === 0) {
            await updateBroadcastCampaign(campaignId, {
              sent_count: sentCount,
              failed_count: failedCount
            });
            console.log(`📊 Прогресс: ${sentCount}/${totalRecipients} отправлено`);
          }
        } else if (response.data.error) {
          failedCount++;
          const errorMsg = response.data.error.error_msg || 'Unknown error';
          await addBroadcastLog(campaignId, recipient.vk_user_id, 'failed', errorMsg);
          console.error(`❌ Ошибка отправки пользователю ${recipient.vk_user_id}: ${errorMsg}`);
        }
      } catch (error) {
        failedCount++;
        const errorMsg = error.response?.data?.error?.error_msg || error.message;
        await addBroadcastLog(campaignId, recipient.vk_user_id, 'failed', errorMsg);
        console.error(`❌ Ошибка отправки пользователю ${recipient.vk_user_id}: ${errorMsg}`);
      }
      
      // ⚠️ ВАЖНО: Дебаунс 500мс между отправками
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Финальное обновление статуса
    await updateBroadcastCampaign(campaignId, {
      status: 'completed',
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date()
    });
    
    console.log(`✅ Рассылка завершена: ${sentCount} отправлено, ${failedCount} ошибок из ${totalRecipients}`);
    
    return { 
      sent: sentCount, 
      failed: failedCount, 
      total: totalRecipients,
      campaignId: campaignId
    };
  } catch (error) {
    console.error('❌ Критическая ошибка рассылки:', error);
    if (campaignId) {
      await updateBroadcastCampaign(campaignId, {
        status: 'failed'
      });
    }
    throw error;
  }
};

module.exports = {
  sendBroadcastMessages
};

