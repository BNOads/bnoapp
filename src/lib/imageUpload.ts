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

  try {
    // Obter usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Usuário não autenticado:', userError);
      throw new Error('Usuário não autenticado. Faça login para fazer upload de imagens.');
    }

    if (onProgress) onProgress(20);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.type.split('/')[1] || 'png';
    const fileName = `${timestamp}-${randomString}.${extension}`;

    // Construir caminho: {userId}/{context}/{entityId}/{yyyy}/{mm}/{fileName}
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    
    const filePath = entityId
      ? `${user.id}/${context || 'general'}/${entityId}/${yyyy}/${mm}/${fileName}`
      : `${user.id}/${context || 'general'}/${yyyy}/${mm}/${fileName}`;

    console.log('📤 Fazendo upload direto para Storage:', {
      bucket: 'richtext-uploads',
      path: filePath,
      fileType: file.type,
      fileSize: `${(file.size / 1024).toFixed(2)}KB`
    });

    if (onProgress) onProgress(40);

    // Upload direto para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('richtext-uploads')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '31536000', // 1 ano
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      throw new Error(uploadError.message || 'Erro ao fazer upload da imagem');
    }

    if (onProgress) onProgress(80);

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('richtext-uploads')
      .getPublicUrl(filePath);

    if (onProgress) onProgress(100);

    console.log('✅ Upload concluído com sucesso:', {
      url: publicUrl,
      fileName,
      fileSize: file.size
    });

    return {
      url: publicUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type,
    };
  } catch (error: any) {
    console.error('❌ Erro ao fazer upload:', {
      message: error.message,
      stack: error.stack,
      error
    });
    
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