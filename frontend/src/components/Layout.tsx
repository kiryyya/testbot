import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import AuthStatus from './AuthStatus';
import { useTheme } from '../hooks/useTheme';
import './Layout.css';

interface LayoutProps {
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDarkMode } = useTheme();

  // Закрываем сайдбар на мобильных устройствах по умолчанию
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`layout ${isDarkMode ? 'dark-mode' : ''}`}>
      <Header showNavigation={true} alwaysShowBackground={true} onLogoutClick={onLogout} />
      
      <main className="layout-main">
        <div className="layout-content">
          <div className="layout-header">
            <AuthStatus />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
