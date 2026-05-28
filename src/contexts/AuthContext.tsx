import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { getProfile as fetchProfile } from '@/db/api';
import {
  getAuthState,
  loginWithPassword,
  logout,
  signupWithPassword,
  subscribeAuthStateChange,
  type AppUser,
} from '@/lib/backend-auth';
import type { Profile } from '@/types';
import { validateUsername } from '@/utils/validation';

interface AuthContextType {
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (
    username: string,
    password: string,
    desiredRole?: 'user' | 'doctor',
    verificationCode?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    return await fetchProfile(userId);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const state = await getAuthState();
      setUser(state.session?.user || null);
      setProfile(state.profile);
    } catch {
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async () => {
      try {
        const state = await getAuthState();
        if (!mounted) return;
        setUser(state.session?.user || null);
        setProfile(state.profile);
      } catch {
        if (!mounted) return;
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void syncAuthState();
    const unsubscribe = subscribeAuthStateChange(() => {
      void syncAuthState();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const state = await loginWithPassword(username, password);
      setUser(state.session?.user || null);
      setProfile(state.profile);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (
    username: string,
    password: string,
    desiredRole: 'user' | 'doctor' = 'user',
    verificationCode?: string
  ) => {
    try {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        throw new Error(usernameValidation.message || '用户名格式不正确');
      }

      if (desiredRole === 'doctor' && !verificationCode) {
        throw new Error('医生注册需要验证码');
      }

      const state = await signupWithPassword({
        username,
        password,
        role: desiredRole,
        verificationCode,
      });
      setUser(state.session?.user || null);
      setProfile(state.profile);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await logout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
