import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const user_id  = localStorage.getItem('user_id');
    if (token) setUser({ token, username, user_id });
  }, []);

  const login = (data) => {
    localStorage.setItem('token',    data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('user_id',  data.user_id);
    setUser(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);