import React, { useState } from 'react';
import Header from '../components/Header';
import './LoginPage.css';
import VKAuth from '../components/VKAuth';

interface LoginPageProps {
  onVKLogin: (userData: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onVKLogin }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
  };

  const handleAuthSuccess = (userData: any) => {
    setIsLoginModalOpen(false);
    onVKLogin(userData);
  };


  return (
    <div className="login-page">
      {/* Header */}
      <Header 
        showNavigation={false}
        onLoginClick={handleLoginClick}
      />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span>10,000+ КОМАНД ПО ВСЕМУ МИРУ</span>
          </div>
          
          <h1 className="hero-title">
            Ускорьте работу с <span className="highlight">умной автоматизацией AI</span>
          </h1>
          
          <p className="hero-description">
            Ускоряйте закрытие сделок с помощью AI-инсайтов, прогнозной аналитики и бесшовных рабочих процессов — все на доверенной платформе.
          </p>
          
          {/* <div className="hero-actions">
            <button className="cta-primary">Начать бесплатно</button>
            <button className="cta-secondary">Запросить демо</button>
          </div> */}
        </div>
      </section>

      {/* Stats Cards */}
      {/* <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">📈</div>
              <div className="stat-controls">
                <span>□</span>
                <span>✏️</span>
                <span>⋯</span>
              </div>
            </div>
            <div className="stat-chart">
              <div className="chart-line"></div>
              <div className="chart-point"></div>
              <div className="chart-label">↑12% vs прошлый месяц</div>
            </div>
            <div className="chart-dates">
              <span>17-21</span>
              <span>24-28</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-pattern"></div>
            <div className="stat-content">
              <div className="stat-number">150,000+</div>
              <div className="stat-text">Пользователей полагаются ежедневно</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-avatar">
              <div className="avatar-image">👨‍💼</div>
            </div>
            <div className="stat-content">
              <div className="stat-number">500+</div>
              <div className="stat-text">Предприятий подключено</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-vr">
              <div className="vr-image">🥽</div>
            </div>
            <div className="stat-content">
              <div className="stat-number">10,000+</div>
              <div className="stat-text">Команд по всему миру</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-balance">
              <div className="balance-label">Баланс</div>
              <div className="balance-amount">$72,840.00</div>
              <div className="balance-status">
                <div className="status-indicator"></div>
                <span>Активно</span>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Login Form Modal */}
      {isLoginModalOpen && (
        <div className="login-form-overlay" onClick={handleCloseModal}>
          <div className="login-form-container" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={handleCloseModal}>×</button>
            <div className="vk-auth-wrapper">
              <h2>Авторизация через VK ID</h2>
              <p className="auth-description">
                Войдите в систему с помощью безопасной авторизации VK ID
              </p>
              <VKAuth onAuthSuccess={handleAuthSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
