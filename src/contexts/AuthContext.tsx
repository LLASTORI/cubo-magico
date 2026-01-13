import { createContext, useContext, useEffect, useRef, useState, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { updateLastLogin, logActivityStandalone } from '@/hooks/useActivityLog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============= FORENSIC DEBUG =============
const AUTH_PROVIDER_ID = `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * AuthProvider com arquitetura estável.
 * 
 * REGRA CRÍTICA: Este provider NUNCA deve causar unmount dos children
 * durante token refresh ou mudanças de estado de autenticação.
 * 
 * O user e session são atualizados via state, mas o provider em si
 * não desmonta - apenas atualiza o context value.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loginLoggedRef = useRef(false);
  const mountedRef = useRef(false);
  const initializedRef = useRef(false);
  
  // FORENSIC: Track mount/unmount
  useEffect(() => {
    if (!mountedRef.current) {
      console.log(`%c[FORENSIC] AuthProvider MOUNTED - ID: ${AUTH_PROVIDER_ID}`, 'background: #9900ff; color: white; font-size: 14px; padding: 4px;');
      console.log(`[FORENSIC] AuthProvider - timestamp: ${new Date().toISOString()}`);
      mountedRef.current = true;
    }
    
    return () => {
      console.log(`%c[FORENSIC] AuthProvider UNMOUNTING - ID: ${AUTH_PROVIDER_ID}`, 'background: #ff0099; color: white; font-size: 14px; padding: 4px;');
      console.log(`[FORENSIC] AuthProvider unmount - timestamp: ${new Date().toISOString()}`);
    };
  }, []);

  useEffect(() => {
    // Prevenir múltiplas inicializações
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // FORENSIC: Log every auth state change
      console.log(`%c[FORENSIC] AUTH STATE CHANGE: ${event}`, 'background: #ff00ff; color: white; font-size: 12px; padding: 2px;');
      console.log(`[FORENSIC] auth event - timestamp: ${new Date().toISOString()}`);
      console.log(`[FORENSIC] auth event - user: ${newSession?.user?.email ?? 'null'}`);
      console.log(`[FORENSIC] auth event - session expires_at: ${newSession?.expires_at ?? 'null'}`);
      
      // CRÍTICO: Apenas atualizar state, NUNCA causar remount
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        loginLoggedRef.current = false;
        return;
      }

      // Register login only once per session, and only after MFA is fully verified (when applicable)
      if (!newSession?.user || loginLoggedRef.current) return;
      if (!(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) return;

      void (async () => {
        try {
          const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

          const shouldLog = aalError ? event === 'SIGNED_IN' : aal.currentLevel === aal.nextLevel;
          if (!shouldLog) return;

          loginLoggedRef.current = true;

          await updateLastLogin();
          await logActivityStandalone(newSession.user.id, {
            action: 'login',
            entityType: 'session',
            entityName: newSession.user.email || '',
          });
        } catch (err) {
          console.error('Failed to register login activity:', err);
        }
      })();
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Log logout activity before signing out
    if (user) {
      await logActivityStandalone(user.id, {
        action: 'logout',
        entityType: 'session',
        entityName: user.email || '',
      });
    }
    await supabase.auth.signOut();
  };

  // CRÍTICO: Memoizar o value para evitar re-renders desnecessários
  // Mas NÃO memoizar de forma que bloqueie atualizações legítimas
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
