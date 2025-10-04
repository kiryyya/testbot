import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { loginStart, loginSuccess, loginFailure, selectAuthLoading, selectAuthError } from '../store/authSlice';
import * as VKID from '@vkid/sdk';
import './VKAuth.css';

const VKAuth = ({ onAuthSuccess }) => {
  const dispatch = useAppDispatch();
  const authLoading = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);
  
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localError, setLocalError] = useState(null);

  // Конфигурация VK ID
  const config = {
    app: 54125757, // Замените на ваш App ID
    redirectUrl: 'http://localhost',
    scope: '' // Заполните нужными доступами по необходимости
  };

  useEffect(() => {
    // Проверяем localStorage - если уже авторизован, не инициализируем VK ID
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData.isAuthenticated && authData.userId) {
          console.log('✅ Пользователь уже авторизован, пропускаем VK ID инициализацию');
          setIsLoading(false);
          return; // НЕ инициализируем VK ID!
        }
      } catch (error) {
        console.error('Ошибка при проверке сохраненной авторизации:', error);
      }
    }
    
    // Если не авторизован - инициализируем VK ID
    console.log('Пользователь не авторизован, инициализируем VK ID...');
    initializeVKAuth();
  }, []);

  // Функция для преобразования семейного положения
  const getRelationText = (relation) => {
    const relations = {
      1: 'Не женат/не замужем',
      2: 'Есть друг/подруга',
      3: 'Помолвлен/помолвлена',
      4: 'Женат/замужем',
      5: 'Всё сложно',
      6: 'В активном поиске',
      7: 'Влюблён/влюблена',
      8: 'В гражданском браке'
    };
    return relations[relation] || 'Не указано';
  };

  // Функция для получения списка друзей через JSONP
  const fetchFriends = async (accessToken, userId = null) => {
    try {
    //   setFriendsLoading(true);
      console.log('Запрос списка друзей через JSONP...');
      
      const params = new URLSearchParams({
        access_token: accessToken,
        fields: 'id,first_name,last_name,photo_100,photo_200,online,last_seen',
        // count: 20, // Получаем первые 20 друзей
        v: '5.131'
      });
      
      // Если есть userId, добавляем его в параметры
      if (userId) {
        params.append('user_id', userId);
        console.log('Получаем друзей пользователя:', userId);
      } else {
        console.log('Получаем друзей текущего пользователя');
      }
      
      const url = `https://api.vk.com/method/friends.get?${params.toString()}`;
      console.log('URL запроса друзей:', url);
      
      // Используем JSONP для обхода CORS
      const data = await new Promise((resolve, reject) => {
        const callbackName = `vkFriendsCallback_${Date.now()}`;
        window[callbackName] = (response) => {
          delete window[callbackName];
          document.head.removeChild(script);
          resolve(response);
        };
        
        const script = document.createElement('script');
        script.src = `${url}&callback=${callbackName}`;
        script.onerror = () => {
          delete window[callbackName];
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
          reject(new Error('JSONP request failed'));
        };
        
        document.head.appendChild(script);
        
        // Таймаут для JSONP
        setTimeout(() => {
          if (window[callbackName]) {
            delete window[callbackName];
            if (document.head.contains(script)) {
              document.head.removeChild(script);
            }
            reject(new Error('JSONP timeout'));
          }
        }, 10000);
      });
      
      console.log('Ответ VK API (друзья):', data);
      
      if (data.error) {
        console.error('Ошибка VK API (друзья):', data.error);
        throw new Error(`VK API Error: ${data.error.error_msg} (код: ${data.error.error_code})`);
      }
      
      if (data.response && data.response.items) {
        console.log('Список друзей получен:', data.response.items);
        // setFriends(data.response.items);
        return data.response.items;
      } else {
        throw new Error('Список друзей не найден в ответе API');
      }
    } catch (error) {
      console.error('Ошибка при запросе списка друзей:', error);
    //   setFriends([]);
      throw error;
    } finally {
    //   setFriendsLoading(false);
    }
  };

  // Функция для получения данных пользователя через VK API (только JSONP)
  const fetchUserData = async (accessToken, userId = null) => {
    try {
      console.log('Запрос данных пользователя через VK API (JSONP)...');
      console.log('Access token:', accessToken.substring(0, 20) + '...');
      console.log('User ID:', userId);
      
      // Сначала получаем базовую информацию
      let params = new URLSearchParams({
        access_token: accessToken,
        fields: 'id,first_name,last_name,photo_200,photo_100,photo_50,sex,bdate,city,country,status,about,site,domain,online,has_mobile,timezone,relation,interests,music,movies,books,games,activities,quotes,verified,is_verified,screen_name,nickname,maiden_name,home_town,followers_count,common_count,has_photo,is_friend,is_favorite,can_send_friend_request,can_write_private_message,last_seen,occupation,career,education',
        v: '5.131'
      });
      
      // Если есть userId, добавляем его в параметры
      if (userId) {
        params.append('user_ids', userId);
        console.log('Используем user_ids:', userId);
      } else {
        console.log('Получаем данные текущего пользователя (без user_ids)');
      }
      
      const url = `https://api.vk.com/method/users.get?${params.toString()}`;
      console.log('URL запроса:', url);
      
      // Используем JSONP для обхода CORS
      const data = await new Promise((resolve, reject) => {
        const callbackName = `vkUserCallback_${Date.now()}`;
        window[callbackName] = (response) => {
          delete window[callbackName];
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
          resolve(response);
        };
        
        const script = document.createElement('script');
        script.src = `${url}&callback=${callbackName}`;
        script.onerror = () => {
          delete window[callbackName];
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
          reject(new Error('JSONP request failed'));
        };
        
        document.head.appendChild(script);
        
        // Таймаут для JSONP
        setTimeout(() => {
          if (window[callbackName]) {
            delete window[callbackName];
            if (document.head.contains(script)) {
              document.head.removeChild(script);
            }
            reject(new Error('JSONP timeout'));
          }
        }, 10000);
      });
      
      console.log('Ответ VK API (JSONP):', data);

      if (data.error) {
        console.error('Ошибка VK API:', data.error);
        throw new Error(`VK API Error: ${data.error.error_msg} (код: ${data.error.error_code})`);
      }

      if (data.response && data.response.length > 0) {
        const userData = data.response[0];
        console.log('Данные пользователя получены:', userData);
        return userData;
      } else {
        throw new Error('Пользователь не найден в ответе API');
      }
    } catch (error) {
      console.error('Ошибка при запросе к VK API:', error);
      
      // Если не удалось получить данные через API, возвращаем базовую информацию
      console.log('Возвращаем базовую информацию о пользователе');
      return {
        id: 'unknown',
        first_name: 'Пользователь',
        last_name: 'VK',
        photo_200: null,
        error: error.message
      };
    }
  };

  const initializeVKAuth = async () => {
    try {
      setIsLoading(true);
      setLocalError(null);

      console.log('Инициализация VK ID...');
      console.log('Конфигурация:', config);
      console.log('Текущий URL:', window.location.href);

      // Инициализируем конфигурацию VK ID
      VKID.Config.init({
        app: config.app,
        redirectUrl: config.redirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: config.scope,
      });

      console.log('VK ID конфигурация инициализирована');

      // Создаем виджет OneTap
      const container = containerRef.current;

      if (container) {
        // Очищаем контейнер перед созданием нового виджета
        container.innerHTML = '';
        
        // Создаем виджет только если контейнер пустой
        if (container.children.length === 0) {
          const oneTap = new VKID.OneTap();
          
          oneTap
            .render({
              container: container,
              showAlternativeLogin: true
            })
            .on(VKID.WidgetEvents.ERROR, handleAuthError)
            .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, function (payload) {
              const code = payload.code;
              const deviceId = payload.device_id;

              VKID.Auth.exchangeCode(code, deviceId)
                .then(handleAuthSuccess)
                .catch(handleAuthError);
            });

          console.log('VK ID виджет инициализирован успешно');
        }
        setIsLoading(false);
      } else {
        throw new Error('Контейнер для виджета не найден');
      }

    } catch (error) {
      console.error('Ошибка инициализации VK ID:', error);
      setLocalError(`Ошибка инициализации авторизации: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (data) => {
    console.log('=== УСПЕШНАЯ АВТОРИЗАЦИЯ ===');
    console.log('Данные от VK ID:', data);
    console.log('Тип данных:', typeof data);
    console.log('Ключи в данных:', Object.keys(data));
    
    // Начинаем процесс авторизации
    dispatch(loginStart());
    
    try {
      // Проверяем, есть ли access_token
      if (!data.access_token) {
        console.error('Нет access_token в данных авторизации');
        console.log('Доступные ключи:', Object.keys(data));
        throw new Error('Access token не найден в данных авторизации');
      }
      
      console.log('Access token найден:', data.access_token.substring(0, 20) + '...');
      
      // Проверяем, есть ли userID в данных
      let userId = null;
      if (data.userID) {
        userId = data.userID;
        console.log('UserID найден в данных:', userId);
      } else if (data.user_id) {
        userId = data.user_id;
        console.log('user_id найден в данных:', userId);
      } else {
        console.log('UserID не найден в данных, будем получать данные текущего пользователя');
      }
      
      // Получаем дополнительные данные пользователя через VK API
      const userData = await fetchUserData(data.access_token, userId);
      console.log('Данные пользователя от VK API:', userData);
      
      // Объединяем данные авторизации с данными пользователя
      const fullUserData = {
        ...data,
        user: userData
      };
      
      console.log('=== ПОЛНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ===');
      console.log('Объединенные данные:', fullUserData);
      
      // Сохраняем в Redux store
      dispatch(loginSuccess({
        user: userData,
        accessToken: data.access_token,
        userId: String(userId || 'unknown')
      }));
      
      // Пробуем загрузить список друзей
      try {
        await fetchFriends(data.access_token, userId);
      } catch (friendsError) {
        console.log('Не удалось загрузить список друзей:', friendsError);
      }
      
      // Скрываем ошибки при успешной авторизации
      setLocalError(null);
      
      // Вызываем коллбэк родительского компонента
      if (onAuthSuccess) {
        onAuthSuccess(fullUserData);
      }
      
      console.log('=== АВТОРИЗАЦИЯ ЗАВЕРШЕНА ===');
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
      console.log('Сохраняем базовые данные авторизации:', data);
      
      // Сохраняем базовые данные в Redux store
      dispatch(loginSuccess({
        user: data,
        accessToken: data.access_token || '',
        userId: String(data.user_id || data.userID || 'unknown')
      }));
      
      // Вызываем коллбэк с базовыми данными
      if (onAuthSuccess) {
        onAuthSuccess(data);
      }
    }
  };

  const handleAuthError = (error) => {
    console.error('Ошибка авторизации:', error);
    
    let errorMessage = 'Произошла ошибка при авторизации';
    
    if (error && error.error) {
      switch (error.error) {
        case 'access_denied':
          errorMessage = 'Пользователь отклонил запрос авторизации';
          break;
        case 'invalid_request':
          errorMessage = 'Неверный запрос авторизации';
          break;
        case 'server_error':
          errorMessage = 'Ошибка сервера VK';
          break;
        default:
          errorMessage = `Ошибка: ${error.error}`;
      }
    } else if (error && error.message) {
      errorMessage = error.message;
    }
    
    // Сохраняем ошибку в Redux store
    dispatch(loginFailure(errorMessage));
    setLocalError(errorMessage);
  };

  const handleLogout = () => {
    // Закрываем модальное окно
    // if (onClose) {
    //   onClose();
    // }
    
    // Перезагружаем виджет
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    setTimeout(() => {
      initializeVKAuth();
    }, 100);
    
    console.log('Пользователь вышел из системы');
  };

  const handleRetryUserData = async () => {
    // if (user && user.access_token) {
    //   console.log('Повторный запрос данных пользователя...');
    //   try {
    //     // Получаем userId из сохраненных данных
    //     const userId = user.userID || user.user_id || null;
    //     dispatch(fetchUserData({ accessToken: user.access_token, userId }));
    //   } catch (error) {
    //     console.error('Ошибка при повторном запросе:', error);
    //   }
    // }
  };

  const handleLoadFriends = async () => {
    // if (user && user.access_token) {
    //   console.log('Загрузка списка друзей...');
    //   try {
    //     const userId = user.userID || user.user_id || null;
    //     dispatch(fetchFriends({ accessToken: user.access_token, userId }));
    //   } catch (error) {
    //     console.error('Ошибка при загрузке друзей:', error);
    //   }
    // }
  };

  // Проверяем сохраненные данные при загрузке
  useEffect(() => {
    console.log('=== ПРОВЕРКА СОХРАНЕННЫХ ДАННЫХ ===');
    // if (user) {
    //   console.log('Пользователь уже авторизован через Redux:', user);
    //   setIsLoading(false);
    // } else {
    //   console.log('Пользователь не авторизован, инициализируем VK ID');
    //   initializeVKAuth();
    // }
  }, []);

//   if (user) {
//     console.log('=== ОТОБРАЖЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ===');
//     console.log('Данные пользователя для отображения:', user);
//     console.log('user.user:', user.user);
    
//     return (
//       <div className="user-info">
//         <h3>Информация о пользователе:</h3>
//         <div className="user-details">
//           <div className="user-card">
//             {user.user?.photo_200 && (
//               <img 
//                 src={user.user.photo_200} 
//                 alt="Аватар" 
//                 className="user-avatar"
//               />
//             )}
            
//             {/* Дополнительные фотографии */}
//             {user.user?.photo_max_orig && user.user.photo_max_orig !== user.user.photo_200 && (
//               <div className="additional-photos">
//                 <h4>Дополнительные фото:</h4>
//                 <div className="photo-grid">
//                   {user.user.photo_50 && (
//                     <img src={user.user.photo_50} alt="Фото 50x50" className="photo-thumb" />
//                   )}
//                   {user.user.photo_100 && (
//                     <img src={user.user.photo_100} alt="Фото 100x100" className="photo-thumb" />
//                   )}
//                   {user.user.photo_400_orig && (
//                     <img src={user.user.photo_400_orig} alt="Фото 400x400" className="photo-thumb" />
//                   )}
//                   {user.user.photo_max_orig && (
//                     <img src={user.user.photo_max_orig} alt="Оригинальное фото" className="photo-thumb" />
//                   )}
//                 </div>
//               </div>
//             )}
//             <div className="user-name">
//               {user.user?.first_name && user.user?.last_name 
//                 ? `${user.user.first_name} ${user.user.last_name}`
//                 : 'Пользователь VK'
//               }
//             </div>
//             <div className="user-id">
//               ID: {user.user?.id || 'Неизвестно'}
//             </div>
            
//             {/* Показываем UserID из VK ID, если он есть */}
//             {(user.userID || user.user_id) && (
//               <div className="user-vk-id">
//                 VK ID: {user.userID || user.user_id}
//               </div>
//             )}
            
//             {/* Отображаем базовые данные авторизации, если нет данных от API */}
//             {!user.user && (
//               <div className="basic-auth-info">
//                 <div className="info-item">
//                   <strong>Статус:</strong> Авторизован через VK ID
//                 </div>
//                 <div className="info-item">
//                   <strong>Токен получен:</strong> Да
//                 </div>
//                 <div className="info-item">
//                   <strong>Данные API:</strong> Загружаются через JSONP (обход CORS)
//                 </div>
//               </div>
//             )}
            
//             {/* Показываем информацию о полученных данных */}
//             {user.user && (
//               <div className="data-info">
//                 <div className="info-item">
//                   <strong>Данные получены:</strong> 
//                   {user.user.id ? ' Да' : ' Нет'}
//                 </div>
//                 {user.user.error && (
//                   <div className="info-item">
//                     <strong>Ошибка API:</strong> {user.user.error}
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {/* Дополнительная информация о пользователе */}
//             <div className="user-additional-info">
//               {user.user?.bdate && (
//                 <div className="info-item">
//                   <strong>Дата рождения:</strong> {user.user.bdate}
//                 </div>
//               )}
              
//               {user.user?.sex && (
//                 <div className="info-item">
//                   <strong>Пол:</strong> {user.user.sex === 1 ? 'Женский' : user.user.sex === 2 ? 'Мужской' : 'Не указан'}
//                 </div>
//               )}
              
//               {user.user?.city && (
//                 <div className="info-item">
//                   <strong>Город:</strong> {user.user.city.title}
//                 </div>
//               )}
              
//               {user.user?.country && (
//                 <div className="info-item">
//                   <strong>Страна:</strong> {user.user.country.title}
//                 </div>
//               )}
              
//               {user.user?.status && (
//                 <div className="info-item">
//                   <strong>Статус:</strong> {user.user.status}
//                 </div>
//               )}
              
//               {user.user?.about && (
//                 <div className="info-item">
//                   <strong>О себе:</strong> {user.user.about}
//                 </div>
//               )}
              
//               {user.user?.site && (
//                 <div className="info-item">
//                   <strong>Сайт:</strong> 
//                   <a href={user.user.site} target="_blank" rel="noopener noreferrer">
//                     {user.user.site}
//                   </a>
//                 </div>
//               )}
              
//               {user.user?.domain && (
//                 <div className="info-item">
//                   <strong>Домен:</strong> {user.user.domain}
//                 </div>
//               )}
              
//               {user.user?.online && (
//                 <div className="info-item">
//                   <strong>Онлайн:</strong> {user.user.online ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.has_mobile && (
//                 <div className="info-item">
//                   <strong>Мобильный:</strong> {user.user.has_mobile ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.mobile_phone && (
//                 <div className="info-item">
//                   <strong>Мобильный телефон:</strong> {user.user.mobile_phone}
//                 </div>
//               )}
              
//               {user.user?.home_phone && (
//                 <div className="info-item">
//                   <strong>Домашний телефон:</strong> {user.user.home_phone}
//                 </div>
//               )}
              
//               {user.user?.skype && (
//                 <div className="info-item">
//                   <strong>Skype:</strong> {user.user.skype}
//                 </div>
//               )}
              
//               {user.user?.timezone && (
//                 <div className="info-item">
//                   <strong>Часовой пояс:</strong> {user.user.timezone}
//                 </div>
//               )}
              
//               {user.user?.relation && (
//                 <div className="info-item">
//                   <strong>Семейное положение:</strong> {getRelationText(user.user.relation)}
//                 </div>
//               )}
              
//               {user.user?.interests && (
//                 <div className="info-item">
//                   <strong>Интересы:</strong> {user.user.interests}
//                 </div>
//               )}
              
//               {user.user?.music && (
//                 <div className="info-item">
//                   <strong>Музыка:</strong> {user.user.music}
//                 </div>
//               )}
              
//               {user.user?.movies && (
//                 <div className="info-item">
//                   <strong>Фильмы:</strong> {user.user.movies}
//                 </div>
//               )}
              
//               {user.user?.books && (
//                 <div className="info-item">
//                   <strong>Книги:</strong> {user.user.books}
//                 </div>
//               )}
              
//               {user.user?.games && (
//                 <div className="info-item">
//                   <strong>Игры:</strong> {user.user.games}
//                 </div>
//               )}
              
//               {user.user?.activities && (
//                 <div className="info-item">
//                   <strong>Деятельность:</strong> {user.user.activities}
//                 </div>
//               )}
              
//               {user.user?.quotes && (
//                 <div className="info-item">
//                   <strong>Цитаты:</strong> {user.user.quotes}
//                 </div>
//               )}
              
//               {user.user?.verified && (
//                 <div className="info-item">
//                   <strong>Верифицирован:</strong> {user.user.verified ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.is_verified && (
//                 <div className="info-item">
//                   <strong>Проверен:</strong> {user.user.is_verified ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.screen_name && (
//                 <div className="info-item">
//                   <strong>Короткое имя:</strong> {user.user.screen_name}
//                 </div>
//               )}
              
//               {user.user?.nickname && (
//                 <div className="info-item">
//                   <strong>Никнейм:</strong> {user.user.nickname}
//                 </div>
//               )}
              
//               {user.user?.maiden_name && (
//                 <div className="info-item">
//                   <strong>Девичья фамилия:</strong> {user.user.maiden_name}
//                 </div>
//               )}
              
//               {user.user?.home_town && (
//                 <div className="info-item">
//                   <strong>Родной город:</strong> {user.user.home_town}
//                 </div>
//               )}
              
//               {user.user?.followers_count && (
//                 <div className="info-item">
//                   <strong>Подписчиков:</strong> {user.user.followers_count}
//                 </div>
//               )}
              
//               {user.user?.common_count && (
//                 <div className="info-item">
//                   <strong>Общих друзей:</strong> {user.user.common_count}
//                 </div>
//               )}
              
//               {user.user?.has_photo && (
//                 <div className="info-item">
//                   <strong>Есть фото:</strong> {user.user.has_photo ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.is_friend && (
//                 <div className="info-item">
//                   <strong>Друг:</strong> {user.user.is_friend ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.is_favorite && (
//                 <div className="info-item">
//                   <strong>В избранном:</strong> {user.user.is_favorite ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.can_send_friend_request && (
//                 <div className="info-item">
//                   <strong>Можно отправить заявку в друзья:</strong> {user.user.can_send_friend_request ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.can_write_private_message && (
//                 <div className="info-item">
//                   <strong>Можно писать в ЛС:</strong> {user.user.can_write_private_message ? 'Да' : 'Нет'}
//                 </div>
//               )}
              
//               {user.user?.last_seen && (
//                 <div className="info-item">
//                   <strong>Последний раз онлайн:</strong> {new Date(user.user.last_seen.time * 1000).toLocaleString()}
//                 </div>
//               )}
              
//               {user.user?.occupation && (
//                 <div className="info-item">
//                   <strong>Род деятельности:</strong> {user.user.occupation.name}
//                 </div>
//               )}
              
//               {user.user?.career && user.user.career.length > 0 && (
//                 <div className="info-item">
//                   <strong>Карьера:</strong>
//                   {user.user.career.map((job, index) => (
//                     <div key={index} style={{marginLeft: '10px', fontSize: '0.9rem'}}>
//                       {job.position} в {job.company}
//                     </div>
//                   ))}
//                 </div>
//               )}
              
//               {user.user?.education && (
//                 <div className="info-item">
//                   <strong>Образование:</strong>
//                   {user.user.education.university_name && (
//                     <div style={{marginLeft: '10px', fontSize: '0.9rem'}}>
//                       Университет: {user.user.education.university_name}
//                     </div>
//                   )}
//                   {user.user.education.faculty_name && (
//                     <div style={{marginLeft: '10px', fontSize: '0.9rem'}}>
//                       Факультет: {user.user.education.faculty_name}
//                     </div>
//                   )}
//                   {user.user.education.graduation && (
//                     <div style={{marginLeft: '10px', fontSize: '0.9rem'}}>
//                       Год окончания: {user.user.education.graduation}
//                     </div>
//                   )}
//                 </div>
//               )}
              
//               {user.user?.error && (
//                 <div className="info-item error">
//                   <strong>Ошибка API:</strong> {user.user.error}
//                   <button 
//                     onClick={() => handleRetryUserData()} 
//                     className="retry-user-data-btn"
//                   >
//                     Попробовать снова
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
          
//           {/* Информация о токене */}
//           {user.access_token && (
//             <div className="token-info">
//               <strong>Токен доступа:</strong>
//               <code className="token-code">
//                 {user.access_token.substring(0, 50)}...
//               </code>
//             </div>
//           )}
          
//           {/* Информация о разрешениях */}
//           {user.scope && (
//             <div className="scope-info">
//               <strong>Разрешения:</strong> {user.scope}
//             </div>
//           )}
//         </div>
        
//         {/* Блок со списком друзей */}
//         <div className="friends-section">
//           <div className="friends-header">
//             <h3>Список друзей</h3>
//             {!friends && !friendsLoading && (
//               <button onClick={handleLoadFriends} className="load-friends-btn">
//                 Загрузить друзей
//               </button>
//             )}
//           </div>
          
//           {friendsLoading && (
//             <div className="friends-loading">
//               <div className="loading"></div>
//               <p>Загрузка списка друзей через JSONP...</p>
//             </div>
//           )}
          
//           {friends && friends.length > 0 && (
//             <div className="friends-list">
//               <p className="friends-count">Найдено друзей: {friends.length}</p>
//               <div className="friends-grid">
//                 {friends.map((friend) => (
//                   <div key={friend.id} className="friend-card">
//                     <div className="friend-avatar">
//                       {friend.photo_100 ? (
//                         <img 
//                           src={friend.photo_100} 
//                           alt={`${friend.first_name} ${friend.last_name}`}
//                           className="friend-photo"
//                         />
//                       ) : (
//                         <div className="friend-photo-placeholder">
//                           {friend.first_name?.[0]}{friend.last_name?.[0]}
//                         </div>
//                       )}
//                       {friend.online && (
//                         <div className="online-indicator"></div>
//                       )}
//                     </div>
//                     <div className="friend-info">
//                       <div className="friend-name">
//                         {friend.first_name} {friend.last_name}
//                       </div>
//                       <div className="friend-id">ID: {friend.id}</div>
//                       {friend.online && (
//                         <div className="friend-status online">Онлайн</div>
//                       )}
//                       {friend.last_seen && !friend.online && (
//                         <div className="friend-status offline">
//                           Был(а) в сети: {new Date(friend.last_seen.time * 1000).toLocaleDateString()}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
          
//           {friends && friends.length === 0 && (
//             <div className="no-friends">
//               <p>Список друзей пуст или недоступен</p>
//             </div>
//           )}
//         </div>
        
//         <button onClick={handleLogout} className="logout-btn">
//           Выйти
//         </button>
//       </div>
//     );
//   }

  return (
    <div className="auth-form">
      <div className="auth-container">
        {/* {onClose && (
          <button 
            className="close-modal-btn" 
            onClick={onClose}
            title="Закрыть"
          >
            ×
          </button>
        )} */}
        {(isLoading || authLoading) && (
          <div className="loading-container">
            <div className="loading"></div>
            <p>Загрузка VK ID...</p>
          </div>
        )}
        
        {/* Показываем ошибку только если виджет не загрузился */}
        {(authError || localError) && !containerRef.current?.children.length && (
          <div className="error-container">
            <p className="error-message">{authError || localError}</p>
            <button onClick={initializeVKAuth} className="retry-btn">
              Попробовать снова
            </button>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          id="vk-auth"
          className="vk-auth-container"
        />
      </div>
      
      <div className="info-section">
        <h3>Преимущества входа через VK ID:</h3>
        <ul>
          <li>Быстрая авторизация в один клик</li>
          <li>Безопасность данных</li>
          <li>Двухфакторная аутентификация</li>
          <li>Вход по лицу или отпечатку пальца</li>
        </ul>
      </div>
    </div>
  );
};

export default VKAuth;
