import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import { getUserManagedGroups, getUserGroups, VKGroup } from '../services/vkApi';
import CommunityCard from '../components/CommunityCard';
import './CommunitiesPage.css';

const CommunitiesPage: React.FC = () => {
  const authState = useAppSelector(selectAuth);
  const { isAuthenticated, accessToken } = authState;
  
  const [managedCommunities, setManagedCommunities] = useState<VKGroup[]>([]);
  const [allCommunities, setAllCommunities] = useState<VKGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'managed' | 'all'>('managed');

  // Загрузка управляемых сообществ
  const loadManagedCommunities = async () => {
    if (!accessToken) {
      setError('Токен доступа не найден');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const communities = await getUserManagedGroups(accessToken);
      setManagedCommunities(communities);
      
      if (communities.length === 0) {
        setError('У вас нет управляемых сообществ');
      }
    } catch (err: any) {
      console.error('Ошибка при загрузке управляемых сообществ:', err);
      setError(err.message || 'Ошибка при загрузке сообществ');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка всех сообществ
  const loadAllCommunities = async () => {
    if (!accessToken) {
      setError('Токен доступа не найден');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const communities = await getUserGroups(accessToken);
      setAllCommunities(communities);
      
      if (communities.length === 0) {
        setError('У вас нет сообществ');
      }
    } catch (err: any) {
      console.error('Ошибка при загрузке всех сообществ:', err);
      setError(err.message || 'Ошибка при загрузке сообществ');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем сообщества при монтировании компонента
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadManagedCommunities();
    }
  }, [isAuthenticated, accessToken]);

  // Переключение табов
  const handleTabChange = (tab: 'managed' | 'all') => {
    setActiveTab(tab);
    
    if (tab === 'all' && allCommunities.length === 0) {
      loadAllCommunities();
    }
  };

  // Обновление данных
  const handleRefresh = () => {
    if (activeTab === 'managed') {
      loadManagedCommunities();
    } else {
      loadAllCommunities();
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

  const currentCommunities = activeTab === 'managed' ? managedCommunities : allCommunities;

  return (
    <div className="communities-page">
      <div className="communities-header">
        <div className="communities-title-section">
          <h1>Мои сообщества VK</h1>
          <p className="communities-subtitle">
            Управление и просмотр ваших сообществ ВКонтакте
          </p>
        </div>
        
        <button 
          onClick={handleRefresh}
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? '🔄' : '↻'} Обновить
        </button>
      </div>

      {/* Вкладки */}
      <div className="communities-tabs">
        <button
          className={`tab ${activeTab === 'managed' ? 'active' : ''}`}
          onClick={() => handleTabChange('managed')}
          disabled={loading}
        >
          <span className="tab-icon">👑</span>
          Управляемые
          {managedCommunities.length > 0 && (
            <span className="tab-count">{managedCommunities.length}</span>
          )}
        </button>
        
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
          disabled={loading}
        >
          <span className="tab-icon">👥</span>
          Все сообщества
          {allCommunities.length > 0 && (
            <span className="tab-count">{allCommunities.length}</span>
          )}
        </button>
      </div>

      {/* Содержимое */}
      <div className="communities-content">
        {loading && (
          <div className="communities-loading">
            <div className="loading-spinner"></div>
            <p>Загрузка сообществ...</p>
          </div>
        )}

        {error && !loading && (
          <div className="communities-error">
            <div className="error-icon">⚠️</div>
            <h3>Ошибка загрузки</h3>
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-btn">
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && currentCommunities.length > 0 && (
          <>
            <div className="communities-stats">
              <div className="stat-item">
                <span className="stat-number">{currentCommunities.length}</span>
                <span className="stat-label">
                  {activeTab === 'managed' ? 'Управляемых' : 'Всего'}
                </span>
              </div>
              
              {activeTab === 'managed' && (
                <div className="stat-item">
                  <span className="stat-number">
                    {managedCommunities.filter(c => c.admin_level === 3).length}
                  </span>
                  <span className="stat-label">Администрируемых</span>
                </div>
              )}
            </div>

            <div className="communities-grid">
              {currentCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                />
              ))}
            </div>
          </>
        )}

        {!loading && !error && currentCommunities.length === 0 && (
          <div className="communities-empty">
            <div className="empty-icon">📭</div>
            <h3>Сообщества не найдены</h3>
            <p>
              {activeTab === 'managed' 
                ? 'У вас нет сообществ, которыми вы управляете'
                : 'Вы не состоите ни в одном сообществе'
              }
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default CommunitiesPage;
