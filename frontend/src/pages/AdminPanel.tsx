import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './AdminPanel.css';

interface AdminSettings {
  autoReplyEnabled: boolean;
  autoReplyText: string;
}

const AdminPanel: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    autoReplyEnabled: true,
    autoReplyText: 'удачно'
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
      const response = await fetch('${API_BASE_URL}/admin/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
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
      const response = await fetch('${API_BASE_URL}/admin/settings', {
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
    const newSettings = { ...settings, autoReplyEnabled: !settings.autoReplyEnabled };
    setSettings(newSettings);
    
    // Автоматически сохраняем при переключении
    setLoading(true);
    try {
      const response = await fetch('${API_BASE_URL}/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      const data = await response.json();
      if (data.success) {
        showNotification(
          `Автоответы ${newSettings.autoReplyEnabled ? 'включены' : 'отключены'}!`, 
          'success'
        );
      } else {
        // Откатываем изменения при ошибке
        setSettings(settings);
        showNotification(data.message || 'Ошибка сохранения настроек', 'error');
      }
    } catch (error) {
      // Откатываем изменения при ошибке
      setSettings(settings);
      console.error('Ошибка сохранения настроек:', error);
      showNotification('Ошибка подключения к серверу', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем настройки при монтировании
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="admin-panel">
      {/* Уведомления */}
      {notification && (
        <div className={`admin-notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <div className="admin-header">
        <h1 className="admin-title">Администраторская панель</h1>
        <p className="admin-subtitle">Управление системой и мониторинг</p>
      </div>

      <div className="admin-content">
        <div className="admin-grid">
          {/* Управление автоответами */}
          <div className="admin-card">
            <div className="card-header">
              <h3 className="card-title">Автоответы VK</h3>
            </div>
            <div className="card-content">
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Автоответы на комментарии</label>
                  <p className="setting-description">
                    Автоматически отвечать на комментарии в постах
                  </p>
                </div>
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
                  <span className={`toggle-status ${settings.autoReplyEnabled ? 'enabled' : 'disabled'}`}>
                    {settings.autoReplyEnabled ? 'Включено' : 'Отключено'}
                  </span>
                </div>
              </div>

              <div className="setting-item">
                <label className="setting-label">Текст автоответа</label>
                <div className="input-group">
                  <input
                    type="text"
                    value={settings.autoReplyText}
                    onChange={(e) => setSettings({...settings, autoReplyText: e.target.value})}
                    placeholder="Введите текст для автоответа"
                    className="setting-input"
                    disabled={!settings.autoReplyEnabled}
                  />
                  <button 
                    onClick={saveSettings} 
                    disabled={loading || !settings.autoReplyEnabled}
                    className="save-btn"
                  >
                    {loading ? 'Загрузка...' : 'Сохранить'}
                  </button>
                </div>
                <p className="setting-description">
                  К комментарию пользователя будет добавлен этот текст
                </p>
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className="admin-card">
            <div className="card-header">
              <h3 className="card-title">Статистика</h3>
            </div>
            <div className="card-content">
              <div className="stat-item">
                <span className="stat-label">Пользователи:</span>
                <span className="stat-value">—</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Сообщения VK:</span>
                <span className="stat-value">—</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Активность:</span>
                <span className="stat-value">—</span>
              </div>
            </div>
          </div>

          {/* Быстрые действия */}
          <div className="admin-card">
            <div className="card-header">
              <h3 className="card-title">Быстрые действия</h3>
            </div>
            <div className="card-content">
              <button className="action-btn primary">
                Экспорт данных
              </button>
              <button className="action-btn secondary">
                Очистить кэш
              </button>
              <button className="action-btn secondary">
                Перезапуск сервисов
              </button>
            </div>
          </div>

          {/* Системная информация */}
          <div className="admin-card">
            <div className="card-header">
              <h3 className="card-title">Система</h3>
            </div>
            <div className="card-content">
              <div className="system-info">
                <div className="info-item">
                  <span className="info-label">Статус сервера:</span>
                  <span className="status-indicator online">Онлайн</span>
                </div>
                <div className="info-item">
                  <span className="info-label">База данных:</span>
                  <span className="status-indicator online">Подключена</span>
                </div>
                <div className="info-item">
                  <span className="info-label">VK API:</span>
                  <span className="status-indicator online">Активно</span>
                </div>
              </div>
            </div>
          </div>

          {/* Недавняя активность */}
          <div className="admin-card full-width">
            <div className="card-header">
              <h3 className="card-title">Недавняя активность</h3>
            </div>
            <div className="card-content">
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-time">Только что</span>
                  <span className="activity-text">Система запущена</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">5 мин назад</span>
                  <span className="activity-text">Подключение к базе данных установлено</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">10 мин назад</span>
                  <span className="activity-text">VK API инициализирован</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
