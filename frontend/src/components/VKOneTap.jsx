import React, { useEffect, useRef } from 'react';
import * as VKID from '@vkid/sdk';
import './VKOneTap.css';

const VKOneTap = () => {
  const containerRef = useRef(null);
  const oneTapRef = useRef(null);

  useEffect(() => {
    const initializeVKAuth = async () => {
      try {
        console.log('Инициализация VK OneTap в хедере...');
        
        // Очищаем контейнер перед созданием нового виджета
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        
        // Конфигурация VK ID
        const config = {
          app: 54125757,
          redirectUrl: 'http://localhost',
          scope: ''
        };

        // Инициализируем VK ID SDK
        await VKID.Config.init(config);
        console.log('VK ID SDK инициализирован');

        // Создаем OneTap виджет только если контейнер пустой
        if (containerRef.current && containerRef.current.children.length === 0) {
          const oneTap = new VKID.OneTap();
          oneTapRef.current = oneTap;
          
          // Рендерим виджет в контейнер
          oneTap.render({
            container: containerRef.current,
            showAlternativeLogin: false, // Скрываем альтернативную кнопку входа
            // scheme: VKID.OneTapScheme.PRIMARY_DARK // Темная схема для хедера
          })
          .on(VKID.WidgetEvents.ERROR, (error) => {
            console.error('Ошибка VK OneTap:', error);
          })
          .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
            console.log('Успешная авторизация через OneTap:', payload);
            
            try {
              // Обмениваем код на токен
              const authData = await VKID.Auth.exchangeCode(payload.code, payload.device_id);
              console.log('Данные авторизации получены:', authData);
              
              // Вызываем callback с данными
            //   if (onLoginSuccess) {
            //     onLoginSuccess(authData);
            //   }
            } catch (error) {
              console.error('Ошибка при обмене кода на токен:', error);
            }
          });

          console.log('VK OneTap виджет создан и настроен');
        }
      } catch (error) {
        console.error('Ошибка при инициализации VK OneTap:', error);
      }
    };

    if (containerRef.current) {
      initializeVKAuth();
    }

    // Cleanup функция для очистки виджета при размонтировании
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      oneTapRef.current = null;
    };
  }, []);

  return (
    <div className="vk-onetap-container">
      <div ref={containerRef} className="vk-onetap-widget"></div>
    </div>
  );
};

export default VKOneTap;
