create table if not exists public.lancamento_criativos (
  id uuid not null default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos(id) on delete cascade,
  criativo_id uuid not null references public.criativos(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint lancamento_criativos_pkey primary key (id),
  constraint lancamento_criativos_unique_link unique (lancamento_id, criativo_id)
);

-- Enable RLS
alter table public.lancamento_criativos enable row level security;

-- Policies
create policy "Users can view lancamento_criativos"
  on public.lancamento_criativos for select
  using (true);

create policy "Users can insert lancamento_criativos"
  on public.lancamento_criativos for insert
  with check (true);

create policy "Users can delete lancamento_criativos"
  on public.lancamento_criativos for delete
  using (true);
