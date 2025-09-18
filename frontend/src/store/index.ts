import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

// Настройка Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  // Включаем Redux DevTools в development режиме
  devTools: process.env.NODE_ENV !== 'production',
  
  // Настройка middleware
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Настройки для serializable check
      serializableCheck: {
        // Игнорируем некоторые actions если нужно
        ignoredActions: [],
      },
    }),
});

// Типы для TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Экспортируем типизированные хуки
export { useAppDispatch, useAppSelector } from './hooks';
