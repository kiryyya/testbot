import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Интерфейс для данных пользователя VK
interface VKUser {
  id: string | number;
  first_name?: string;
  last_name?: string;
  photo_200?: string;
  photo_100?: string;
  photo_50?: string;
  email?: string;
  sex?: number;
  bdate?: string;
  city?: {
    id: number;
    title: string;
  };
  country?: {
    id: number;
    title: string;
  };
  status?: string;
  online?: boolean;
  domain?: string;
  verified?: boolean;
  [key: string]: any; // Для дополнительных полей от VK API
}

// Интерфейс состояния авторизации
interface AuthState {
  isAuthenticated: boolean;
  user: VKUser | null;
  accessToken: string | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  authMethod: 'vk' | null; // Метод авторизации
}

// Начальное состояние
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  userId: null,
  loading: false,
  error: null,
  authMethod: null,
};

// Создаем slice для авторизации
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Начало процесса авторизации
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    
    // Успешная авторизация через VK
    loginSuccess: (state, action: PayloadAction<{
      user: VKUser;
      accessToken: string;
      userId: string;
    }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.authMethod = 'vk';
      state.loading = false;
      state.error = null;
      
      // Сохраняем данные в localStorage для персистентности
      localStorage.setItem('auth', JSON.stringify({
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        userId: action.payload.userId,
        authMethod: 'vk',
      }));
    },
    
    // Ошибка авторизации
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.userId = null;
      state.authMethod = null;
      state.loading = false;
      state.error = action.payload;
    },
    
    // Выход из системы
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.userId = null;
      state.authMethod = null;
      state.loading = false;
      state.error = null;
      
      // Очищаем localStorage
      localStorage.removeItem('auth');
    },
    
    // Восстановление авторизации из localStorage
    restoreAuth: (state, action: PayloadAction<{
      user: VKUser;
      accessToken: string;
      userId: string;
      authMethod: 'vk';
    }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.authMethod = action.payload.authMethod;
      state.loading = false;
      state.error = null;
    },
    
    // Обновление данных пользователя
    updateUser: (state, action: PayloadAction<Partial<VKUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        
        // Обновляем данные в localStorage
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          authData.user = state.user;
          localStorage.setItem('auth', JSON.stringify(authData));
        }
      }
    },
    
    // Очистка ошибок
    clearError: (state) => {
      state.error = null;
    },
  },
});

// Экспортируем actions
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  restoreAuth,
  updateUser,
  clearError,
} = authSlice.actions;

// Селекторы для удобного доступа к состоянию
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Экспортируем reducer
export default authSlice.reducer;
