const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: './config.env' });

const { pool, createTable, testConnection } = require('./database');

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
    console.log('💭 Новый комментарий VK:', {
      from: commentData.from_id,
      text: commentData.text,
      post_id: commentData.post_id
    });
    
    const query = `
      INSERT INTO vk_messages (
        vk_message_id, vk_user_id, user_name, message_text, 
        message_type, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (vk_message_id) DO NOTHING
      RETURNING *
    `;
    
    const values = [
      commentData.id,
      commentData.from_id,
      'VK User ' + commentData.from_id,
      commentData.text || '',
      'wall_comment',
      commentData.date
    ];
    
    const result = await pool.query(query, values);
    if (result.rows.length > 0) {
      console.log('✅ Комментарий VK сохранен в БД');
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения VK комментария:', error);
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
    const result = await pool.query(
      'SELECT * FROM vk_messages ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Ошибка при получении VK сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении VK сообщений'
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
      'GET /api/vk/likes': 'Получить статистику лайков постов'
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
