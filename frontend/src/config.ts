// Конфигурация API URL для всего приложения
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Для использования с /api в конце
export const API_URL = API_BASE_URL;

// Для использования без /api
export const API_URL_WITHOUT_API = API_BASE_URL.replace('/api', '');

