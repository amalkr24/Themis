import { useState } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'advocate' | 'admin';
  advocateStatus?: string | null;
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('themis_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('themis_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('themis_token', newToken);
    localStorage.setItem('themis_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('themis_token');
    localStorage.removeItem('themis_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  const updateAdvocateStatus = (status: string) => {
    if (user) {
      const updated = { ...user, advocateStatus: status };
      localStorage.setItem('themis_user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  return {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout,
    updateAdvocateStatus,
  };
}
export type UseAuthReturn = ReturnType<typeof useAuth>;
