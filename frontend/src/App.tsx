import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import LoginPage from './pages/LoginPage';
import { useAppDispatch, useAppSelector } from './store';
import { loginSuccess, logout, restoreAuth, selectIsAuthenticated } from './store/authSlice';
import './App.css';

function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Восстанавливаем авторизацию из localStorage при запуске приложения
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData.isAuthenticated && authData.user && authData.accessToken) {
          dispatch(restoreAuth({
            user: authData.user,
            accessToken: authData.accessToken,
            userId: authData.userId,
            authMethod: authData.authMethod,
          }));
          console.log('Авторизация восстановлена из localStorage:', authData);
        }
      } catch (error) {
        console.error('Ошибка при восстановлении авторизации:', error);
        localStorage.removeItem('auth');
      }
    }
  }, [dispatch]);

  const handleVKLogin = (vkUserData: any) => {
    console.log('VK авторизация успешна:', vkUserData);
    
    // Извлекаем нужные данные из ответа VK
    const userData = vkUserData.user || vkUserData;
    const accessToken = vkUserData.access_token || '';
    const userId = vkUserData.userID || vkUserData.user_id || userData.id || '';

    // Сохраняем в Redux store
    dispatch(loginSuccess({
      user: userData,
      accessToken: accessToken,
      userId: String(userId),
    }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  // Если пользователь не авторизован, показываем страницу входа
  if (!isAuthenticated) {
    return <LoginPage onVKLogin={handleVKLogin} />;
  }

  // Если авторизован, показываем основное приложение
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout onLogout={handleLogout} />}>
            <Route index element={<HomePage />} />
            <Route path="admin" element={<AdminPanel />} />
            {/* Заглушки для остальных страниц */}
            <Route path="communities" element={<CommunitiesPage />} />
            <Route path="communities/:communityId" element={<CommunityDetailPage />} />
            <Route path="vk-messages" element={<div style={{padding: '30px'}}><h2>VK Сообщения</h2><p>Страница в разработке...</p></div>} />
            <Route path="analytics" element={<div style={{padding: '30px'}}><h2>Аналитика</h2><p>Страница в разработке...</p></div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;