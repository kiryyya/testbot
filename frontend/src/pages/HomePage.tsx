import React, { useState, useEffect } from 'react';
import UserForm from '../components/UserForm';
import DataList from '../components/DataList';
import VkMessages from '../components/VkMessages';
import VkLikesCounter from '../components/VkLikesCounter';
import { apiService } from '../services/api';
import { UserData } from '../types';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<UserData | null>(null);
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

  // Создать новую запись
  const handleSubmit = async (formData: Omit<UserData, 'id' | 'created_at' | 'updated_at'>) => {
    setSubmitLoading(true);
    try {
      if (editingItem) {
        // Обновление существующей записи
        const response = await apiService.updateData(editingItem.id!, formData);
        if (response.success) {
          showNotification('Данные успешно обновлены!', 'success');
          setEditingItem(null);
          await loadData();
        }
      } else {
        // Создание новой записи
        const response = await apiService.createData(formData);
        if (response.success) {
          showNotification('Данные успешно сохранены!', 'success');
          await loadData();
        }
      }
    } catch (error: any) {
      console.error('Ошибка при сохранении:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка при сохранении данных';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Редактировать запись
  const handleEdit = (item: UserData) => {
    setEditingItem(item);
    // Прокрутка к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Отменить редактирование
  const handleCancelEdit = () => {
    setEditingItem(null);
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
        
        // Если удаляем редактируемую запись, сбрасываем форму
        if (editingItem?.id === id) {
          setEditingItem(null);
        }
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
        <p>Система управления данными и интеграция с VK Callback API</p>
        <div className="features-badges">
          <span className="badge">FORMS</span>
          <span className="badge">VK MESSAGES</span>
          <span className="badge">VK LIKES</span>
          <span className="badge">REAL-TIME</span>
          <span className="badge">DATABASE</span>
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
        {/* Форма */}
        <section>
          <UserForm
            onSubmit={handleSubmit}
            initialData={editingItem || undefined}
            isEditing={!!editingItem}
            loading={submitLoading}
          />
          
          {editingItem && (
            <div className="editing-controls">
              <button onClick={handleCancelEdit} className="cancel-button">
                Отменить редактирование
              </button>
            </div>
          )}
        </section>

        {/* VK Счетчик лайков */}
        <section>
          <VkLikesCounter refreshInterval={5} />
        </section>

        {/* VK Сообщения */}
        <section>
          <VkMessages refreshInterval={10} />
        </section>

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
