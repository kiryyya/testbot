import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import './UserAvatar.css';

const UserAvatar = ({ user }) => {
  const dispatch = useDispatch();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAvatarClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    dispatch(logout());
    setShowDropdown(false);
  };

  return (
    <div className="user-avatar-container">
      <div 
        className="user-avatar" 
        onClick={handleAvatarClick}
        title={`${user.first_name} ${user.last_name}`}
      >
        {user.photo_50 ? (
          <img 
            src={user.photo_50} 
            alt={`${user.first_name} ${user.last_name}`}
            className="avatar-image"
          />
        ) : (
          <div className="avatar-placeholder">
            {user.first_name ? user.first_name[0].toUpperCase() : 'U'}
          </div>
        )}
      </div>
      
      {showDropdown && (
        <div className="user-dropdown">
          <div className="user-info">
            <div className="user-name">
              {user.first_name} {user.last_name}
            </div>
            <div className="user-id">
              ID: {user.id}
            </div>
          </div>
          <div className="dropdown-divider"></div>
          <button 
            className="logout-button"
            onClick={handleLogout}
          >
            Выйти
          </button>
        </div>
      )}
      
      {showDropdown && (
        <div 
          className="dropdown-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default UserAvatar;
