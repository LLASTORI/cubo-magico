import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Filter, 
  X, 
  CalendarIcon,
  Tag,
  DollarSign,
  Clock,
  Plus,
  Trash2
} from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanContact {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  pipeline_stage_id: string | null;
  total_revenue: number | null;
  total_purchases: number | null;
  last_activity_at: string;
  updated_at: string;
  tags: string[] | null;
}

export interface KanbanFilters {
  search: string;
  tags: string[];
  revenueMin: number | null;
  revenueMax: number | null;
  lastActivityDays: number | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface KanbanFiltersProps {
  contacts: KanbanContact[];
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  onSearchSelect: (contactId: string) => void;
  onCreateTag?: (tag: string) => void;
  onDeleteTag?: (tag: string) => Promise<void>;
}

export const defaultFilters: KanbanFilters = {
  search: '',
  tags: [],
  revenueMin: null,
  revenueMax: null,
  lastActivityDays: null,
  dateFrom: null,
  dateTo: null,
};

export function KanbanFiltersBar({ contacts, filters, onFiltersChange, onSearchSelect, onCreateTag, onDeleteTag }: KanbanFiltersProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract all unique tags from contacts with counts
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    contacts.forEach(c => {
      c.tags?.forEach(t => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return counts;
  }, [contacts]);

  const allTags = useMemo(() => {
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([tag]) => tag);
  }, [tagCounts]);

  // Filter contacts for search autocomplete
  const searchResults = useMemo(() => {
    if (!filters.search || filters.search.length < 2) return [];
    
    const query = filters.search.toLowerCase();
    return contacts
      .filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      )
      .slice(0, 8);
  }, [contacts, filters.search]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.tags.length > 0) count++;
    if (filters.revenueMin !== null || filters.revenueMax !== null) count++;
    if (filters.lastActivityDays !== null) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search with autocomplete */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              value={filters.search}
              onChange={(e) => {
                onFiltersChange({ ...filters, search: e.target.value });
                if (e.target.value.length >= 2) {
                  setSearchOpen(true);
                }
              }}
              onFocus={() => {
                if (filters.search.length >= 2) {
                  setSearchOpen(true);
                }
              }}
              className="pl-9 w-64"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        {searchResults.length > 0 && (
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup heading="Resultados">
                  {searchResults.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => {
                        onSearchSelect(contact.id);
                        setSearchOpen(false);
                        onFiltersChange({ ...filters, search: '' });
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {contact.name || contact.email.split('@')[0]}
                        </span>
                        <span className="text-xs text-muted-foreground">{contact.email}</span>
                        {contact.phone && (
                          <span className="text-xs text-muted-foreground">{contact.phone}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>

      {/* Filter Button */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Limpar
                </Button>
              )}
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <Input
                placeholder="Buscar tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {allTags.length === 0 && !tagSearch ? (
                  <span className="text-sm text-muted-foreground">Nenhuma tag disponível</span>
                ) : (
                  allTags
                    .filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer group flex items-center gap-1"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                        <span className="opacity-70">({tagCounts.get(tag)})</span>
                        {onDeleteTag && (
                          <Trash2
                            className="h-3 w-3 opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:text-destructive ml-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagToDelete(tag);
                            }}
                          />
                        )}
                      </Badge>
                    ))
                )}
                {tagSearch && 
                  allTags.filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                  <div className="w-full space-y-2">
                    <span className="text-sm text-muted-foreground block">Nenhuma tag encontrada</span>
                    {onCreateTag && tagSearch.trim().length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onCreateTag(tagSearch.trim());
                          setTagSearch('');
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Criar tag "{tagSearch.trim()}"
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={filters.revenueMin ?? ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    revenueMin: e.target.value ? Number(e.target.value) : null 
                  })}
                  className="w-24"
                />
                <span className="text-muted-foreground self-center">-</span>
                <Input
                  type="number"
                  placeholder="Máx"
                  value={filters.revenueMax ?? ''}
                  onChange={(e) => onFiltersChange({ 
                    ...filters, 
                    revenueMax: e.target.value ? Number(e.target.value) : null 
                  })}
                  className="w-24"
                />
              </div>
            </div>

            {/* Last Activity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Última Atividade
              </label>
              <Select
                value={filters.lastActivityDays?.toString() ?? ''}
                onValueChange={(val) => onFiltersChange({ 
                  ...filters, 
                  lastActivityDays: val ? Number(val) : null 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Período Específico
              </label>
              <div className="flex gap-2">
                <Popover open={dateFromOpen} onOpenChange={setDateFromOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                      {filters.dateFrom 
                        ? format(filters.dateFrom, 'dd/MM/yy', { locale: ptBR })
                        : 'De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom ?? undefined}
                      onSelect={(date) => {
                        onFiltersChange({ ...filters, dateFrom: date ?? null });
                        setDateFromOpen(false);
                      }}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={dateToOpen} onOpenChange={setDateToOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                      {filters.dateTo 
                        ? format(filters.dateTo, 'dd/MM/yy', { locale: ptBR })
                        : 'Até'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={filters.dateTo ?? undefined}
                      onSelect={(date) => {
                        onFiltersChange({ ...filters, dateTo: date ?? null });
                        setDateToOpen(false);
                      }}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {filters.tags.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Tags: {filters.tags.length}
          <X 
            className="h-3 w-3 cursor-pointer" 
            onClick={() => onFiltersChange({ ...filters, tags: [] })}
          />
        </Badge>
      )}
      {(filters.revenueMin !== null || filters.revenueMax !== null) && (
        <Badge variant="secondary" className="gap-1">
          Receita: R${filters.revenueMin ?? 0} - R${filters.revenueMax ?? '∞'}
          <X 
            className="h-3 w-3 cursor-pointer" 
            onClick={() => onFiltersChange({ ...filters, revenueMin: null, revenueMax: null })}
          />
        </Badge>
      )}
      {filters.lastActivityDays !== null && (
        <Badge variant="secondary" className="gap-1">
          Últimos {filters.lastActivityDays} dias
          <X 
            className="h-3 w-3 cursor-pointer" 
            onClick={() => onFiltersChange({ ...filters, lastActivityDays: null })}
          />
        </Badge>
      )}
      {(filters.dateFrom || filters.dateTo) && (
        <Badge variant="secondary" className="gap-1">
          Período: {filters.dateFrom ? format(filters.dateFrom, 'dd/MM', { locale: ptBR }) : '...'} - {filters.dateTo ? format(filters.dateTo, 'dd/MM', { locale: ptBR }) : '...'}
          <X 
            className="h-3 w-3 cursor-pointer" 
            onClick={() => onFiltersChange({ ...filters, dateFrom: null, dateTo: null })}
          />
        </Badge>
      )}
      {/* Delete Tag Confirmation Dialog */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar tag permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              A tag <strong>"{tagToDelete}"</strong> será removida de todos os {tagCounts.get(tagToDelete || '') || 0} contatos que a possuem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (tagToDelete && onDeleteTag) {
                  setIsDeleting(true);
                  try {
                    await onDeleteTag(tagToDelete);
                    // Remove from filters if it was selected
                    if (filters.tags.includes(tagToDelete)) {
                      onFiltersChange({ ...filters, tags: filters.tags.filter(t => t !== tagToDelete) });
                    }
                  } finally {
                    setIsDeleting(false);
                    setTagToDelete(null);
                  }
                }
              }}
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Filter function to apply filters to contacts
export function applyFilters(contacts: KanbanContact[], filters: KanbanFilters): KanbanContact[] {
  return contacts.filter(contact => {
    // Search filter
    if (filters.search && filters.search.length >= 2) {
      const query = filters.search.toLowerCase();
      const matchesSearch = 
        contact.name?.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone?.includes(query);
      if (!matchesSearch) return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const contactTags = contact.tags || [];
      const hasMatchingTag = filters.tags.some(tag => contactTags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Revenue filter
    const revenue = contact.total_revenue ?? 0;
    if (filters.revenueMin !== null && revenue < filters.revenueMin) return false;
    if (filters.revenueMax !== null && revenue > filters.revenueMax) return false;

    // Last activity days filter - use updated_at for more accurate filtering
    if (filters.lastActivityDays !== null) {
      const activityDate = new Date(contact.updated_at);
      const cutoffDate = subDays(new Date(), filters.lastActivityDays);
      if (isBefore(activityDate, cutoffDate)) return false;
    }

    // Date range filter - use updated_at for filtering (when contact was last updated/synced)
    if (filters.dateFrom || filters.dateTo) {
      const activityDate = new Date(contact.updated_at);
      if (filters.dateFrom && isBefore(activityDate, startOfDay(filters.dateFrom))) return false;
      if (filters.dateTo && isAfter(activityDate, endOfDay(filters.dateTo))) return false;
    }

    return true;
  });
}
