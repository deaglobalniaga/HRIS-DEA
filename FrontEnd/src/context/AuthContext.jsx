import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/api';

const AuthContext = createContext();

// Initialize token synchronously to prevent race conditions on page reload
const initialToken = localStorage.getItem('token');
if (initialToken) {
    setAuthToken(initialToken);
}

import AuthTransitionOverlay from '../components/common/AuthTransitionOverlay';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user_data');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState(initialToken);
    const [loading, setLoading] = useState(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user_data');
        return !(savedToken && savedUser);
    });

    useEffect(() => {
        if (token) {
            setAuthToken(token);

            // Auto-logout timer based on JWT expiry (with safe clock-skew guard)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiryTime = payload.exp * 1000;
                const timeout = expiryTime - Date.now();

                // Only set auto-logout timer if timeout is in the future (> 10s)
                // Never aggressively logout based solely on client clock; let server verify via fetchProfile
                if (timeout > 10000) {
                    const timer = setTimeout(() => {
                        logout(true);
                    }, timeout);

                    fetchProfile();
                    return () => clearTimeout(timer);
                } else {
                    fetchProfile();
                }
            } catch (e) {
                console.warn("Token inspection note:", e.message);
                fetchProfile();
            }
        } else {
            setAuthToken(null);
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/profile');
            if (res.data) {
                setUser(res.data);
                localStorage.setItem('user_data', JSON.stringify(res.data));
            }
        } catch (err) {
            console.error('Fetch profile error:', err);
            if (err.response && err.response.status === 401) {
                logout(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        setAuthToken(newToken);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user_data', JSON.stringify(userData));
        setLoading(false);
    };

    const logout = async (redirect = true) => {
        // Synchronously wipe storage and state immediately to prevent redirect loop
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        setAuthToken(null);
        setToken(null);
        setUser(null);

        setIsLoggingOut(true);
        try {
            await api.post('/auth/logout').catch(() => {});
        } catch (e) {}

        setTimeout(() => {
            setIsLoggingOut(false);
            if (redirect && window.location.pathname !== '/login') {
                window.location.replace('/login');
            }
        }, 350);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, isLoggingOut }}>
            {/* Clean White Orbiting Auth Transition Overlay on Logout */}
            {isLoggingOut && <AuthTransitionOverlay />}

            {loading ? (
                <div className="flex h-screen items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-red-900 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-500 animate-pulse">Loading HRIS System...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
