import React, { useState, useEffect } from 'react';
import { VkMessage } from '../types';
import { apiService } from '../services/api';
import './VkMessages.css';

interface VkMessagesProps {
  refreshInterval?: number; // интервал обновления в секундах
}

const VkMessages: React.FC<VkMessagesProps> = ({ refreshInterval = 10 }) => {
  const [messages, setMessages] = useState<VkMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Загрузка VK сообщений
  const loadVkMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getVkMessages(20);
      if (response.success && response.data) {
        setMessages(response.data);
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке VK сообщений:', error);
      setError('Ошибка при загрузке сообщений');
    } finally {
      setLoading(false);
    }
  };

  // Автоматическое обновление
  useEffect(() => {
    loadVkMessages();

    const interval = setInterval(() => {
      loadVkMessages();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Форматирование времени
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование времени последнего обновления
  const formatLastUpdate = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Получение иконки для типа сообщения
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'wall_comment':
        return '💭';
      default:
        return '📝';
    }
  };

  // Получение названия типа сообщения
  const getMessageTypeName = (type: string) => {
    switch (type) {
      case 'message':
        return 'Сообщение';
      case 'wall_comment':
        return 'Комментарий';
      default:
        return 'Событие';
    }
  };

  return (
    <div className="vk-messages">
      <div className="vk-messages-header">
        <h2>📱 VK Сообщения</h2>
        <div className="vk-messages-controls">
          <button 
            onClick={loadVkMessages} 
            disabled={loading}
            className="refresh-button"
            title="Обновить сообщения"
          >
            🔄 {loading ? 'Загрузка...' : 'Обновить'}
          </button>
          {lastUpdate && (
            <span className="last-update">
              Обновлено: {formatLastUpdate(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {messages.length === 0 && !loading && !error && (
        <div className="no-messages">
          <p>📭 Нет сообщений от VK</p>
          <p className="no-messages-hint">
            Сообщения появятся здесь автоматически при получении через VK Callback API
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="messages-container">
          <div className="messages-info">
            Найдено сообщений: <strong>{messages.length}</strong> 
            <span className="auto-refresh">
              (обновление каждые {refreshInterval}с)
            </span>
          </div>

          <div className="messages-list">
            {messages.map((message) => (
              <div key={message.id} className={`message-item ${message.message_type}`}>
                <div className="message-header">
                  <div className="message-type">
                    {getMessageIcon(message.message_type)} {getMessageTypeName(message.message_type)}
                  </div>
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>

                <div className="message-content">
                  <div className="message-author">
                    👤 {message.user_name || `VK User ${message.vk_user_id}`}
                  </div>
                  
                  <div className="message-text">
                    {message.message_text || <em>Пустое сообщение</em>}
                  </div>

                  <div className="message-meta">
                    <span>ID: {message.vk_message_id}</span>
                    {message.peer_id && (
                      <span>• Диалог: {message.peer_id}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="vk-messages-footer">
        <p>🔗 Подключено к VK Callback API</p>
        <p className="connection-status">
          {loading ? '🟡 Загрузка...' : '🟢 Готов к получению сообщений'}
        </p>
      </div>
    </div>
  );
};

export default VkMessages;
