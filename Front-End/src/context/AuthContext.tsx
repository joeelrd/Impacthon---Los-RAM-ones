import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
    id: number;
    name: string;
    email: string;
    token: string;
    isPremium: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    login: (userData: AuthUser) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
    isAuthenticated: false,
    loading: true
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('biomolecule_inc_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('biomolecule_inc_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData: AuthUser) => {
        setUser(userData);
        localStorage.setItem('biomolecule_inc_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('biomolecule_inc_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
