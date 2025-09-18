// Утилиты для работы с VK API

// Интерфейс для группы/сообщества VK
export interface VKGroup {
  id: number;
  name: string;
  screen_name: string;
  type: 'group' | 'page' | 'event';
  photo_50?: string;
  photo_100?: string;
  photo_200?: string;
  description?: string;
  members_count?: number;
  activity?: string;
  status?: string;
  verified?: number;
  is_closed?: number;
  is_admin?: number;
  admin_level?: number;
  is_member?: number;
  can_post?: number;
  can_see_all_posts?: number;
  can_upload_doc?: number;
  can_upload_video?: number;
  can_create_topic?: number;
  site?: string;
  [key: string]: any;
}

// Функция для выполнения JSONP запросов к VK API
const makeVKAPICall = async (method: string, params: Record<string, any>): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = `vkCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Добавляем версию API и callback
    const apiParams = {
      ...params,
      v: '5.131',
      callback: callbackName
    };
    
    // Формируем URL
    const queryString = Object.entries(apiParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const url = `https://api.vk.com/method/${method}?${queryString}`;
    
    // Создаем callback функцию
    (window as any)[callbackName] = (response: any) => {
      delete (window as any)[callbackName];
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      resolve(response);
    };
    
    // Создаем и добавляем script элемент
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
      delete (window as any)[callbackName];
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      reject(new Error('JSONP request failed'));
    };
    
    document.head.appendChild(script);
    
    // Устанавливаем таймаут
    setTimeout(() => {
      if ((window as any)[callbackName]) {
        delete (window as any)[callbackName];
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
};

// Получение управляемых групп пользователя
export const getUserManagedGroups = async (accessToken: string): Promise<VKGroup[]> => {
  try {
    console.log('Получение управляемых групп пользователя...');
    
    const response = await makeVKAPICall('groups.get', {
      access_token: accessToken,
      extended: 1,
      filter: 'admin,editor,moder', // Только группы, где пользователь админ/редактор/модератор
      fields: 'id,name,screen_name,type,photo_50,photo_100,photo_200,description,members_count,activity,status,verified,is_closed,is_admin,admin_level,is_member,can_post,can_see_all_posts,can_upload_doc,can_upload_video,can_create_topic,site'
    });
    
    console.log('Ответ VK API (управляемые группы):', response);
    
    if (response.error) {
      console.error('Ошибка VK API:', response.error);
      throw new Error(`VK API Error: ${response.error.error_msg} (код: ${response.error.error_code})`);
    }
    
    if (response.response && response.response.items) {
      const groups = response.response.items as VKGroup[];
      console.log(`Найдено ${groups.length} управляемых групп:`, groups);
      return groups;
    } else {
      console.log('Управляемые группы не найдены');
      return [];
    }
  } catch (error) {
    console.error('Ошибка при получении управляемых групп:', error);
    throw error;
  }
};

// Получение всех групп пользователя (включая обычное участие)
export const getUserGroups = async (accessToken: string): Promise<VKGroup[]> => {
  try {
    console.log('Получение всех групп пользователя...');
    
    const response = await makeVKAPICall('groups.get', {
      access_token: accessToken,
      extended: 1,
      fields: 'id,name,screen_name,type,photo_50,photo_100,photo_200,description,members_count,activity,status,verified,is_closed,is_admin,admin_level,is_member,can_post'
    });
    
    console.log('Ответ VK API (все группы):', response);
    
    if (response.error) {
      console.error('Ошибка VK API:', response.error);
      throw new Error(`VK API Error: ${response.error.error_msg} (код: ${response.error.error_code})`);
    }
    
    if (response.response && response.response.items) {
      const groups = response.response.items as VKGroup[];
      console.log(`Найдено ${groups.length} групп:`, groups);
      return groups;
    } else {
      console.log('Группы не найдены');
      return [];
    }
  } catch (error) {
    console.error('Ошибка при получении групп:', error);
    throw error;
  }
};

// Получение информации о конкретной группе
export const getGroupInfo = async (accessToken: string, groupId: number): Promise<VKGroup | null> => {
  try {
    console.log('Получение информации о группе:', groupId);
    
    const response = await makeVKAPICall('groups.getById', {
      access_token: accessToken,
      group_id: groupId,
      fields: 'id,name,screen_name,type,photo_50,photo_100,photo_200,description,members_count,activity,status,verified,is_closed,site,contacts,place,links,fixed_post,verified,site,main_album_id,links,contacts,place,description,wiki_page,main_section,secondary_section,trending,can_post,can_see_all_posts,can_upload_story,can_upload_doc,can_upload_video,can_create_topic'
    });
    
    console.log('Ответ VK API (информация о группе):', response);
    
    if (response.error) {
      console.error('Ошибка VK API:', response.error);
      throw new Error(`VK API Error: ${response.error.error_msg} (код: ${response.error.error_code})`);
    }
    
    if (response.response && response.response.length > 0) {
      const group = response.response[0] as VKGroup;
      console.log('Информация о группе получена:', group);
      return group;
    } else {
      console.log('Группа не найдена');
      return null;
    }
  } catch (error) {
    console.error('Ошибка при получении информации о группе:', error);
    throw error;
  }
};

// Утилита для определения уровня доступа в группе
export const getAccessLevelText = (adminLevel?: number): string => {
  switch (adminLevel) {
    case 1:
      return 'Модератор';
    case 2:
      return 'Редактор';
    case 3:
      return 'Администратор';
    default:
      return 'Участник';
  }
};

// Утилита для определения типа группы
export const getGroupTypeText = (type: string): string => {
  switch (type) {
    case 'group':
      return 'Группа';
    case 'page':
      return 'Публичная страница';
    case 'event':
      return 'Мероприятие';
    default:
      return 'Сообщество';
  }
};

// Интерфейс для поста VK
export interface VKPost {
  id: number;
  from_id: number;
  owner_id: number;
  date: number;
  text: string;
  attachments?: VKAttachment[];
  copy_history?: VKPost[];
  likes?: {
    count: number;
    user_likes: number;
    can_like: number;
    can_publish: number;
  };
  reposts?: {
    count: number;
    user_reposted: number;
  };
  comments?: {
    count: number;
    can_post: number;
  };
  views?: {
    count: number;
  };
  is_pinned?: number;
  marked_as_ads?: number;
  post_type?: string;
  [key: string]: any;
}

// Интерфейс для вложений VK
export interface VKAttachment {
  type: string;
  photo?: {
    id: number;
    album_id: number;
    owner_id: number;
    user_id?: number;
    photo_75: string;
    photo_130: string;
    photo_604: string;
    photo_807: string;
    photo_1280: string;
    photo_2560: string;
    width: number;
    height: number;
    text: string;
    date: number;
    access_key?: string;
  };
  video?: {
    id: number;
    owner_id: number;
    title: string;
    description: string;
    duration: number;
    image: string;
    first_frame: string;
    date: number;
    adding_date: number;
    views: number;
    comments: number;
    player: string;
    platform: string;
    can_edit: number;
    can_add: number;
    is_private: number;
    access_key: string;
    processing: number;
    live: number;
    upcoming: number;
    is_favorite: number;
  };
  audio?: {
    id: number;
    owner_id: number;
    artist: string;
    title: string;
    duration: number;
    date: number;
    url: string;
    lyrics_id: number;
    album_id: number;
    genre_id: number;
    no_search: number;
    is_hq: number;
  };
  doc?: {
    id: number;
    owner_id: number;
    title: string;
    size: number;
    ext: string;
    url: string;
    date: number;
    type: number;
    preview?: {
      photo: {
        sizes: Array<{
          src: string;
          width: number;
          height: number;
          type: string;
        }>;
      };
    };
  };
  link?: {
    url: string;
    title: string;
    description: string;
    target: string;
    photo?: {
      id: number;
      album_id: number;
      owner_id: number;
      photo_75: string;
      photo_130: string;
      photo_604: string;
      photo_807: string;
      photo_1280: string;
      photo_2560: string;
      width: number;
      height: number;
      text: string;
      date: number;
    };
  };
  [key: string]: any;
}

// Получение постов сообщества
export const getCommunityPosts = async (
  accessToken: string, 
  ownerId: number, 
  count: number = 20,
  offset: number = 0
): Promise<VKPost[]> => {
  try {
    console.log('Получение постов сообщества:', ownerId);
    
    const response = await makeVKAPICall('wall.get', {
      access_token: accessToken,
      owner_id: -ownerId, // Для сообществ owner_id должен быть отрицательным
      count: count,
      offset: offset,
      extended: 1,
      fields: 'id,first_name,last_name,photo_50,photo_100,photo_200'
    });
    
    console.log('Ответ VK API (посты сообщества):', response);
    
    if (response.error) {
      console.error('Ошибка VK API:', response.error);
      throw new Error(`VK API Error: ${response.error.error_msg} (код: ${response.error.error_code})`);
    }
    
    if (response.response && response.response.items) {
      const posts = response.response.items as VKPost[];
      console.log(`Найдено ${posts.length} постов:`, posts);
      return posts;
    } else {
      console.log('Посты не найдены');
      return [];
    }
  } catch (error) {
    console.error('Ошибка при получении постов сообщества:', error);
    throw error;
  }
};

// Утилита для форматирования даты поста
export const formatPostDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return 'только что';
  } else if (minutes < 60) {
    return `${minutes} мин. назад`;
  } else if (hours < 24) {
    return `${hours} ч. назад`;
  } else if (days < 7) {
    return `${days} дн. назад`;
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

// Утилита для получения типа вложения
export const getAttachmentTypeText = (type: string): string => {
  switch (type) {
    case 'photo':
      return 'Фотография';
    case 'video':
      return 'Видео';
    case 'audio':
      return 'Аудио';
    case 'doc':
      return 'Документ';
    case 'link':
      return 'Ссылка';
    case 'poll':
      return 'Опрос';
    case 'page':
      return 'Страница';
    default:
      return 'Вложение';
  }
};
