import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRide } from '@/contexts/RideContext';
import { RootStackScreenProps } from '@/navigation/types';
import { supabase } from '@/api/supabase';
import { useMqtt } from '@/contexts/MqttContext';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import Colors from '@/constants/Colors';

const QRScannerScreen = ({ navigation, route }: RootStackScreenProps<'QRScanner'>) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showScanAgain, setShowScanAgain] = useState(false);
  const [targetDock, setTargetDock] = useState<number | null>(null);

  const { startRide, endRide, activeRide } = useRide();
  const { action, returnMethod } = route.params;

  const { publish, subscribe, messages, status: mqttStatus } = useMqtt();
  const initialDockStatusRef = useRef<string | null>(null);
  const scannedStationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  useEffect(() => {
    if (action !== 'return' || returnMethod !== 'scan_and_wait' || !messages || !targetDock || !scannedStationIdRef.current) return;

    const statusTopic = `estacao${scannedStationIdRef.current}/travas`;
    const newStatus = messages.get(statusTopic);

    if (newStatus) {
      if (initialDockStatusRef.current === null) {
        initialDockStatusRef.current = newStatus;
        return;
      }
      const oldStatus = initialDockStatusRef.current;
      const dockIndex = targetDock - 1;

      if (oldStatus[dockIndex] === '0' && newStatus[dockIndex] === '1') {
        finalizeReturn(scannedStationIdRef.current, targetDock);
        initialDockStatusRef.current = null;
        setTargetDock(null);
        scannedStationIdRef.current = null;
      } else {
        initialDockStatusRef.current = newStatus;
      }
    }
  }, [messages, action, returnMethod, targetDock]);

  const handleError = (error: any) => {
    // Agora o showErrorToast exibirá a mensagem correta (ex: "Você já tem uma corrida ativa")
    showErrorToast(error);
    setIsLoading(false);
    setShowScanAgain(true);
    setTargetDock(null);
    scannedStationIdRef.current = null;
    initialDockStatusRef.current = null;
    setStatusMessage('Ocorreu um erro.');
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    
    // Logs de depuração que você adicionou
    console.log('--- [QRScanner] Código lido ---');
    console.log('Parâmetros Recebidos: ', { action, returnMethod });
    console.log('Ride Ativa no Contexto? ID:', activeRide?.id);
    
    setScanned(true);
    setIsLoading(true);
    setShowScanAgain(false);
    setStatusMessage('Processando QR Code...');

    try {
      if (action === 'rent') {
        await handleRent(data);
      } else if (action === 'return') {
        if (returnMethod === 'already_returned') {
          await verifyAlreadyReturned(data);
        } else {
          await handleStandardReturn(data);
        }
      }
    } catch (error) {
      // O handleError agora será chamado se o startRide() falhar
      handleError(error);
    }
  };

  //
  // --- FUNÇÃO handleRent TOTALMENTE CORRIGIDA ---
  //
  const handleRent = async (bikeId: string) => {
    setStatusMessage('Validando bicicleta...');
    
    // --- ETAPA 1: Validações Iniciais ---
    if (!bikeId.startsWith('bike')) {
      throw new Error("QR Code inválido. Por favor, leia o código de uma bicicleta.");
    }
    if (activeRide) { // Verificação de estado local (primeira barreira)
      throw new Error("Você já tem uma corrida ativa.");
    }

    const { data: bikeData, error: bikeError } = await supabase
      .from('bikes')
      .select('status, last_station_id, current_dock_id')
      .eq('id', bikeId)
      .single();

    if (bikeError) throw new Error("Bicicleta não encontrada.");
    if (bikeData.status !== 'available') throw new Error(`Bicicleta indisponível (status: ${bikeData.status}).`);
    if (!bikeData.last_station_id || !bikeData.current_dock_id) throw new Error("Dados da bicicleta inconsistentes.");

    // --- ETAPA 2: Tentar iniciar a corrida (Lógica Crítica) ---
    // Usamos try/catch para garantir que o MQTT só seja enviado em caso de SUCESSO.
    
    let commandTopic: string | null = null;
    let commandMessage: string | null = null;

    try {
      setStatusMessage('Registrando início da corrida...');
      
      // Tenta iniciar a corrida (aqui é onde a verificação de duplicata do DB acontece)
      // Se startRide falhar (ex: corrida já existe), ele lança um erro e cai no CATCH.
      await startRide(bikeId, bikeData.last_station_id);

      // SUCESSO! A corrida foi registrada no DB. Agora podemos atualizar a bike.
      await supabase.from('bikes').update({ status: 'in_use', current_dock_id: null }).eq('id', bikeId);
      
      // Prepara os comandos MQTT
      commandTopic = `estacao${bikeData.last_station_id}/selecaobike`;
      commandMessage = `bike${bikeData.current_dock_id}`;

    } catch (error: any) {
        // Se startRide() lançou o erro "Você já tem uma corrida ativa",
        // ou qualquer outro erro (como o "erro ao verificar status..."),
        // ele será capturado aqui.
        console.error("[handleRent] Erro capturado do startRide:", error.message);
        // O comando MQTT NÃO será enviado.
        throw error; // Lança o erro para o handleBarCodeScanned tratar (mostrar o Toast)
    }

    // --- ETAPA 3: Enviar Comando MQTT (Só executa se o TRY for bem-sucedido) ---
    if (commandTopic && commandMessage) {
      setStatusMessage('Enviando comando de desbloqueio...');
      
      // Atraso de 2 segundos para o registro da corrida processar
      setTimeout(() => {
        let publishCount = 0;
        const intervalId = setInterval(async () => {
          try {
            console.log(`Enviando comando MQTT #${publishCount + 1}: Tópico=${commandTopic}, Mensagem=${commandMessage}`);
            await publish(commandTopic!, commandMessage!); // Usando ! pois temos certeza que não são nulos
            publishCount++;
            setStatusMessage(`Comando de desbloqueio enviado (${publishCount}/10)...`);

            if (publishCount >= 10) {
              clearInterval(intervalId);
              showSuccessToast("Sucesso!", `Bicicleta ${bikeId} desbloqueada. Boa viagem!`);
              navigation.navigate('App');
            }
          } catch (mqttError) {
            console.error(`Erro ao enviar comando MQTT #${publishCount + 1}:`, mqttError);
            clearInterval(intervalId);
            // Mesmo que o MQTT falhe, a corrida está ATIVA. O usuário deve ser informado.
            showErrorToast(mqttError, 'Falha ao comunicar com a estação. Sua corrida está registrada. Se a bike não destravar, contate o suporte.');
            navigation.navigate('App'); // Leva para o App, onde o ActiveRideCard aparecerá.
          }
        }, 2000);
      }, 2000);
    } else {
        // Isso não deve acontecer, mas é uma segurança
        throw new Error("Falha interna: Tópico MQTT não pôde ser preparado.");
    }
  };
  // --- FIM DA FUNÇÃO handleRent CORRIGIDA ---
  //

  const handleStandardReturn = async (qrData: string) => {
    if (!activeRide) throw new Error("Nenhuma corrida ativa para finalizar.");

    const parts = qrData.split('/');
    if (parts.length !== 2 || !parts[0].startsWith('estacao') || !parts[1].startsWith('trava')) {
      throw new Error("QR Code inválido. Por favor, leia o código de uma trava específica.");
    }

    const scannedStationId = parseInt(parts[0].replace('estacao', ''), 10);
    const scannedDockId = parseInt(parts[1].replace('trava', ''), 10);

    if (isNaN(scannedStationId) || isNaN(scannedDockId) || scannedDockId < 1 || scannedDockId > 12) {
      throw new Error("Dados do QR Code da trava inválidos.");
    }

    scannedStationIdRef.current = scannedStationId;
    setTargetDock(scannedDockId);
    const statusTopic = `estacao${scannedStationId}/travas`;
    subscribe(statusTopic);

    setStatusMessage(`Encaixe a bicicleta na Trava ${scannedDockId}. Aguardando confirmação...`);
    setIsLoading(false);
  };

  const verifyAlreadyReturned = async (qrData: string) => {
    if (!activeRide) throw new Error("Nenhuma corrida ativa para finalizar.");
    if (mqttStatus !== 'connected') throw new Error("Sem conexão com o sistema das estações. Tente novamente.");

    const parts = qrData.split('/');
    if (parts.length !== 2 || !parts[0].startsWith('estacao') || !parts[1].startsWith('trava')) {
      throw new Error("QR Code inválido. Por favor, leia o código de uma trava específica.");
    }

    const scannedStationId = parseInt(parts[0].replace('estacao', ''), 10);
    const scannedDockId = parseInt(parts[1].replace('trava', ''), 10);

    if (isNaN(scannedStationId) || isNaN(scannedDockId) || scannedDockId < 1 || scannedDockId > 12) {
      throw new Error("Dados do QR Code da trava inválidos.");
    }

    setStatusMessage(`Verificando status da Trava ${scannedDockId}...`);

    const statusTopic = `estacao${scannedStationId}/travas`;
    const currentStatus = messages.get(statusTopic);
    const dockIndex = scannedDockId - 1;

    if (!currentStatus || currentStatus.length !== 12) {
        throw new Error("Não foi possível obter o status atual da estação. Tente novamente.");
    }

    const isDockClosedMQTT = currentStatus[dockIndex] === '1';

    const { data: bikeInDock, error: dbError } = await supabase
      .from('bikes')
      .select('id')
      .eq('current_dock_id', scannedDockId)
      .eq('last_station_id', scannedStationId)
      .maybeSingle();

    if (dbError) {
      throw new Error("Erro ao verificar o status da vaga no sistema.");
    }

    const isDockEmptyDB = bikeInDock === null;

    if (isDockClosedMQTT && isDockEmptyDB) {
      setStatusMessage("Confirmando devolução...");
      await finalizeReturn(scannedStationId, scannedDockId);
    } else {
      let errorMsg = "Não foi possível confirmar a devolução:\n";
      if (!isDockClosedMQTT) errorMsg += "- A trava parece estar aberta.\n";
      if (!isDockEmptyDB) errorMsg += `- Outra bicicleta (${bikeInDock?.id}) já está registrada nesta vaga.\n`;
      errorMsg += "Verifique se encaixou corretamente ou tente escanear outra vaga.";
      throw new Error(errorMsg);
    }
  };


  const finalizeReturn = async (stationId: number, dockId: number) => {
    if (!activeRide) return;
    setIsLoading(true);
    setStatusMessage('Processando devolução...');
    try {
      await endRide(stationId, dockId);
      await supabase
        .from('bikes')
        .update({ status: 'available', last_station_id: stationId, current_dock_id: dockId })
        .eq('id', activeRide.bike_id);

      showSuccessToast("Sucesso!", `Bicicleta devolvida com sucesso na vaga ${dockId}!`);
      navigation.navigate('App');
    } catch (error: any) {
      throw error; // Este erro será tratado pelo handleError
    } finally {
      // O 'finally' não é mais necessário aqui, pois o handleError
      // já cuida de redefinir o estado de loading em caso de falha.
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsLoading(false);
    setShowScanAgain(false);
    setTargetDock(null);
    scannedStationIdRef.current = null;
    initialDockStatusRef.current = null;
    setStatusMessage('');
  };

  if (hasPermission === null) return <Text style={styles.text}>A pedir permissão para a câmara...</Text>;
  if (hasPermission === false && !__DEV__) return <Text style={styles.text}>Sem acesso à câmara. Por favor, ative nas definições.</Text>;

  return (
    <View style={styles.container}>
      {hasPermission && (
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View style={styles.overlay}>
        {isLoading || statusMessage ? (
          <View style={styles.statusContainer}>
            {isLoading && <ActivityIndicator size="large" color="#fff" />}
            <Text style={styles.statusText}>{statusMessage}</Text>
            {showScanAgain && (
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                <Text style={styles.scanAgainButtonText}>Escanear Novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.title}>{action === 'rent' ? 'Aponte para o QR Code da Bicicleta' : 'Aponte para o QR Code da Trava'}</Text>
            <View style={styles.scanBox} />
          </>
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <View style={styles.devContainer}>
            <Text style={styles.devTitle}>-- MODO SIMULADOR --</Text>
            <TouchableOpacity
              style={styles.devButton}
              onPress={() => handleBarCodeScanned({ data: 'bike1' })}>
              <Text style={styles.devButtonText}>Simular Aluguel (bike1)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.devButton}
              onPress={() => {
                 // Simula a navegação para devolução
                 navigation.setParams({ action: 'return', returnMethod: 'scan_and_wait' });
                 handleBarCodeScanned({ data: 'estacao1/trava3' });
              }}>
              <Text style={styles.devButtonText}>Devolver Normal (E1/T3)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.devButton}
               onPress={() => {
                 // Simula a navegação para devolução
                 navigation.setParams({ action: 'return', returnMethod: 'already_returned' });
                 handleBarCodeScanned({ data: 'estacao1/trava4' });
              }}>
              <Text style={styles.devButtonText}>Já Devolvi (E1/T4)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'column', justifyContent: 'center', backgroundColor: 'black' },
    text: { flex: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 18, color: 'white' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, color: 'white', fontFamily: 'Montserrat_700Bold', position: 'absolute', top: '20%', textAlign: 'center', paddingHorizontal: 20 },
    scanBox: { width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 10 },
    cancelButton: { position: 'absolute', bottom: '10%', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
    cancelButtonText: { color: 'white', fontSize: 16, fontFamily: 'Montserrat_600SemiBold' },
    statusContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    statusText: { color: 'white', fontSize: 18, marginTop: 20, textAlign: 'center', fontFamily: 'Montserrat_400Regular' },
    scanAgainButton: { marginTop: 20, backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, },
    scanAgainButtonText: { color: Colors.surface, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
    devContainer: { position: 'absolute', bottom: '20%', alignItems: 'center', padding: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10 },
    devTitle: { color: 'white', fontFamily: 'Montserrat_700Bold', marginBottom: 10 },
    devButton: { backgroundColor: Colors.accent, padding: 10, borderRadius: 5, marginVertical: 5, width: 250, alignItems: 'center' },
    devButtonText: { color: Colors.text, fontFamily: 'Montserrat_600SemiBold' },
});

export default QRScannerScreen;