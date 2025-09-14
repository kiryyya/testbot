const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config({ path: './config.env' });

const { 
  pool, 
  createTable, 
  testConnection,
  findOrCreateVkPlayer,
  createVkEvent,
  updatePlayerStats,
  getTopPlayers,
  getPlayerEvents,
  calculateRandomDamage,
  checkVictoryConditions
} = require('./database');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Инициализация базы данных при запуске сервера
const initializeDatabase = async () => {
  await testConnection();
  await createTable();
};

// API маршруты

// Получить все записи
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_data ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных из базы'
    });
  }
});

// Получить запись по ID
app.get('/api/data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_data WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Запись не найдена'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при получении записи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении записи'
    });
  }
});

// Создать новую запись
app.post('/api/data', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    
    // Валидация обязательных полей
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Имя и email обязательны для заполнения'
      });
    }
    
    const query = `
      INSERT INTO user_data (name, email, phone, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [name, email, phone || null, message || null];
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      message: 'Данные успешно сохранены',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при создании записи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при сохранении данных'
    });
  }
});

// Обновить запись
app.put('/api/data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, message } = req.body;
    
    const query = `
      UPDATE user_data 
      SET name = $1, email = $2, phone = $3, message = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    
    const values = [name, email, phone, message, id];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Запись не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Данные успешно обновлены',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при обновлении записи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении данных'
    });
  }
});

// Удалить запись
app.delete('/api/data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM user_data WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Запись не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Запись успешно удалена',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при удалении записи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении записи'
    });
  }
});

// VK Callback API маршруты

// Обработчик VK Callback API
app.post('/vk/callback', async (req, res) => {
  try {
    const { type, object, secret } = req.body;
    
    console.log('📥 VK Callback получен:', { 
      type, 
      object: object ? 'есть данные' : 'нет данных',
      headers: req.headers,
      body: req.body
    });
    
    // Проверка секретного ключа (временно отключена для настройки)
    // if (process.env.VK_SECRET_KEY && process.env.VK_SECRET_KEY !== 'your_secret_key' && secret !== process.env.VK_SECRET_KEY) {
    //   console.log('❌ Неверный секретный ключ VK');
    //   return res.status(403).send('Forbidden');
    // }
    console.log('🔑 Секретный ключ в запросе:', secret);
    
    // Обработка подтверждения сервера
    if (type === 'confirmation') {
      console.log('🔐 Запрос подтверждения VK сервера');
      return res.send(process.env.VK_CONFIRMATION_CODE || 'your_confirmation_code');
    }
    
    // Обработка входящих сообщений
    if (type === 'message_new') {
      await handleNewMessage(object.message);
    }
    
    // Обработка комментариев к постам
    if (type === 'wall_reply_new') {
      console.log('🔄 Получен wall_reply_new, обрабатываем комментарий...');
      await handleWallComment(object);
    }
    
    // Обработка лайков на посты
    if (type === 'wall_like_new') {
      await handleWallLike(object);
    }
    
    // Обработка добавления лайка (реальное VK событие)
    if (type === 'like_add') {
      await handleLikeAdd(object);
    }
    
    // Обработка удаления лайка (реальное VK событие)
    if (type === 'like_remove') {
      await handleLikeRemove(object);
    }
    
    // Обязательный ответ "ok" для VK
    res.send('ok');
  } catch (error) {
    console.error('❌ Ошибка в VK Callback:', error);
    res.send('ok'); // Все равно отвечаем "ok" чтобы VK не отключил webhook
  }
});

// Функция обработки новых сообщений
const handleNewMessage = async (message) => {
  try {
    console.log('💬 Новое сообщение VK:', {
      from: message.from_id,
      text: message.text,
      date: message.date
    });
    
    // Сохраняем сообщение в базу данных
    const query = `
      INSERT INTO vk_messages (
        vk_message_id, vk_user_id, user_name, message_text, 
        message_type, peer_id, conversation_message_id, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (vk_message_id) DO NOTHING
      RETURNING *
    `;
    
    const values = [
      message.id,
      message.from_id,
      'VK User ' + message.from_id, // Позже можно получить реальное имя через VK API
      message.text || '',
      'message',
      message.peer_id,
      message.conversation_message_id,
      message.date
    ];
    
    const result = await pool.query(query, values);
    if (result.rows.length > 0) {
      console.log('✅ Сообщение VK сохранено в БД');
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения VK сообщения:', error);
  }
};

// Функция обработки комментариев к постам
const handleWallComment = async (commentData) => {
  try {
    console.log('💭 Обработка комментария VK:', {
      comment_id: commentData.id,
      from: commentData.from_id,
      text: commentData.text,
      post_id: commentData.post_id,
      timestamp: commentData.date
    });
    
    // Проверяем, не наш ли это бот (не отвечаем на собственные комментарии)
    const groupId = process.env.VK_GROUP_ID;
    if (groupId && commentData.from_id === -parseInt(groupId)) {
      console.log('🤖 Пропускаем собственный комментарий бота');
      return;
    }
    
    // 1. Найти или создать игрока
    const player = await findOrCreateVkPlayer(
      commentData.from_id,
      `VK User ${commentData.from_id}`,
      null
    );
    
    console.log('🎮 Текущий игрок:', {
      id: player.id,
      vk_user_id: player.vk_user_id,
      attempts_left: player.attempts_left,
      lives_count: player.lives_count,
      total_score: player.total_score
    });
    
    // 2. Проверяем, есть ли у игрока попытки
    if (player.attempts_left <= 0) {
      console.log('🚫 У игрока закончились попытки, отправляем уведомление');
      
      // Отправляем сообщение о том, что попытки закончились
      await replyToComment(commentData, player, false, 0, true); // true = attempts_finished
      return;
    }
    
    // 3. Рассчитать случайный урон жизней
    const livesToLose = calculateRandomDamage();
    console.log(`🎲 Рассчитан урон: ${livesToLose} жизней`);
    
    // 4. Создать событие комментария (с защитой от дублей)
    const eventData = {
      vkMessageId: commentData.id,
      vkUserId: commentData.from_id,
      playerId: player.id,
      postId: commentData.post_id,
      eventType: 'wall_comment',
      messageText: commentData.text || '',
      scoreEarned: 1, // Базовый счет за комментарий
      attemptsUsed: 1, // Использована одна попытка
      livesUsed: livesToLose, // Случайный урон жизней
      timestamp: commentData.date
    };
    
    const event = await createVkEvent(eventData);
    
    if (event) {
      console.log('📝 Новое событие создано:', event.id);
      
      // 5. Обновить статистику игрока
      const updatedPlayer = await updatePlayerStats(
        player.id,
        1, // попытки использованы
        livesToLose, // жизни использованы (случайный урон)
        1  // очки заработаны
      );
      
      if (updatedPlayer) {
        console.log('📊 Статистика обновлена:', {
          attempts_left: updatedPlayer.attempts_left,
          lives_count: updatedPlayer.lives_count,
          total_score: updatedPlayer.total_score,
          lives_lost_this_turn: livesToLose
        });
        
        // 6. Проверить условия победы
        const isVictory = checkVictoryConditions(updatedPlayer);
        
        // 7. Автоматически отвечаем на комментарий
        await replyToComment(commentData, updatedPlayer, isVictory, livesToLose, false); // false = attempts_finished
      }
    } else {
      console.log('⚠️ Событие уже существует, пропускаем обработку (защита от дублей)');
      // Не обрабатываем дубликаты - не отвечаем повторно
      return;
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки VK комментария:', error);
  }
};

// Функция для ответа на комментарий
const replyToComment = async (commentData, playerData = null, isVictory = false, livesLost = 0, attemptsFinished = false) => {
  try {
    console.log('📤 Начинаем отправку ответа на комментарий:', {
      comment_id: commentData.id,
      user_id: commentData.from_id,
      is_victory: isVictory,
      lives_lost: livesLost,
      attempts_finished: attemptsFinished
    });
    
    // Проверяем, включены ли автоответы
    const autoReplyEnabled = await getSetting('auto_reply_enabled');
    
    console.log('🔍 Проверка настроек автоответов:', {
      autoReplyEnabled,
      type: typeof autoReplyEnabled,
      isEnabled: autoReplyEnabled === true
    });
    
    if (autoReplyEnabled !== true) {
      console.log('🔇 Автоответы отключены, пропускаем ответ на комментарий. Значение:', autoReplyEnabled);
      return;
    }
    
    const accessToken = process.env.VK_ACCESS_TOKEN;
    const groupId = process.env.VK_GROUP_ID;
    
    console.log('🔑 Проверка VK токенов:', {
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken ? accessToken.length : 0,
      hasGroupId: !!groupId,
      groupId: groupId
    });
    
    if (!accessToken || accessToken === 'vk1.a.your_actual_access_token_here') {
      console.log('⚠️ VK Access Token не настроен');
      return;
    }
    
    if (!groupId || groupId === 'your_group_id') {
      console.log('⚠️ VK Group ID не настроен');
      return;
    }
    
    // Получаем текст автоответа из настроек
    const autoReplyText = await getSetting('auto_reply_text') || 'удачно';
    
    // Формируем текст ответа с игровой статистикой
    const originalText = commentData.text || '';
    let replyText;
    
    // Проверяем тип сообщения
    if (isVictory) {
      // Сообщение о победе
      replyText = `${originalText} ${autoReplyText}\n\n🎉🏆 ВЫ ПОБЕДИЛИ! 🏆🎉\n\nВы прошли все 5 попыток и потратили все жизни! Поздравляем с победой! 🎊`;
      
      if (playerData) {
        replyText += `\n\n📊 Финальная статистика:\n⭐ Итоговые очки: ${playerData.total_score}\n💀 Последний урон: -${livesLost} жизней`;
      }
    } else if (attemptsFinished) {
      // Сообщение о закончившихся попытках
      replyText = `${originalText} ${autoReplyText}\n\n🚫 ПОПЫТКИ ЗАКОНЧИЛИСЬ! 🚫\n\nУ вас больше нет попыток для игры.`;
      
      if (playerData) {
        replyText += `\n\n📊 Ваша статистика:\n🎮 Попытки: ${playerData.attempts_left} | 💜 Жизни: ${playerData.lives_count} | ⭐ Очки: ${playerData.total_score}`;
        
        if (playerData.lives_count > 0) {
          replyText += `\n\n💡 Жизни еще остались, но попытки кончились. Игра завершена.`;
        }
      }
    } else {
      // Обычный ответ с игровой статистикой
      replyText = `${originalText} ${autoReplyText}`;
      
      if (playerData) {
        const gameStats = `\n🎮 Попытки: ${playerData.attempts_left} | 💜 Жизни: ${playerData.lives_count} | ⭐ Очки: ${playerData.total_score}`;
        replyText += gameStats;
        
        // Показываем урон этого хода
        if (livesLost > 0) {
          replyText += `\n💥 Урон: -${livesLost} жизней`;
        }
        
        // Дополнительные сообщения в зависимости от статуса
        if (playerData.attempts_left <= 1) {
          replyText += '\n⚠️ Осталась последняя попытка!';
        } else if (playerData.attempts_left <= 2) {
          replyText += '\n🔥 Попыток мало, будь осторожнее!';
        }
        
        if (playerData.lives_count <= 20) {
          replyText += '\n💔 Жизней мало!';
        }
        
        if (playerData.lives_count <= 0) {
          replyText += '\n💀 Жизни закончились!';
        }
      }
    }
    
    const vkApiUrl = 'https://api.vk.com/method/wall.createComment';
    const params = {
      access_token: accessToken,
      v: '5.199',
      owner_id: `-${groupId}`, // Отрицательный ID для групп
      post_id: commentData.post_id,
      reply_to_comment: commentData.id,
      message: replyText
    };
    
    console.log('📤 Отправляем ответ на комментарий:', {
      post_id: commentData.post_id,
      reply_to: commentData.id,
      message: replyText,
      auto_reply_enabled: autoReplyEnabled,
      auto_reply_text: autoReplyText
    });
    
    const response = await axios.post(vkApiUrl, null, { params });
    
    if (response.data.response) {
      console.log('✅ Ответ на комментарий отправлен успешно');
      
      // Сохраняем наш ответ в БД
      const replyQuery = `
        INSERT INTO vk_messages (
          vk_message_id, vk_user_id, user_name, message_text, 
          message_type, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (vk_message_id) DO NOTHING
      `;
      
      const replyValues = [
        response.data.response.comment_id,
        -parseInt(groupId), // Отрицательный ID для группы
        'Наша группа',
        replyText,
        'our_reply',
        Math.floor(Date.now() / 1000)
      ];
      
      await pool.query(replyQuery, replyValues);
      console.log('✅ Наш ответ сохранен в БД');
      
    } else {
      console.error('❌ Ошибка API VK при отправке ответа:', response.data);
    }
  } catch (error) {
    console.error('❌ Ошибка при отправке ответа на комментарий:', error.message);
    if (error.response) {
      console.error('❌ Детали ошибки VK API:', error.response.data);
    }
  }
};

// Функция обработки лайков постов (legacy)
const handleWallLike = async (likeData) => {
  try {
    console.log('❤️ Новый лайк VK (legacy):', {
      liker_id: likeData.liker_id,
      post_id: likeData.post_id || likeData.object_id,
      object_type: likeData.object_type
    });

    const postId = likeData.post_id || likeData.object_id;
    
    // Обновляем счетчик лайков для поста
    const query = `
      INSERT INTO vk_post_likes (post_id, likes_count, last_liker_id, last_like_time, updated_at)
      VALUES ($1, 1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (post_id) 
      DO UPDATE SET 
        likes_count = vk_post_likes.likes_count + 1,
        last_liker_id = $2,
        last_like_time = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [postId, likeData.liker_id];
    const result = await pool.query(query, values);
    
    if (result.rows.length > 0) {
      const postStats = result.rows[0];
      console.log(`✅ Лайк сохранен! Пост ${postId} теперь имеет ${postStats.likes_count} лайков`);
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения VK лайка:', error);
  }
};

// Функция обработки добавления лайка (реальное VK событие)
const handleLikeAdd = async (likeData) => {
  try {
    console.log('❤️ Лайк добавлен VK:', {
      liker_id: likeData.liker_id,
      object_id: likeData.object_id,
      object_type: likeData.object_type,
      post_id: likeData.post_id
    });

    const postId = likeData.object_id; // В реальных VK событиях используется object_id
    
    // Увеличиваем счетчик лайков для поста
    const query = `
      INSERT INTO vk_post_likes (post_id, likes_count, last_liker_id, last_like_time, updated_at)
      VALUES ($1, 1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (post_id) 
      DO UPDATE SET 
        likes_count = vk_post_likes.likes_count + 1,
        last_liker_id = $2,
        last_like_time = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [postId, likeData.liker_id];
    const result = await pool.query(query, values);
    
    if (result.rows.length > 0) {
      const postStats = result.rows[0];
      console.log(`✅ Лайк добавлен! Пост ${postId} теперь имеет ${postStats.likes_count} лайков`);
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения добавления лайка:', error);
  }
};

// Функция обработки удаления лайка (реальное VK событие)
const handleLikeRemove = async (likeData) => {
  try {
    console.log('💔 Лайк удален VK:', {
      liker_id: likeData.liker_id,
      object_id: likeData.object_id,
      object_type: likeData.object_type,
      post_id: likeData.post_id
    });

    const postId = likeData.object_id;
    
    // Уменьшаем счетчик лайков для поста
    const query = `
      UPDATE vk_post_likes 
      SET 
        likes_count = GREATEST(likes_count - 1, 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE post_id = $1
      RETURNING *
    `;
    
    const values = [postId];
    const result = await pool.query(query, values);
    
    if (result.rows.length > 0) {
      const postStats = result.rows[0];
      console.log(`✅ Лайк удален! Пост ${postId} теперь имеет ${postStats.likes_count} лайков`);
    } else {
      console.log(`ℹ️ Пост ${postId} не найден в базе лайков`);
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения удаления лайка:', error);
  }
};

// API для получения VK сообщений
app.get('/api/vk/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Получаем события из новой таблицы с информацией об игроках
    const query = `
      SELECT 
        e.id,
        e.vk_message_id,
        e.vk_user_id,
        p.user_name,
        e.message_text,
        e.event_type as message_type,
        e.score_earned,
        e.attempts_used,
        e.lives_used,
        e.timestamp,
        e.created_at
      FROM vk_events e
      JOIN vk_players p ON e.player_id = p.id
      ORDER BY e.created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Ошибка при получении VK сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке сообщений',
      error: error.message
    });
  }
});

// API для получения статистики лайков
app.get('/api/vk/likes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vk_post_likes ORDER BY updated_at DESC'
    );
    
    // Подсчитываем общее количество лайков
    const totalLikes = result.rows.reduce((sum, post) => sum + post.likes_count, 0);
    
    res.json({
      success: true,
      data: result.rows,
      total_likes: totalLikes,
      posts_count: result.rows.length
    });
  } catch (error) {
    console.error('Ошибка при получении статистики лайков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики лайков'
    });
  }
});

// API для тестирования автоответов на комментарии
app.post('/api/test/comment', async (req, res) => {
  try {
    const { text, post_id, from_id } = req.body;
    
    // Создаем тестовый комментарий
    const testComment = {
      id: Math.floor(Math.random() * 1000000),
      text: text || 'Тестовый комментарий',
      post_id: post_id || 123,
      from_id: from_id || 123456789,
      date: Math.floor(Date.now() / 1000)
    };
    
    console.log('🧪 Тестируем обработку комментария:', testComment);
    
    // Обрабатываем комментарий
    await handleWallComment(testComment);
    
    res.json({
      success: true,
      message: 'Тестовый комментарий обработан',
      comment: testComment
    });
  } catch (error) {
    console.error('Ошибка тестирования комментария:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при тестировании комментария'
    });
  }
});

// API для игровой системы

// Получить топ игроков
app.get('/api/players/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topPlayers = await getTopPlayers(limit);
    
    res.json({
      success: true,
      data: topPlayers,
      count: topPlayers.length
    });
  } catch (error) {
    console.error('Ошибка получения топа игроков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении топа игроков'
    });
  }
});

// Получить данные конкретного игрока
app.get('/api/players/:vkUserId', async (req, res) => {
  try {
    const vkUserId = parseInt(req.params.vkUserId);
    
    const playerQuery = `
      SELECT * FROM vk_players 
      WHERE vk_user_id = $1
    `;
    const playerResult = await pool.query(playerQuery, [vkUserId]);
    
    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Игрок не найден'
      });
    }
    
    const player = playerResult.rows[0];
    const events = await getPlayerEvents(player.id, 20);
    
    res.json({
      success: true,
      data: {
        player,
        events
      }
    });
  } catch (error) {
    console.error('Ошибка получения данных игрока:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных игрока'
    });
  }
});

// Получить все события
app.get('/api/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const query = `
      SELECT 
        e.*,
        p.user_name,
        p.vk_user_id
      FROM vk_events e
      JOIN vk_players p ON e.player_id = p.id
      ORDER BY e.timestamp DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Ошибка получения событий:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении событий'
    });
  }
});

// Получить статистику игровой системы
app.get('/api/game/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_players,
        SUM(total_score) as total_score,
        AVG(total_score) as avg_score,
        MAX(total_score) as max_score,
        SUM(attempts_left) as total_attempts_left,
        SUM(lives_count) as total_lives
      FROM vk_players
      WHERE is_active = true
    `;
    
    const eventsStatsQuery = `
      SELECT 
        COUNT(*) as total_events,
        SUM(score_earned) as total_score_earned,
        SUM(attempts_used) as total_attempts_used,
        SUM(lives_used) as total_lives_used
      FROM vk_events
    `;
    
    const [statsResult, eventsStatsResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(eventsStatsQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        players: statsResult.rows[0],
        events: eventsStatsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики'
    });
  }
});

// Сбросить игрока (для тестирования)
app.post('/api/players/:vkUserId/reset', async (req, res) => {
  try {
    const vkUserId = parseInt(req.params.vkUserId);
    
    const resetQuery = `
      UPDATE vk_players 
      SET 
        attempts_left = 5,
        lives_count = 100,
        total_score = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE vk_user_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(resetQuery, [vkUserId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Игрок не найден'
      });
    }
    
    res.json({
      success: true,
      message: 'Игрок сброшен к начальным значениям',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка сброса игрока:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при сбросе игрока'
    });
  }
});

// Тестирование игровой системы
app.post('/api/game/test', async (req, res) => {
  try {
    const { testGameSystem } = require('./test-game-system');
    
    console.log('🧪 Запуск тестирования игровой системы...');
    await testGameSystem();
    
    res.json({
      success: true,
      message: 'Тестирование игровой системы завершено успешно. Проверьте логи сервера.'
    });
  } catch (error) {
    console.error('Ошибка тестирования:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при тестировании игровой системы',
      error: error.message
    });
  }
});

// API для управления настройками администратора

// Получить настройки
app.get('/api/admin/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value, setting_type FROM admin_settings');
    
    // Преобразуем результат в удобный формат
    const settings = {};
    result.rows.forEach(row => {
      let value = row.setting_value;
      
      // Конвертируем значения в правильный тип
      if (row.setting_type === 'boolean') {
        value = value === 'true';
      } else if (row.setting_type === 'number') {
        value = parseFloat(value);
      }
      
      // Конвертируем ключи в camelCase для фронтенда
      const key = row.setting_key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      settings[key] = value;
    });
    
    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('Ошибка при получении настроек:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении настроек'
    });
  }
});

// Сохранить настройки
app.post('/api/admin/settings', async (req, res) => {
  try {
    const { autoReplyEnabled, autoReplyText } = req.body;
    
    // Валидация
    if (typeof autoReplyEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'autoReplyEnabled должно быть boolean'
      });
    }
    
    if (typeof autoReplyText !== 'string' || autoReplyText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'autoReplyText должно быть непустой строкой'
      });
    }
    
    // Обновляем настройки в базе данных
    const updateEnabledQuery = `
      UPDATE admin_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE setting_key = 'auto_reply_enabled'
    `;
    
    const updateTextQuery = `
      UPDATE admin_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE setting_key = 'auto_reply_text'
    `;
    
    await pool.query(updateEnabledQuery, [autoReplyEnabled.toString()]);
    await pool.query(updateTextQuery, [autoReplyText.trim()]);
    
    console.log('⚙️ Настройки автоответов обновлены:', {
      autoReplyEnabled,
      autoReplyText: autoReplyText.trim()
    });
    
    res.json({
      success: true,
      message: 'Настройки успешно сохранены',
      settings: {
        autoReplyEnabled,
        autoReplyText: autoReplyText.trim()
      }
    });
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при сохранении настроек'
    });
  }
});

// Функция для получения настройки из базы данных
const getSetting = async (key) => {
  try {
    const result = await pool.query(
      'SELECT setting_value, setting_type FROM admin_settings WHERE setting_key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    let value = result.rows[0].setting_value;
    const type = result.rows[0].setting_type;
    
    // Конвертируем значение в правильный тип
    if (type === 'boolean') {
      value = value === 'true';
    } else if (type === 'number') {
      value = parseFloat(value);
    }
    
    return value;
  } catch (error) {
    console.error(`Ошибка получения настройки ${key}:`, error);
    return null;
  }
};

// Обработка корневого маршрута
app.get('/', (req, res) => {
  res.json({
    message: 'API сервер для проекта с формами + VK Callback API',
    version: '1.0.0',
    endpoints: {
      'GET /api/data': 'Получить все записи',
      'GET /api/data/:id': 'Получить запись по ID',
      'POST /api/data': 'Создать новую запись',
      'PUT /api/data/:id': 'Обновить запись',
      'DELETE /api/data/:id': 'Удалить запись',
      'POST /vk/callback': 'VK Callback API webhook',
      'GET /api/vk/messages': 'Получить VK сообщения',
      'GET /api/vk/likes': 'Получить статистику лайков постов',
      'GET /api/admin/settings': 'Получить настройки администратора',
      'POST /api/admin/settings': 'Сохранить настройки администратора',
      'POST /api/test/comment': 'Тестировать обработку комментария'
    }
  });
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступно по адресу: http://localhost:${PORT}`);
  
  // Инициализация базы данных
  await initializeDatabase();
});

// Обработка ошибок при завершении работы
process.on('SIGINT', async () => {
  console.log('\n🛑 Завершение работы сервера...');
  await pool.end();
  process.exit(0);
});
