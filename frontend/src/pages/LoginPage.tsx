import React, { useState } from 'react';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onLogin({ email: email.trim(), password: password.trim() });
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-info">
          <h1>TestBot Dashboard</h1>
          <p className="subtitle">Система управления и аналитики</p>
          
          <div className="features">
            <div className="feature">
              <div className="feature-icon">👥</div>
              <h3>Управление пользователями</h3>
              <p>Полный контроль над пользователями системы, их ролями и правами доступа</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">💬</div>
              <h3>VK интеграция</h3>
              <p>Мониторинг сообщений, лайков и взаимодействий в социальной сети ВКонтакте</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">📊</div>
              <h3>Аналитика</h3>
              <p>Детальная статистика и отчеты по активности пользователей и эффективности</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">⚙️</div>
              <h3>Администрирование</h3>
              <p>Гибкие настройки системы и расширенные возможности управления</p>
            </div>
          </div>
        </div>

        <div className="login-form-container">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Вход в систему</h2>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите ваш email"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className={`login-button ${isFormValid ? 'active' : 'disabled'}`}
              disabled={!isFormValid}
            >
              Войти в систему
            </button>
            
            <p className="login-hint">
              * Для демонстрации введите любые данные в оба поля
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
