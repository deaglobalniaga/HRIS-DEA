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

let isRedirecting = false;

// Response interceptor for auto-logout on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || '';
        const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password') || url.includes('/auth/verify-reset-otp');
        
        if (error.response && error.response.status === 401 && !isAuthRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_data');
            setAuthToken(null);

            // Avoid loop if already redirecting or already on login page
            if (!isRedirecting && window.location.pathname !== '/login') {
                isRedirecting = true;
                setTimeout(() => { isRedirecting = false; }, 3000);
                window.location.replace('/login');
            }
        }
        return Promise.reject(error);
    }
);

export default api;
