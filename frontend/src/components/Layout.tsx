import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AuthStatus from './AuthStatus';
import './Layout.css';

interface LayoutProps {
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} onLogout={onLogout} />
      
      <main className={`layout-main ${sidebarOpen ? 'layout-main-shifted' : 'layout-main-full'}`}>
        <div className="layout-content">
          <AuthStatus />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
