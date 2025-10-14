import React, { useState, useEffect } from 'react';
import './GameSettingsPage.css';

interface GameSettings {
  gameEnabled: boolean;
  defaultAttempts: number;
  defaultLives: number;
  autoReplyEnabled: boolean;
  autoReplyText: string;
}

const GameSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings>({
    gameEnabled: true,
    defaultAttempts: 5,
    defaultLives: 100,
    autoReplyEnabled: true,
    autoReplyText: 'удачно'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Загружаем настройки при монтировании компонента
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          gameEnabled: data.settings?.game_enabled ?? true,
          defaultAttempts: parseInt(data.settings?.default_attempts) || 5,
          defaultLives: parseInt(data.settings?.default_lives) || 100,
          autoReplyEnabled: data.settings?.auto_reply_enabled ?? true,
          autoReplyText: data.settings?.auto_reply_text || 'удачно'
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Сохраняем настройки игры
      const gameResponse = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameEnabled: settings.gameEnabled,
          defaultAttempts: settings.defaultAttempts,
          defaultLives: settings.defaultLives
        }),
      });

      // Сохраняем настройки автоответов
      const autoReplyResponse = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoReplyEnabled: settings.autoReplyEnabled,
          autoReplyText: settings.autoReplyText
        }),
      });

      if (gameResponse.ok && autoReplyResponse.ok) {
        setMessage({ type: 'success', text: 'Настройки успешно сохранены!' });
      } else {
        setMessage({ type: 'error', text: 'Ошибка сохранения настроек' });
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof GameSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="game-settings-page">
      <div className="game-settings-header">
        <h1>Настройки игры</h1>
        <p>Управляйте параметрами игровой системы и автоответов</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="game-settings-content">
        {/* Основные настройки игры */}
        <div className="settings-section">
          <h2>Основные настройки игры</h2>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.gameEnabled}
                onChange={(e) => handleInputChange('gameEnabled', e.target.checked)}
              />
              <span className="setting-text">Включить игровую систему</span>
            </label>
            <p className="setting-description">
              Когда включено, пользователи могут играть в игру, комментируя посты
            </p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <span className="setting-text">Количество попыток по умолчанию:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.defaultAttempts}
                onChange={(e) => handleInputChange('defaultAttempts', parseInt(e.target.value))}
                disabled={!settings.gameEnabled}
              />
            </label>
            <p className="setting-description">
              Сколько попыток получает новый игрок (1-20)
            </p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <span className="setting-text">Количество жизней по умолчанию:</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.defaultLives}
                onChange={(e) => handleInputChange('defaultLives', parseInt(e.target.value))}
                disabled={!settings.gameEnabled}
              />
            </label>
            <p className="setting-description">
              Сколько жизней получает новый игрок (1-1000)
            </p>
          </div>
        </div>

        {/* Настройки автоответов */}
        <div className="settings-section">
          <h2>Настройки автоответов</h2>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.autoReplyEnabled}
                onChange={(e) => handleInputChange('autoReplyEnabled', e.target.checked)}
              />
              <span className="setting-text">Включить автоответы</span>
            </label>
            <p className="setting-description">
              Бот будет отвечать на комментарии пользователей
            </p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <span className="setting-text">Текст автоответа (захардкоженный):</span>
              <input
                type="text"
                value={settings.autoReplyText}
                onChange={(e) => handleInputChange('autoReplyText', e.target.value)}
                disabled={!settings.autoReplyEnabled}
                placeholder="Введите текст автоответа"
              />
            </label>
            <p className="setting-description">
              ВНИМАНИЕ: Этот текст больше не используется! Теперь ответы генерируются через GPT
            </p>
          </div>
        </div>

        {/* Информация о GPT */}
        <div className="settings-section">
          <h2>Генерация ответов через GPT</h2>
          <div className="info-box">
            <p><strong>Новая функция:</strong> Теперь все ответы бота генерируются автоматически через OpenAI GPT!</p>
            <ul>
              <li>Умные и контекстные ответы</li>
              <li>Адаптация под ситуацию (победа, поражение, обычная игра)</li>
              <li>Сохранение игровой статистики (жизни, попытки, очки)</li>
              <li>Автоматический fallback при недоступности GPT</li>
            </ul>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={loadSettings}
            disabled={loading}
          >
            Отменить изменения
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSettingsPage;
