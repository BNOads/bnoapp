-- Função para exclusão lógica (soft delete) com checagem de permissão
create or replace function public.soft_delete_referencia(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verifica permissão: criador ou admin
  if exists (
    select 1 from public.referencias_criativos r
    where r.id = _id
      and (r.created_by = auth.uid() or is_admin_with_valid_reason(auth.uid()))
  ) then
    update public.referencias_criativos
    set ativo = false, updated_at = now()
    where id = _id;
  else
    raise exception 'Sem permissão para excluir esta referência';
  end if;
end;
$$;