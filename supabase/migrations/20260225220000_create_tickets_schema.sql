-- Migration: Implement Central de Tickets Schema
-- Description: Creates tickets, logs, and attachments tables with RLS and SLA triggers.

-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq;

-- Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero integer DEFAULT nextval('public.ticket_number_seq') NOT NULL,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    origem text NOT NULL,
    categoria text NOT NULL,
    descricao text,
    prioridade text NOT NULL DEFAULT 'media',
    status text NOT NULL DEFAULT 'aberto',
    responsavel_id uuid REFERENCES auth.users(id),
    criado_por uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
    sla_limite timestamptz,
    primeira_resposta_em timestamptz,
    encerrado_em timestamptz,
    tempo_resolucao interval,
    solucao_descricao text,
    linked_task_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ticket Logs
CREATE TABLE IF NOT EXISTS public.ticket_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
    acao text NOT NULL,
    descricao text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Ticket Anexos
CREATE TABLE IF NOT EXISTS public.ticket_anexos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    arquivo_url text NOT NULL,
    nome_arquivo text NOT NULL,
    tipo_arquivo text,
    tamanho_arquivo bigint,
    criado_por uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Update Tasks Table to include ticket_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='ticket_id') THEN
        ALTER TABLE public.tasks ADD COLUMN ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add reverse reference constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='tickets_linked_task_id_fkey') THEN
        ALTER TABLE public.tickets ADD CONSTRAINT tickets_linked_task_id_fkey FOREIGN KEY (linked_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Function to calculate SLA
CREATE OR REPLACE FUNCTION public.calculate_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (NEW.prioridade IS DISTINCT FROM OLD.prioridade) THEN
        NEW.sla_limite := CASE
            WHEN lower(NEW.prioridade) = 'critica' THEN (NEW.created_at AT TIME ZONE 'UTC') + interval '2 hours'
            WHEN lower(NEW.prioridade) = 'alta' THEN (NEW.created_at AT TIME ZONE 'UTC') + interval '8 hours'
            WHEN lower(NEW.prioridade) = 'media' THEN (NEW.created_at AT TIME ZONE 'UTC') + interval '24 hours'
            WHEN lower(NEW.prioridade) = 'baixa' THEN (NEW.created_at AT TIME ZONE 'UTC') + interval '48 hours'
            ELSE (NEW.created_at AT TIME ZONE 'UTC') + interval '24 hours'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for SLA
DROP TRIGGER IF EXISTS tr_calculate_ticket_sla ON public.tickets;
CREATE TRIGGER tr_calculate_ticket_sla
BEFORE INSERT OR UPDATE OF prioridade ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.calculate_ticket_sla();

-- Function for updated_at
CREATE OR REPLACE FUNCTION public.handle_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.status = 'encerrado' AND (OLD.status IS NULL OR OLD.status != 'encerrado') THEN
        NEW.encerrado_em = now();
        NEW.tempo_resolucao = NEW.encerrado_em - NEW.created_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tr_handle_tickets_updated_at ON public.tickets;
CREATE TRIGGER tr_handle_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_tickets_updated_at();

-- RLS Enable
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_anexos ENABLE ROW LEVEL SECURITY;

-- Tickets Policies
DROP POLICY IF EXISTS "Tickets Select/Insert/Update for authenticated" ON public.tickets;
CREATE POLICY "Tickets Select/Insert/Update for authenticated" ON public.tickets
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Tickets Delete for admin" ON public.tickets;
CREATE POLICY "Tickets Delete for admin" ON public.tickets
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.nivel_acesso IN ('admin', 'dono')
        )
    );

-- Ticket Logs Policies
DROP POLICY IF EXISTS "Ticket logs Select/Insert for authenticated" ON public.ticket_logs;
CREATE POLICY "Ticket logs Select/Insert for authenticated" ON public.ticket_logs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ticket logs Insert for authenticated" ON public.ticket_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Ticket Anexos Policies
DROP POLICY IF EXISTS "Ticket anexos Select/Insert for authenticated" ON public.ticket_anexos;
CREATE POLICY "Ticket anexos Select/Insert for authenticated" ON public.ticket_anexos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ticket anexos Insert for authenticated" ON public.ticket_anexos
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Ticket anexos Delete for admin" ON public.ticket_anexos;
CREATE POLICY "Ticket anexos Delete for admin" ON public.ticket_anexos
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.nivel_acesso IN ('admin', 'dono')
        )
    );

-- Bucket creation (if access to storage schema)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-anexos', 'ticket-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket policies
DROP POLICY IF EXISTS "Public Read access" ON storage.objects;
CREATE POLICY "Public Read access" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'ticket-anexos');

DROP POLICY IF EXISTS "Authenticated Upload access" ON storage.objects;
CREATE POLICY "Authenticated Upload access" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'ticket-anexos');
