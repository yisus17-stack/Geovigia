-- Agrega el estado que se usa cuando un productor solicita auditoría.
-- "if not exists" permite ejecutar este script más de una vez sin error.
alter type public.estado_huerto add value if not exists 'pendiente';

-- El productor sólo puede actualizar sus propias huertas.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'huertos'
      and policyname = 'productor puede solicitar auditoria'
  ) then
    execute 'create policy "productor puede solicitar auditoria"
      on public.huertos
      for update
      to authenticated
      using ((select auth.uid()) = propietario_id)
      with check ((select auth.uid()) = propietario_id)';
  end if;
end $$;
