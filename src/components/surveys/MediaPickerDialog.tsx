import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutomationMedia, getMediaTypeFromMime, formatFileSize } from '@/hooks/useAutomationMedia';
import { Image, Link, Search, Loader2, Upload, Check, FolderOpen } from 'lucide-react';
import { useRef } from 'react';

interface MediaPickerDialogProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label: string;
  filterType?: 'image' | 'all';
  children?: React.ReactNode;
}

export function MediaPickerDialog({ 
  value, 
  onChange, 
  label,
  filterType = 'image',
  children 
}: MediaPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { mediaList, isLoading, uploadMedia, allowedTypes } = useAutomationMedia();

  const filteredMedia = mediaList.filter(media => {
    const matchesSearch = media.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || getMediaTypeFromMime(media.mime_type) === filterType;
    return matchesSearch && matchesType;
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const uploadedMedia = await uploadMedia.mutateAsync(files[0]);
    onChange(uploadedMedia.public_url);
    setOpen(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectMedia = (url: string) => {
    onChange(url);
    setOpen(false);
  };

  const handleUrlSubmit = () => {
    onChange(urlInput || undefined);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setUrlInput('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start">
            <Image className="h-4 w-4 mr-2" />
            {value ? 'Alterar mídia' : `Selecionar ${label}`}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar {label}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL Externa
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="library" className="space-y-4 mt-4">
            {/* Search and Upload */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na biblioteca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploadMedia.isPending}
              >
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
                accept={filterType === 'image' ? 'image/*' : allowedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
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
                  {searchTerm ? 'Nenhuma mídia encontrada' : 'Biblioteca vazia'}
                </p>
                <p className="text-sm">
                  {searchTerm ? 'Tente outro termo' : 'Faça upload de uma mídia'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredMedia.map((media) => {
                    const isSelected = value === media.public_url;
                    return (
                      <button
                        key={media.id}
                        onClick={() => handleSelectMedia(media.public_url)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                        }`}
                      >
                        {getMediaTypeFromMime(media.mime_type) === 'image' ? (
                          <img 
                            src={media.public_url} 
                            alt={media.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              {media.mime_type.split('/')[1]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-[10px] text-white truncate">{media.file_name}</p>
                          <p className="text-[9px] text-white/70">{formatFileSize(media.file_size)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/imagem.png"
              />
              <p className="text-xs text-muted-foreground">
                Cole a URL de uma imagem externa
              </p>
            </div>
            
            {urlInput && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <img 
                  src={urlInput} 
                  alt="Preview"
                  className="max-h-32 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <Button onClick={handleUrlSubmit} className="w-full">
              Usar esta URL
            </Button>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t">
          {value && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive">
              Remover mídia
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="ml-auto">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
