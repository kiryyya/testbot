import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import { VKGroup } from '../services/vkApi';
import CommunityCard from '../components/CommunityCard';
import AddCommunity from '../components/AddCommunity';
import './CommunitiesPage.css';

interface UserCommunity {
  id: string;
  user_id: string;
  community_id: number;
  community_name: string;
  community_photo: string;
  access_token: string;
  added_at: string;
}

const CommunitiesPage: React.FC = () => {
  const authState = useAppSelector(selectAuth);
  const { isAuthenticated, userId } = authState;
  const location = useLocation();
  
  const [communities, setCommunities] = useState<UserCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка добавленных сообществ пользователя
  const loadUserCommunities = async () => {
    if (!userId) {
      console.error('ID пользователя не найден');
      setError('ID пользователя не найден');
      return;
    }

    try {
      console.log('Загрузка сообществ для пользователя:', userId);
      setLoading(true);
      setError(null);
      
      const url = `${API_BASE_URL}/user/${userId}/communities`;
      console.log('URL запроса:', url);
      
      const response = await fetch(url);
      console.log('Статус ответа:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('Полученные данные:', data);
      
      if (data.success) {
        console.log('Успех! Количество сообществ:', data.data.length);
        console.log('Список сообществ:', data.data);
        setCommunities(data.data);
        
        if (data.data.length === 0) {
          console.warn('Массив сообществ пустой');
          setError('У вас пока нет добавленных сообществ');
        }
      } else {
        console.error('Backend вернул ошибку:', data.message);
        setError(data.message || 'Ошибка при загрузке сообществ');
      }
    } catch (err: any) {
      console.error('Исключение при загрузке сообществ:', err);
      setError(err.message || 'Ошибка при загрузке сообществ');
    } finally {
      setLoading(false);
      console.log('Загрузка сообществ завершена');
    }
  };

  // Загружаем сообщества при монтировании компонента
  useEffect(() => {
    if (isAuthenticated && userId) {
      loadUserCommunities();
    }
  }, [isAuthenticated, userId]);

  // Слушаем событие возврата с OAuth для обновления списка
  useEffect(() => {
    const handleFocus = () => {
      // Перезагружаем список когда пользователь возвращается на страницу
      if (isAuthenticated && userId) {
        console.log('Обновление списка сообществ после возврата');
        loadUserCommunities();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, userId]);

  // Перезагружаем данные если пришли с флагом reload из OAuth callback
  useEffect(() => {
    const state = location.state as { reload?: boolean } | null;
    if (state?.reload && isAuthenticated && userId) {
      console.log('Принудительная перезагрузка списка сообществ после OAuth');
      loadUserCommunities();
      // Очищаем state чтобы не перезагружать повторно
      window.history.replaceState({}, document.title);
    }
  }, [location, isAuthenticated, userId]);

  // Обновление данных после добавления сообщества
  const handleCommunityAdded = () => {
    loadUserCommunities();
  };

  // Удаление сообщества
  const handleRemoveCommunity = async (communityId: number) => {
    if (!userId) return;
    
    if (!window.confirm('Удалить это сообщество из списка?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/communities/${communityId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadUserCommunities();
      } else {
        window.alert('Ошибка при удалении сообщества');
      }
    } catch (err) {
      console.error('Ошибка при удалении:', err);
      window.alert('Ошибка при удалении сообщества');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="communities-page">
        <div className="communities-error">
          <h2>Доступ запрещен</h2>
          <p>Для просмотра сообществ необходимо авторизоваться через VK ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="communities-page">
      <div className="communities-header">
        <div className="communities-title-section">
          <h1>Мои сообщества</h1>
          {/* <p className="communities-subtitle">
            Добавьте сообщество для настройки Callback API и автоответов
          </p> */}
        </div>
        
        <AddCommunity onCommunityAdded={handleCommunityAdded} />
      </div>

      {/* Содержимое */}
      <div className="communities-content">
        {loading && (
          <div className="communities-loading">
            <div className="loading-spinner"></div>
            <p>Загрузка сообществ...</p>
          </div>
        )}

        {error && !loading && communities.length === 0 && (
          <div className="communities-empty">
            <div className="empty-icon"></div>
            <h3>Сообществ пока нет</h3>
            <p>{error}</p>
            <p className="empty-hint">
              Нажмите кнопку "Добавить сообщество" чтобы начать
            </p>
          </div>
        )}

        {!loading && communities.length > 0 && (
          <>
            <div className="communities-stats">
              <div className="stat-item">
                <span className="stat-number">{communities.length}</span>
                <span className="stat-label">Добавленных сообществ</span>
              </div>
            </div>

            <div className="communities-grid">
              {communities.map((community) => (
                <div key={community.community_id} className="community-card-wrapper">
                  <CommunityCard
                    community={{
                      id: community.community_id,
                      name: community.community_name,
                      photo_100: community.community_photo,
                      photo_200: community.community_photo,
                    } as VKGroup}
                  />
                  <button
                    onClick={() => handleRemoveCommunity(community.community_id)}
                    className="remove-community-btn"
                    title="Удалить сообщество"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommunitiesPage;
