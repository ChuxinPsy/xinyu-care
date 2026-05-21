import type { User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types';
import { validateUsername, usernameToEmail } from '@/utils/validation';

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string, desiredRole?: 'user' | 'doctor', verificationCode?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    let mounted = true;
    let safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const finishLoading = () => {
      if (!mounted) return;
      setLoading(false);
      clearTimeout(safetyTimer);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then((profileData) => {
          if (!mounted) return;
          setProfile(profileData);
          finishLoading();
        });
      } else {
        setProfile(null);
        finishLoading();
      }
    }).catch(() => {
      finishLoading();
    });
    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      // 将用户名转换为有效的邮箱格式
      const email = usernameToEmail(username);
      let { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        await (supabase.rpc as any)('link_username_to_user', { uid, uname: username });
        const profileData = await getProfile(uid);
        setProfile(profileData);
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string, desiredRole: 'user' | 'doctor' = 'user', verificationCode?: string) => {
    try {
      // 验证用户名格式
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        throw new Error(usernameValidation.message || '用户名格式不正确');
      }

      // 如果是医生注册，需要验证验证码
      if (desiredRole === 'doctor') {
        if (!verificationCode) {
          throw new Error('医生注册需要验证码');
        }
        
        // 验证验证码
        const { verifyCode } = await import('@/db/api');
        const verifyResult = await verifyCode(verificationCode);
        
        if (!verifyResult.valid) {
          throw new Error(verifyResult.message || '验证码无效');
        }
      }
      
      // 将用户名转换为有效的邮箱格式
      const email = usernameToEmail(username);
      
      const { error: regErr } = await supabase.auth.signUp({ email, password, options: { data: { username, role: desiredRole } } });
      if (regErr) throw regErr;
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        await (supabase.rpc as any)('link_username_to_user', { uid, uname: username });
        
        // 如果是医生注册，标记验证码已使用
        if (desiredRole === 'doctor' && verificationCode) {
          const { markCodeAsUsed } = await import('@/db/api');
          await markCodeAsUsed(verificationCode, uid);
        }

        const profileData = await getProfile(uid);
        setProfile(profileData);
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore network errors */ }
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
