// Тестирование игровой системы
const { 
  findOrCreateVkPlayer,
  createVkEvent,
  updatePlayerStats,
  calculateDamage,
  checkVictoryConditions,
  testConnection,
  createTable
} = require('./database');

// Функция для тестирования игровой механики
const testGameSystem = async () => {
  console.log('🧪 Начинаем тестирование игровой системы...\n');

  try {
    // 1. Проверка подключения к БД
    console.log('1️⃣ Тестируем подключение к базе данных...');
    await testConnection();
    await createTable();
    console.log('✅ База данных готова\n');

    // 2. Тестируем функцию урона
    console.log('2️⃣ Тестируем расчет урона...');
    for (let i = 0; i < 5; i++) {
      const damage = calculateDamage();
      console.log(`   Урон ${i + 1}: ${damage} жизней`);
    }
    console.log('✅ Функция урона работает (фиксированный урон 20 жизней)\n');

    // 3. Создаем тестового игрока
    console.log('3️⃣ Создаем тестового игрока...');
    const testVkUserId = 999999999; // Тестовый ID
    const player = await findOrCreateVkPlayer(testVkUserId, 'Test Player', null);
    console.log('✅ Тестовый игрок создан:', {
      id: player.id,
      vk_user_id: player.vk_user_id,
      attempts_left: player.attempts_left,
      lives_count: player.lives_count,
      total_score: player.total_score
    });
    console.log('');

    // 4. Симулируем игровой процесс (ровно 5 попыток)
    console.log('4️⃣ Симулируем игровой процесс...');
    let currentPlayer = player;
    let commentId = 1000000;

    for (let turn = 1; turn <= 5; turn++) {
      console.log(`\n--- ХОД ${turn} ---`);
      
      // Рассчитываем урон (фиксированный 20 жизней)
      const damage = calculateDamage();
      console.log(`🎯 Урон за попытку: ${damage} жизней`);

      // Создаем событие
      const eventData = {
        vkMessageId: commentId++,
        vkUserId: testVkUserId,
        playerId: currentPlayer.id,
        postId: 12345,
        eventType: 'wall_comment',
        messageText: `Тестовый комментарий ${turn}`,
        scoreEarned: 1,
        attemptsUsed: 1,
        livesUsed: damage,
        timestamp: Math.floor(Date.now() / 1000)
      };

      await createVkEvent(eventData);
      console.log('📝 Событие создано');

      // Обновляем статистику игрока
      currentPlayer = await updatePlayerStats(currentPlayer.id, 1, damage, 1);
      console.log('📊 Статистика обновлена:', {
        attempts_left: currentPlayer.attempts_left,
        lives_count: currentPlayer.lives_count,
        total_score: currentPlayer.total_score
      });

      // Проверяем условия победы
      const isVictory = checkVictoryConditions(currentPlayer);
      if (isVictory) {
        console.log('🎉🏆 ПОБЕДА! Игрок выполнил все условия на 5-й попытке!');
        console.log('🎁 Игрок может написать "Приз" в личные сообщения для получения купона!');
        break;
      }
    }

    console.log('\n5️⃣ Финальное состояние игрока:');
    console.log({
      vk_user_id: currentPlayer.vk_user_id,
      attempts_left: currentPlayer.attempts_left,
      lives_count: currentPlayer.lives_count,
      total_score: currentPlayer.total_score,
      is_victory: checkVictoryConditions(currentPlayer)
    });

    console.log('\n✅ Тестирование завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
};

// Запускаем тест, если файл выполняется напрямую
if (require.main === module) {
  testGameSystem().then(() => {
    console.log('\n🎮 Тестирование игровой системы завершено');
    process.exit(0);
  });
}

module.exports = { testGameSystem };
