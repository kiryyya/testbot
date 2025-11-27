import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './ScheduledPostsList.css';

interface ScheduledPostsListProps {
  communityId: number;
  onPostPublished?: () => void;
}

interface ScheduledPost {
  id: string;
  community_id: number;
  post_text: string;
  scheduled_at: string;
  published_at?: string;
  vk_post_id?: string;
  status: string;
  game_enabled: boolean;
  attempts_per_player: number;
  lives_per_player: number;
  prize_keyword: string;
  promo_codes: string[];
  error_message?: string;
  created_at: string;
}

const ScheduledPostsList: React.FC<ScheduledPostsListProps> = ({ communityId, onPostPublished }) => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузить запланированные посты
  const loadScheduledPosts = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await apiService.getScheduledPosts(communityId);
      if (response.success && response.data) {
        setScheduledPosts(response.data);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки запланированных постов:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Получить статус поста
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Запланирован',
      'published': 'Опубликован',
      'failed': 'Ошибка'
    };
    return statusMap[status] || status;
  };

  // Получить цвет статуса
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'scheduled': '#9C27B0',
      'published': '#4CAF50',
      'failed': '#F44336'
    };
    return colorMap[status] || '#666';
  };

  // Загрузка при монтировании
  useEffect(() => {
    loadScheduledPosts();
  }, [communityId]);

  // Polling для обновления статуса запланированных постов
  useEffect(() => {
    const hasScheduled = scheduledPosts.some(p => p.status === 'scheduled');
    
    if (!hasScheduled) {
      return; // Нет запланированных постов, не нужно обновлять
    }

    // Обновляем каждые 10 секунд
    const interval = setInterval(() => {
      loadScheduledPosts(true);
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledPosts.length, scheduledPosts.filter(p => p.status === 'scheduled').length]);

  if (loading && scheduledPosts.length === 0) {
    return (
      <div className="scheduled-posts-list">
        <div className="scheduled-posts-loading">Загрузка запланированных постов...</div>
      </div>
    );
  }

  if (scheduledPosts.length === 0) {
    return (
      <div className="scheduled-posts-list">
        <div className="scheduled-posts-empty">
          <div className="empty-icon">📅</div>
          <h3>Нет запланированных постов</h3>
          <p>Создайте пост, чтобы увидеть его здесь</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scheduled-posts-list">
      <div className="scheduled-posts-header">
        <h3 className="scheduled-posts-title">📅 Запланированные посты</h3>
        <button
          onClick={() => loadScheduledPosts()}
          className="refresh-scheduled-btn"
          disabled={loading}
        >
          {loading ? '🔄' : '↻'} Обновить
        </button>
      </div>

      <div className="scheduled-posts-grid">
        {scheduledPosts.map((post) => (
          <div key={post.id} className="scheduled-post-card">
            <div className="scheduled-post-header">
              <div className="scheduled-post-status" style={{ color: getStatusColor(post.status) }}>
                {getStatusText(post.status)}
              </div>
              <div className="scheduled-post-date">
                {new Date(post.created_at).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="scheduled-post-text">
              {post.post_text.length > 150 
                ? `${post.post_text.substring(0, 150)}...` 
                : post.post_text}
            </div>

            <div className="scheduled-post-info">
              <div className="info-item">
                <span className="info-label">📅 Публикация:</span>
                <span className="info-value">
                  {new Date(post.scheduled_at).toLocaleString('ru-RU')}
                </span>
              </div>

              {post.status === 'published' && post.vk_post_id && (
                <div className="info-item">
                  <span className="info-label">✅ Опубликован:</span>
                  <span className="info-value">
                    {post.published_at 
                      ? new Date(post.published_at).toLocaleString('ru-RU')
                      : 'Недавно'}
                  </span>
                </div>
              )}

              {post.status === 'published' && post.vk_post_id && (
                <div className="info-item">
                  <span className="info-label">🔗 ID поста:</span>
                  <span className="info-value">
                    <a 
                      href={`https://vk.com/wall${post.vk_post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="post-link"
                    >
                      {post.vk_post_id}
                    </a>
                  </span>
                </div>
              )}

              {post.game_enabled && (
                <div className="info-item game-info">
                  <span className="info-label">🎮 Игра:</span>
                  <span className="info-value">
                    Включена ({post.attempts_per_player} попыток, {post.lives_per_player} жизней)
                  </span>
                </div>
              )}

              {post.prize_keyword && post.game_enabled && (
                <div className="info-item">
                  <span className="info-label">🎁 Ключевое слово:</span>
                  <span className="info-value">{post.prize_keyword}</span>
                </div>
              )}

              {post.promo_codes && post.promo_codes.length > 0 && (
                <div className="info-item">
                  <span className="info-label">🎫 Промокоды:</span>
                  <span className="info-value">{post.promo_codes.join(', ')}</span>
                </div>
              )}

              {post.status === 'failed' && post.error_message && (
                <div className="info-item error-info">
                  <span className="info-label">❌ Ошибка:</span>
                  <span className="info-value">{post.error_message}</span>
                </div>
              )}
            </div>

            {post.status === 'scheduled' && (
              <div className="scheduled-post-countdown">
                {(() => {
                  const scheduledDate = new Date(post.scheduled_at);
                  const now = new Date();
                  const diff = scheduledDate.getTime() - now.getTime();
                  
                  if (diff <= 0) {
                    return '⏳ Ожидает публикации...';
                  }
                  
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  
                  if (hours > 24) {
                    const days = Math.floor(hours / 24);
                    return `⏰ Осталось: ${days} дн. ${hours % 24} ч.`;
                  } else if (hours > 0) {
                    return `⏰ Осталось: ${hours} ч. ${minutes} мин.`;
                  } else {
                    return `⏰ Осталось: ${minutes} мин.`;
                  }
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduledPostsList;

