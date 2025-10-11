import React from 'react';
import { useAppSelector } from '../store';
import { selectAuth } from '../store/authSlice';
import './AuthStatus.css';

interface AuthStatusProps {
  className?: string;
}

const AuthStatus: React.FC<AuthStatusProps> = ({ className = '' }) => {
  const authState = useAppSelector(selectAuth);
  const { isAuthenticated, user, authMethod } = authState;

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
    {/* <div className={`auth-status ${className}`}> */}
      {/* <div className="auth-status-header">
        <span className="auth-method-badge">
          {authMethod === 'vk' ? 'VK ID' : 'Авторизован'}
        </span>
      </div> */}
      
      {/* <div className="user-info">
        {user.photo_100 && (
          <img 
            src={user.photo_100} 
            alt="Аватар пользователя" 
            className="user-avatar-small"
          />
        )}
        
        <div className="user-details">
          <div className="user-name">
            {user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}`
              : 'Пользователь VK'
            }
          </div>
          {user.id && (
            <div className="user-id">ID: {user.id}</div>
          )}
          {user.domain && (
            <div className="user-domain">@{user.domain}</div>
          )}
          {/* Статус online не отображается, т.к. VK ID SDK не возвращает точные данные */}
        {/* </div> */}
      {/* </div>  */}
    {/* </div> */}
    </>
  );
};

export default AuthStatus;
