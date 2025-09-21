const OpenAI = require('openai');
require('dotenv').config({ path: './config.env' });

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Функция для генерации текста ответа через GPT (копия из server.js)
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

// Тестовые сценарии
const testScenarios = [
  {
    name: "Обычная игра - много жизней и попыток",
    originalText: "Отличный пост!",
    playerData: {
      attempts_left: 4,
      lives_count: 80,
      total_score: 15
    },
    isVictory: false,
    livesLost: 20,
    attemptsFinished: false
  },
  {
    name: "Мало попыток",
    originalText: "Попробую еще раз!",
    playerData: {
      attempts_left: 1,
      lives_count: 60,
      total_score: 25
    },
    isVictory: false,
    livesLost: 20,
    attemptsFinished: false
  },
  {
    name: "Мало жизней",
    originalText: "Ой, кажется я умираю!",
    playerData: {
      attempts_left: 3,
      lives_count: 15,
      total_score: 35
    },
    isVictory: false,
    livesLost: 20,
    attemptsFinished: false
  },
  {
    name: "ПОБЕДА!",
    originalText: "Финальный ход!",
    playerData: {
      attempts_left: 0,
      lives_count: 0,
      total_score: 50
    },
    isVictory: true,
    livesLost: 20,
    attemptsFinished: false
  },
  {
    name: "Попытки закончились",
    originalText: "Еще один комментарий...",
    playerData: {
      attempts_left: 0,
      lives_count: 40,
      total_score: 30
    },
    isVictory: false,
    livesLost: 0,
    attemptsFinished: true
  }
];

// Функция для тестирования
const runTests = async () => {
  console.log('🧪 === ТЕСТИРОВАНИЕ УНИКАЛЬНОЙ ГЕНЕРАЦИИ GPT ===\n');
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 Тест ${i + 1}: ${scenario.name}`);
    console.log('─'.repeat(50));
    console.log(`Комментарий: "${scenario.originalText}"`);
    console.log(`Статистика: ${scenario.playerData ? 
      `Попытки: ${scenario.playerData.attempts_left}, Жизни: ${scenario.playerData.lives_count}, Очки: ${scenario.playerData.total_score}` : 
      'Нет данных игрока'
    }`);
    console.log(`Урон: ${scenario.livesLost}, Победа: ${scenario.isVictory}, Попытки закончились: ${scenario.attemptsFinished}`);
    console.log('\n🤖 Сгенерированный ответ:');
    
    try {
      const response = await generateReplyText(
        scenario.originalText,
        scenario.playerData,
        scenario.isVictory,
        scenario.livesLost,
        scenario.attemptsFinished
      );
      
      console.log(`"${response}"`);
      console.log(`\n✅ Длина ответа: ${response.length} символов`);
      
    } catch (error) {
      console.error(`❌ Ошибка в тесте ${i + 1}:`, error.message);
    }
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Тестирование завершено!');
};

// Запуск тестов
runTests().catch(console.error);
