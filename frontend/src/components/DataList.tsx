import React from 'react';
import { UserData } from '../types';
import './DataList.css';

interface DataListProps {
  data: UserData[];
  onEdit: (item: UserData) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const DataList: React.FC<DataListProps> = ({ data, onEdit, onDelete, loading = false }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="data-list">
        <h2>Загрузка данных...</h2>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="data-list">
        <h2>Сохраненные данные</h2>
        <div className="no-data">
          <p>Нет сохраненных записей</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-list">
      <h2>Сохраненные данные ({data.length})</h2>
      <div className="data-grid">
        {data.map((item) => (
          <div key={item.id} className="data-card">
            <div className="card-header">
              <h3>{item.name}</h3>
              <div className="card-actions">
                <button
                  onClick={() => onEdit(item)}
                  className="edit-button"
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(item.id!)}
                  className="delete-button"
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="card-content">
              <div className="info-row">
                <strong>Email:</strong> 
                <a href={`mailto:${item.email}`}>{item.email}</a>
              </div>
              
              {item.phone && (
                <div className="info-row">
                  <strong>Телефон:</strong> 
                  <a href={`tel:${item.phone}`}>{item.phone}</a>
                </div>
              )}
              
              {item.message && (
                <div className="info-row">
                  <strong>Сообщение:</strong>
                  <p className="message-text">{item.message}</p>
                </div>
              )}
              
              <div className="info-row">
                <strong>ID:</strong>
                <span className="id-text">{item.id}</span>
              </div>
              
              {item.created_at && (
                <div className="info-row">
                  <strong>Создано:</strong>
                  <span className="date-text">{formatDate(item.created_at)}</span>
                </div>
              )}
              
              {item.updated_at && item.updated_at !== item.created_at && (
                <div className="info-row">
                  <strong>Обновлено:</strong>
                  <span className="date-text">{formatDate(item.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataList;
