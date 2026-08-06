import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// Helper to set auth header
export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Response interceptor for auto-logout
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Don't auto-logout or redirect if the 401 is from the login attempt itself
        const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
        
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
