import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach token to every request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('chess_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: standardize error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    
    // Attach clean error message to error object
    error.userMessage = serverMessage;
    return Promise.reject(error);
  }
);

export default api;
