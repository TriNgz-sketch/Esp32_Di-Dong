import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth } from '../config/firebase';


// =====================================================
// TYPES
// =====================================================

type AuthContextType = {
  user: User | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
};


// =====================================================
// CONTEXT
// =====================================================

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);


// =====================================================
// PROVIDER
// =====================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {

  // ===================================================
  // STATES
  // ===================================================

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);


  // ===================================================
  // FIREBASE AUTH LISTENER
  // ===================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        currentUser => {

          setUser(currentUser);

          setLoading(false);

        }
      );

    return () => {

      unsubscribe();

    };

  }, []);


  // ===================================================
  // LOGIN
  // ===================================================

  const login = async (
    email: string,
    password: string
  ) => {

    try {

      const cleanEmail =
        email.trim();

      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    } catch (error: any) {

      console.log(
        'Login error:',
        error
      );

      throw error;

    }

  };


  // ===================================================
  // REGISTER
  // ===================================================

  const register = async (
    email: string,
    password: string
  ) => {

    try {

      const cleanEmail =
        email.trim();

      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    } catch (error: any) {

      console.log(
        'Register error:',
        error
      );

      throw error;

    }

  };


  // ===================================================
  // LOGOUT
  // ===================================================

  const logout = async () => {

    try {

      await signOut(auth);

    } catch (error: any) {

      console.log(
        'Logout error:',
        error
      );

      throw error;

    }

  };


  // ===================================================
  // CONTEXT VALUE
  // ===================================================

  const value: AuthContextType = {

    user,

    loading,

    login,

    register,

    logout,

  };


  // ===================================================
  // PROVIDER
  // ===================================================

  return (

    <AuthContext.Provider
      value={value}
    >

      {children}

    </AuthContext.Provider>

  );

}


// =====================================================
// HOOK
// =====================================================

export function useAuth() {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      'useAuth phải được sử dụng bên trong AuthProvider'
    );

  }

  return context;

}