import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{email: string; password: string} | null>(null);

  const handleLogin = (credentials: {email: string; password: string}) => {
    // Простая мок авторизация - принимаем любые данные
    setUser(credentials);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  // Если пользователь не авторизован, показываем страницу входа
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Если авторизован, показываем основное приложение
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout onLogout={handleLogout} user={user} />}>
            <Route index element={<HomePage />} />
            <Route path="admin" element={<AdminPanel />} />
            {/* Заглушки для остальных страниц */}
            <Route path="users" element={<div style={{padding: '30px'}}><h2>Пользователи</h2><p>Страница в разработке...</p></div>} />
            <Route path="vk-messages" element={<div style={{padding: '30px'}}><h2>VK Сообщения</h2><p>Страница в разработке...</p></div>} />
            <Route path="analytics" element={<div style={{padding: '30px'}}><h2>Аналитика</h2><p>Страница в разработке...</p></div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;