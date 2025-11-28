const axios = require('axios');
const { updateScheduledPost, setPostGameSettings, createBroadcastCampaign } = require('./database');
const { sendBroadcastMessages } = require('./broadcast');

/**
 * Публикация поста в VK сообществе
 * @param {number} communityId - ID сообщества
 * @param {string} accessToken - Access token сообщества
 * @param {string} postText - Текст поста
 * @param {string} attachments - JSON строка с вложениями (опционально)
 * @param {number} publishDate - Unix timestamp для отложенной публикации (опционально)
 * @returns {Promise<{postId: string}>}
 */
const publishPost = async (communityId, accessToken, postText, attachments = null, publishDate = null) => {
  try {
    console.log(`📝 Публикация поста в сообществе ${communityId}...`);
    
    const params = {
      access_token: accessToken,
      v: '5.199',
      owner_id: `-${communityId}`, // Отрицательный ID для сообществ
      message: postText
    };

    // Если указана дата публикации в будущем, добавляем publish_date
    // VK API требует publish_date в формате Unix timestamp
    if (publishDate && publishDate > new Date()) {
      params.publish_date = Math.floor(publishDate.getTime() / 1000);
      console.log(`📅 Пост будет опубликован: ${publishDate.toLocaleString('ru-RU')} (Unix: ${params.publish_date})`);
    }

    // Если есть вложения, добавляем их
    if (attachments) {
      try {
        const attachmentsData = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
        if (Array.isArray(attachmentsData) && attachmentsData.length > 0) {
          params.attachments = attachmentsData.join(',');
        }
      } catch (error) {
        console.warn('⚠️ Ошибка парсинга вложений:', error);
      }
    }

    const response = await axios.post('https://api.vk.com/method/wall.post', null, { params });

    if (response.data.error) {
      throw new Error(`VK API Error: ${response.data.error.error_msg} (код: ${response.data.error.error_code})`);
    }

    const postId = response.data.response.post_id;
    const fullPostId = `${communityId}_${postId}`;

    console.log(`✅ Пост опубликован: ${fullPostId}`);
    
    return { postId: fullPostId, vkPostId: postId };
  } catch (error) {
    console.error('❌ Ошибка публикации поста:', error);
    throw error;
  }
};

/**
 * Публикация запланированного поста и настройка игры
 */
const publishScheduledPost = async (scheduledPost) => {
  try {
    console.log(`🚀 Публикация запланированного поста ${scheduledPost.id}...`);

    // Получаем access_token сообщества
    const { pool } = require('./database');
    const communityData = await pool.query(
      'SELECT access_token FROM user_communities WHERE community_id = $1',
      [scheduledPost.community_id]
    );

    if (!communityData.rows || communityData.rows.length === 0) {
      throw new Error(`Сообщество ${scheduledPost.community_id} не найдено`);
    }

    const accessToken = communityData.rows[0].access_token;

    // Публикуем пост (если время уже наступило, публикуем сразу, иначе используем publish_date)
    const scheduledDate = new Date(scheduledPost.scheduled_at);
    const now = new Date();
    
    // Если время уже прошло, публикуем сразу
    // Если время в будущем, используем publish_date для отложенной публикации VK
    const publishDate = scheduledDate > now ? scheduledDate : null;
    
    const result = await publishPost(
      scheduledPost.community_id,
      accessToken,
      scheduledPost.post_text,
      scheduledPost.attachments,
      publishDate
    );

    // Обновляем статус поста
    await updateScheduledPost(scheduledPost.id, {
      status: 'published',
      vk_post_id: result.postId,
      published_at: new Date()
    });

    // Если игра включена, настраиваем её для поста
    if (scheduledPost.game_enabled) {
      console.log(`🎮 Настройка игры для поста ${result.postId}...`);
      await setPostGameSettings(
        result.postId,
        scheduledPost.game_enabled,
        scheduledPost.attempts_per_player,
        scheduledPost.lives_per_player,
        scheduledPost.prize_keyword,
        scheduledPost.promo_codes || []
      );
      console.log(`✅ Игра настроена для поста ${result.postId}`);
    }

    // Если рассылка включена, создаем и запускаем её
    if (scheduledPost.broadcast_enabled && scheduledPost.broadcast_message_text) {
      console.log(`📢 Создание рассылки для поста ${scheduledPost.id}...`);
      
      let broadcastScheduledAt = null;
      let shouldStartImmediately = false;
      
      // Если указана задержка в минутах, вычисляем время относительно публикации поста
      if (scheduledPost.broadcast_delay_minutes !== null && scheduledPost.broadcast_delay_minutes !== undefined) {
        if (scheduledPost.broadcast_delay_minutes === 0) {
          // Задержка 0 - отправляем сразу
          broadcastScheduledAt = new Date();
          shouldStartImmediately = true;
          console.log(`⏰ Рассылка будет отправлена сразу`);
        } else {
          // Вычисляем время через N минут после публикации
          const publishTime = new Date();
          publishTime.setMinutes(publishTime.getMinutes() + scheduledPost.broadcast_delay_minutes);
          broadcastScheduledAt = publishTime;
          console.log(`⏰ Рассылка запланирована через ${scheduledPost.broadcast_delay_minutes} минут после публикации: ${broadcastScheduledAt.toLocaleString('ru-RU')}`);
        }
      } else if (scheduledPost.broadcast_scheduled_at) {
        // Если указано конкретное время
        broadcastScheduledAt = new Date(scheduledPost.broadcast_scheduled_at);
        const now = new Date();
        if (broadcastScheduledAt <= now) {
          // Время уже прошло, отправляем сразу
          shouldStartImmediately = true;
          broadcastScheduledAt = now;
          console.log(`⏰ Время рассылки уже прошло, отправляем сразу`);
        } else {
          console.log(`⏰ Рассылка запланирована на: ${broadcastScheduledAt.toLocaleString('ru-RU')}`);
        }
      } else {
        // Если не указано время, отправляем сразу
        broadcastScheduledAt = new Date();
        shouldStartImmediately = true;
        console.log(`⏰ Рассылка будет отправлена сразу`);
      }
      
      // Создаем рассылку
      const broadcastCampaign = await createBroadcastCampaign(
        scheduledPost.community_id,
        scheduledPost.broadcast_message_text,
        shouldStartImmediately ? null : broadcastScheduledAt // Если сразу, то null (не запланировано)
      );
      
      console.log(`✅ Рассылка создана: ${broadcastCampaign.id}`);
      
      // Если нужно запустить сразу
      if (shouldStartImmediately) {
        console.log(`🚀 Запуск рассылки сразу...`);
        const { pool } = require('./database');
        const communityData = await pool.query(
          'SELECT access_token FROM user_communities WHERE community_id = $1',
          [scheduledPost.community_id]
        );
        
        if (communityData.rows && communityData.rows.length > 0) {
          const accessToken = communityData.rows[0].access_token;
          // Запускаем рассылку асинхронно, не блокируя публикацию поста
          sendBroadcastMessages(
            scheduledPost.community_id,
            accessToken,
            scheduledPost.broadcast_message_text,
            broadcastCampaign.id
          ).then(result => {
            console.log(`✅ Рассылка завершена:`, result);
          }).catch(error => {
            console.error(`❌ Ошибка в рассылке:`, error);
          });
        }
      }
    }

    console.log(`✅ Запланированный пост ${scheduledPost.id} успешно опубликован`);
    
    return result;
  } catch (error) {
    console.error(`❌ Ошибка публикации запланированного поста ${scheduledPost.id}:`, error);
    
    // Обновляем статус на ошибку
    await updateScheduledPost(scheduledPost.id, {
      status: 'failed',
      error_message: error.message
    });
    
    throw error;
  }
};

module.exports = {
  publishPost,
  publishScheduledPost
};

