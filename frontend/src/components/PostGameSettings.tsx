import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './PostGameSettings.css';

interface PostGameSettingsProps {
  postId: number;
  onClose: () => void;
}

interface GameSettings {
  post_id: number;
  game_enabled: boolean;
  attempts_per_player: number;
  lives_per_player: number;
  prize_keyword: string;
}

const PostGameSettings: React.FC<PostGameSettingsProps> = ({ postId, onClose }) => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загрузка текущих настроек
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getPostGameSettings(postId);
      
      if (response.success) {
        setSettings(response.data);
      } else {
        setError('Ошибка при загрузке настроек');
      }
    } catch (err: any) {
      console.error('Ошибка при загрузке настроек игры:', err);
      setError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  // Сохранение настроек
  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.updatePostGameSettings(postId, {
        game_enabled: settings.game_enabled,
        attempts_per_player: settings.attempts_per_player,
        lives_per_player: settings.lives_per_player,
        prize_keyword: settings.prize_keyword
      });

      if (response.success) {
        setSuccess('Настройки игры успешно сохранены!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('Ошибка при сохранении настроек');
      }
    } catch (err: any) {
      console.error('Ошибка при сохранении настроек:', err);
      setError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  // Обработка изменений
  const handleChange = (field: keyof GameSettings, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value
    });
  };

  useEffect(() => {
    loadSettings();
  }, [postId]);

  if (loading) {
    return (
      <div className="post-game-settings-overlay">
        <div className="post-game-settings-modal">
          <div className="loading-spinner"></div>
          <p>Загрузка настроек игры...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="post-game-settings-overlay" onClick={onClose}>
      <div className="post-game-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎮 Настройки игры для поста #{postId}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {settings && (
          <div className="modal-content">
            <div className="settings-section">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={settings.game_enabled}
                    onChange={(e) => handleChange('game_enabled', e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span className="checkbox-label">Включить игру для этого поста</span>
                </label>
                <p className="setting-description">
                  Когда включено, пользователи смогут играть, комментируя этот пост
                </p>
              </div>

              {settings.game_enabled && (
                <>
                  <div className="setting-item">
                    <label className="setting-label">
                      Количество попыток на игрока:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.attempts_per_player}
                      onChange={(e) => handleChange('attempts_per_player', parseInt(e.target.value))}
                      className="setting-input"
                    />
                    <p className="setting-description">
                      Сколько попыток будет у каждого игрока (по умолчанию: 5)
                    </p>
                  </div>

                  <div className="setting-item">
                    <label className="setting-label">
                      Количество жизней на игрока:
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.lives_per_player}
                      onChange={(e) => handleChange('lives_per_player', parseInt(e.target.value))}
                      className="setting-input"
                    />
                    <p className="setting-description">
                      Сколько жизней будет у каждого игрока (по умолчанию: 100)
                    </p>
                  </div>

                  <div className="setting-item">
                    <label className="setting-label">
                      Ключевое слово для приза:
                    </label>
                    <input
                      type="text"
                      value={settings.prize_keyword}
                      onChange={(e) => handleChange('prize_keyword', e.target.value)}
                      className="setting-input"
                      placeholder="приз"
                      maxLength={50}
                    />
                    <p className="setting-description">
                      Слово, которое пользователь должен отправить в ЛС для получения приза (по умолчанию: "приз")
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="save-btn"
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
              <button
                onClick={onClose}
                className="cancel-btn"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostGameSettings;
