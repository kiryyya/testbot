import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import { getGroupInfo, getCommunityPosts, VKGroup, VKPost, getAccessLevelText, getGroupTypeText } from '../services/vkApi';
import PostCard from '../components/PostCard';
import './CommunityDetailPage.css';

const CommunityDetailPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const authState = useAppSelector(selectAuth);
  const { isAuthenticated, accessToken } = authState;
  
  const [community, setCommunity] = useState<VKGroup | null>(null);
  const [posts, setPosts] = useState<VKPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'posts'>('info');

  // Загрузка информации о сообществе
  const loadCommunityInfo = async () => {
    if (!accessToken || !communityId) {
      setError('Недостаточно данных для загрузки сообщества');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const communityData = await getGroupInfo(accessToken, parseInt(communityId));
      
      if (communityData) {
        setCommunity(communityData);
      } else {
        setError('Сообщество не найдено');
      }
    } catch (err: any) {
      console.error('Ошибка при загрузке информации о сообществе:', err);
      setError(err.message || 'Ошибка при загрузке сообщества');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка постов сообщества
  const loadCommunityPosts = async () => {
    if (!accessToken || !communityId) {
      setPostsError('Недостаточно данных для загрузки постов');
      return;
    }

    try {
      setPostsLoading(true);
      setPostsError(null);
      
      const communityPosts = await getCommunityPosts(accessToken, parseInt(communityId), 20, 0);
      setPosts(communityPosts);
      
      if (communityPosts.length === 0) {
        setPostsError('В сообществе пока нет постов');
      }
    } catch (err: any) {
      console.error('Ошибка при загрузке постов:', err);
      setPostsError(err.message || 'Ошибка при загрузке постов');
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && accessToken && communityId) {
      loadCommunityInfo();
    } else if (!isAuthenticated) {
      setError('Необходима авторизация');
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, communityId]);

  const handleOpenVK = () => {
    if (community) {
      const url = `https://vk.com/${community.screen_name || `club${community.id}`}`;
      window.open(url, '_blank');
    }
  };

  const handleGoBack = () => {
    navigate('/communities');
  };

  if (!isAuthenticated) {
    return (
      <div className="community-detail-page">
        <div className="community-detail-error">
          <h2>Доступ запрещен</h2>
          <p>Для просмотра информации о сообществе необходимо авторизоваться через VK ID</p>
          <Link to="/communities" className="back-link">
            ← Вернуться к сообществам
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="community-detail-page">
        <div className="community-detail-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка информации о сообществе...</p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="community-detail-page">
        <div className="community-detail-error">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка загрузки</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadCommunityInfo} className="retry-btn">
              Попробовать снова
            </button>
            <button onClick={handleGoBack} className="back-btn">
              ← Назад к сообществам
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="community-detail-page">
      {/* Хлебные крошки */}
      <div className="breadcrumbs">
        <Link to="/communities" className="breadcrumb-link">
          Сообщества
        </Link>
        <span className="breadcrumb-separator">→</span>
        <span className="breadcrumb-current">{community.name}</span>
      </div>

      {/* Заголовок сообщества */}
      <div className="community-header">
        <div className="community-avatar-large">
          {community.photo_200 ? (
            <img 
              src={community.photo_200} 
              alt={community.name}
              className="community-avatar-img-large"
            />
          ) : (
            <div className="community-avatar-placeholder-large">
              {community.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Значки статуса */}
          <div className="community-badges-large">
            {community.verified === 1 && (
              <div className="badge-large verified" title="Верифицированное сообщество">
                ✓
              </div>
            )}
          </div>
        </div>
        
        <div className="community-header-info">
          <h1 className="community-title">{community.name}</h1>
          
          <div className="community-meta-large">
            <span className="community-type-large">
              {getGroupTypeText(community.type)}
            </span>
            
            {community.admin_level && (
              <span className="community-role-large">
                • {getAccessLevelText(community.admin_level)}
              </span>
            )}
            
            {community.is_closed !== undefined && (
              <span className="community-privacy">
                • {community.is_closed === 0 ? 'Открытое' : 
                   community.is_closed === 1 ? 'Закрытое' : 'Частное'}
              </span>
            )}
          </div>
          
          {community.screen_name && (
            <div className="community-link">
              <span className="link-label">Ссылка:</span>
              <code>vk.com/{community.screen_name}</code>
            </div>
          )}
          
          <div className="community-actions-header">
            <button onClick={handleOpenVK} className="open-vk-btn-large">
              🔗 Открыть в ВКонтакте
            </button>
            <button onClick={handleGoBack} className="back-btn-header">
              ← Назад
            </button>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="community-tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <span className="tab-icon">ℹ️</span>
          Информация
        </button>
        
        <button
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('posts');
            if (posts.length === 0 && !postsLoading && !postsError) {
              loadCommunityPosts();
            }
          }}
        >
          <span className="tab-icon">📝</span>
          Посты
          {posts.length > 0 && (
            <span className="tab-count">{posts.length}</span>
          )}
        </button>
      </div>

      {/* Основная информация */}
      <div className="community-content">
        {activeTab === 'info' && (
          <>
            {/* Статистика */}
            <div className="community-stats-section">
          <h2>Статистика</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">
                {community.members_count?.toLocaleString() || 'Н/Д'}
              </div>
              <div className="stat-label">Участников</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">#{community.id}</div>
              <div className="stat-label">ID сообщества</div>
            </div>
            
            {community.admin_level && (
              <div className="stat-card">
                <div className="stat-number">{community.admin_level}</div>
                <div className="stat-label">Уровень доступа</div>
              </div>
            )}
          </div>
        </div>

        {/* Описание */}
        {community.description && (
          <div className="community-description-section">
            <h2>Описание</h2>
            <div className="description-content">
              {community.description}
            </div>
          </div>
        )}

        {/* Деятельность */}
        {community.activity && (
          <div className="community-activity-section">
            <h2>Деятельность</h2>
            <div className="activity-content">
              {community.activity}
            </div>
          </div>
        )}

        {/* Возможности */}
        <div className="community-permissions-section">
          <h2>Ваши возможности</h2>
          <div className="permissions-grid">
            {community.can_post === 1 && (
              <div className="permission-card">
                <div className="permission-icon">✏️</div>
                <div className="permission-text">
                  <strong>Публикация записей</strong>
                  <p>Вы можете создавать записи в сообществе</p>
                </div>
              </div>
            )}
            
            {community.can_see_all_posts === 1 && (
              <div className="permission-card">
                <div className="permission-icon">👁️</div>
                <div className="permission-text">
                  <strong>Просмотр всех записей</strong>
                  <p>Доступны все записи, включая отложенные</p>
                </div>
              </div>
            )}
            
            {community.can_upload_video === 1 && (
              <div className="permission-card">
                <div className="permission-icon">🎥</div>
                <div className="permission-text">
                  <strong>Загрузка видео</strong>
                  <p>Вы можете загружать видеозаписи</p>
                </div>
              </div>
            )}
            
            {community.can_upload_doc === 1 && (
              <div className="permission-card">
                <div className="permission-icon">📄</div>
                <div className="permission-text">
                  <strong>Загрузка документов</strong>
                  <p>Вы можете загружать файлы и документы</p>
                </div>
              </div>
            )}
            
            {community.can_create_topic === 1 && (
              <div className="permission-card">
                <div className="permission-icon">💬</div>
                <div className="permission-text">
                  <strong>Создание обсуждений</strong>
                  <p>Вы можете создавать новые темы для обсуждения</p>
                </div>
              </div>
            )}
          </div>
          
          {!community.can_post && !community.can_see_all_posts && !community.can_upload_video && 
           !community.can_upload_doc && !community.can_create_topic && (
            <div className="no-permissions">
              <p>Особых возможностей не предоставлено</p>
            </div>
          )}
        </div>

        {/* Дополнительная информация */}
        <div className="community-additional-info">
          <h2>Дополнительная информация</h2>
          <div className="info-table">
            <div className="info-row">
              <span className="info-label">ID сообщества:</span>
              <span className="info-value">{community.id}</span>
            </div>
            
            {community.screen_name && (
              <div className="info-row">
                <span className="info-label">Короткое имя:</span>
                <span className="info-value">@{community.screen_name}</span>
              </div>
            )}
            
            <div className="info-row">
              <span className="info-label">Тип:</span>
              <span className="info-value">{getGroupTypeText(community.type)}</span>
            </div>
            
            {community.admin_level && (
              <div className="info-row">
                <span className="info-label">Ваша роль:</span>
                <span className="info-value">{getAccessLevelText(community.admin_level)}</span>
              </div>
            )}
            
            {community.site && (
              <div className="info-row">
                <span className="info-label">Веб-сайт:</span>
                <span className="info-value">
                  <a href={community.site} target="_blank" rel="noopener noreferrer">
                    {community.site}
                  </a>
                </span>
              </div>
            )}
            
            <div className="info-row">
              <span className="info-label">Статус:</span>
              <span className="info-value">
                {community.is_closed === 0 ? 'Открытое сообщество' :
                 community.is_closed === 1 ? 'Закрытое сообщество' : 'Частное сообщество'}
              </span>
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'posts' && (
          <div className="community-posts-section">
            <div className="posts-header">
              <h2>Посты сообщества</h2>
              <button 
                onClick={loadCommunityPosts}
                className="refresh-posts-btn"
                disabled={postsLoading}
              >
                {postsLoading ? '🔄' : '↻'} Обновить
              </button>
            </div>

            {postsLoading && (
              <div className="posts-loading">
                <div className="loading-spinner"></div>
                <p>Загрузка постов...</p>
              </div>
            )}

            {postsError && !postsLoading && (
              <div className="posts-error">
                <div className="error-icon">⚠️</div>
                <h3>Ошибка загрузки постов</h3>
                <p>{postsError}</p>
                <button onClick={loadCommunityPosts} className="retry-btn">
                  Попробовать снова
                </button>
              </div>
            )}

            {!postsLoading && !postsError && posts.length > 0 && (
              <div className="posts-list">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {!postsLoading && !postsError && posts.length === 0 && (
              <div className="posts-empty">
                <div className="empty-icon">📭</div>
                <h3>Посты не найдены</h3>
                <p>В сообществе пока нет публикаций</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDetailPage;
