import React, { createContext, useState, useEffect, useRef, useContext, PropsWithChildren, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useAuth } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

type MqttStatus = 'connecting' | 'connected' | 'error' | 'closed';

interface MqttContextType {
  status: MqttStatus;
  messages: Map<string, string>;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  publish: (topic: string, message: string) => Promise<void>;
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

const MQTT_BROKER_URL = 'ws://212.85.21.145:9001';

const MQTT_OPTIONS = { 
  username: 'usuario2', 
  password: '7461', 
  clean: true, 
  connectTimeout: 4000,
  keepalive: 120,
  reconnectPeriod: 1000, 
};

export const MqttProvider = ({ children }: PropsWithChildren<{}>) => {
  const { user } = useAuth();
  const clientRef = useRef<MqttClient | null>(null);
  const subscribedTopicsRef = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<MqttStatus>('closed');
  const [messages, setMessages] = useState<Map<string, string>>(new Map());

  const connect = useCallback(() => {
    if (user && !clientRef.current) {
      setStatus('connecting');
      console.log("MQTT: Tentando conectar...");
      const client = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);
      clientRef.current = client;

      client.on('connect', () => {
        console.log("MQTT: Conectado com sucesso!");
        setStatus('connected');
        subscribedTopicsRef.current.forEach(topic => {
          console.log(`MQTT: Re-inscrevendo no tópico ${topic}`);
          client.subscribe(topic);
        });
      });

      client.on('reconnect', () => {
        console.log("MQTT: Tentando reconectar...");
        setStatus('connecting');
      });

      client.on('error', (err) => {
        console.error('MQTT Connection Error:', err);
        setStatus('error');
      });

      client.on('close', () => {
        console.log("MQTT: Conexão fechada.");
        clientRef.current = null; 
        setStatus('closed');
      });

      client.on('message', (topic, message) => {
        const newMessage = message.toString();
        setMessages(prevMessages => {
          const newMessages = new Map(prevMessages);
          newMessages.set(topic, newMessage);
          return newMessages;
        });
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      connect();
    } else if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
      subscribedTopicsRef.current.clear();
      setStatus('closed');
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log("MQTT: App ativo, verificando conexão...");
        if (user && !clientRef.current) {
          connect();
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
      appStateSubscription.remove();
    };
  }, [user, connect]);

  const subscribe = useCallback((topic: string) => {
    subscribedTopicsRef.current.add(topic);
    if (clientRef.current?.connected) {
      clientRef.current.subscribe(topic);
    }
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    subscribedTopicsRef.current.delete(topic);
    if (clientRef.current?.connected) {
      clientRef.current.unsubscribe(topic);
    }
  }, []);

  const publish = useCallback((topic: string, message: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!clientRef.current?.connected) {
        return reject(new Error('Cliente MQTT não está conectado.'));
      }
      clientRef.current.publish(topic, message, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }, []);

  const value = { status, messages, subscribe, unsubscribe, publish };

  return (
    <MqttContext.Provider value={value}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (context === undefined) {
    throw new Error('useMqtt deve ser usado dentro de um MqttProvider');
  }
  return context;
};