import { useState } from 'react';
import { useWhatsAppDepartments } from '@/hooks/useWhatsAppDepartments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#64748b', // Slate
];

export function WhatsAppDepartmentsManager() {
  const { 
    departments, 
    isLoading, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment,
    isCreating,
    isUpdating 
  } = useWhatsAppDepartments();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#6366f1');
    setEditingDepartment(null);
  };

  const handleOpenDialog = (departmentId?: string) => {
    if (departmentId) {
      const dept = departments?.find(d => d.id === departmentId);
      if (dept) {
        setEditingDepartment(departmentId);
        setName(dept.name);
        setDescription(dept.description || '');
        setColor(dept.color);
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (editingDepartment) {
      updateDepartment({
        id: editingDepartment,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    } else {
      createDepartment({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departamentos
            </CardTitle>
            <CardDescription>
              Organize os atendentes por área (Vendas, Suporte, etc.)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? 'Editar Departamento' : 'Novo Departamento'}
                </DialogTitle>
                <DialogDescription>
                  Configure as informações do departamento
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Vendas, Suporte, Financeiro"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva as responsabilidades deste departamento"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((presetColor) => (
                      <button
                        key={presetColor}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          color === presetColor 
                            ? 'border-foreground scale-110' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: presetColor }}
                        onClick={() => setColor(presetColor)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!name.trim()}
                >
                  {isCreating || isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingDepartment ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {departments && departments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="font-medium">{dept.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {dept.description || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                      {dept.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(dept.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDepartment(dept.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum departamento cadastrado</p>
            <p className="text-sm">Crie departamentos para organizar seus atendentes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
