import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    withCredentials: true // For HttpOnly Cookies
});

// Helper to set auth header
export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Response interceptor for auto-logout on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
        
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            // Redirect to login page immediately
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
