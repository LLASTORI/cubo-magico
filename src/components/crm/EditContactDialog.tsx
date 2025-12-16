import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { CRMContact } from '@/hooks/useCRMContact';
import { InternationalPhoneInput, parsePhoneNumber, getFullPhoneNumber } from '@/components/ui/international-phone-input';

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: CRMContact;
  onSave: (data: Partial<CRMContact>) => void;
  isPending?: boolean;
}

export function EditContactDialog({ open, onOpenChange, contact, onSave, isPending }: EditContactDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_country_code: '55',
    phone_ddd: '',
    phone: '',
    document: '',
    instagram: '',
    address: '',
    address_number: '',
    address_complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: '',
    cep: '',
    status: 'lead',
  });

  // Build full phone for the international input
  const [fullPhone, setFullPhone] = useState('');

  useEffect(() => {
    if (contact) {
      const countryCode = (contact as any).phone_country_code || '55';
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone_country_code: countryCode,
        phone_ddd: contact.phone_ddd || '',
        phone: contact.phone || '',
        document: contact.document || '',
        instagram: contact.instagram || '',
        address: contact.address || '',
        address_number: contact.address_number || '',
        address_complement: contact.address_complement || '',
        neighborhood: contact.neighborhood || '',
        city: contact.city || '',
        state: contact.state || '',
        country: contact.country || 'Brasil',
        cep: contact.cep || '',
        status: contact.status || 'lead',
      });
      
      // Build E.164 phone for the input
      const phone = `+${countryCode}${contact.phone_ddd || ''}${contact.phone || ''}`;
      setFullPhone(phone.length > 3 ? phone : '');
    }
  }, [contact]);

  const handlePhoneChange = (phone: string, countryCode: string) => {
    setFullPhone(phone);
    
    // Parse the phone number to extract components
    const cleanPhone = phone.replace(/\D/g, '');
    const parsed = parsePhoneNumber(cleanPhone);
    
    setFormData(prev => ({
      ...prev,
      phone_country_code: parsed.countryCode || countryCode,
      phone_ddd: parsed.areaCode,
      phone: parsed.localNumber
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="email">E-mail</Label>
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
                Selecione o país e digite o número completo. Ex: 🇧🇷 11 999999999
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
          </div>

          {/* Endereço */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Endereço</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  placeholder="00000-000"
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
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Bairro"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Avenida..."
                />
              </div>

              <div>
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  value={formData.address_number}
                  onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                  placeholder="123"
                />
              </div>

              <div>
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  value={formData.address_complement}
                  onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                  placeholder="Apto, Bloco..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
