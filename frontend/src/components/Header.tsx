import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../store/authSlice';
import { apiService } from '../services/api';
import TopUpBalance from './TopUpBalance';
import './Header.css';

interface HeaderProps {
  showNavigation?: boolean;
  alwaysShowBackground?: boolean;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onLogoutClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  showNavigation = false, 
  alwaysShowBackground = false,
  onLoginClick, 
  onSignupClick,
  onLogoutClick 
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Навигационные элементы
  const menuItems = [
    // {
    //   path: '/',
    //   name: 'Главная',
    //   icon: 'home'
    // },
    // {
    //   path: '/game-settings',
    //   name: 'Настройки игры',
    //   icon: 'game'
    // },
    {
      path: '/communities',
      name: 'Сообщества',
      icon: ''
    }
  ];

  // Отслеживание скролла для хедера
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Загрузка баланса пользователя
  useEffect(() => {
    const loadBalance = async () => {
      if (!isAuthenticated || !user?.id) return;
      
      try {
        setLoadingBalance(true);
        const response = await apiService.getUserBalance(String(user.id));
        if (response.success && response.data) {
          setBalance(response.data.balance);
        }
      } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
      } finally {
        setLoadingBalance(false);
      }
    };

    loadBalance();
    
    // Обновляем баланс каждые 30 секунд
    const interval = setInterval(loadBalance, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  const handleBalanceUpdated = (newBalance: number) => {
    setBalance(newBalance);
  };

  // Определяем, нужно ли показывать фон
  const shouldShowBackground = alwaysShowBackground || isScrolled;

  return (
    <header className={`header ${isDarkMode ? 'dark-mode' : ''} ${shouldShowBackground ? 'scrolled' : ''}`}>
      <div className="header-content">
        <Link to="/" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-icon">TB</div>
          <span className="logo-text">TestBot</span>
        </Link>
        
        {showNavigation && (
          <nav className="header-nav">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        )}
        
        <div className="header-actions">
          {isAuthenticated && user?.id && (
            <div className="balance-widget">
              <div className="balance-display">
                <span className="balance-label">Баланс:</span>
                <span className="balance-value">
                  {loadingBalance ? '...' : `${balance.toFixed(2)} ₽`}
                </span>
              </div>
              <button 
                className="top-up-btn"
                onClick={() => setShowTopUpModal(true)}
                title="Пополнить счет"
              >
                💰
              </button>
            </div>
          )}
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀' : '🌙'}
          </button>
          {onLoginClick && (
            <button className="login-btn" onClick={onLoginClick}>Войти</button>
          )}
          {onSignupClick && (
            <button className="signup-btn" onClick={onSignupClick}>Регистрация</button>
          )}
          {onLogoutClick && (
            <button className="logout-btn" onClick={onLogoutClick}>Выйти</button>
          )}
        </div>
        
        {showTopUpModal && user?.id && (
          <div className="modal-overlay" onClick={() => setShowTopUpModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <TopUpBalance
                userId={String(user.id)}
                currentBalance={balance}
                onBalanceUpdated={handleBalanceUpdated}
                onClose={() => setShowTopUpModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
