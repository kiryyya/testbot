import React, { useState } from 'react';
import { apiService } from '../services/api';
import './PostCreator.css';

interface PostCreatorProps {
  communityId: number;
  onPostCreated?: () => void;
}

const PostCreator: React.FC<PostCreatorProps> = ({ communityId, onPostCreated }) => {
  const [postText, setPostText] = useState('');
  const [isScheduled, setIsScheduled] = useState(true);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Настройки игры
  const [gameEnabled, setGameEnabled] = useState(false);
  const [attemptsPerPlayer, setAttemptsPerPlayer] = useState(3);
  const [livesPerPlayer, setLivesPerPlayer] = useState(100);
  const [prizeKeyword, setPrizeKeyword] = useState('приз');
  const [promoCodes, setPromoCodes] = useState<string[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  
  // Настройки рассылки
  const [broadcastEnabled, setBroadcastEnabled] = useState(false);
  const [broadcastMessageText, setBroadcastMessageText] = useState('');
  const [broadcastTimeMode, setBroadcastTimeMode] = useState<'delay' | 'custom'>('delay');
  const [broadcastDelayMinutes, setBroadcastDelayMinutes] = useState<number | null>(1);
  const [broadcastScheduledDateTime, setBroadcastScheduledDateTime] = useState('');

  // Показать уведомление
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Добавить промокод
  const handleAddPromoCode = () => {
    if (newPromoCode.trim() && !promoCodes.includes(newPromoCode.trim())) {
      setPromoCodes([...promoCodes, newPromoCode.trim()]);
      setNewPromoCode('');
    }
  };

  // Удалить промокод
  const handleRemovePromoCode = (index: number) => {
    setPromoCodes(promoCodes.filter((_, i) => i !== index));
  };

  // Создать пост
  const handleCreatePost = async () => {
    if (!postText.trim()) {
      showNotification('Введите текст поста', 'error');
      return;
    }

    if (!isScheduled || !scheduledDateTime) {
      showNotification('Выберите время публикации', 'error');
      return;
    }

    const selectedDate = new Date(scheduledDateTime);
    const now = new Date();
    
    if (selectedDate <= now) {
      showNotification('Время публикации должно быть в будущем', 'error');
      return;
    }

    try {
      setCreating(true);
      
      // Подготовка данных для рассылки
      let broadcastData: any = undefined;
      if (broadcastEnabled && broadcastMessageText.trim()) {
        if (broadcastTimeMode === 'delay') {
          // Используем задержку
          broadcastData = {
            broadcastEnabled: true,
            broadcastMessageText: broadcastMessageText,
            broadcastDelayMinutes: broadcastDelayMinutes !== null ? broadcastDelayMinutes : 0
          };
        } else {
          // Используем конкретное время
          if (!broadcastScheduledDateTime) {
            showNotification('Выберите время для рассылки', 'error');
            return;
          }
          const broadcastDate = new Date(broadcastScheduledDateTime);
          if (broadcastDate <= selectedDate) {
            showNotification('Время рассылки должно быть после времени публикации поста', 'error');
            return;
          }
          broadcastData = {
            broadcastEnabled: true,
            broadcastMessageText: broadcastMessageText,
            broadcastScheduledAt: broadcastDate.toISOString()
          };
        }
      }

      const response = await apiService.createScheduledPost(
        communityId,
        postText,
        selectedDate.toISOString(),
        {
          gameEnabled,
          attemptsPerPlayer,
          livesPerPlayer,
          prizeKeyword,
          promoCodes,
          ...broadcastData
        }
      );

      if (response.success) {
        showNotification(response.message || 'Пост запланирован', 'success');
        setPostText('');
        setScheduledDateTime('');
        setGameEnabled(false);
        setPromoCodes([]);
        setBroadcastEnabled(false);
        setBroadcastMessageText('');
        setBroadcastDelayMinutes(1);
        setBroadcastScheduledDateTime('');
        if (onPostCreated) {
          onPostCreated();
        }
      } else {
        showNotification(response.message || 'Ошибка создания поста', 'error');
      }
    } catch (error: any) {
      console.error('Ошибка создания поста:', error);
      showNotification(error.response?.data?.message || error.message || 'Ошибка создания поста', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Установить минимальное время (сейчас + 1 минута)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="post-creator">
      <h3 className="post-creator-title">📝 Создать пост</h3>

      {notification && (
        <div className={`post-creator-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="post-creator-form">
        <div className="form-group">
          <label className="form-label">Текст поста:</label>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Введите текст поста..."
            className="post-textarea"
            rows={6}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Время публикации:</label>
          <input
            type="datetime-local"
            value={scheduledDateTime}
            onChange={(e) => setScheduledDateTime(e.target.value)}
            className="schedule-input"
            min={getMinDateTime()}
            required
          />
          {scheduledDateTime && (
            <div className="schedule-preview">
              Запланировано на: {new Date(scheduledDateTime).toLocaleString('ru-RU')}
            </div>
          )}
        </div>

        {/* Настройки игры */}
        <div className="game-settings-section">
          <label className="game-settings-toggle">
            <input
              type="checkbox"
              checked={gameEnabled}
              onChange={(e) => setGameEnabled(e.target.checked)}
            />
            <span>🎮 Включить игру для этого поста</span>
          </label>

          {gameEnabled && (
            <div className="game-settings-content">
              <div className="form-row">
                <div className="form-group-small">
                  <label className="form-label">Попыток на игрока:</label>
                  <input
                    type="number"
                    value={attemptsPerPlayer}
                    onChange={(e) => setAttemptsPerPlayer(parseInt(e.target.value) || 3)}
                    min="1"
                    max="20"
                    className="form-input-small"
                  />
                </div>
                <div className="form-group-small">
                  <label className="form-label">Жизней на игрока:</label>
                  <input
                    type="number"
                    value={livesPerPlayer}
                    onChange={(e) => setLivesPerPlayer(parseInt(e.target.value) || 100)}
                    min="1"
                    max="1000"
                    className="form-input-small"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ключевое слово для приза:</label>
                <input
                  type="text"
                  value={prizeKeyword}
                  onChange={(e) => setPrizeKeyword(e.target.value)}
                  placeholder="приз"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Промокоды:</label>
                <div className="promo-codes-input">
                  <input
                    type="text"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    placeholder="Введите промокод"
                    className="form-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPromoCode();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddPromoCode}
                    className="add-promo-btn"
                    disabled={!newPromoCode.trim()}
                  >
                    ➕ Добавить
                  </button>
                </div>
                {promoCodes.length > 0 && (
                  <div className="promo-codes-list">
                    {promoCodes.map((code, index) => (
                      <div key={index} className="promo-code-item">
                        <span>{code}</span>
                        <button
                          onClick={() => handleRemovePromoCode(index)}
                          className="remove-promo-btn"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Настройки рассылки */}
        <div className="broadcast-settings-section">
          <label className="broadcast-settings-toggle">
            <input
              type="checkbox"
              checked={broadcastEnabled}
              onChange={(e) => setBroadcastEnabled(e.target.checked)}
            />
            <span>📢 Отправить рассылку вместе с постом</span>
          </label>

          {broadcastEnabled && (
            <div className="broadcast-settings-content">
              <div className="form-group">
                <label className="form-label">Текст рассылки:</label>
                <textarea
                  value={broadcastMessageText}
                  onChange={(e) => setBroadcastMessageText(e.target.value)}
                  placeholder="Введите текст сообщения для рассылки..."
                  className="broadcast-textarea"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Время отправки рассылки:</label>
                <div className="broadcast-time-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="broadcastTimeMode"
                      value="delay"
                      checked={broadcastTimeMode === 'delay'}
                      onChange={(e) => setBroadcastTimeMode('delay')}
                    />
                    <span>Быстрый выбор:</span>
                  </label>
                  <div className="delay-buttons">
                    <button
                      type="button"
                      className={`delay-btn ${broadcastDelayMinutes === 0 ? 'active' : ''}`}
                      onClick={() => setBroadcastDelayMinutes(0)}
                    >
                      Сразу
                    </button>
                    <button
                      type="button"
                      className={`delay-btn ${broadcastDelayMinutes === 1 ? 'active' : ''}`}
                      onClick={() => setBroadcastDelayMinutes(1)}
                    >
                      Через 1 мин
                    </button>
                    <button
                      type="button"
                      className={`delay-btn ${broadcastDelayMinutes === 5 ? 'active' : ''}`}
                      onClick={() => setBroadcastDelayMinutes(5)}
                    >
                      Через 5 мин
                    </button>
                    <button
                      type="button"
                      className={`delay-btn ${broadcastDelayMinutes === 10 ? 'active' : ''}`}
                      onClick={() => setBroadcastDelayMinutes(10)}
                    >
                      Через 10 мин
                    </button>
                  </div>
                  
                  <label className="radio-option" style={{ marginTop: '16px' }}>
                    <input
                      type="radio"
                      name="broadcastTimeMode"
                      value="custom"
                      checked={broadcastTimeMode === 'custom'}
                      onChange={(e) => setBroadcastTimeMode('custom')}
                    />
                    <span>Выбрать время вручную:</span>
                  </label>
                  {broadcastTimeMode === 'custom' && (
                    <input
                      type="datetime-local"
                      value={broadcastScheduledDateTime}
                      onChange={(e) => setBroadcastScheduledDateTime(e.target.value)}
                      className="schedule-input"
                      min={scheduledDateTime || getMinDateTime()}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCreatePost}
          disabled={creating || !postText.trim() || !scheduledDateTime || (broadcastEnabled && !broadcastMessageText.trim())}
          className="create-post-btn"
        >
          {creating ? '⏳ Создание...' : '📅 Запланировать пост'}
        </button>
      </div>
    </div>
  );
};

export default PostCreator;

