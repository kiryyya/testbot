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

// Обработка корневого маршрута
app.get('/', (req, res) => {
  res.json({
    message: 'API сервер для проекта с формами',
    version: '1.0.0',
    endpoints: {
      'GET /api/data': 'Получить все записи',
      'GET /api/data/:id': 'Получить запись по ID',
      'POST /api/data': 'Создать новую запись',
      'PUT /api/data/:id': 'Обновить запись',
      'DELETE /api/data/:id': 'Удалить запись'
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
