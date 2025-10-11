import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
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

  // Навигационные элементы
  const menuItems = [
    // {
    //   path: '/',
    //   name: 'Главная',
    //   icon: '🏠'
    // },
    // {
    //   path: '/game-settings',
    //   name: 'Настройки игры',
    //   icon: '🎮'
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

  // Определяем, нужно ли показывать фон
  const shouldShowBackground = alwaysShowBackground || isScrolled;

  return (
    <header className={`header ${isDarkMode ? 'dark-mode' : ''} ${shouldShowBackground ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">TB</div>
          <span className="logo-text">TestBot</span>
        </div>
        
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
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
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
      </div>
    </header>
  );
};

export default Header;
