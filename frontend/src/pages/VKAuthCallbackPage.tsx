import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import './VKAuthCallbackPage.css';

const VKAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const authState = useAppSelector(selectAuth);
  const { userId } = authState;
  const [status, setStatus] = useState<string>('Обработка авторизации...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('OAuth Callback начало обработки...');
        console.log('URL:', window.location.href);
        console.log('userId из Redux:', userId);
        console.log('isAuthenticated:', authState.isAuthenticated);
        
        // Получаем code из URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        
        console.log('OAuth code:', code ? code.substring(0, 20) + '...' : 'отсутствует');
        
        if (errorParam) {
          throw new Error(`OAuth Error: ${errorParam}`);
        }
        
        if (!code) {
          throw new Error('OAuth code не найден в URL');
        }
        
        // Получаем communityId из localStorage
        // Может быть либо pending_community_setup (новое сообщество)
        // либо pending_callback_setup (настройка Callback для существующего)
        const communityId = localStorage.getItem('pending_community_setup') || 
                           localStorage.getItem('pending_callback_setup');
        
        const returnToCommunity = localStorage.getItem('return_to_community');
        
        console.log('Community ID:', communityId);
        console.log('Return to community:', returnToCommunity);
        
        if (!communityId) {
          throw new Error('ID сообщества не найден. Попробуйте снова.');
        }
        
        if (!userId) {
          console.error('userId отсутствует! Проверяем localStorage...');
          const savedAuth = localStorage.getItem('auth');
          console.log('Saved auth:', savedAuth);
          throw new Error('Пользователь не авторизован');
        }
        
        console.log('Все проверки пройдены, отправляем запрос на backend...');
        setStatus('Получение токена доступа...');
        
        // Отправляем code на backend для обмена на access_token
        console.log('Отправка запроса на backend:', {
          code: code.substring(0, 20) + '...',
          userId,
          communityId: parseInt(communityId)
        });
        
        const response = await fetch(`${API_BASE_URL}/auth/vk/exchange-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            userId,
            communityId: parseInt(communityId)
          })
        });
        
        const data = await response.json();
        
        console.log('Ответ от backend:', data);
        
        if (!data.success) {
          console.error('Backend вернул ошибку:', data.message);
          throw new Error(data.message || 'Ошибка при обмене кода на токен');
        }
        
        setStatus('Настройка Callback API...');
        
        // Очищаем localStorage
        localStorage.removeItem('pending_community_setup');
        localStorage.removeItem('pending_callback_setup');
        
        console.log('LocalStorage очищен');
        
        setStatus('Сообщество успешно добавлено!');
        
        console.log('Сообщество успешно добавлено, перенаправление...');
        console.log('Данные сообщества:', data.data);
        
        // Перенаправляем на нужную страницу через 2 секунды
        setTimeout(() => {
          if (returnToCommunity) {
            // Возвращаемся на страницу сообщества
            localStorage.removeItem('return_to_community');
            navigate(`/communities/${returnToCommunity}`, { replace: true });
          } else {
            // Идём на список сообществ с флагом для перезагрузки
            navigate('/communities', { 
              replace: true,
              state: { reload: true } // Флаг для перезагрузки данных
            });
          }
        }, 1500); // Уменьшили время ожидания
        
      } catch (err: any) {
        console.error('Ошибка OAuth callback:', err);
        setError(err.message || 'Произошла ошибка при авторизации');
        
        // Перенаправляем обратно на страницу сообществ через 3 секунды
        setTimeout(() => {
          navigate('/communities');
        }, 3000);
      }
    };
    
    handleOAuthCallback();
  }, [navigate, userId]);

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-container">
        <div className="oauth-callback-content">
          {!error ? (
            <>
              <div className="oauth-spinner"></div>
              <h2>{status}</h2>
              <p className="oauth-description">
                Подождите, мы настраиваем всё автоматически...
              </p>
              <div className="oauth-steps">
                <div className="oauth-step">Получение токена доступа</div>
                <div className="oauth-step">Настройка Callback API</div>
                <div className="oauth-step">Сохранение настроек</div>
              </div>
            </>
          ) : (
            <>
              <div className="oauth-error-icon">!</div>
              <h2>Ошибка авторизации</h2>
              <p className="oauth-error-message">{error}</p>
              <p className="oauth-redirect">Перенаправление на страницу сообществ...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VKAuthCallbackPage;

