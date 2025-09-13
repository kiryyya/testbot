const { pool } = require('./database');
require('dotenv').config({ path: './config.env' });

// Функция для получения настройки из базы данных
const getSetting = async (key) => {
  try {
    const result = await pool.query(
      'SELECT setting_value, setting_type FROM admin_settings WHERE setting_key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ Настройка ${key} не найдена в БД`);
      return null;
    }
    
    let value = result.rows[0].setting_value;
    const type = result.rows[0].setting_type;
    
    console.log(`📋 Настройка ${key}: сырое значение="${value}", тип="${type}"`);
    
    // Конвертируем значение в правильный тип
    if (type === 'boolean') {
      value = value === 'true';
    } else if (type === 'number') {
      value = parseFloat(value);
    }
    
    console.log(`📋 Настройка ${key}: конвертированное значение=${value}, тип=${typeof value}`);
    
    return value;
  } catch (error) {
    console.error(`❌ Ошибка получения настройки ${key}:`, error);
    return null;
  }
};

// Функция для тестирования автоответов
const testAutoReply = async (commentData) => {
  try {
    console.log('\n🧪 === ТЕСТИРОВАНИЕ АВТООТВЕТОВ ===');
    console.log('📥 Входящий комментарий:', commentData);
    
    // Проверяем, включены ли автоответы
    const autoReplyEnabled = await getSetting('auto_reply_enabled');
    
    console.log('🔍 Проверка настроек автоответов:', {
      autoReplyEnabled,
      type: typeof autoReplyEnabled,
      isEnabled: autoReplyEnabled === true,
      isStrictTrue: autoReplyEnabled === true,
      isTruthy: !!autoReplyEnabled
    });
    
    if (autoReplyEnabled !== true) {
      console.log('🔇 Автоответы отключены, пропускаем ответ на комментарий. Значение:', autoReplyEnabled);
      return false;
    }
    
    // Получаем текст автоответа из настроек
    const autoReplyText = await getSetting('auto_reply_text') || 'удачно';
    
    console.log('📝 Текст автоответа:', autoReplyText);
    
    // Формируем текст ответа
    const originalText = commentData.text || '';
    const replyText = `${originalText} ${autoReplyText}`;
    
    console.log('✅ Сформированный ответ:', replyText);
    console.log('🚀 Автоответ должен быть отправлен!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании автоответов:', error);
    return false;
  }
};

// Запуск тестов
const runTests = async () => {
  try {
    console.log('🔌 Подключение к базе данных...');
    
    // Тестовый комментарий
    const testComment = {
      id: 12345,
      text: 'Тестовый комментарий',
      post_id: 123,
      from_id: 999,
      date: Math.floor(Date.now() / 1000)
    };
    
    // Проверяем текущие настройки в БД
    console.log('\n📊 === ПРОВЕРКА НАСТРОЕК В БД ===');
    const result = await pool.query('SELECT * FROM admin_settings ORDER BY setting_key');
    console.table(result.rows.map(row => ({
      key: row.setting_key,
      value: row.setting_value,
      type: row.setting_type
    })));
    
    // Тестируем автоответы
    await testAutoReply(testComment);
    
  } catch (error) {
    console.error('❌ Ошибка при запуске тестов:', error);
  } finally {
    await pool.end();
    console.log('\n🔚 Тестирование завершено');
  }
};

runTests();
