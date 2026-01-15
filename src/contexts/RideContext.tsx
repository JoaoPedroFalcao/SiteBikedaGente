import React, { createContext, useState, useEffect, useContext, PropsWithChildren, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/api/supabase';
import { useAuth } from './AuthContext';
import { useMqtt } from './MqttContext'; 
import { Ride, Bike, Station } from '@/types'; 
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Location from 'expo-location';

interface RideContextType {
  activeRide: Ride | null;
  lastCompletedRide: Ride | null;
  showPostRideCard: boolean;
  isLoading: boolean;
  cooldownEndTime: Date | null;
  startRide: (bikeId: string, stationId: number) => Promise<void>;
  startRemoteRide: (bike: Bike, station: Station) => Promise<boolean>;
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
  const { user, userRole } = useAuth();
  const { publish, status: mqttStatus } = useMqtt(); 

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
  // Reduzi o polling para 5s para garantir atualização mesmo se o Realtime falhar
  const POLLING_INTERVAL_MS = 5000; 

  // Mantém a ref atualizada para usar dentro dos callbacks
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  const dismissPostRideCard = () => {
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

  // --- 1. SINCRONIZAÇÃO INTELIGENTE ---
  const checkUserStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      // Busca corrida ATIVA
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
        // Cenario A: Tem corrida ativa
        setActiveRide(current => {
            if (current?.id !== rideData.id) {
                console.log("✅ [RideContext] Sync: Corrida ativa detectada:", rideData.id);
                setCooldownEndTime(null);
                setShowPostRideCard(false);
                return rideData;
            }
            return current; // Não atualiza se for igual para evitar re-render
        });
      } else {
        // Cenario B: Não tem corrida ativa no banco
        // Se localmente ainda achamos que tem (activeRideRef), significa que ACABOU de acabar.
        if (activeRideRef.current) {
             console.log("[RideContext] Sync: A corrida ativa sumiu. Buscando status final...");
             
             const { data: finishedRide } = await supabase
                .from('rides')
                .select('*')
                .eq('id', activeRideRef.current.id)
                .single();
             
             if (finishedRide) {
                 setActiveRide(null); // Limpa a ativa

                 if (finishedRide.status === 'completed') {
                     // Exibe o card de resumo se ainda não estiver exibindo
                     if (!showPostRideCard) {
                        console.log("🏁 [RideContext] Corrida finalizada detectada!");
                        setLastCompletedRide(finishedRide);
                        setShowPostRideCard(true);
                        setCooldownEndTime(new Date(Date.now() + COOLDOWN_DURATION));
                        
                        // Auto-dismiss em 45s
                        if (postRideTimerRef.current) clearTimeout(postRideTimerRef.current);
                        // @ts-ignore
                        postRideTimerRef.current = setTimeout(() => dismissPostRideCard(), 45000);
                     }
                 } else if (finishedRide.status === 'canceled') {
                     console.log("🚫 [RideContext] Corrida foi cancelada.");
                     setLastCompletedRide(null);
                     setShowPostRideCard(false);
                     setCooldownEndTime(null);
                 }
             } else {
                 // Caso raro: a corrida foi deletada
                 setActiveRide(null);
             }
        }
      }
    } catch (e: any) {
      console.error("[RideContext] Erro Sync:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, showPostRideCard, cooldownEndTime]); 

  // Atualiza a ref para o Realtime usar
  useEffect(() => {
    checkStatusRef.current = checkUserStatus;
  }, [checkUserStatus]);

  // --- 2. SETUP DE CONEXÃO E REALTIME ---
  useEffect(() => {
    if (!user) {
      setActiveRide(null);
      setCooldownEndTime(null);
      setIsLoading(false);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      return;
    }

    setIsLoading(true);
    checkUserStatus().finally(() => setIsLoading(false));

    const setupRealtime = () => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        
        const channelName = `user-rides-${user.id}`;
        console.log(`🔌 [RideContext] Conectando Realtime no canal: ${channelName}`);
        
        const channel = supabase.channel(channelName)
          .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'rides',
                filter: `user_id=eq.${user.id}` // <--- O PULO DO GATO: Filtra só este usuário
            },
            (payload) => {
                console.log(`🔔 [RideContext] MUDANÇA NO BANCO DETECTADA!`, payload.eventType);
                // Força atualização imediata
                if (checkStatusRef.current) {
                    checkStatusRef.current();
                }
            }
          )
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') console.log("✅ [RideContext] Realtime Sincronizado!");
          });

        channelRef.current = channel;
    };

    setupRealtime();

    // Sincroniza quando o app volta do background
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
            console.log('📱 [RideContext] App ativo (Foreground). Sincronizando...');
            if (checkStatusRef.current) checkStatusRef.current();
        }
    });

    // Polling de segurança (caso o Realtime falhe)
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

  // --- 3. START REMOTE RIDE (Modificado com tempo seguro) ---
  const startRemoteRide = async (bike: Bike, station: Station): Promise<boolean> => {
    console.log(`--- [RideContext] startRemoteRide: Bike ${bike.id} ---`);
    
    if (mqttStatus !== 'connected') {
      showErrorToast('Offline', 'Sistema de estação offline.');
      return false;
    }
    if (!user) {
      showErrorToast('Login', 'Faça login para continuar.');
      return false;
    }
    if (!bike.current_lock_position) {
      showErrorToast('Erro', 'Posição da trava desconhecida.');
      return false;
    }

    // Validações de Horário e Cooldown
    const hour = getBrasiliaHour();
    if (hour >= 23 || hour < 5) {
      showErrorToast('Fechado', "Horário: 05h às 23h.");
      return false;
    }
    if (cooldownEndTime && cooldownEndTime.getTime() > Date.now()) {
        const min = Math.ceil((cooldownEndTime.getTime() - Date.now()) / 60000);
        showErrorToast('Aguarde', `Aguarde ${min} min.`);
        return false;
    }
    if (activeRide) {
        showErrorToast('Atenção', "Você já tem uma corrida.");
        return false;
    }

    // Validação GPS
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const dist = getDistanceFromLatLonInMeters(
        location.coords.latitude, location.coords.longitude,
        (station as any).latitude || (station as any).lat,
        (station as any).longitude || (station as any).lng
    );

    if (dist > 50 && userRole !== 'admin') {
        showErrorToast('Longe Demais', `Aproxime-se ${Math.floor(dist - 50)}m.`);
        return false;
    }

    setIsLoading(true);
    let rideIdCreated: number | null = null; 

    try {
      // Cria corrida PENDING
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .insert({
          user_id: user.id,
          bike_id: bike.id,
          start_station_id: station.id,
          started_at: new Date().toISOString(),
          status: 'pending', 
        })
        .select()
        .single();

      if (rideError) throw rideError;
      rideIdCreated = rideData.id; 

      // Envia MQTT
      const topic = `estacao${station.id}/selecaobike`;
      const message = `open${bike.current_lock_position}`;
      console.log(`[MQTT] Enviando: ${message}`);
      await publish(topic, message);

      // Loop de Espera (AUMENTADO PARA 30s de segurança)
      const MAX_ATTEMPTS = 30; // 30x 1s = 30 segundos
      let success = false;
      
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        // Verifica status da corrida no banco
        const { data: currentRide } = await supabase
            .from('rides')
            .select('status, started_at')
            .eq('id', rideIdCreated)
            .single();

        if (currentRide?.status === 'active') {
            console.log("🚀 Corrida ativada!");
            success = true;
            setActiveRide({ ...rideData, status: 'active', started_at: currentRide.started_at });
            break; 
        }

        if (!currentRide || currentRide.status === 'canceled') throw new Error("Corrida cancelada.");

        // Espera 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!success) throw new Error("Tempo esgotado. Tente novamente.");

      setCooldownEndTime(null);
      showSuccessToast('Sucesso', 'Boa viagem!');
      return true;

    } catch (e: any) {
      console.error("Erro startRemoteRide:", e);
      if (rideIdCreated) {
        // Rollback
        await supabase.from('rides').delete().eq('id', rideIdCreated);
        // Garante restauração da bike
        await supabase.from('bikes').update({ 
            status: 'available', 
            station_id: station.id, 
            current_lock_position: bike.current_lock_position 
        }).eq('id', bike.id);
      }
      showErrorToast('Erro', e.message || 'Falha na retirada.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Mantive as outras funções (endRide, cancelRide, startRide legacy) iguais...
  const startRide = async (bikeId: string, stationId: number) => { throw new Error("Use startRemoteRide"); };

  const endRide = async (stationId: number, dockId: number) => {
      // Apenas fallback, pois o script faz isso automaticamente
      if (activeRide) await checkUserStatus();
  };

  const cancelRide = async (reason: string) => {
    if (!activeRide) return;
    setIsLoading(true);
    try {
        await supabase.from('rides').update({ status: 'canceled', ended_at: new Date().toISOString() }).eq('id', activeRide.id);
        await checkUserStatus();
    } catch(e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const value = {
    activeRide, lastCompletedRide, showPostRideCard, isLoading, cooldownEndTime,
    startRide, startRemoteRide, endRide, cancelRide, dismissPostRideCard,
  };

  return <RideContext.Provider value={value}>{children}</RideContext.Provider>;
};

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; 
}
function deg2rad(deg: number) { return deg * (Math.PI / 180); }