import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import './CallbackSetup.css';

interface CallbackSetupProps {
  communityId: number;
}

interface CallbackStatus {
  configured: boolean;
  confirmationCode?: string;
  callbackUrl?: string;
  eventsConfigured?: string[];
}

const CallbackSetup: React.FC<CallbackSetupProps> = ({ communityId }) => {
  const authState = useAppSelector(selectAuth);
  const { userId } = authState;
  
  const [status, setStatus] = useState<CallbackStatus>({ configured: false });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadCallbackStatus = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/communities/${communityId}/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStatus({
            configured: data.data.callback_configured || false,
            confirmationCode: data.data.confirmation_code,
            callbackUrl: data.data.callback_url
          });
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса Callback API:', error);
    }
  };

  const setupCallback = async () => {
    if (!userId) {
      showNotification('Необходимо авторизоваться', 'error');
      return;
    }

    console.log('🚀 Запуск OAuth Flow для Callback API');
    console.log('Community ID:', communityId);
    console.log('User ID:', userId);

    // Сохраняем ID сообщества в localStorage для использования после OAuth redirect
    localStorage.setItem('pending_callback_setup', communityId.toString());
    localStorage.setItem('return_to_community', communityId.toString());

    console.log('✅ Данные сохранены в localStorage');

    try {
      setLoading(true);

      // Получаем конфигурацию VK OAuth с backend
      const configResponse = await fetch('http://localhost:5001/api/vk/config');
      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error('Не удалось получить конфигурацию VK');
      }

      const { appId, redirectUri } = configData.data;

      console.log('🔧 VK OAuth конфигурация:', { appId, redirectUri });

      // Формируем OAuth URL на основе реальных рабочих примеров
      // Убираем ВСЕ потенциально проблемные параметры (display, устаревшие scopes)
      // Используем минималистичный подход, который работает у других разработчиков
      const authUrl = `https://oauth.vk.com/authorize?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=manage&` + // Используем только manage (включает все необходимое)
        `response_type=code&` +
        `group_ids=${communityId}&` + // ID сообщества для OAuth
        `v=5.199`;

      console.log('🔗 OAuth URL:', authUrl);
      console.log('📋 Group ID:', communityId);
      console.log('🔧 Redirect URI:', redirectUri);
      console.log('🔄 Перенаправление на VK...');

      // Перенаправляем пользователя на VK OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Ошибка при подготовке OAuth:', error);
      showNotification('Не удалось начать процесс авторизации', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (communityId) {
      loadCallbackStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  return (
    <div className="callback-setup-card">
      <div className="callback-setup-header">
        <h2>🔗 Callback API</h2>
        {status.configured && (
          <span className="callback-status-badge configured">✓ Подключено</span>
        )}
        {!status.configured && (
          <span className="callback-status-badge not-configured">Не настроено</span>
        )}
      </div>

      {notification && (
        <div className={`callback-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="callback-setup-content">
        {!status.configured ? (
          <>
            <p className="callback-description">
              Callback API позволяет вашему боту автоматически получать уведомления о событиях в сообществе 
              (новые комментарии, лайки, сообщения).
            </p>
            <p className="callback-description">
              <strong>Для настройки потребуется:</strong>
            </p>
            <ul className="callback-requirements">
              <li>✓ Вы должны быть администратором сообщества</li>
              <li>✓ Предоставить права на управление сообществом</li>
              <li>✓ Это займет около 5 секунд</li>
            </ul>
            <button 
              onClick={setupCallback} 
              disabled={loading} 
              className="callback-setup-button"
            >
              {loading ? '⏳ Настраиваем...' : '🚀 Подключить Callback API'}
            </button>
          </>
        ) : (
          <>
            <div className="callback-info-success">
              <p>✅ Callback API успешно настроен и работает!</p>
              <p className="callback-description">
                Ваш бот получает уведомления о следующих событиях:
              </p>
              <ul className="callback-events-list">
                {status.eventsConfigured?.map((event) => (
                  <li key={event}>✓ {event}</li>
                )) || (
                  <>
                    <li>✓ message_new</li>
                    <li>✓ wall_reply_new</li>
                    <li>✓ wall_post_new</li>
                    <li>✓ like_add</li>
                    <li>✓ like_remove</li>
                  </>
                )}
              </ul>
            </div>

            {status.confirmationCode && (
              <div className="callback-details">
                <div className="callback-detail-item">
                  <span className="callback-detail-label">Код подтверждения:</span>
                  <code className="callback-detail-value">{status.confirmationCode}</code>
                </div>
              </div>
            )}

            {status.callbackUrl && (
              <div className="callback-details">
                <div className="callback-detail-item">
                  <span className="callback-detail-label">URL сервера:</span>
                  <code className="callback-detail-value">{status.callbackUrl}</code>
                </div>
              </div>
            )}

            <button 
              onClick={setupCallback} 
              disabled={loading} 
              className="callback-reconfigure-button"
            >
              🔄 Перенастроить
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallbackSetup;
