import React, { createContext, useState, useEffect, useContext, PropsWithChildren, useRef, useCallback } from 'react';
import { Session, User, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase';
import { navigate } from '@/navigation/navigation';
import { AppState, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { showErrorToast } from '@/utils/errorHandler';

// --- NOVOS IMPORTS PARA NOTIFICAÇÃO ---
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

// --- CONFIGURAÇÃO CORRIGIDA ---
// Adicionamos shouldShowBanner e shouldShowList para satisfazer o TypeScript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Novo: Exibe o banner no topo da tela
    shouldShowList: true,   // Novo: Exibe na central de notificações
  }),
});

// --- FUNÇÃO AUXILIAR: Pede permissão e gera o Token ---
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[AuthContext] Permissão de notificação negada!');
      return;
    }

    try {
        // ID do projeto fixo conforme sua conta EAS
        const projectId = '8da2d9f7-aa8f-46ba-93a2-9da0c45513a6';
        
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
        })).data;
        
        console.log("🔔 [AuthContext] Push Token Gerado com Sucesso:", token);
    } catch (e) {
        console.error("❌ [AuthContext] Erro ao gerar token Expo:", e);
    }
  } else {
    console.log('[AuthContext] Notificações não funcionam em simulador físico.');
  }

  return token;
}

type ProfileStatus = 'pending_approval' | 'approved' | 'rejected' | 'deleted' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: 'admin' | 'user' | null;
  has_payment_method: boolean;
  profileStatus: ProfileStatus;
  isIdentityVerified: boolean;
  suspendedUntil: string | null;
  loading: boolean;
  signOut: () => void;
  refreshUserProfile: () => Promise<void>;
  completePasswordRecovery: () => void;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, userRole: null, profileStatus: null, loading: true,
  signOut: () => {}, has_payment_method: false, isIdentityVerified: false, suspendedUntil: null,
  refreshUserProfile: async () => {}, completePasswordRecovery: () => {},
  signInWithGoogle: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AuthContextType['userRole']>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(null);
  const [loading, setLoading] = useState(true);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  
  const isRecoveringPassword = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchProfileRef = useRef<() => Promise<void>>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedUrlRef = useRef<string>(""); 

  // --- LÓGICA DE REGISTRO DO TOKEN NO SUPABASE ---
  const registerToken = async (userId: string) => {
    try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          Alert.alert("Debug Token", `Token gerado: ${token}`);
            // Salva no banco de dados
            const { error } = await supabase
                .from('profiles')
                .update({ push_token: token })
                .eq('id', userId);
            
            if (error) Alert.alert("Erro Banco", error.message);
            else Alert.alert("Debug", "Token veio nulo/vazio");
        }
    } catch (error) {
        console.error("[AuthContext] Erro fatal no registro de notificação:", error);
    }
  };

  // --- EFEITO: REGISTRAR AO LOGAR ---
  useEffect(() => {
    if (user) {
        registerToken(user.id);
    }
  }, [user]);

  const extractParamsFromUrl = (url: string) => {
    const params: { [key: string]: string } = {};
    try {
      const fragment = url.split('#')[1] || url.split('?')[1];
      if (!fragment) return params;
      fragment.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) params[key] = decodeURIComponent(value);
      });
    } catch (e) {
      console.error("[AuthContext] Erro URL parse:", e);
    }
    return params;
  };

  const fetchUserProfile = useCallback(async (userToFetch: User | null = user) => {
    if (!userToFetch) {
      setUserRole(null); setProfileStatus(null); setHasPaymentMethod(false); 
      setIsIdentityVerified(false); setSuspendedUntil(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, has_payment_method, status, is_identity_verified, suspended_until')
        .eq('id', userToFetch.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setUserRole(data.role as 'admin' | 'user'); 
        setProfileStatus(data.status as ProfileStatus); 
        setHasPaymentMethod(data.has_payment_method);
        setIsIdentityVerified(data.is_identity_verified);
        if (data.suspended_until !== suspendedUntil) setSuspendedUntil(data.suspended_until);
      } else { 
        setProfileStatus('pending_approval'); 
        setIsIdentityVerified(false);
      }
    } catch (error) { 
      console.error("[AuthContext] Falha perfil (não bloqueante):", error); 
    }
  }, [user, suspendedUntil]);

  useEffect(() => {
    fetchProfileRef.current = () => fetchUserProfile(user);
  }, [fetchUserProfile, user]);

  const signInWithGoogle = async () => {
    setLoading(true);
    processedUrlRef.current = ""; 
    
    if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);

    loginTimeoutRef.current = setTimeout(() => {
        setLoading((curr) => {
            if (curr && !user) {
                console.warn("[AuthContext] Timeout login Google. Forçando liberação.");
                return false; 
            }
            return curr;
        });
    }, 15000); 

    try {
      const redirectUrl = Linking.createURL('/google-auth'); 
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type !== 'success') {
            if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
            setLoading(false);
        } else if (result.type === 'success' && result.url) {
            handleUrl(result.url); 
        }
      }
    } catch (error) {
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
      console.error("Erro Google:", error);
      setLoading(false);
      showErrorToast({ message: "Erro ao iniciar login." });
    }
  };

  const handleUrl = async (url: string) => {
    if (processedUrlRef.current === url) return;
    processedUrlRef.current = url;
    
    console.log("[AuthContext] URL Deep Link detectada.");
    try {
      const params = extractParamsFromUrl(url);
      if (url.includes('type=recovery') || params.type === 'recovery') {
        isRecoveringPassword.current = true;
      }
      
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (accessToken && refreshToken) {
        // Tenta criar sessão
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) throw error;
        
        // SUCESSO: Limpa timeout e libera tela IMEDIATAMENTE
        if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
        
        if (data.user) {
            setUser(data.user);
            setSession(data.session);
            // IMPORTANTE: Dispara o fetch sem 'await' para não bloquear a UI
            fetchUserProfile(data.user); 
        }
        setLoading(false); 
      } 
    } catch (e) {
      console.error("Erro handleUrl:", e);
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log("[AuthContext] Inicializando...");
      
      // 1. Tenta recuperar sessão existente
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession && isMounted) {
          console.log("[AuthContext] Sessão recuperada.");
          setSession(initialSession);
          setUser(initialSession.user);
          // Dispara fetch em background
          fetchUserProfile(initialSession.user);
        }
      } catch (e) {
        console.error("[AuthContext] Erro sessão:", e);
      }

      // 2. Verifica Deep Link
      try {
        const url = await Linking.getInitialURL();
        if (url) {
            console.log("[AuthContext] App abriu com URL.");
            await handleUrl(url);
        }
      } catch (e) {
        console.error("Erro InitialURL:", e);
      }

      // 3. Libera UI
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log(`[AuthContext] Evento: ${_event}`);
      
      if (isRecoveringPassword.current && _event !== 'SIGNED_OUT') {
        setLoading(false);
        navigate('ResetPassword');
        return;
      }

      if (_event === 'SIGNED_IN' && newSession) {
         if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
         setSession(newSession);
         setUser(newSession.user);
         fetchUserProfile(newSession.user); // Background
         setLoading(false); // Desbloqueia Imediatamente
      } else if (_event === 'SIGNED_OUT') {
         setSession(null);
         setUser(null);
         setUserRole(null);
         setProfileStatus(null);
         setLoading(false);
      } else if (_event === 'TOKEN_REFRESHED' && newSession) {
         setSession(newSession);
      }
    });

    const linkingSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      linkingSub.remove();
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
    };
  }, []);

  // --- REALTIME (Mantido) ---
  useEffect(() => {
    if (!user) {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        return;
    }
    const channelName = `profile-updates-${user.id}`;
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          // @ts-ignore
          if (payload.new.id === user.id && fetchProfileRef.current) {
              fetchProfileRef.current();
          }
        }
      )
      .subscribe();
    channelRef.current = channel;

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
          supabase.auth.startAutoRefresh();
          if (fetchProfileRef.current) fetchProfileRef.current();
      } else {
          supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      appStateSubscription.remove();
    };
  }, [user]);

  const value = {
    session, user, userRole, profileStatus, loading, isIdentityVerified, suspendedUntil,
    signOut: () => {
      isRecoveringPassword.current = false;
      supabase.auth.signOut();
    },
    has_payment_method: hasPaymentMethod,
    refreshUserProfile: () => fetchUserProfile(user),
    completePasswordRecovery: () => {
        isRecoveringPassword.current = false;
        supabase.auth.signOut();
    },
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};