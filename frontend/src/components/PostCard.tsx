import React from 'react';
import { VKPost, formatPostDate, getAttachmentTypeText } from '../services/vkApi';
import './PostCard.css';

interface PostCardProps {
  post: VKPost;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  // Обработка текста поста
  const formatPostText = (text: string): string => {
    if (!text) return '';
    
    // Заменяем переносы строк на <br>
    return text.replace(/\n/g, '<br>');
  };

  // Получение лучшего размера фото
  const getBestPhotoSize = (photo: any): string => {
    if (photo.photo_2560) return photo.photo_2560;
    if (photo.photo_1280) return photo.photo_1280;
    if (photo.photo_807) return photo.photo_807;
    if (photo.photo_604) return photo.photo_604;
    if (photo.photo_130) return photo.photo_130;
    return photo.photo_75;
  };

  // Рендер вложений
  const renderAttachments = () => {
    if (!post.attachments || post.attachments.length === 0) {
      return null;
    }

    return (
      <div className="post-attachments">
        {post.attachments.map((attachment, index) => (
          <div key={index} className="attachment">
            {attachment.type === 'photo' && attachment.photo && (
              <div className="attachment-photo">
                <img 
                  src={getBestPhotoSize(attachment.photo)} 
                  alt="Фото из поста"
                  className="attachment-image"
                />
                {attachment.photo.text && (
                  <div className="photo-text">{attachment.photo.text}</div>
                )}
              </div>
            )}
            
            {attachment.type === 'video' && attachment.video && (
              <div className="attachment-video">
                <div className="video-preview">
                  <img 
                    src={attachment.video.image} 
                    alt={attachment.video.title}
                    className="video-thumbnail"
                  />
                  <div className="video-play-button">▶</div>
                  <div className="video-duration">
                    {Math.floor(attachment.video.duration / 60)}:
                    {String(attachment.video.duration % 60).padStart(2, '0')}
                  </div>
                </div>
                <div className="video-info">
                  <div className="video-title">{attachment.video.title}</div>
                  {attachment.video.description && (
                    <div className="video-description">{attachment.video.description}</div>
                  )}
                </div>
              </div>
            )}
            
            {attachment.type === 'audio' && attachment.audio && (
              <div className="attachment-audio">
                <div className="audio-icon">🎵</div>
                <div className="audio-info">
                  <div className="audio-title">{attachment.audio.title}</div>
                  <div className="audio-artist">{attachment.audio.artist}</div>
                </div>
                <div className="audio-duration">
                  {Math.floor(attachment.audio.duration / 60)}:
                  {String(attachment.audio.duration % 60).padStart(2, '0')}
                </div>
              </div>
            )}
            
            {attachment.type === 'doc' && attachment.doc && (
              <div className="attachment-doc">
                <div className="doc-icon">📄</div>
                <div className="doc-info">
                  <div className="doc-title">{attachment.doc.title}</div>
                  <div className="doc-meta">
                    {attachment.doc.ext.toUpperCase()} • 
                    {(attachment.doc.size / 1024 / 1024).toFixed(1)} МБ
                  </div>
                </div>
              </div>
            )}
            
            {attachment.type === 'link' && attachment.link && (
              <div className="attachment-link">
                {attachment.link.photo && (
                  <img 
                    src={attachment.link.photo.photo_604} 
                    alt=""
                    className="link-image"
                  />
                )}
                <div className="link-content">
                  <div className="link-title">{attachment.link.title}</div>
                  <div className="link-description">{attachment.link.description}</div>
                  <div className="link-url">{attachment.link.url}</div>
                </div>
              </div>
            )}
            
            {/* Общий рендер для других типов вложений */}
            {!['photo', 'video', 'audio', 'doc', 'link'].includes(attachment.type) && (
              <div className="attachment-other">
                <div className="other-icon">
                  {attachment.type === 'poll' ? '📊' : 
                   attachment.type === 'page' ? '📄' : '📎'}
                </div>
                <div className="other-info">
                  <div className="other-type">{getAttachmentTypeText(attachment.type)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`post-card ${post.is_pinned ? 'pinned' : ''}`}>
      {/* Заголовок поста */}
      <div className="post-header">
        <div className="post-meta">
          <div className="post-date">
            {formatPostDate(post.date)}
            {post.is_pinned && (
              <span className="pinned-badge" title="Закрепленный пост">
                📌
              </span>
            )}
          </div>
          {post.marked_as_ads && (
            <span className="ads-badge" title="Реклама">
              Реклама
            </span>
          )}
        </div>
      </div>

      {/* Текст поста */}
      {post.text && (
        <div 
          className="post-text"
          dangerouslySetInnerHTML={{ __html: formatPostText(post.text) }}
        />
      )}

      {/* Вложения */}
      {renderAttachments()}

      {/* Репосты */}
      {post.copy_history && post.copy_history.length > 0 && (
        <div className="post-reposts">
          <div className="repost-header">
            <span className="repost-icon">🔄</span>
            <span>Репост</span>
          </div>
          {post.copy_history.map((repost, index) => (
            <div key={index} className="repost-content">
              {repost.text && (
                <div 
                  className="repost-text"
                  dangerouslySetInnerHTML={{ __html: formatPostText(repost.text) }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Статистика поста */}
      <div className="post-stats">
        <div className="stats-row">
          {post.likes && (
            <div className="stat-item">
              <span className="stat-icon">❤️</span>
              <span className="stat-count">{post.likes.count}</span>
            </div>
          )}
          
          {post.comments && (
            <div className="stat-item">
              <span className="stat-icon">💬</span>
              <span className="stat-count">{post.comments.count}</span>
            </div>
          )}
          
          {post.reposts && (
            <div className="stat-item">
              <span className="stat-icon">🔄</span>
              <span className="stat-count">{post.reposts.count}</span>
            </div>
          )}
          
          {post.views && (
            <div className="stat-item">
              <span className="stat-icon">👁️</span>
              <span className="stat-count">{post.views.count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
