import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Memory, 
  MemoryType, 
  MemorySource, 
  MemoryContent,
  MemoryCandidate,
  ExtractionResult 
} from '@/lib/memoryExtractionEngine';

// Convert database row to Memory type
function rowToMemory(row: any): Memory {
  return {
    id: row.id,
    contact_id: row.contact_id,
    project_id: row.project_id,
    memory_type: row.memory_type as MemoryType,
    content: (typeof row.content === 'object' ? row.content : {}) as MemoryContent,
    confidence: row.confidence,
    source: row.source as MemorySource,
    source_id: row.source_id || undefined,
    source_name: row.source_name || undefined,
    is_locked: row.is_locked,
    is_contradicted: row.is_contradicted,
    contradicted_by: row.contradicted_by || undefined,
    last_reinforced_at: row.last_reinforced_at,
    reinforcement_count: row.reinforcement_count
  };
}

// Fetch memories for a contact
export function useContactMemories(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-memories', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('contact_memory')
        .select('*')
        .eq('contact_id', contactId)
        .order('confidence', { ascending: false })
        .order('last_reinforced_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(rowToMemory);
    },
    enabled: !!contactId
  });
}

// Fetch memories by type for a contact
export function useContactMemoriesByType(contactId: string | undefined, memoryType: MemoryType) {
  return useQuery({
    queryKey: ['contact-memories', contactId, memoryType],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('contact_memory')
        .select('*')
        .eq('contact_id', contactId)
        .eq('memory_type', memoryType)
        .order('confidence', { ascending: false });

      if (error) throw error;
      return (data || []).map(rowToMemory);
    },
    enabled: !!contactId
  });
}

// Fetch high-confidence memories for a contact
export function useContactKeyMemories(contactId: string | undefined, minConfidence: number = 0.7) {
  return useQuery({
    queryKey: ['contact-key-memories', contactId, minConfidence],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('contact_memory')
        .select('*')
        .eq('contact_id', contactId)
        .gte('confidence', minConfidence)
        .eq('is_contradicted', false)
        .order('confidence', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map(rowToMemory);
    },
    enabled: !!contactId
  });
}

// Create a new memory
export function useCreateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memory: Omit<Memory, 'id'>) => {
      const insertData = {
        contact_id: memory.contact_id,
        project_id: memory.project_id,
        memory_type: memory.memory_type,
        content: memory.content as any,
        confidence: memory.confidence,
        source: memory.source,
        source_id: memory.source_id || null,
        source_name: memory.source_name || null,
        is_locked: memory.is_locked || false
      };

      const { data, error } = await supabase
        .from('contact_memory')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return rowToMemory(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-memories', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contact-key-memories', data.contact_id] });
      toast.success('Memória criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating memory:', error);
      toast.error('Erro ao criar memória');
    }
  });
}

// Update a memory
export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Memory> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.content) updateData.content = updates.content;
      if (updates.confidence !== undefined) updateData.confidence = updates.confidence;
      if (updates.is_locked !== undefined) updateData.is_locked = updates.is_locked;
      if (updates.memory_type) updateData.memory_type = updates.memory_type;

      const { data, error } = await supabase
        .from('contact_memory')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rowToMemory(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-memories', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contact-key-memories', data.contact_id] });
      toast.success('Memória atualizada');
    },
    onError: (error) => {
      console.error('Error updating memory:', error);
      toast.error('Erro ao atualizar memória');
    }
  });
}

// Delete a memory
export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('contact_memory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, contactId };
    },
    onSuccess: ({ contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['contact-memories', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-key-memories', contactId] });
      toast.success('Memória removida');
    },
    onError: (error) => {
      console.error('Error deleting memory:', error);
      toast.error('Erro ao remover memória');
    }
  });
}

// Lock/unlock a memory
export function useLockMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isLocked }: { id: string; isLocked: boolean }) => {
      const { data, error } = await supabase
        .from('contact_memory')
        .update({ is_locked: isLocked })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rowToMemory(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-memories', data.contact_id] });
      toast.success(data.is_locked ? 'Memória bloqueada' : 'Memória desbloqueada');
    },
    onError: (error) => {
      console.error('Error toggling memory lock:', error);
      toast.error('Erro ao alterar bloqueio da memória');
    }
  });
}

// Reinforce an existing memory
export function useReinforceMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      confidenceBoost, 
      newEvidence 
    }: { 
      id: string; 
      confidenceBoost: number; 
      newEvidence?: string;
    }) => {
      // First get current memory
      const { data: current, error: fetchError } = await supabase
        .from('contact_memory')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newConfidence = Math.min(1, current.confidence + confidenceBoost);
      const contentObj = typeof current.content === 'object' && current.content ? current.content : {};
      const updatedContent = {
        ...(contentObj as Record<string, unknown>),
        reinforcement_notes: [
          ...((contentObj as any).reinforcement_notes || []),
          { date: new Date().toISOString(), evidence: newEvidence }
        ].slice(-5) // Keep last 5 reinforcement notes
      };

      const { data, error } = await supabase
        .from('contact_memory')
        .update({
          confidence: newConfidence,
          content: updatedContent,
          last_reinforced_at: new Date().toISOString(),
          reinforcement_count: current.reinforcement_count + 1
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rowToMemory(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-memories', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contact-key-memories', data.contact_id] });
    }
  });
}

// Mark a memory as contradicted
export function useContradictMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      contradictedById 
    }: { 
      id: string; 
      contradictedById: string;
    }) => {
      const { data, error } = await supabase
        .from('contact_memory')
        .update({
          is_contradicted: true,
          contradicted_by: contradictedById
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rowToMemory(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-memories', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contact-key-memories', data.contact_id] });
    }
  });
}

// Process extraction results - save new memories, reinforce existing, handle contradictions
export function useProcessExtractionResult() {
  const createMemory = useCreateMemory();
  const reinforceMemory = useReinforceMemory();
  const contradictMemory = useContradictMemory();

  return useMutation({
    mutationFn: async ({ 
      result, 
      contactId, 
      projectId 
    }: { 
      result: ExtractionResult; 
      contactId: string; 
      projectId: string;
    }) => {
      const processed = {
        created: 0,
        reinforced: 0,
        contradicted: 0
      };

      // Create new memories
      for (const candidate of result.new_memories) {
        try {
          await createMemory.mutateAsync({
            memory_type: candidate.memory_type,
            content: candidate.content,
            confidence: candidate.confidence,
            source: candidate.source,
            source_id: candidate.source_id,
            source_name: candidate.source_name,
            contact_id: contactId,
            project_id: projectId
          });
          processed.created++;
        } catch (e) {
          console.error('Error creating memory:', e);
        }
      }

      // Process reinforcements
      for (const reinforcement of result.reinforcements) {
        try {
          await reinforceMemory.mutateAsync({
            id: reinforcement.memory_id,
            confidenceBoost: reinforcement.confidence_boost,
            newEvidence: reinforcement.new_evidence
          });
          processed.reinforced++;
        } catch (e) {
          console.error('Error reinforcing memory:', e);
        }
      }

      // Process contradictions
      for (const contradiction of result.contradictions) {
        try {
          // Create the new contradicting memory first
          const newMemory = await createMemory.mutateAsync({
            ...contradiction.new_memory,
            contact_id: contactId,
            project_id: projectId
          });

          // Mark the old memory as contradicted
          await contradictMemory.mutateAsync({
            id: contradiction.existing_memory_id,
            contradictedById: newMemory.id!
          });
          processed.contradicted++;
        } catch (e) {
          console.error('Error processing contradiction:', e);
        }
      }

      return processed;
    }
  });
}

// Create a manual memory
export function useCreateManualMemory() {
  const createMemory = useCreateMemory();

  return useMutation({
    mutationFn: async ({
      contactId,
      projectId,
      memoryType,
      summary,
      details,
      confidence = 0.9
    }: {
      contactId: string;
      projectId: string;
      memoryType: MemoryType;
      summary: string;
      details?: string;
      confidence?: number;
    }) => {
      return createMemory.mutateAsync({
        contact_id: contactId,
        project_id: projectId,
        memory_type: memoryType,
        content: {
          summary,
          details,
          polarity: 'neutral' as const
        },
        confidence,
        source: 'manual',
        is_locked: true // Manual memories are locked by default
      });
    }
  });
}
