import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/',
      name: 'Главная',
      icon: '🏠'
    },
    {
      path: '/admin',
      name: 'Админ панель',
      icon: '⚙️'
    },
    {
      path: '/users',
      name: 'Пользователи',
      icon: '👥'
    },
    {
      path: '/vk-messages',
      name: 'VK Сообщения',
      icon: '💬'
    },
    {
      path: '/analytics',
      name: 'Аналитика',
      icon: '📊'
    }
  ];

  return (
    <>
      {/* Overlay для мобильных устройств */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
      
      {/* Сайдбар */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            {isOpen && 'Панель управления'}
          </h2>
          <button 
            className="sidebar-toggle" 
            onClick={toggleSidebar}
            aria-label="Переключить меню"
          >
            {isOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
              <li key={item.path} className="sidebar-menu-item">
                <Link
                  to={item.path}
                  className={`sidebar-link ${
                    location.pathname === item.path ? 'sidebar-link-active' : ''
                  }`}
                  title={!isOpen ? item.name : ''}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  {isOpen && <span className="sidebar-text">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          {isOpen && (
            <div className="sidebar-user">
              <span className="sidebar-user-icon">👤</span>
              <span className="sidebar-user-name">Администратор</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
