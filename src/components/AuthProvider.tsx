import React, { createContext, useContext, useEffect, useState } from "react";
import { Language } from "@/lib/translations";

interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = "obd-decoder-users";

// Default admin for first time
const INITIAL_USERS: User[] = [
  { id: "admin-1", username: "admin", name: "User", role: "admin", isActive: true },
  { id: "user-1", username: "workshop", name: "Bike Workshop", role: "user", isActive: true }
];

const HARDCODED_PASSWORDS: Record<string, string> = {
  "admin": "admin123",
  "workshop": "bike123"
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "english";
    return (localStorage.getItem("app-language") as Language) || "english";
  });

  useEffect(() => {
    localStorage.setItem("app-language", language);
  }, [language]);

  useEffect(() => {
    // Initialize users if not exists
    if (!localStorage.getItem(USERS_STORAGE_KEY)) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      localStorage.setItem("user-pass-admin", "admin123"); // Hardcoded for demo/setup
    }

    const savedUser = localStorage.getItem("obd-decoder-current-user");
    if (savedUser) {
      let parsedUser = JSON.parse(savedUser);
      
      // Migration: Rename Admin accounts for User Portal
      if (parsedUser.username === "admin" && (parsedUser.name === "Super Admin" || parsedUser.name === "Administrator" || parsedUser.name === "Developer" || parsedUser.name === "Workshop Admin")) {
        parsedUser.name = "User";
        localStorage.setItem("obd-decoder-current-user", JSON.stringify(parsedUser));
      }

      // Re-verify if user is still active from the central users list
      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      const allUsers: User[] = rawUsers ? JSON.parse(rawUsers) : [];
      
      // Migration for users list
      if (Array.isArray(allUsers)) {
        const adminIndex = allUsers.findIndex(u => u.username === "admin" && (u.name === "Super Admin" || u.name === "Administrator" || u.name === "Developer" || u.name === "Workshop Admin"));
        if (adminIndex > -1) {
          allUsers[adminIndex].name = "User";
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(allUsers));
        }
      }

      const verifiedUser = allUsers.find(u => u.id === parsedUser.id) || INITIAL_USERS.find(u => u.username === parsedUser.username);
      
      if (verifiedUser && verifiedUser.isActive) {
        setUser(verifiedUser);
      } else {
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const allUsers: User[] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
    const normalizedUsername = username.toLowerCase();
    const hardcodedPass = HARDCODED_PASSWORDS[normalizedUsername];
    const foundUser = allUsers.find(u => u.username.toLowerCase() === normalizedUsername) || INITIAL_USERS.find(u => u.username === normalizedUsername);
    
    let storedPass = hardcodedPass || localStorage.getItem(`user-pass-${foundUser?.username || username}`);

    if (foundUser && storedPass === password) {
      if (!foundUser.isActive) {
        throw new Error("Your account has been disabled. Please contact support.");
      }
      setUser(foundUser);
      localStorage.setItem("obd-decoder-current-user", JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("obd-decoder-current-user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, language, setLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
