
-- Função para detectar e marcar recuperações automáticas
-- Critério: compra APPROVED do mesmo produto/oferta após um cancelamento/reembolso/chargeback
CREATE OR REPLACE FUNCTION public.detect_auto_recovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_recovery_stage_id uuid;
    v_previous_cancellation RECORD;
    v_current_tags text[];
BEGIN
    -- Only process APPROVED transactions
    IF NEW.status NOT IN ('APPROVED', 'COMPLETE') THEN
        RETURN NEW;
    END IF;
    
    -- Check if this contact had a previous cancellation/refund/chargeback for the SAME product/offer
    SELECT * INTO v_previous_cancellation
    FROM public.crm_transactions t
    WHERE t.contact_id = NEW.contact_id
      AND t.status IN ('CANCELLED', 'REFUNDED', 'CHARGEBACK')
      AND t.transaction_date < NEW.transaction_date
      AND (
          -- Same offer_code (most specific)
          (t.offer_code IS NOT NULL AND t.offer_code = NEW.offer_code)
          OR
          -- Same product_code if no offer_code match
          (t.product_code IS NOT NULL AND t.product_code = NEW.product_code AND (t.offer_code IS NULL OR NEW.offer_code IS NULL))
      )
    ORDER BY t.transaction_date DESC
    LIMIT 1;
    
    -- If found a previous cancellation for same product, this is a recovery!
    IF v_previous_cancellation IS NOT NULL THEN
        -- Get the "Recuperado" stage for this project
        SELECT id INTO v_recovery_stage_id
        FROM public.crm_recovery_stages
        WHERE project_id = NEW.project_id
          AND is_recovered = true
        LIMIT 1;
        
        -- Get current tags
        SELECT tags INTO v_current_tags
        FROM public.crm_contacts
        WHERE id = NEW.contact_id;
        
        -- Update contact: add "Recuperado (auto)" tag and move to recovered stage
        UPDATE public.crm_contacts
        SET 
            tags = CASE 
                WHEN 'Recuperado (auto)' = ANY(COALESCE(v_current_tags, ARRAY[]::text[])) 
                THEN v_current_tags
                ELSE array_append(COALESCE(v_current_tags, ARRAY[]::text[]), 'Recuperado (auto)')
            END,
            recovery_stage_id = COALESCE(v_recovery_stage_id, recovery_stage_id),
            recovery_updated_at = now(),
            updated_at = now()
        WHERE id = NEW.contact_id;
        
        -- Create an activity recording the auto-recovery
        INSERT INTO public.crm_activities (
            contact_id,
            project_id,
            activity_type,
            description,
            metadata
        ) VALUES (
            NEW.contact_id,
            NEW.project_id,
            'auto_recovery',
            'Cliente recuperado automaticamente! Comprou "' || NEW.product_name || '" após ' || 
            CASE v_previous_cancellation.status
                WHEN 'CANCELLED' THEN 'cancelamento'
                WHEN 'REFUNDED' THEN 'reembolso'
                WHEN 'CHARGEBACK' THEN 'chargeback'
                ELSE 'perda'
            END || ' anterior.',
            jsonb_build_object(
                'recovery_type', 'automatic',
                'original_cancellation_id', v_previous_cancellation.id,
                'original_status', v_previous_cancellation.status,
                'original_date', v_previous_cancellation.transaction_date,
                'recovery_transaction_id', NEW.id,
                'product_name', NEW.product_name,
                'offer_code', NEW.offer_code
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on crm_transactions to detect recoveries
DROP TRIGGER IF EXISTS trigger_detect_auto_recovery ON public.crm_transactions;
CREATE TRIGGER trigger_detect_auto_recovery
AFTER INSERT ON public.crm_transactions
FOR EACH ROW
EXECUTE FUNCTION public.detect_auto_recovery();

-- Also run detection on existing data (one-time migration)
-- This function scans existing transactions and marks auto-recoveries
CREATE OR REPLACE FUNCTION public.migrate_auto_recoveries()
RETURNS TABLE(contacts_recovered integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_recovered_count integer := 0;
    v_contact RECORD;
    v_recovery_stage_id uuid;
BEGIN
    -- Find all contacts that should be marked as auto-recovered
    FOR v_contact IN
        SELECT DISTINCT ON (approved.contact_id, approved.project_id)
            approved.contact_id,
            approved.project_id,
            approved.product_name,
            canceled.status as original_status
        FROM public.crm_transactions approved
        JOIN public.crm_transactions canceled ON 
            canceled.contact_id = approved.contact_id
            AND canceled.status IN ('CANCELLED', 'REFUNDED', 'CHARGEBACK')
            AND canceled.transaction_date < approved.transaction_date
            AND (
                (canceled.offer_code IS NOT NULL AND canceled.offer_code = approved.offer_code)
                OR (canceled.product_code IS NOT NULL AND canceled.product_code = approved.product_code AND (canceled.offer_code IS NULL OR approved.offer_code IS NULL))
            )
        WHERE approved.status IN ('APPROVED', 'COMPLETE')
    LOOP
        -- Get recovery stage for this project
        SELECT id INTO v_recovery_stage_id
        FROM public.crm_recovery_stages
        WHERE project_id = v_contact.project_id
          AND is_recovered = true
        LIMIT 1;
        
        -- Update contact if not already marked
        UPDATE public.crm_contacts
        SET 
            tags = CASE 
                WHEN 'Recuperado (auto)' = ANY(COALESCE(tags, ARRAY[]::text[])) THEN tags
                ELSE array_append(COALESCE(tags, ARRAY[]::text[]), 'Recuperado (auto)')
            END,
            recovery_stage_id = COALESCE(v_recovery_stage_id, recovery_stage_id),
            recovery_updated_at = now(),
            updated_at = now()
        WHERE id = v_contact.contact_id
          AND NOT ('Recuperado (auto)' = ANY(COALESCE(tags, ARRAY[]::text[])));
        
        IF FOUND THEN
            v_recovered_count := v_recovered_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_recovered_count;
END;
$$;
