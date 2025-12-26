import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { InternationalPhoneInput, parsePhoneNumber } from '@/components/ui/international-phone-input';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contactId: string) => void;
}

export function CreateContactDialog({ open, onOpenChange, onSuccess }: CreateContactDialogProps) {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [fullPhone, setFullPhone] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_country_code: '55',
    phone_ddd: '',
    phone: '',
    document: '',
    instagram: '',
    city: '',
    state: '',
    source: 'manual',
    status: 'lead',
    notes: '',
    tags: '',
  });

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_country_code: '55',
      phone_ddd: '',
      phone: '',
      document: '',
      instagram: '',
      city: '',
      state: '',
      source: 'manual',
      status: 'lead',
      notes: '',
      tags: '',
    });
    setFullPhone('');
  };

  const handlePhoneChange = (phone: string, countryCode: string) => {
    setFullPhone(phone);
    
    const cleanPhone = phone.replace(/\D/g, '');
    const parsed = parsePhoneNumber(cleanPhone);
    
    setFormData(prev => ({
      ...prev,
      phone_country_code: parsed.countryCode || countryCode,
      phone_ddd: parsed.areaCode,
      phone: parsed.localNumber
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProject?.id) {
      toast.error('Nenhum projeto selecionado');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('E-mail é obrigatório');
      return;
    }

    setIsPending(true);

    try {
      // Verificar se já existe contato com esse email
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('id, name, email')
        .eq('project_id', currentProject.id)
        .eq('email', formData.email.toLowerCase().trim())
        .single();

      if (existingContact) {
        toast.error(`Já existe um contato com este e-mail: ${existingContact.name || existingContact.email}`);
        setIsPending(false);
        return;
      }

      // Preparar tags
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Construir nome completo a partir de first_name e last_name
      const fullName = [formData.first_name.trim(), formData.last_name.trim()].filter(Boolean).join(' ') || null;

      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({
          project_id: currentProject.id,
          name: fullName,
          first_name: formData.first_name.trim() || null,
          last_name: formData.last_name.trim() || null,
          email: formData.email.toLowerCase().trim(),
          phone_country_code: formData.phone_country_code || '55',
          phone_ddd: formData.phone_ddd || null,
          phone: formData.phone || null,
          document: formData.document || null,
          instagram: formData.instagram || null,
          city: formData.city || null,
          state: formData.state || null,
          source: formData.source,
          status: formData.status,
          notes: formData.notes || null,
          tags: tags.length > 0 ? tags : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Contato criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      resetForm();
      onOpenChange(false);
      
      if (onSuccess && data) {
        onSuccess(data.id);
      }
    } catch (error: any) {
      console.error('Erro ao criar contato:', error);
      toast.error(error.message || 'Erro ao criar contato');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Primeiro Nome</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Primeiro nome"
              />
            </div>

            <div>
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Sobrenome"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="phone">Telefone</Label>
              <InternationalPhoneInput
                value={fullPhone}
                onChange={handlePhoneChange}
                defaultCountry="br"
                placeholder="Telefone com código do país"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Selecione o país e digite o número completo
              </p>
            </div>

            <div>
              <Label htmlFor="document">CPF/CNPJ</Label>
              <Input
                id="document"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@usuario"
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>

            <div>
              <Label htmlFor="state">Estado</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospecto</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source">Origem</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="hotmart">Hotmart</SelectItem>
                  <SelectItem value="import">Importação</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Lead quente, Interessado, etc"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o contato..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Contato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
