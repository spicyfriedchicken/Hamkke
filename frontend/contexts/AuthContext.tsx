"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_BASE = "https://5wvnvwiuc1.execute-api.us-east-1.amazonaws.com/dev";

type UserInfo = {
  email?: string;
  sub: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
};

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  loginOAuth: (provider: "Google" | "Apple") => void;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    // Fetch user info with token from your API
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginOAuth = (provider: "Google" | "Apple") => {
    const redirectUrl = `${API_BASE}/login?provider=${provider}`;
    window.location.href = redirectUrl;
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/login-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Invalid credentials");

    const { token } = await res.json();
    localStorage.setItem("token", token);

    const userRes = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = await userRes.json();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginOAuth, loginWithEmailPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
