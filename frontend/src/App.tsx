import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="admin" element={<AdminPanel />} />
            {/* Заглушки для остальных страниц */}
            <Route path="users" element={<div style={{padding: '30px'}}><h2>👥 Пользователи</h2><p>Страница в разработке...</p></div>} />
            <Route path="vk-messages" element={<div style={{padding: '30px'}}><h2>💬 VK Сообщения</h2><p>Страница в разработке...</p></div>} />
            <Route path="analytics" element={<div style={{padding: '30px'}}><h2>📊 Аналитика</h2><p>Страница в разработке...</p></div>} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;