import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './VkLikesCounter.css';

interface VkPostLike {
  id: string;
  post_id: number;
  likes_count: number;
  last_liker_id: number;
  last_like_time: string;
  created_at: string;
  updated_at: string;
}

interface VkLikesResponse {
  success: boolean;
  data: VkPostLike[];
  total_likes: number;
  posts_count: number;
  message?: string;
}

interface VkLikesCounterProps {
  refreshInterval?: number;
}

const VkLikesCounter: React.FC<VkLikesCounterProps> = ({ refreshInterval = 5 }) => {
  const [likesData, setLikesData] = useState<VkLikesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Загрузка статистики лайков
  const loadLikesStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getVkLikes();
      
      if (response.success) {
        // Создаем объект с нужной структурой
        const likesResponse: VkLikesResponse = {
          success: response.success,
          data: response.data || [],
          total_likes: (response as any).total_likes || 0,
          posts_count: (response as any).posts_count || 0,
          message: response.message
        };
        
        setLikesData(likesResponse);
        setLastUpdate(new Date());
      } else {
        setError('Ошибка при загрузке статистики');
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке статистики лайков:', error);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Автоматическое обновление
  useEffect(() => {
    loadLikesStats();

    const interval = setInterval(() => {
      loadLikesStats();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="vk-likes-counter">
      <div className="likes-header">
        <h3>❤️ Счетчик лайков VK</h3>
        <button 
          onClick={loadLikesStats} 
          disabled={loading}
          className="refresh-btn"
        >
          🔄 {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {likesData && (
        <div className="likes-stats">
          <div className="total-stats">
            <div className="stat-card total-likes">
              <div className="stat-number">{likesData.total_likes}</div>
              <div className="stat-label">Всего лайков</div>
            </div>
            <div className="stat-card total-posts">
              <div className="stat-number">{likesData.posts_count}</div>
              <div className="stat-label">Постов с лайками</div>
            </div>
          </div>

          {likesData.data.length > 0 && (
            <div className="posts-list">
              <h4>📊 Лайки по постам:</h4>
              {likesData.data.map((post) => (
                <div key={post.id} className="post-item">
                  <div className="post-info">
                    <span className="post-id">Пост #{post.post_id}</span>
                    <span className="likes-count">❤️ {post.likes_count}</span>
                  </div>
                  <div className="post-meta">
                    <span>Последний лайк: {formatTime(post.last_like_time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {lastUpdate && (
            <div className="update-info">
              Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
              <span className="auto-refresh"> (обновление каждые {refreshInterval}с)</span>
            </div>
          )}
        </div>
      )}

      {!likesData && !loading && !error && (
        <div className="no-data">
          <p>📭 Нет данных о лайках</p>
          <p className="hint">Лайки появятся здесь автоматически при получении через VK Callback API</p>
        </div>
      )}
    </div>
  );
};

export default VkLikesCounter;
