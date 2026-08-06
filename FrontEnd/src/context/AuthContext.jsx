import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../api/api';

const AuthContext = createContext();

// Initialize token synchronously to prevent race conditions on page reload
const initialToken = localStorage.getItem('token');
if (initialToken) {
    setAuthToken(initialToken);
}

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
            fetchProfile();

            // Auto-logout logic based on JWT expiry
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiryTime = payload.exp * 1000;
                const timeout = expiryTime - Date.now();

                if (timeout <= 0) {
                    logout();
                } else {
                    const timer = setTimeout(() => {
                        logout();
                        window.location.href = '/'; // Redirect to login
                    }, timeout);
                    return () => clearTimeout(timer);
                }
            } catch (e) {
                console.error("Token parse error", e);
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
            setUser(res.data);
        } catch (err) {
            console.error(err);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        setAuthToken(newToken); // Fix race condition with navigate()
        localStorage.setItem('token', newToken);
        localStorage.setItem('user_data', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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





