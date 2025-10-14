import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import { getUserManagedGroups, VKGroup } from '../services/vkApi';
import './AddCommunity.css';

interface AddCommunityProps {
  onCommunityAdded?: () => void;
}

const AddCommunity: React.FC<AddCommunityProps> = ({ onCommunityAdded }) => {
  const authState = useAppSelector(selectAuth);
  const { accessToken, userId } = authState;
  
  const [isOpen, setIsOpen] = useState(false);
  const [communities, setCommunities] = useState<VKGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<number | null>(null);

  const loadCommunities = async () => {
    if (!accessToken) {
      setError('Токен доступа не найден');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const groups = await getUserManagedGroups(accessToken);
      setCommunities(groups);
      
      if (groups.length === 0) {
        setError('У вас нет сообществ с правами администратора');
      }
    } catch (err: any) {
      console.error('Ошибка загрузки сообществ:', err);
      setError('Не удалось загрузить список сообществ');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setIsOpen(true);
    if (communities.length === 0) {
      loadCommunities();
    }
  };

  const handleCommunitySelect = (communityId: number) => {
    setSelectedCommunity(communityId);
  };

  const handleSubmit = async () => {
    if (!selectedCommunity || !userId) {
      return;
    }

    // Сохраняем ID сообщества в localStorage для использования после OAuth redirect
    localStorage.setItem('pending_community_setup', selectedCommunity.toString());

    try {
      // Получаем конфигурацию VK OAuth с backend
      const configResponse = await fetch(`${API_BASE_URL}/vk/config`);
      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error('Не удалось получить конфигурацию VK');
      }

      const { appId, redirectUri } = configData.data;

      console.log('VK OAuth конфигурация:', { appId, redirectUri });

      // Формируем OAuth URL на основе реальных рабочих примеров
      // Убираем ВСЕ потенциально проблемные параметры (display, устаревшие scopes)
      // Используем минималистичный подход, который работает у других разработчиков
      const authUrl = `https://oauth.vk.com/authorize?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=manage,wall,messages&` + // manage + wall (комментарии) + messages (личные сообщения)
        `response_type=code&` +
        `group_ids=${selectedCommunity}&` + // ID сообщества для OAuth
        `v=5.199`;

      console.log('Перенаправление на VK OAuth:', authUrl);
      console.log('Group ID:', selectedCommunity);
      console.log('Redirect URI:', redirectUri);

      // Перенаправляем на VK OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Ошибка при подготовке OAuth:', error);
      setError('Не удалось начать процесс авторизации');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedCommunity(null);
  };

  if (!isOpen) {
    return (
      <button onClick={handleAddClick} className="add-community-button">
        <span className="add-icon">+</span>
        Добавить сообщество
      </button>
    );
  }

  return (
    <>
      <div className="add-community-overlay" onClick={handleClose}></div>
      <div className="add-community-modal">
        <div className="add-community-header">
          <h3>Добавить сообщество</h3>
          <button onClick={handleClose} className="close-button">×</button>
        </div>

        <div className="add-community-content">
          <p className="add-community-description">
            Выберите сообщество для добавления. Вам потребуется предоставить права на управление.
          </p>

          {loading && (
            <div className="add-community-loading">
              <div className="spinner"></div>
              <p>Загрузка сообществ...</p>
            </div>
          )}

          {error && (
            <div className="add-community-error">
              {error}
            </div>
          )}

          {!loading && !error && communities.length > 0 && (
            <div className="communities-list">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className={`community-item ${selectedCommunity === community.id ? 'selected' : ''}`}
                  onClick={() => handleCommunitySelect(community.id)}
                >
                  <div className="community-item-avatar">
                    {community.photo_100 ? (
                      <img src={community.photo_100} alt={community.name} />
                    ) : (
                      <div className="community-item-avatar-placeholder">
                        {community.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="community-item-info">
                    <div className="community-item-name">{community.name}</div>
                    <div className="community-item-meta">
                      ID: {community.id} • {community.members_count?.toLocaleString() || 0} подписчиков
                    </div>
                  </div>
                  {selectedCommunity === community.id && (
                    <div className="community-item-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="add-community-footer">
          <button onClick={handleClose} className="cancel-button">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCommunity || loading}
            className="submit-button"
          >
            Продолжить
          </button>
        </div>
      </div>
    </>
  );
};

export default AddCommunity;

