-- Create the diario_atendimento table for the global Atendimento page
create table if not exists public.diario_atendimento (
    id uuid default gen_random_uuid() primary key,
    cliente_id uuid not null references public.clientes(id) on delete cascade,
    autor_id uuid not null references auth.users(id) on delete cascade,
    texto text not null,
    lancamento_id uuid references public.lancamentos(id) on delete set null,
    parent_id uuid references public.diario_atendimento(id) on delete cascade,
    reacoes jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.diario_atendimento enable row level security;

-- Policies for public.diario_atendimento
drop policy if exists "Authenticated users can read diario_atendimento" on public.diario_atendimento;
create policy "Authenticated users can read diario_atendimento"
    on public.diario_atendimento
    for select
    to authenticated
    using (true);

drop policy if exists "Authenticated users can insert diario_atendimento" on public.diario_atendimento;
create policy "Authenticated users can insert diario_atendimento"
    on public.diario_atendimento
    for insert
    to authenticated
    with check (auth.uid() = autor_id);

drop policy if exists "Users can update their own diario_atendimento or admins can" on public.diario_atendimento;
create policy "Users can update their own diario_atendimento or admins can"
    on public.diario_atendimento
    for update
    to authenticated
    using (auth.uid() = autor_id or exists (select 1 from profiles where user_id = auth.uid() and nivel_acesso in ('admin', 'dono')))
    with check (auth.uid() = autor_id or exists (select 1 from profiles where user_id = auth.uid() and nivel_acesso in ('admin', 'dono')));

drop policy if exists "Users can delete their own diario_atendimento or admins can" on public.diario_atendimento;
create policy "Users can delete their own diario_atendimento or admins can"
    on public.diario_atendimento
    for delete
    to authenticated
    using (auth.uid() = autor_id or exists (select 1 from profiles where user_id = auth.uid() and nivel_acesso in ('admin', 'dono')));

-- Trigger to update updated_at
drop trigger if exists set_updated_at_diario_atendimento on public.diario_atendimento;
create trigger set_updated_at_diario_atendimento
    before update on public.diario_atendimento
    for each row
    execute function public.handle_updated_at();
