import { message, notification } from 'antd';
import { supabase } from '@/lib/supabase'; // Supposant que votre client est ici

export const useFeedback = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const showSuccess = (content: string) => {
    messageApi.success({
      content,
      duration: 3,
    });
  };

  const showError = async (title: string, error: any, silent = false) => {
    const errorMessage = error?.message || "Une erreur inattendue est survenue";
    
    // Logging automatique dans la table error_logs (voir database.types.ts)
    try {
      await supabase.rpc('fn_log_error', {
        p_error_message: errorMessage,
        p_error_type: 'client_ui',
        p_error_details: { 
          context: title, 
          stack: error?.stack,
          timestamp: new Date().toISOString() 
        }
      });
    } catch (logErr) {
      console.error("Échec du logging de l'erreur:", logErr);
    }

    if (!silent) {
      notification.error({
        message: title,
        description: errorMessage,
        placement: 'topRight',
        duration: 5,
      });
    }
  };

  const showLoading = (content: string) => {
    return messageApi.loading({
      content,
      duration: 0, // Reste jusqu'à ce qu'on appelle la fonction de retour
    });
  };

  return { showSuccess, showError, showLoading, contextHolder };
};