import { useState } from 'react';
import { useAutomationMedia, getMediaTypeFromMime, formatFileSize } from '@/hooks/useAutomationMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Trash2, Search, FileImage, FileVideo, FileAudio, FileText, FolderOpen, HardDrive } from 'lucide-react';
import { useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MediaLibraryManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mediaList, isLoading, uploadMedia, deleteMedia, maxFileSize, allowedTypes } = useAutomationMedia();
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      await uploadMedia.mutateAsync(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (media: typeof mediaList[0]) => {
    setDeletingId(media.id);
    try {
      await deleteMedia.mutateAsync(media);
    } finally {
      setDeletingId(null);
    }
  };

  const getMediaIcon = (mimeType: string) => {
    const type = getMediaTypeFromMime(mimeType);
    switch (type) {
      case 'image': return <FileImage className="h-5 w-5" />;
      case 'video': return <FileVideo className="h-5 w-5" />;
      case 'audio': return <FileAudio className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getMediaTypeBadge = (mimeType: string) => {
    const type = getMediaTypeFromMime(mimeType);
    const variants: Record<string, { label: string; className: string }> = {
      image: { label: 'Imagem', className: 'bg-blue-500/10 text-blue-500' },
      video: { label: 'Vídeo', className: 'bg-purple-500/10 text-purple-500' },
      audio: { label: 'Áudio', className: 'bg-green-500/10 text-green-500' },
      document: { label: 'Documento', className: 'bg-orange-500/10 text-orange-500' },
    };
    const variant = variants[type] || variants.document;
    return <Badge variant="secondary" className={variant.className}>{variant.label}</Badge>;
  };

  const filteredMedia = mediaList.filter(media => 
    media.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSize = mediaList.reduce((acc, m) => acc + m.file_size, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Biblioteca de Mídias
            </CardTitle>
            <CardDescription>
              Gerencie as mídias utilizadas nas automações.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{mediaList.length} arquivo(s)</span>
            <span>•</span>
            <span>{formatFileSize(totalSize)} usado</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mídia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMedia.isPending}>
            {uploadMedia.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
        </div>

        {/* Limits Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span>Máximo por arquivo: {maxFileSize / 1024 / 1024}MB</span>
          <span>•</span>
          <span>Formatos: JPG, PNG, GIF, WEBP, MP4, WEBM, MP3, OGG, PDF</span>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">
              {searchTerm ? 'Nenhuma mídia encontrada' : 'Nenhuma mídia na biblioteca'}
            </p>
            <p className="text-sm">
              {searchTerm ? 'Tente outro termo de busca' : 'Faça upload para começar'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((media) => (
                <div
                  key={media.id}
                  className="group relative border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-all"
                >
                  {/* Preview */}
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {getMediaTypeFromMime(media.mime_type) === 'image' ? (
                      <img 
                        src={media.public_url} 
                        alt={media.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        {getMediaIcon(media.mime_type)}
                        <span className="text-xs">{media.mime_type.split('/')[1]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2 space-y-1">
                    <p className="text-sm font-medium truncate" title={media.file_name}>
                      {media.file_name}
                    </p>
                    <div className="flex items-center justify-between">
                      {getMediaTypeBadge(media.mime_type)}
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(media.file_size)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(media.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {deletingId === media.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir mídia?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir "{media.file_name}"? 
                          Esta ação não pode ser desfeita e pode afetar automações que usam esta mídia.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(media)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
