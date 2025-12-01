import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadImageOptions {
  file: File | Blob;
  context?: string;
  entityId?: string;
  onProgress?: (progress: number) => void;
}

interface UploadImageResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

export async function uploadImage({
  file,
  context,
  entityId,
  onProgress,
}: UploadImageOptions): Promise<UploadImageResult> {
  // Validações client-side
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido. Use: PNG, JPEG, WEBP ou GIF`);
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    throw new Error(`Arquivo muito grande (${sizeMB}MB). Máximo: 5MB`);
  }

  // Preparar FormData
  const formData = new FormData();
  formData.append('file', file);
  if (context) formData.append('context', context);
  if (entityId) formData.append('entityId', entityId);

  // Simular progresso (já que fetch não suporta nativamente)
  if (onProgress) {
    const progressInterval = setInterval(() => {
      onProgress(Math.random() * 40 + 30); // 30-70%
    }, 500);

    // Limpar intervalo após timeout
    setTimeout(() => clearInterval(progressInterval), 10000);
  }

  try {
    // Obter sessão para passar token de autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      throw new Error('Erro ao obter sessão de autenticação');
    }
    
    if (!session) {
      console.error('❌ Usuário não autenticado');
      throw new Error('Usuário não autenticado. Faça login para fazer upload de imagens.');
    }

    console.log('✅ Sessão obtida, iniciando upload...', {
      fileType: file.type,
      fileSize: `${(file.size / 1024).toFixed(2)}KB`,
      context,
      entityId
    });

    const uploadUrl = 'https://tbdooscfrrkwfutkdjha.supabase.co/functions/v1/upload-richtext-image';
    console.log('📤 Enviando para:', uploadUrl);

    // Fazer chamada HTTP direta para garantir que o token é passado corretamente
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    console.log('📥 Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erro no upload:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.error || data.details || `Erro HTTP ${response.status}: ${response.statusText}`);
    }

    if (!data || !data.url) {
      console.error('❌ Resposta inválida:', data);
      throw new Error('Resposta inválida do servidor - URL não retornada');
    }

    if (onProgress) onProgress(100);

    console.log('✅ Upload concluído com sucesso:', {
      url: data.url,
      fileName: data.fileName,
      fileSize: data.fileSize
    });

    return data as UploadImageResult;
  } catch (error: any) {
    console.error('❌ Erro ao fazer upload:', {
      message: error.message,
      stack: error.stack,
      error
    });
    
    // Melhorar mensagens de erro específicas
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
    }
    
    throw new Error(error.message || 'Erro ao fazer upload da imagem');
  }
}

/**
 * Converte um data URL (paste de clipboard) para Blob
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Processa paste event e retorna File se for imagem
 */
export function getImageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Verificar se é imagem
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      return file;
    }
  }

  return null;
}

/**
 * Exibe toast de erro amigável
 */
export function showUploadError(error: any) {
  const message = error.message || 'Erro ao fazer upload da imagem';
  
  toast.error("Erro no upload", {
    description: message,
    action: {
      label: "Tentar novamente",
      onClick: () => {}, // Pode ser substituído por lógica de retry
    },
  });
}