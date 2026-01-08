import React, { createContext, useState, useEffect, useContext, PropsWithChildren, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase';
import { navigate } from '@/navigation/navigation';
import * as Linking from 'expo-linking';

type ProfileStatus = 'pending_approval' | 'approved' | 'rejected' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: 'admin' | 'user' | null;
  has_payment_method: boolean;
  profileStatus: ProfileStatus;
  loading: boolean;
  signOut: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  profileStatus: null,
  loading: true,
  signOut: () => {},
  has_payment_method: false,
  refreshUserProfile: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AuthContextType['userRole']>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(null);
  const [loading, setLoading] = useState(true);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  const fetchUserProfile = async (userToFetch: User | null) => {
    if (!userToFetch) {
      setUserRole(null);
      setProfileStatus(null);
      setHasPaymentMethod(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, has_payment_method, status')
        .eq('id', userToFetch.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setUserRole(data.role as 'admin' | 'user');
        setProfileStatus(data.status as ProfileStatus);
        setHasPaymentMethod(data.has_payment_method);
      }
    } catch (error) {
      console.error("Erro ao buscar o perfil do usuário:", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchUserProfile(initialSession.user);
      }
      setLoading(false);
    };
    
    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
          setSession(session);
          navigate('ResetPassword'); 
          return;
        }

        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        await fetchUserProfile(currentUser);
      }
    );

    const handleInitialUrl = async () => {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
            const { queryParams } = Linking.parse(initialUrl);
            const accessToken = queryParams?.access_token;
            const refreshToken = queryParams?.refresh_token;

            if (accessToken && refreshToken) {
               await supabase.auth.setSession({
                 access_token: accessToken as string,
                 refresh_token: refreshToken as string,
               });
            }
        }
    };
    handleInitialUrl();
    const subscription = Linking.addEventListener('url', ({ url }) => {
        const { queryParams } = Linking.parse(url);
        const accessToken = queryParams?.access_token;
        const refreshToken = queryParams?.refresh_token;
        if (accessToken && refreshToken) {
           supabase.auth.setSession({
             access_token: accessToken as string,
             refresh_token: refreshToken as string,
           });
        }
    });

    return () => {
      authListener.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);

  const signOut = () => {
    supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    userRole,
    profileStatus,
    loading,
    signOut,
    has_payment_method: hasPaymentMethod,
    refreshUserProfile: () => fetchUserProfile(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};