import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VKGroup, getAccessLevelText, getGroupTypeText } from '../services/vkApi';
import './CommunityCard.css';

interface CommunityCardProps {
  community: VKGroup;
  onClick?: (community: VKGroup) => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onClick }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // Используем навигацию к странице сообщества
    navigate(`/communities/${community.id}`);
    
    // Оставляем возможность для дополнительного обработчика
    if (onClick) {
      onClick(community);
    }
  };

  const handleOpenVK = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://vk.com/${community.screen_name || `club${community.id}`}`;
    window.open(url, '_blank');
  };

  return (
    <div className="community-card" onClick={handleClick}>
      <div className="community-card-header">
        <div className="community-avatar">
          {community.photo_100 ? (
            <img 
              src={community.photo_100} 
              alt={community.name}
              className="community-avatar-img"
            />
          ) : (
            <div className="community-avatar-placeholder">
              {community.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Значки статуса */}
          <div className="community-badges">
            {community.verified === 1 && (
              <div className="badge verified" title="Верифицированное сообщество">
                ✓
              </div>
            )}
            {community.is_closed === 0 && (
              <div className="badge open" title="Открытое сообщество">
                🌐
              </div>
            )}
            {community.is_closed === 1 && (
              <div className="badge closed" title="Закрытое сообщество">
                🔒
              </div>
            )}
            {community.is_closed === 2 && (
              <div className="badge private" title="Частное сообщество">
                🔐
              </div>
            )}
          </div>
        </div>
        
        <div className="community-info">
          <h3 className="community-name" title={community.name}>
            {community.name}
          </h3>
          
          <div className="community-meta">
            <span className="community-type">
              {getGroupTypeText(community.type)}
            </span>
            
            {community.admin_level && (
              <span className="community-role">
                • {getAccessLevelText(community.admin_level)}
              </span>
            )}
          </div>
          
          <div className="community-stats">
            {community.members_count && (
              <span className="stat">
                👥 {community.members_count.toLocaleString()}
              </span>
            )}
            
            {community.screen_name && (
              <span className="stat">
                🔗 @{community.screen_name}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {community.description && (
        <div className="community-description">
          {community.description.length > 150 
            ? `${community.description.substring(0, 150)}...`
            : community.description
          }
        </div>
      )}
      
      {community.activity && (
        <div className="community-activity">
          <strong>Деятельность:</strong> {community.activity}
        </div>
      )}
      
      <div className="community-actions">
        <div className="community-permissions">
          {community.can_post === 1 && (
            <span className="permission" title="Можно публиковать записи">
              ✏️ Постинг
            </span>
          )}
          {community.can_see_all_posts === 1 && (
            <span className="permission" title="Видны все записи">
              👁️ Все записи
            </span>
          )}
          {community.can_upload_video === 1 && (
            <span className="permission" title="Можно загружать видео">
              🎥 Видео
            </span>
          )}
          {community.can_upload_doc === 1 && (
            <span className="permission" title="Можно загружать документы">
              📄 Документы
            </span>
          )}
        </div>
        
        <button 
          className="open-vk-btn"
          onClick={handleOpenVK}
          title="Открыть в ВКонтакте"
        >
          Открыть в VK
        </button>
      </div>
    </div>
  );
};

export default CommunityCard;
