import React, { createContext, useContext, useEffect, useState } from "react";
import { Language } from "@/lib/translations";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          const email = firebaseUser.email || "";
          let name = email.split("@")[0];
          // Default role matches: arunkumaran484@gmail.com is admin, anyone starting with admin is admin, otherwise user
          let role: "admin" | "user" = 
            (email.toLowerCase() === "arunkumaran484@gmail.com" || email.toLowerCase().startsWith("admin")) 
              ? "admin" 
              : "user";
          let isActive = true;

          // Attempt to load custom user profile from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) name = data.name;
            if (data.role === "admin" || data.role === "user") role = data.role;
            if (data.isActive !== undefined) isActive = data.isActive;
          }

          if (!isActive) {
            await signOut(auth);
            setUser(null);
          } else {
            setUser({
              id: firebaseUser.uid,
              username: email,
              name,
              role,
              isActive
            });
          }
        } catch (error) {
          console.error("Error fetching user profile from Firestore:", error);
          // Fallback to basic email profile if Firestore query fails (e.g. offline/permission rules)
          const email = firebaseUser.email || "";
          setUser({
            id: firebaseUser.uid,
            username: email,
            name: email.split("@")[0],
            role: (email.toLowerCase() === "arunkumaran484@gmail.com" || email.toLowerCase().startsWith("admin")) ? "admin" : "user",
            isActive: true
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user doc to verify if active
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.isActive === false) {
          await signOut(auth);
          throw new Error("Your account has been disabled. Please contact support.");
        }
      }
      
      return true;
    } catch (error: any) {
      // Map Firebase auth errors to user-friendly messages
      let message = error.message;
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        message = "Invalid email or password.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
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
