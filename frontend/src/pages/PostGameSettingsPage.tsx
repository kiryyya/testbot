import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import './PostGameSettingsPage.css';

interface GameSettings {
  game_enabled: boolean;
  attempts_per_player: number;
  lives_per_player: number;
  prize_keyword: string;
}

const PostGameSettingsPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<GameSettings>({
    game_enabled: false,
    attempts_per_player: 5,
    lives_per_player: 100,
    prize_keyword: 'приз'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загрузка текущих настроек
  const loadSettings = async () => {
    if (!postId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getPostGameSettings(parseInt(postId));
      
      if (response.success) {
        setSettings(response.data);
      } else {
        setError('Ошибка при загрузке настроек');
      }
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      setError('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  // Сохранение настроек
  const saveSettings = async () => {
    if (!postId) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.updatePostGameSettings(parseInt(postId), {
        game_enabled: settings.game_enabled,
        attempts_per_player: settings.attempts_per_player,
        lives_per_player: settings.lives_per_player,
        prize_keyword: settings.prize_keyword
      });

      if (response.success) {
        setSuccess('Настройки успешно сохранены!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Ошибка при сохранении настроек');
      }
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setError('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [postId]);

  const handleInputChange = (field: keyof GameSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="post-game-settings-page">
        <div className="loading">Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className="post-game-settings-page">
      <div className="settings-header">
        <button 
          onClick={() => navigate('/communities')}
          className="back-button"
        >
          ← Назад к сообществам
        </button>
        <h1>Настройки игры для поста #{postId}</h1>
      </div>

      <div className="settings-content">
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

        <div className="settings-form">
          <div className="setting-group">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.game_enabled}
                onChange={(e) => handleInputChange('game_enabled', e.target.checked)}
              />
              <span className="checkbox-text">Включить игру для этого поста</span>
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-label">
              Попыток на игрока:
              <input
                type="number"
                min="1"
                max="20"
                value={settings.attempts_per_player}
                onChange={(e) => handleInputChange('attempts_per_player', parseInt(e.target.value))}
                className="number-input"
              />
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-label">
              Жизней на игрока:
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.lives_per_player}
                onChange={(e) => handleInputChange('lives_per_player', parseInt(e.target.value))}
                className="number-input"
              />
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-label">
              Ключевое слово для приза:
              <input
                type="text"
                value={settings.prize_keyword}
                onChange={(e) => handleInputChange('prize_keyword', e.target.value)}
                className="text-input"
                placeholder="приз"
              />
            </label>
            {/* <div className="setting-hint">
              Пользователи должны отправить это слово в личные сообщения для получения приза
            </div> */}
          </div>

          <div className="settings-actions">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="save-button"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostGameSettingsPage;
