import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './CommunitySettings.css';

interface CommunitySettingsProps {
  communityId: number;
}

interface Settings {
  autoReplyEnabled: boolean;
  autoReplyText: string;
  gameEnabled: boolean;
  defaultAttempts: number;
  defaultLives: number;
  vkAccessToken?: string;
}

const CommunitySettings: React.FC<CommunitySettingsProps> = ({ communityId }) => {
  const [settings, setSettings] = useState<Settings>({
    autoReplyEnabled: true,
    autoReplyText: 'удачно',
    gameEnabled: true,
    defaultAttempts: 5,
    defaultLives: 100,
    vkAccessToken: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Показать уведомление
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Загрузить настройки
  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/communities/${communityId}/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const communitySettings = data.data;
          setSettings({
            autoReplyEnabled: Boolean(communitySettings.auto_reply_enabled),
            autoReplyText: communitySettings.auto_reply_text || '',
            gameEnabled: Boolean(communitySettings.game_enabled),
            defaultAttempts: Number(communitySettings.default_attempts) || 5,
            defaultLives: Number(communitySettings.default_lives) || 100,
            vkAccessToken: communitySettings.vk_access_token || ''
          });
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  // Сохранить настройки
  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/communities/${communityId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Настройки успешно сохранены!', 'success');
      } else {
        showNotification(data.message || 'Ошибка сохранения настроек', 'error');
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      showNotification('Ошибка подключения к серверу', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Переключить автоответы
  const toggleAutoReply = async () => {
    const newValue = !settings.autoReplyEnabled;
    setSettings({ ...settings, autoReplyEnabled: newValue });
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/communities/${communityId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...settings, autoReplyEnabled: newValue }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification(
          `Автоответы ${newValue ? 'включены' : 'отключены'}!`, 
          'success'
        );
      } else {
        setSettings(settings); // Откатываем
        showNotification(data.message || 'Ошибка сохранения настроек', 'error');
      }
    } catch (error) {
      setSettings(settings); // Откатываем
      console.error('Ошибка сохранения настроек:', error);
      showNotification('Ошибка подключения к серверу', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [communityId]);

  return (
    <div className="community-settings-container">
      {/* <h2>Автоответы VK</h2> */}
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="settings-card">
        <h3>Автоответы на комментарии</h3>
        <p className="settings-description">
          Автоматически отвечать на комментарии в постах
        </p>

        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.autoReplyEnabled}
              onChange={toggleAutoReply}
              disabled={loading}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-status">
            {settings.autoReplyEnabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}
          </span>
        </div>
      </div>

      {/* <div className="settings-card">
        <h3>Текст автоответа</h3>
        <p className="settings-description">
          К комментарию пользователя будет добавлен этот текст
        </p>

        <div className="input-group">
          <input
            type="text"
            value={settings.autoReplyText}
            onChange={(e) => setSettings({ ...settings, autoReplyText: e.target.value })}
            placeholder="удачно"
            className="text-input"
          />
          <button
            onClick={saveSettings}
            disabled={loading}
            className="save-button"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div> */}

      {/* <div className="settings-info">
        <p><strong>Совет:</strong> Укажите ключевое слово, при наличии которого в комментарии бот будет генерировать ответ через GPT.</p>
      </div> */}
    </div>
  );
};

export default CommunitySettings;

