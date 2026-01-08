import Toast from 'react-native-toast-message';
// Remova a importação do FunctionsHttpError daqui

const errorTranslations: { [key: string]: string } = {
    'Invalid login credentials': 'Email ou senha inválidos.',
    'User already registered': 'Este email já está cadastrado.',
    'Unable to validate email address: invalid format': 'O formato do email é inválido.',
    'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
    'Network request failed': 'Falha na conexão. Verifique sua internet.',
    'QR Code inválido. Por favor, leia o código de uma bicicleta.': 'QR Code inválido. Por favor, leia o código de uma bicicleta.',
    'QR Code inválido. Por favor, leia o código da estação.': 'QR Code inválido. Por favor, leia o código da estação.',
    'Nenhuma corrida ativa para finalizar.': 'Nenhuma corrida ativa para finalizar.',
    'Por favor, aguarde {minutes} minuto(s) para iniciar uma nova corrida.': 'Por favor, aguarde {minutes} minuto(s) para iniciar uma nova corrida.',
};

/**
 * Exibe um Toast de erro elegante, tratando o erro de forma segura.
 * @param error O objeto de erro (do tipo unknown) capturado no catch.
 * @param defaultMessage Uma mensagem padrão para exibir.
 */
export const showErrorToast = (error: unknown, defaultMessage: string = 'Ocorreu um erro inesperado.') => {
    console.error("HANDLED_ERROR:", error);

    let message = defaultMessage;

    // Esta é a lógica original e correta
    if (error instanceof Error) {
        message = errorTranslations[error.message] || error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        message = errorTranslations[(error as any).message] || (error as any).message;
    } else if (typeof error === 'string') {
        message = errorTranslations[error] || error;
    }

    Toast.show({
        type: 'error',
        text1: 'Atenção',
        text2: message,
        position: 'top',
        visibilityTime: 4000,
    });
};

/**
 * Exibe um Toast de sucesso.
 * @param title Título da mensagem.
 * @param message A mensagem de sucesso a ser exibida.
 */
export const showSuccessToast = (title: string, message: string) => {
    Toast.show({
        type: 'success',
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
    });
};