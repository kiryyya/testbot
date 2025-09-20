import React, { useState, useEffect } from 'react';
import DataList from '../components/DataList';
import { apiService } from '../services/api';
import { UserData } from '../types';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Показать уведомление
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Загрузить все данные
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAllData();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      showNotification('Ошибка при загрузке данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Редактировать запись
  const handleEdit = (item: UserData) => {
    // Прокрутка к началу страницы
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Удалить запись
  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      const response = await apiService.deleteData(id);
      if (response.success) {
        showNotification('Запись успешно удалена!', 'success');
        await loadData();
      }
    } catch (error: any) {
      console.error('Ошибка при удалении:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка при удалении записи';
      showNotification(errorMessage, 'error');
    }
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>TestBot - Marketing Project</h1>
        <p>Система управления данными</p>
        <div className="features-badges">
          <span className="badge">DATABASE</span>
          <span className="badge">REAL-TIME</span>
        </div>
      </header>

      {/* Уведомления */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <main className="home-main">
        {/* Список данных */}
        <section>
          <DataList
            data={data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </section>
      </main>

      <footer className="home-footer">
        <p>Проект на React + Node.js + PostgreSQL</p>
      </footer>
    </div>
  );
};

export default HomePage;
