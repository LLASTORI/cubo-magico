import { cn } from '@/lib/utils';

interface QuizVectorBarsProps {
  vector: Record<string, number>;
  type: 'intent' | 'traits';
  maxItems?: number;
}

const INTENT_COLORS: Record<string, string> = {
  purchase: 'bg-green-500',
  curiosity: 'bg-blue-500',
  research: 'bg-purple-500',
  awareness: 'bg-amber-500',
  trust: 'bg-teal-500',
  urgency: 'bg-red-500',
};

const TRAIT_COLORS: Record<string, string> = {
  dominance: 'bg-red-500',
  influence: 'bg-amber-500',
  stability: 'bg-green-500',
  conscientiousness: 'bg-blue-500',
  analytical: 'bg-indigo-500',
  emotional: 'bg-pink-500',
  racional: 'bg-slate-500',
  intuitivo: 'bg-violet-500',
};

const DIMENSION_LABELS: Record<string, string> = {
  // Intent dimensions
  purchase: 'Compra',
  curiosity: 'Curiosidade',
  research: 'Pesquisa',
  awareness: 'Consciência',
  trust: 'Confiança',
  urgency: 'Urgência',
  // Trait dimensions
  dominance: 'Dominância',
  influence: 'Influência',
  stability: 'Estabilidade',
  conscientiousness: 'Conscienciosidade',
  analytical: 'Analítico',
  emotional: 'Emocional',
  racional: 'Racional',
  intuitivo: 'Intuitivo',
};

export function QuizVectorBars({ vector, type, maxItems = 6 }: QuizVectorBarsProps) {
  // Sort by value descending and take top items
  const sortedEntries = Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);

  if (sortedEntries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">Sem dados disponíveis</p>
    );
  }

  const colors = type === 'intent' ? INTENT_COLORS : TRAIT_COLORS;

  return (
    <div className="space-y-2">
      {sortedEntries.map(([key, value]) => {
        const percentage = Math.round(value * 100);
        const colorClass = colors[key] || (type === 'intent' ? 'bg-primary' : 'bg-secondary');
        const label = DIMENSION_LABELS[key] || key;

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground capitalize">{label}</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-300", colorClass)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
