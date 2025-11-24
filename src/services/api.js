import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = "https://musical-succotash-pjrvv7rxprjxcr9xw-3000.app.github.dev/api";

// Criar instância do axios
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Erro ao adicionar token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido - fazer logout
      console.log('Token inválido, fazer logout...');
      // Você pode chamar logout() do contexto aqui se necessário
    }
    return Promise.reject(error);
  }
);

export default api;