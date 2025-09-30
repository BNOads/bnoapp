-- Bucket de assets dos clientes
insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', true)
on conflict (id) do nothing;

-- Permitir leitura pública dos arquivos do bucket
create policy "Public can read client assets"
  on storage.objects
  for select
  to public
  using (bucket_id = 'client-assets');

-- Equipe autenticada pode fazer upload (inserir)
create policy "Team can upload client assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'client-assets'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.ativo = true
    )
  );

-- Equipe autenticada pode atualizar
create policy "Team can update client assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'client-assets'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.ativo = true
    )
  )
  with check (
    bucket_id = 'client-assets'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.ativo = true
    )
  );

-- Equipe autenticada pode deletar
create policy "Team can delete client assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'client-assets'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.ativo = true
    )
  );