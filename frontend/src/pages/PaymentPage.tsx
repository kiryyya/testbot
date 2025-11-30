import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import './PaymentPage.css';

const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const transactionId = searchParams.get('transactionId');
  const amount = searchParams.get('amount');
  const userId = searchParams.get('userId');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Автоматически начинаем обработку платежа через 2 секунды
    if (status === 'pending' && transactionId && amount && userId) {
      const timer = setTimeout(() => {
        handlePayment();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, transactionId, amount, userId]);

  const handlePayment = async () => {
    if (!transactionId || !amount || !userId) {
      setError('Отсутствуют необходимые параметры');
      return;
    }

    setLoading(true);
    setStatus('processing');

    try {
      // Имитируем процесс оплаты (2-3 секунды)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Зачисляем средства
      const response = await apiService.depositBalance(userId, parseFloat(amount), 'tpay');
      
      if (response.success && response.data?.balance) {
        setStatus('success');
        
        // Автоматически перенаправляем через 3 секунды
        setTimeout(() => {
          navigate('/communities');
        }, 3000);
      } else {
        setStatus('failed');
        setError(response.message || 'Ошибка при обработке платежа');
      }
    } catch (err: any) {
      setStatus('failed');
      setError(err.response?.data?.message || 'Произошла ошибка при обработке платежа');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/communities');
  };

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>Оплата</h1>
          <div className="payment-logo">💳</div>
        </div>

        <div className="payment-content">
          {status === 'pending' && (
            <div className="payment-status pending">
              <div className="status-icon">⏳</div>
              <h2>Подготовка к оплате...</h2>
              <p>Сумма: <strong>{amount} ₽</strong></p>
              <p className="test-mode-notice">🧪 Тестовый режим - платеж будет обработан автоматически</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="payment-status processing">
              <div className="status-icon spinning">💳</div>
              <h2>Обработка платежа...</h2>
              <p>Пожалуйста, подождите</p>
              <div className="loading-bar">
                <div className="loading-progress"></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="payment-status success">
              <div className="status-icon">✅</div>
              <h2>Платеж успешно обработан!</h2>
              <p>Сумма <strong>{amount} ₽</strong> зачислена на ваш счет</p>
              <p className="redirect-notice">Перенаправление через 3 секунды...</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="payment-status failed">
              <div className="status-icon">❌</div>
              <h2>Ошибка обработки платежа</h2>
              {error && <p className="error-message">{error}</p>}
              <button className="retry-btn" onClick={handlePayment}>
                Попробовать снова
              </button>
            </div>
          )}

          {status !== 'processing' && status !== 'success' && (
            <div className="payment-actions">
              <button className="cancel-btn" onClick={handleCancel}>
                Отмена
              </button>
            </div>
          )}
        </div>

        <div className="payment-footer">
          <p className="test-mode-badge">🧪 Тестовый режим</p>
          <p className="payment-info">
            В реальной интеграции здесь будет форма оплаты T-Pay
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;

