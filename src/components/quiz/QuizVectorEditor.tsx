import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface QuizVectorEditorProps {
  vector: Record<string, number>;
  onChange: (vector: Record<string, number>) => void;
  type: 'traits' | 'intent';
  label?: string;
}

const DEFAULT_DIMENSIONS = {
  traits: ['dominance', 'influence', 'stability', 'conscientiousness'],
  intent: ['purchase', 'curiosity', 'research', 'awareness', 'trust', 'urgency'],
};

const DIMENSION_LABELS: Record<string, string> = {
  // Traits
  dominance: 'Dominância',
  influence: 'Influência',
  stability: 'Estabilidade',
  conscientiousness: 'Conscienciosidade',
  analytical: 'Analítico',
  emotional: 'Emocional',
  racional: 'Racional',
  intuitivo: 'Intuitivo',
  // Intent
  purchase: 'Compra',
  curiosity: 'Curiosidade',
  research: 'Pesquisa',
  awareness: 'Consciência',
  trust: 'Confiança',
  urgency: 'Urgência',
};

export function QuizVectorEditor({ vector, onChange, type, label }: QuizVectorEditorProps) {
  const [newDimension, setNewDimension] = useState('');
  const [localVector, setLocalVector] = useState<Record<string, number>>(vector || {});

  useEffect(() => {
    setLocalVector(vector || {});
  }, [vector]);

  const dimensions = Object.keys(localVector);
  const total = Object.values(localVector).reduce((sum, val) => sum + val, 0);
  const isNormalized = Math.abs(total - 1) < 0.01 || total === 0;

  const handleValueChange = (key: string, value: number) => {
    const updated = { ...localVector, [key]: value };
    setLocalVector(updated);
    onChange(updated);
  };

  const handleAddDimension = () => {
    if (!newDimension.trim()) return;
    const key = newDimension.toLowerCase().replace(/\s+/g, '_');
    if (localVector[key] !== undefined) return;
    
    const updated = { ...localVector, [key]: 0 };
    setLocalVector(updated);
    onChange(updated);
    setNewDimension('');
  };

  const handleRemoveDimension = (key: string) => {
    const updated = { ...localVector };
    delete updated[key];
    setLocalVector(updated);
    onChange(updated);
  };

  const handleNormalize = () => {
    if (total === 0) return;
    
    const normalized: Record<string, number> = {};
    Object.entries(localVector).forEach(([key, value]) => {
      normalized[key] = Math.round((value / total) * 100) / 100;
    });
    setLocalVector(normalized);
    onChange(normalized);
  };

  const addDefaultDimensions = () => {
    const defaults = DEFAULT_DIMENSIONS[type];
    const updated = { ...localVector };
    const weight = 1 / defaults.length;
    defaults.forEach(dim => {
      if (updated[dim] === undefined) {
        updated[dim] = Math.round(weight * 100) / 100;
      }
    });
    setLocalVector(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label || (type === 'traits' ? 'Vetor de Traços' : 'Vetor de Intenção')}
        </Label>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-mono",
            isNormalized ? "text-success" : "text-destructive"
          )}>
            Total: {(total * 100).toFixed(0)}%
          </span>
          {!isNormalized && total > 0 && (
            <Button variant="ghost" size="sm" onClick={handleNormalize}>
              Normalizar
            </Button>
          )}
        </div>
      </div>

      {!isNormalized && total > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="h-4 w-4" />
          <span>Soma deve ser 100% para normalização correta</span>
        </div>
      )}

      {dimensions.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <p className="mb-2">Nenhuma dimensão configurada</p>
          <Button variant="outline" size="sm" onClick={addDefaultDimensions}>
            Adicionar Dimensões Padrão
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {dimensions.map((key) => {
            const value = localVector[key];
            const percentage = Math.round(value * 100);
            
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">
                    {DIMENSION_LABELS[key] || key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveDimension(key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[percentage]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([val]) => handleValueChange(key, val / 100)}
                  className="cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <Input
          placeholder="Nova dimensão..."
          value={newDimension}
          onChange={(e) => setNewDimension(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddDimension()}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={handleAddDimension} disabled={!newDimension.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
