import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './BroadcastManager.css';

interface BroadcastManagerProps {
  communityId: number;
}

interface MembersCount {
  total: number;
  active: number;
}

interface BroadcastCampaign {
  id: string;
  community_id: number;
  message_text: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  scheduled_at?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

const BroadcastManager: React.FC<BroadcastManagerProps> = ({ communityId }) => {
  const [membersCount, setMembersCount] = useState<MembersCount>({ total: 0, active: 0 });
  const [syncing, setSyncing] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [creating, setCreating] = useState(false);
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Показать уведомление
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Загрузить количество участников
  const loadMembersCount = async () => {
    try {
      setLoadingCount(true);
      const response = await apiService.getCommunityMembersCount(communityId);
      if (response.success && response.data) {
        setMembersCount(response.data);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки количества участников:', error);
      showNotification('Ошибка загрузки количества участников', 'error');
    } finally {
      setLoadingCount(false);
    }
  };

  // Синхронизация участников (парсинг в БД)
  const handleSyncMembers = async () => {
    try {
      setSyncing(true);
      const response = await apiService.syncCommunityMembers(communityId);
      if (response.success) {
        showNotification(`Успешно спарсено ${response.data?.saved || 0} участников`, 'success');
        await loadMembersCount();
      } else {
        showNotification(response.message || 'Ошибка синхронизации', 'error');
      }
    } catch (error: any) {
      console.error('Ошибка синхронизации участников:', error);
      showNotification(error.response?.data?.message || 'Ошибка синхронизации участников', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Загрузить рассылки
  const loadCampaigns = async (silent = false) => {
    try {
      if (!silent) {
        setLoadingCampaigns(true);
      }
      const response = await apiService.getCommunityBroadcasts(communityId);
      if (response.success && response.data) {
        setCampaigns(response.data);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки рассылок:', error);
    } finally {
      if (!silent) {
        setLoadingCampaigns(false);
      }
    }
  };

  // Создать рассылку
  const handleCreateBroadcast = async () => {
    if (!messageText.trim()) {
      showNotification('Введите текст сообщения', 'error');
      return;
    }

    // Валидация времени отправки
    let scheduledAt: string | undefined = undefined;
    if (isScheduled) {
      if (!scheduledDateTime) {
        showNotification('Выберите время отправки', 'error');
        return;
      }
      
      const selectedDate = new Date(scheduledDateTime);
      const now = new Date();
      
      if (selectedDate <= now) {
        showNotification('Время отправки должно быть в будущем', 'error');
        return;
      }
      
      scheduledAt = selectedDate.toISOString();
    }

    try {
      setCreating(true);
      const response = await apiService.createBroadcast(communityId, messageText, scheduledAt);
      if (response.success) {
        showNotification(response.message || 'Рассылка создана', 'success');
        setMessageText('');
        setIsScheduled(false);
        setScheduledDateTime('');
        await loadCampaigns();
      } else {
        showNotification(response.message || 'Ошибка создания рассылки', 'error');
      }
    } catch (error: any) {
      console.error('Ошибка создания рассылки:', error);
      showNotification(error.response?.data?.message || 'Ошибка создания рассылки', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Запустить рассылку
  const handleStartBroadcast = async (campaignId: string) => {
    try {
      const response = await apiService.startBroadcast(campaignId);
      if (response.success) {
        showNotification('Рассылка запущена', 'success');
        await loadCampaigns();
      } else {
        showNotification(response.message || 'Ошибка запуска рассылки', 'error');
      }
    } catch (error: any) {
      console.error('Ошибка запуска рассылки:', error);
      showNotification(error.response?.data?.message || 'Ошибка запуска рассылки', 'error');
    }
  };

  // Получить статус рассылки
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'draft': 'Черновик',
      'scheduled': 'Запланирована',
      'running': 'В процессе',
      'completed': 'Завершена',
      'paused': 'Приостановлена',
      'failed': 'Ошибка'
    };
    return statusMap[status] || status;
  };

  // Получить цвет статуса
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'draft': '#666',
      'scheduled': '#9C27B0',
      'running': '#2196F3',
      'completed': '#4CAF50',
      'paused': '#FF9800',
      'failed': '#F44336'
    };
    return colorMap[status] || '#666';
  };

  // Автоматическое обновление статуса активных рассылок
  useEffect(() => {
    loadMembersCount();
    loadCampaigns();
  }, [communityId]);

  // Polling для обновления статуса активных и запланированных рассылок
  useEffect(() => {
    // Проверяем, есть ли активные или запланированные рассылки
    const activeCampaigns = campaigns.filter(c => 
      c.status === 'running' || c.status === 'scheduled'
    );
    const hasActiveCampaigns = activeCampaigns.length > 0;
    
    if (!hasActiveCampaigns) {
      return; // Нет активных рассылок, не нужно обновлять
    }

    // Обновляем статус каждые 5 секунд (для запланированных) и 2 секунды (для активных)
    const interval = setInterval(() => {
      loadCampaigns(true);
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  return (
    <div className="broadcast-manager">
      <h2 className="broadcast-manager-title">📢 Авторассылки</h2>

      {notification && (
        <div className={`broadcast-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Секция синхронизации участников */}
      <div className="broadcast-section">
        <h3 className="broadcast-section-title">Участники сообщества</h3>
        <div className="members-count-info">
          <div className="count-item">
            <span className="count-label">Всего в БД:</span>
            <span className="count-value">{loadingCount ? '...' : membersCount.total}</span>
          </div>
          <div className="count-item">
            <span className="count-label">Активных:</span>
            <span className="count-value">{loadingCount ? '...' : membersCount.active}</span>
          </div>
        </div>
        <button
          onClick={handleSyncMembers}
          disabled={syncing}
          className="sync-members-btn"
        >
          {syncing ? '⏳ Синхронизация...' : '🔄 Спарсить подписчиков в БД'}
        </button>
        <p className="sync-hint">
          Сначала нужно спарсить всех подписчиков сообщества в базу данных, 
          затем можно будет запускать рассылки.
        </p>
      </div>

      {/* Секция создания рассылки */}
      <div className="broadcast-section">
        <h3 className="broadcast-section-title">Создать рассылку</h3>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Введите текст сообщения для рассылки..."
          className="broadcast-textarea"
          rows={5}
        />
        
        {/* Опция отложенной рассылки */}
        <div className="schedule-option">
          <label className="schedule-checkbox">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
            />
            <span>📅 Отложенная рассылка</span>
          </label>
          
          {isScheduled && (
            <div className="schedule-datetime">
              <label className="schedule-label">Время отправки:</label>
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="schedule-input"
                min={new Date().toISOString().slice(0, 16)}
              />
              {scheduledDateTime && (
                <div className="schedule-preview">
                  Запланировано на: {new Date(scheduledDateTime).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={handleCreateBroadcast}
          disabled={creating || !messageText.trim() || (isScheduled && !scheduledDateTime)}
          className="create-broadcast-btn"
        >
          {creating ? '⏳ Создание...' : isScheduled ? '📅 Создать отложенную рассылку' : '➕ Создать рассылку'}
        </button>
      </div>

      {/* Список рассылок */}
      <div className="broadcast-section">
        <h3 className="broadcast-section-title">Рассылки</h3>
        {loadingCampaigns ? (
          <div className="broadcast-loading">Загрузка...</div>
        ) : campaigns.length === 0 ? (
          <div className="broadcast-empty">Рассылок пока нет</div>
        ) : (
          <div className="broadcast-campaigns">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="broadcast-campaign">
                <div className="campaign-header">
                  <div className="campaign-status" style={{ color: getStatusColor(campaign.status) }}>
                    {getStatusText(campaign.status)}
                  </div>
                  <div className="campaign-date">
                    {campaign.scheduled_at ? (
                      <div>
                        <div>📅 {new Date(campaign.scheduled_at).toLocaleString('ru-RU')}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Создано: {new Date(campaign.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    ) : (
                      new Date(campaign.created_at).toLocaleString('ru-RU')
                    )}
                  </div>
                </div>
                <div className="campaign-message">{campaign.message_text}</div>
                <div className="campaign-stats">
                  <div className="stat-item">
                    <span className="stat-label">Всего:</span>
                    <span className="stat-value">{campaign.total_recipients}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Отправлено:</span>
                    <span className="stat-value success">{campaign.sent_count}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Ошибок:</span>
                    <span className="stat-value error">{campaign.failed_count}</span>
                  </div>
                </div>
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => handleStartBroadcast(campaign.id)}
                    className="start-broadcast-btn"
                  >
                    ▶️ Запустить рассылку
                  </button>
                )}
                {campaign.status === 'scheduled' && (
                  <div className="campaign-scheduled">
                    ⏰ Рассылка запланирована на {new Date(campaign.scheduled_at!).toLocaleString('ru-RU')}
                  </div>
                )}
                {campaign.status === 'running' && (
                  <div className="campaign-running">
                    <div className="running-indicator">
                      <span className="spinner">⏳</span>
                      <span>Рассылка выполняется...</span>
                    </div>
                    <div className="running-progress">
                      Прогресс: {campaign.sent_count} / {campaign.total_recipients} 
                      {campaign.total_recipients > 0 && (
                        <span className="progress-percent">
                          ({Math.round((campaign.sent_count / campaign.total_recipients) * 100)}%)
                        </span>
                      )}
                    </div>
                    {campaign.failed_count > 0 && (
                      <div className="running-errors">
                        Ошибок: {campaign.failed_count}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastManager;

