const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const OpenAI = require('openai');
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
  calculateDamage,
  checkVictoryConditions,
  // Новые функции для игры по постам
  getPostGameSettings,
  setPostGameSettings,
  findOrCreatePostPlayer,
  createPostEvent,
  updatePostPlayerStats,
  getPostTopPlayers,
  getPostEvents
} = require('./database');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    
    // Проверяем, является ли сообщение запросом приза
    if (message.text && message.text.toLowerCase().trim() === 'приз') {
      console.log('🎁 Получен запрос на приз от пользователя:', message.from_id);
      await handlePrizeRequest(message.from_id);
      return;
    }
    
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

// Функция обработки запроса приза
const handlePrizeRequest = async (vkUserId) => {
  try {
    console.log('🎁 Обрабатываем запрос приза для пользователя:', vkUserId);
    
    // Проверяем, есть ли игрок в базе и победил ли он
    const playerQuery = `
      SELECT * FROM vk_players 
      WHERE vk_user_id = $1 AND attempts_left <= 0 AND lives_count <= 0
    `;
    
    const playerResult = await pool.query(playerQuery, [vkUserId]);
    
    if (playerResult.rows.length === 0) {
      console.log('❌ Пользователь не имеет права на приз:', vkUserId);
      await sendMessage(vkUserId, '❌ Извините, но вы еще не победили в игре! Завершите игру, чтобы получить приз.');
      return;
    }
    
    const player = playerResult.rows[0];
    console.log('✅ Пользователь имеет право на приз:', {
      vk_user_id: player.vk_user_id,
      total_score: player.total_score,
      attempts_left: player.attempts_left,
      lives_count: player.lives_count
    });
    
    // Отправляем купон
    await sendMessage(vkUserId, 'купон');
    
    console.log('🎉 Купон отправлен пользователю:', vkUserId);
    
  } catch (error) {
    console.error('❌ Ошибка при обработке запроса приза:', error);
  }
};

// Функция отправки сообщения пользователю
const sendMessage = async (vkUserId, messageText) => {
  try {
    const accessToken = process.env.VK_ACCESS_TOKEN;
    
    if (!accessToken || accessToken === 'vk1.a.your_actual_access_token_here') {
      console.log('⚠️ VK Access Token не настроен для отправки сообщений');
      return;
    }
    
    // Генерируем случайный ID для сообщения
    const randomId = Math.floor(Math.random() * 2147483647);
    
    const vkApiUrl = 'https://api.vk.com/method/messages.send';
    const params = {
      access_token: accessToken,
      v: '5.199',
      user_id: vkUserId,
      random_id: randomId,
      message: messageText
    };
    
    console.log('📤 Отправляем сообщение VK:', {
      user_id: vkUserId,
      message: messageText,
      random_id: randomId
    });
    
    const response = await axios.post(vkApiUrl, null, { params });
    
    if (response.data.response) {
      console.log('✅ Сообщение отправлено успешно:', response.data.response);
    } else if (response.data.error) {
      console.error('❌ Ошибка VK API при отправке сообщения:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Ошибка при отправке сообщения:', error.message);
    if (error.response) {
      console.error('❌ Детали ошибки VK API:', error.response.data);
    }
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
    
    // 1. Проверяем настройки игры для этого поста
    const postGameSettings = await getPostGameSettings(commentData.post_id);
    
    if (!postGameSettings || !postGameSettings.game_enabled) {
      console.log('🎮 Игра отключена для этого поста, отправляем обычный автоответ');
      // Отправляем обычный автоответ без игровой логики
      await replyToComment(commentData, null, false, 0, false);
      return;
    }
    
    console.log('🎮 Игра включена для поста:', {
      post_id: commentData.post_id,
      game_enabled: postGameSettings.game_enabled,
      attempts_per_player: postGameSettings.attempts_per_player,
      lives_per_player: postGameSettings.lives_per_player
    });
    
    // 2. Найти или создать игрока для этого поста
    const player = await findOrCreatePostPlayer(
      commentData.post_id,
      commentData.from_id,
      `VK User ${commentData.from_id}`,
      null
    );
    
    console.log('🎮 Текущий игрок поста:', {
      id: player.id,
      post_id: player.post_id,
      vk_user_id: player.vk_user_id,
      attempts_left: player.attempts_left,
      lives_count: player.lives_count,
      total_score: player.total_score
    });
    
    // 3. Проверяем, есть ли у игрока попытки для этого поста
    if (player.attempts_left <= 0) {
      console.log('🚫 У игрока закончились попытки для этого поста, отправляем уведомление');
      
      // Отправляем сообщение о том, что попытки закончились
      await replyToComment(commentData, player, false, 0, true); // true = attempts_finished
      return;
    }
    
      // 3. Рассчитать урон жизней (фиксированный 20 жизней за попытку)
      const livesToLose = calculateDamage();
    console.log(`🎲 Рассчитан урон: ${livesToLose} жизней`);
    
    // 4. Создать событие комментария для поста (с защитой от дублей)
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
    
    const event = await createPostEvent(eventData);
    
    if (event) {
      console.log('📝 Новое событие поста создано:', event.id);
      
      // 5. Обновить статистику игрока поста
      const updatedPlayer = await updatePostPlayerStats(
        player.id,
        1, // попытки использованы
        livesToLose, // жизни использованы (случайный урон)
        1  // очки заработаны
      );
      
      if (updatedPlayer) {
        console.log('📊 Статистика игрока поста обновлена:', {
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
      console.log('⚠️ Событие поста уже существует, пропускаем обработку (защита от дублей)');
      // Не обрабатываем дубликаты - не отвечаем повторно
      return;
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки VK комментария:', error);
  }
};

// Функция для генерации текста ответа через GPT
const generateReplyText = async (originalText, playerData = null, isVictory = false, livesLost = 0, attemptsFinished = false) => {
  try {
    console.log('🤖 Генерация текста ответа через GPT:', {
      originalText: originalText.substring(0, 100) + '...',
      isVictory,
      livesLost,
      attemptsFinished,
      hasPlayerData: !!playerData
    });

    // Формируем контекст для GPT
    let systemPrompt = `Ты - дружелюбный бот для игрового сообщества ВКонтакте. Твоя задача - генерировать уникальные, позитивные ответы на комментарии пользователей.

Правила:
- Отвечай на русском языке
- Будь дружелюбным и позитивным
- Используй эмодзи для выразительности
- ВСЕГДА включай игровую статистику в свой ответ
- Каждый ответ должен быть уникальным и креативным
- Адаптируй тон под контекст (победа, поражение, обычная игра)
- Используй разные формулировки и стили для каждого ответа`;

    let userPrompt = `Пользователь написал комментарий: "${originalText}"`;

    // Добавляем игровую статистику в промпт
    if (playerData) {
      userPrompt += `\n\nИгровая статистика пользователя:
- Попыток осталось: ${playerData.attempts_left}
- Жизней осталось: ${playerData.lives_count}
- Очков набрано: ${playerData.total_score}`;
      
      if (livesLost > 0) {
        userPrompt += `\n- Урон в этом ходу: -${livesLost} жизней`;
      }
    }

    if (isVictory) {
      userPrompt += `\n\n🎉 ПОБЕДА! Пользователь прошел игру! Поздравь его с победой и упомяни про приз.`;
    } else if (attemptsFinished) {
      userPrompt += `\n\n🚫 У пользователя закончились попытки. Поддержи его и объясни ситуацию.`;
    } else if (playerData) {
      if (playerData.lives_count <= 20) {
        userPrompt += `\n\n💔 У пользователя мало жизней! Поддержи его.`;
      } else if (playerData.attempts_left <= 2) {
        userPrompt += `\n\n🔥 У пользователя мало попыток! Поддержи его.`;
      } else {
        userPrompt += `\n\n🎮 Пользователь продолжает игру. Поддержи его.`;
      }
    }

    userPrompt += `\n\nСгенерируй уникальный ответ, который включает всю игровую статистику естественным образом. Будь креативным и используй разные стили!`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.9 // Увеличиваем температуру для большей креативности
    });

    const generatedText = completion.choices[0].message.content.trim();
    console.log('✅ GPT сгенерировал уникальный текст:', generatedText);
    
    return generatedText;

  } catch (error) {
    console.error('❌ Ошибка генерации текста через GPT:', error);
    // Fallback на дефолтный текст если GPT недоступен
    if (playerData) {
      return `Спасибо за комментарий! 🎮 Попытки: ${playerData.attempts_left} | 💜 Жизни: ${playerData.lives_count} | ⭐ Очки: ${playerData.total_score}`;
    }
    return 'Спасибо за комментарий!';
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
    
    // Генерируем текст ответа через GPT
    const originalText = commentData.text || '';
    const autoReplyText = await generateReplyText(originalText, playerData, isVictory, livesLost, attemptsFinished);
    
    // Формируем текст ответа с игровой статистикой
    let replyText;
    
    // Используем только GPT-сгенерированный текст (уже включает всю статистику)
    replyText = autoReplyText;
    
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

// Тестирование системы призов
app.post('/api/prize/test', async (req, res) => {
  try {
    const { vk_user_id = 123456789 } = req.body;
    
    console.log('🎁 Тестируем систему призов для пользователя:', vk_user_id);
    
    await handlePrizeRequest(vk_user_id);
    
    res.json({
      success: true,
      message: `Тест системы призов завершен для пользователя ${vk_user_id}. Проверьте логи сервера.`
    });
  } catch (error) {
    console.error('Ошибка тестирования системы призов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при тестировании системы призов',
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
    const { 
      autoReplyEnabled, 
      autoReplyText, 
      gameEnabled, 
      defaultAttempts, 
      defaultLives 
    } = req.body;
    
    // Валидация автоответов
    if (autoReplyEnabled !== undefined && typeof autoReplyEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'autoReplyEnabled должно быть boolean'
      });
    }
    
    if (autoReplyText !== undefined && (typeof autoReplyText !== 'string' || autoReplyText.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'autoReplyText должно быть непустой строкой'
      });
    }
    
    // Валидация настроек игры
    if (gameEnabled !== undefined && typeof gameEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'gameEnabled должно быть boolean'
      });
    }
    
    if (defaultAttempts !== undefined && (typeof defaultAttempts !== 'number' || defaultAttempts < 1 || defaultAttempts > 20)) {
      return res.status(400).json({
        success: false,
        message: 'defaultAttempts должно быть числом от 1 до 20'
      });
    }
    
    if (defaultLives !== undefined && (typeof defaultLives !== 'number' || defaultLives < 1 || defaultLives > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'defaultLives должно быть числом от 1 до 1000'
      });
    }
    
    // Обновляем настройки в базе данных
    const updates = [];
    
    if (autoReplyEnabled !== undefined) {
      updates.push({
        query: `UPDATE admin_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'auto_reply_enabled'`,
        params: [autoReplyEnabled.toString()]
      });
    }
    
    if (autoReplyText !== undefined) {
      updates.push({
        query: `UPDATE admin_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'auto_reply_text'`,
        params: [autoReplyText.trim()]
      });
    }
    
    if (gameEnabled !== undefined) {
      updates.push({
        query: `UPDATE admin_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'game_enabled'`,
        params: [gameEnabled.toString()]
      });
    }
    
    if (defaultAttempts !== undefined) {
      updates.push({
        query: `UPDATE admin_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'default_attempts'`,
        params: [defaultAttempts.toString()]
      });
    }
    
    if (defaultLives !== undefined) {
      updates.push({
        query: `UPDATE admin_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'default_lives'`,
        params: [defaultLives.toString()]
      });
    }
    
    // Выполняем все обновления
    for (const update of updates) {
      await pool.query(update.query, update.params);
    }
    
    console.log('⚙️ Настройки обновлены:', {
      autoReplyEnabled,
      autoReplyText: autoReplyText?.trim(),
      gameEnabled,
      defaultAttempts,
      defaultLives
    });
    
    res.json({
      success: true,
      message: 'Настройки успешно сохранены',
      settings: {
        autoReplyEnabled,
        autoReplyText: autoReplyText?.trim(),
        gameEnabled,
        defaultAttempts,
        defaultLives
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

// ===== API ЭНДПОИНТЫ ДЛЯ ИГРЫ ПО ПОСТАМ =====

// Получить настройки игры для поста
app.get('/api/posts/:postId/game', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const settings = await getPostGameSettings(postId);
    
    res.json({
      success: true,
      data: settings || {
        post_id: postId,
        game_enabled: false,
        attempts_per_player: 5,
        lives_per_player: 100
      }
    });
  } catch (error) {
    console.error('Ошибка при получении настроек игры поста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении настроек игры поста'
    });
  }
});

// Обновить настройки игры для поста
app.put('/api/posts/:postId/game', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const { game_enabled, attempts_per_player = 5, lives_per_player = 100 } = req.body;
    
    const settings = await setPostGameSettings(postId, game_enabled, attempts_per_player, lives_per_player);
    
    res.json({
      success: true,
      message: 'Настройки игры поста обновлены',
      data: settings
    });
  } catch (error) {
    console.error('Ошибка при обновлении настроек игры поста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении настроек игры поста'
    });
  }
});

// Получить все посты с игровыми настройками
app.get('/api/posts/game', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM post_game_settings 
      ORDER BY updated_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Ошибка при получении постов с играми:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении постов с играми'
    });
  }
});

// Получить игроков конкретного поста
app.get('/api/posts/:postId/players', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const limit = parseInt(req.query.limit) || 50;
    
    const players = await getPostTopPlayers(postId, limit);
    
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    console.error('Ошибка при получении игроков поста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении игроков поста'
    });
  }
});

// Получить события конкретного поста
app.get('/api/posts/:postId/events', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const limit = parseInt(req.query.limit) || 50;
    
    const events = await getPostEvents(postId, limit);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Ошибка при получении событий поста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении событий поста'
    });
  }
});

// Получить статистику поста
app.get('/api/posts/:postId/stats', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    
    // Статистика игроков поста
    const playersStatsQuery = `
      SELECT 
        COUNT(*) as total_players,
        SUM(total_score) as total_score,
        AVG(total_score) as avg_score,
        MAX(total_score) as max_score,
        SUM(attempts_left) as total_attempts_left,
        SUM(lives_count) as total_lives
      FROM post_players
      WHERE post_id = $1 AND is_active = true
    `;
    
    const eventsStatsQuery = `
      SELECT 
        COUNT(*) as total_events,
        SUM(score_earned) as total_score_earned,
        SUM(attempts_used) as total_attempts_used,
        SUM(lives_used) as total_lives_used
      FROM post_events
      WHERE post_id = $1
    `;
    
    const [playersResult, eventsResult] = await Promise.all([
      pool.query(playersStatsQuery, [postId]),
      pool.query(eventsStatsQuery, [postId])
    ]);
    
    res.json({
      success: true,
      data: {
        post_id: postId,
        players: playersResult.rows[0],
        events: eventsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении статистики поста:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики поста'
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
      'GET /api/admin/settings': 'Получить настройки администратора',
      'POST /api/admin/settings': 'Сохранить настройки администратора',
      'POST /api/test/comment': 'Тестировать обработку комментария',
      'GET /api/posts/:postId/game': 'Получить настройки игры поста',
      'PUT /api/posts/:postId/game': 'Обновить настройки игры поста',
      'GET /api/posts/game': 'Получить все посты с играми',
      'GET /api/posts/:postId/players': 'Получить игроков поста',
      'GET /api/posts/:postId/events': 'Получить события поста',
      'GET /api/posts/:postId/stats': 'Получить статистику поста'
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
