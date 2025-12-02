-- Tabela para registrar alterações/changelog do funil
CREATE TABLE public.funnel_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_funil TEXT NOT NULL,
  codigo_oferta TEXT,
  tipo_alteracao TEXT NOT NULL, -- 'preco', 'oferta_nova', 'oferta_removida', 'copy', 'outro'
  descricao TEXT NOT NULL,
  valor_anterior NUMERIC,
  valor_novo NUMERIC,
  data_alteracao DATE NOT NULL DEFAULT CURRENT_DATE,
  anotacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnel_changes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (mesmo padrão das outras tabelas)
CREATE POLICY "Allow all select on funnel_changes" 
ON public.funnel_changes FOR SELECT USING (true);

CREATE POLICY "Allow all insert on funnel_changes" 
ON public.funnel_changes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update on funnel_changes" 
ON public.funnel_changes FOR UPDATE USING (true);

CREATE POLICY "Allow all delete on funnel_changes" 
ON public.funnel_changes FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_funnel_changes_updated_at
BEFORE UPDATE ON public.funnel_changes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_funnel_changes_funil ON public.funnel_changes(id_funil);
CREATE INDEX idx_funnel_changes_data ON public.funnel_changes(data_alteracao);