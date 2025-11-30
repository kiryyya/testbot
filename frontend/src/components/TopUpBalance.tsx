import React, { useState } from 'react';
import { apiService } from '../services/api';
import './TopUpBalance.css';

interface TopUpBalanceProps {
  userId: string;
  currentBalance: number;
  onBalanceUpdated?: (newBalance: number) => void;
  onClose?: () => void;
}

const TopUpBalance: React.FC<TopUpBalanceProps> = ({
  userId,
  currentBalance,
  onBalanceUpdated,
  onClose
}) => {
  const [amount, setAmount] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'redirect'>('direct');

  // Предустановленные суммы
  const presetAmounts = [100, 500, 1000, 2000, 5000];

  const handleAmountChange = (value: number) => {
    setAmount(value);
    setError(null);
    setSuccess(false);
  };

  const handleDeposit = async () => {
    if (amount <= 0) {
      setError('Сумма должна быть больше нуля');
      return;
    }

    if (amount < 10) {
      setError('Минимальная сумма пополнения: 10 ₽');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (paymentMethod === 'direct') {
        // Прямое пополнение (мок - сразу зачисляется)
        const response = await apiService.depositBalance(userId, amount, 'tpay');
        
        if (response.success && response.data?.balance) {
          setSuccess(true);
          if (onBalanceUpdated) {
            onBalanceUpdated(response.data.balance.balance);
          }
          
          // Автоматически закрываем через 2 секунды
          setTimeout(() => {
            if (onClose) {
              onClose();
            }
          }, 2000);
        } else {
          setError(response.message || 'Ошибка пополнения счета');
        }
      } else {
        // Редирект на платежную форму T-Pay (мок)
        const response = await apiService.initiatePayment({
          userId,
          amount,
          returnUrl: window.location.href,
          description: `Пополнение счета на ${amount} ₽`
        });

        if (response.success && response.data) {
          // Проверяем, есть ли реальный paymentUrl от T-Pay
          if (response.data.paymentUrl && !response.data.testMode) {
            // Редирект на реальную платежную форму T-Pay
            window.location.href = response.data.paymentUrl;
          } else if (response.data.testMode) {
            // Мок-режим: сразу зачисляем средства без редиректа
            setSuccess(true);
            
            // Зачисляем средства
            const depositResponse = await apiService.depositBalance(userId, amount, 'tpay');
            if (depositResponse.success && depositResponse.data?.balance && onBalanceUpdated) {
              onBalanceUpdated(depositResponse.data.balance.balance);
            }
            
            // Автоматически закрываем через 2 секунды
            setTimeout(() => {
              if (onClose) {
                onClose();
              }
            }, 2000);
          } else {
            // Нет paymentUrl и не мок-режим - ошибка
            const errorMsg = response.message || 'Ошибка инициализации платежа: не получен paymentUrl';
            setError(errorMsg);
            console.error('Ошибка инициализации платежа:', response);
          }
        } else {
          // Ошибка инициализации
          const errorMsg = response.message || response.data?.error?.message || 'Ошибка инициализации платежа';
          setError(errorMsg);
          console.error('Ошибка инициализации платежа:', response);
        }
      }
    } catch (err: any) {
      console.error('Ошибка пополнения счета:', err);
      setError(err.response?.data?.message || 'Произошла ошибка при пополнении счета');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="top-up-balance">
      <div className="top-up-balance-header">
        <h2>Пополнить счет</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="top-up-balance-content">
        <div className="current-balance">
          <span className="balance-label">Текущий баланс:</span>
          <span className="balance-amount">{currentBalance.toFixed(2)} ₽</span>
        </div>

        <div className="amount-section">
          <label className="amount-label">Сумма пополнения</label>
          
          <div className="preset-amounts">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                className={`preset-amount-btn ${amount === preset ? 'active' : ''}`}
                onClick={() => handleAmountChange(preset)}
                disabled={loading}
              >
                {preset} ₽
              </button>
            ))}
          </div>

          <div className="custom-amount">
            <input
              type="number"
              className="amount-input"
              value={amount || ''}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="Введите сумму"
              min="10"
              step="10"
              disabled={loading}
            />
            <span className="currency">₽</span>
          </div>
        </div>

        <div className="payment-method-section">
          <label className="payment-method-label">Способ оплаты</label>
          <div className="payment-method-options">
            <label className="payment-method-option">
              <input
                type="radio"
                name="paymentMethod"
                value="direct"
                checked={paymentMethod === 'direct'}
                onChange={() => setPaymentMethod('direct')}
                disabled={loading}
              />
              <span>Мгновенное пополнение (тест)</span>
            </label>
            <label className="payment-method-option">
              <input
                type="radio"
                name="paymentMethod"
                value="redirect"
                checked={paymentMethod === 'redirect'}
                onChange={() => setPaymentMethod('redirect')}
                disabled={loading}
              />
              <span>Редирект на T-Pay (тест)</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            ✅ Счет успешно пополнен на {amount} ₽
          </div>
        )}

        <div className="top-up-actions">
          <button
            className="deposit-btn"
            onClick={handleDeposit}
            disabled={loading || amount <= 0}
          >
            {loading ? 'Обработка...' : `Пополнить на ${amount} ₽`}
          </button>
          
          {onClose && (
            <button
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
          )}
        </div>

        <div className="payment-info">
          <p className="info-text">
            💳 В тестовом режиме используется мок-интеграция T-Pay.
            Платежи обрабатываются мгновенно без реального списания средств.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TopUpBalance;

