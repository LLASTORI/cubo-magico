import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export interface AutomationMedia {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  public_url: string;
  uploaded_by: string | null;
  created_at: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'application/pdf',
];

export function useAutomationMedia() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: mediaList, isLoading } = useQuery({
    queryKey: ['automation-media', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const { data, error } = await supabase
        .from('automation_media')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutomationMedia[];
    },
    enabled: !!currentProject?.id,
  });

  const uploadMedia = useMutation({
    mutationFn: async (file: File) => {
      if (!currentProject?.id) throw new Error('Projeto não selecionado');

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Tipo de arquivo não permitido');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentProject.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('automation-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('automation-media')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error } = await supabase
        .from('automation_media')
        .insert({
          project_id: currentProject.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          public_url: publicUrl,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AutomationMedia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-media', currentProject?.id] });
      toast.success('Mídia enviada com sucesso');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mídia');
    },
  });

  const deleteMedia = useMutation({
    mutationFn: async (media: AutomationMedia) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('automation-media')
        .remove([media.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('automation_media')
        .delete()
        .eq('id', media.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-media', currentProject?.id] });
      toast.success('Mídia excluída');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir mídia');
    },
  });

  return {
    mediaList: mediaList || [],
    isLoading,
    uploadMedia,
    deleteMedia,
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
  };
}

export function getMediaTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
