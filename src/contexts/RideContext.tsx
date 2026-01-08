import React, { createContext, useState, useEffect, useContext, PropsWithChildren, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/api/supabase';
import { useAuth } from './AuthContext';
import { Ride } from '@/types';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RideContextType {
  activeRide: Ride | null;
  lastCompletedRide: Ride | null;
  showPostRideCard: boolean;
  isLoading: boolean;
  cooldownEndTime: Date | null;
  startRide: (bikeId: string, stationId: number) => Promise<void>;
  endRide: (stationId: number, dockId: number) => Promise<void>;
  cancelRide: (reason: string) => Promise<void>;
  dismissPostRideCard: () => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const useRide = () => {
  const context = useContext(RideContext);
  if (context === undefined) {
    throw new Error('useRide must be used within a RideProvider');
  }
  return context;
};

export const RideProvider = ({ children }: PropsWithChildren<{}>) => {
  const { user } = useAuth();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [lastCompletedRide, setLastCompletedRide] = useState<Ride | null>(null);
  const [showPostRideCard, setShowPostRideCard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cooldownEndTime, setCooldownEndTime] = useState<Date | null>(null);
  
  const postRideTimerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const checkStatusRef = useRef<(() => Promise<void>) | null>(null);
  const activeRideRef = useRef<Ride | null>(null);

  const COOLDOWN_DURATION = 30 * 60 * 1000; 
  const POLLING_INTERVAL_MS = 15000; 

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  const dismissPostRideCard = () => {
    console.log('--- [RideContext] Dispensando PostRideCard manualmente ---');
    setShowPostRideCard(false);
    setLastCompletedRide(null);
    
    if (postRideTimerRef.current) {
        clearTimeout(postRideTimerRef.current);
        postRideTimerRef.current = null;
    }
  };

  const getBrasiliaHour = () => {
    const now = new Date();
    let hour = now.getUTCHours() - 3; 
    if (hour < 0) hour += 24; 
    return hour;
  };

  // Função Central de Sincronização
  const checkUserStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      // 1. Busca corrida ATIVA
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rideError) throw rideError;

      if (rideData) {
        // Se o estado local for diferente, atualiza
        setActiveRide(current => {
            if (current?.id !== rideData.id) {
                console.log("✅ [RideContext] Sync: Corrida ativa encontrada:", rideData.id);
                setCooldownEndTime(null);
                setShowPostRideCard(false);
                return rideData;
            }
            return current;
        });
      } else {
        // Se NÃO achou corrida ativa no banco
        // Mas nós tínhamos uma ativa localmente? Se sim, significa que ela acabou (ou foi cancelada)
        if (activeRideRef.current) {
             console.log("[RideContext] Sync: Corrida ativa sumiu do banco. Buscando status final...");
             const { data: finishedRide } = await supabase
                .from('rides')
                .select('*')
                .eq('id', activeRideRef.current.id)
                .single();
             
             if (finishedRide) {
                 setActiveRide(null); 

                 if (finishedRide.status === 'completed') {
                     // Só atualiza se ainda não estiver mostrando
                     if (!showPostRideCard) {
                        setLastCompletedRide(finishedRide);
                        setShowPostRideCard(true);
                        setCooldownEndTime(new Date(Date.now() + COOLDOWN_DURATION));
                        
                        if (postRideTimerRef.current) clearTimeout(postRideTimerRef.current);
                        // @ts-ignore
                        postRideTimerRef.current = setTimeout(() => dismissPostRideCard(), 30000);
                     }
                 } else if (finishedRide.status === 'canceled') {
                     setLastCompletedRide(null);
                     setShowPostRideCard(false);
                     setCooldownEndTime(null);
                 }
             } else {
                 setActiveRide(null);
             }
        } else {
             // Se não tinha ativa e continua não tendo, verifica apenas cooldown
             if (!cooldownEndTime) {
                 const { data: lastRideData } = await supabase
                .from('rides')
                .select('ended_at')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .not('ended_at', 'is', null)
                .order('ended_at', { ascending: false })
                .limit(1)
                .maybeSingle();

                if (lastRideData?.ended_at) {
                    const lastRideEndTime = new Date(lastRideData.ended_at).getTime();
                    const timeSinceEnd = Date.now() - lastRideEndTime;
                    if (timeSinceEnd < COOLDOWN_DURATION) {
                        setCooldownEndTime(new Date(Date.now() + (COOLDOWN_DURATION - timeSinceEnd)));
                    }
                }
            }
        }
      }
    } catch (e: any) {
      console.error("[RideContext] Erro Sync:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, showPostRideCard, cooldownEndTime]); 

  // Mantém a ref atualizada para usar no polling e realtime
  useEffect(() => {
    checkStatusRef.current = checkUserStatus;
  }, [checkUserStatus]);


  // --- EFEITO DE SETUP ---
  useEffect(() => {
    if (!user) {
      setActiveRide(null);
      setCooldownEndTime(null);
      setIsLoading(false);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      return;
    }

    // 1. Carga inicial
    setIsLoading(true);
    checkUserStatus().finally(() => setIsLoading(false));

    // 2. Configuração Realtime
    const setupRealtime = () => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        const channelName = `rides-updates-${user.id}-${Date.now()}`;
        console.log(`🔌 [RideContext] Conectando Realtime: ${channelName}`);
        
        const channel = supabase.channel(channelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rides' },
            (payload) => {
                // @ts-ignore
                const recordUserId = payload.new?.user_id || payload.old?.user_id;
                if (recordUserId === user.id && checkStatusRef.current) {
                    console.log(`🔔 [RideContext] Evento Realtime recebido.`);
                    checkStatusRef.current();
                }
            }
          )
          .subscribe();

        channelRef.current = channel;
    };

    setupRealtime();

    // 3. AppState
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
            console.log('📱 [RideContext] App ativo. Sincronizando...');
            if (checkStatusRef.current) checkStatusRef.current();
        }
    });

    // 4. Polling de Segurança (15s)
    const pollingInterval = setInterval(() => {
        if (checkStatusRef.current) {
            checkStatusRef.current();
        }
    }, POLLING_INTERVAL_MS);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      appStateSubscription.remove();
      clearInterval(pollingInterval);
    };
  }, [user]); 

  const startRide = async (bikeId: string, stationId: number) => {
    console.log('--- [RideContext] Tentando INICIAR (startRide) ---');
    if (!user) throw new Error("Usuário não autenticado.");
    
    // 1. Regra de Horário (Brasília)
    const hour = getBrasiliaHour();
    if (hour >= 23 || hour < 5) throw new Error("O sistema está fechado. Horário de funcionamento: 05h às 23h.");

    // 2. Cooldown
    if (cooldownEndTime && cooldownEndTime.getTime() > Date.now()) {
        const min = Math.ceil((cooldownEndTime.getTime() - Date.now()) / 60000);
        throw new Error(`Aguarde ${min} min.`);
    }

    setIsLoading(true);
    try {
        // 3. Verificação de Suspensão (NOVO)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('suspended_until')
            .eq('id', user.id)
            .single();
        
        if (profileError) throw profileError;

        if (profile?.suspended_until) {
            const suspendedUntilDate = new Date(profile.suspended_until);
            if (suspendedUntilDate > new Date()) {
                const formattedDate = suspendedUntilDate.toLocaleDateString('pt-BR');
                const formattedTime = suspendedUntilDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                throw new Error(`Sua conta está suspensa até ${formattedDate} às ${formattedTime}.`);
            }
        }

        // 4. Verificação de Duplicidade
        const { data: existingRide, error: existingError } = await supabase
            .from('rides')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (existingError) throw new Error("Erro ao verificar status.");
        if (existingRide) {
            await checkUserStatus(); 
            throw new Error("Você já tem uma corrida ativa.");
        }
        
        // 5. Inserção
        const now = new Date().toISOString();
        const { data, error } = await supabase
        .from('rides')
        .insert({
            user_id: user.id,
            bike_id: bikeId,
            start_station_id: stationId,
            status: 'active',
            started_at: now
        })
        .select()
        .single();

        if (error) {
            if (error.code === '23505') throw new Error("Você já tem uma corrida ativa.");
            throw error;
        }

        if (data) {
            setActiveRide(data);
            setCooldownEndTime(null);
            setShowPostRideCard(false);
        }
    } catch (e: any) {
        showErrorToast(e, e.message.startsWith("Você já") || e.message.startsWith("Sua conta") ? e.message : "Erro ao iniciar.");
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  const endRide = async (stationId: number, dockId: number) => {
    if (!user || !activeRide) throw new Error("Nenhuma corrida ativa.");
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('rides')
        .update({ status: 'completed', ended_at: now, end_station_id: stationId, end_dock_id: dockId })
        .eq('id', activeRide.id);

      if (error) throw error;
      
      // Atualização local imediata para feedback rápido
      await checkUserStatus();
    } catch (e: any) {
        showErrorToast(e, "Erro ao finalizar.");
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  const cancelRide = async (reason: string) => {
    if (!user || !activeRide) throw new Error("Nenhuma corrida ativa.");
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('rides')
        .update({ status: 'canceled', ended_at: now })
        .eq('id', activeRide.id);

      if (error) throw error;
      showSuccessToast("Sucesso", "Corrida cancelada.");
      await checkUserStatus();
    } catch (e: any) {
        showErrorToast(e, "Erro ao cancelar.");
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  const value = {
    activeRide,
    lastCompletedRide,
    showPostRideCard,
    isLoading,
    cooldownEndTime,
    startRide,
    endRide,
    cancelRide,
    dismissPostRideCard,
  };

  return (
    <RideContext.Provider value={value}>
      {children}
    </RideContext.Provider>
  );
};