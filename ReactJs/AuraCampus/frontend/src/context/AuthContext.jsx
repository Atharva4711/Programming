import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = loading, false = unauthenticated, obj = user
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("aura_token");
    if (!token) { setUser(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => { localStorage.removeItem("aura_token"); setUser(false); });
  }, []);

  const login = async (email, password, role) => {
    const { data } = await api.post("/auth/login", { email, password, role });
    localStorage.setItem("aura_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (body) => {
    const { data } = await api.post("/auth/signup", body);
    localStorage.setItem("aura_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("aura_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
