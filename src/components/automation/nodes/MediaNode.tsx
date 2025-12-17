import { memo } from 'react';
import { BaseNode } from './BaseNode';
import { Image, FileAudio, Video, FileText } from 'lucide-react';

interface MediaNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    media_type?: 'image' | 'audio' | 'video' | 'document';
    media_url?: string;
    caption?: string;
    isConfigured?: boolean;
  };
  selected: boolean;
}

const mediaIcons: Record<string, React.ReactNode> = {
  image: <Image className="h-4 w-4" />,
  audio: <FileAudio className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
};

const mediaLabels: Record<string, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
};

export const MediaNode = memo(({ data, selected }: MediaNodeProps) => {
  const icon = mediaIcons[data.media_type || 'image'] || <Image className="h-4 w-4" />;
  
  const getSubtitle = () => {
    if (!data.media_url) return 'Clique para configurar';
    const type = mediaLabels[data.media_type || 'image'];
    return data.caption ? `${type}: ${data.caption.substring(0, 20)}...` : type;
  };

  return (
    <BaseNode
      data={{ 
        ...data, 
        label: data.label || 'Mídia', 
        subtitle: getSubtitle(),
        isConfigured: !!data.media_url 
      }}
      selected={selected}
      icon={icon}
      color="bg-gradient-to-br from-pink-500 to-rose-500"
    />
  );
});

MediaNode.displayName = 'MediaNode';
