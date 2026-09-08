-- Historial persistente de auditorías y documentos generados por Vigía.
create table if not exists public.auditorias (
  id uuid primary key default gen_random_uuid(),
  audit_id text not null unique,
  huerto_id uuid not null references public.huertos(id) on delete cascade,
  propietario_id uuid not null references auth.users(id) on delete cascade,
  resultado text not null,
  nivel_riesgo text not null,
  confianza numeric(5,4) check (confianza >= 0 and confianza <= 1),
  resumen text not null,
  requiere_auditor boolean not null default true,
  evaluacion jsonb not null,
  expediente jsonb,
  documento_path text,
  documento_url text,
  created_at timestamptz not null default now()
);

alter table public.auditorias enable row level security;

create policy "auditorias visibles para auditor autoridad o propietario"
  on public.auditorias for select to authenticated
  using (
    propietario_id = (select auth.uid())
    or (select auth.jwt() -> 'user_metadata' ->> 'role') in ('auditor', 'autoridad')
  );

create policy "auditor puede crear auditorias"
  on public.auditorias for insert to authenticated
  with check ((select auth.jwt() -> 'user_metadata' ->> 'role') = 'auditor');

insert into storage.buckets (id, name, public)
values ('auditorias', 'auditorias', false)
on conflict (id) do nothing;

create policy "auditor puede cargar documentos de auditoria"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'auditorias'
    and (select auth.jwt() -> 'user_metadata' ->> 'role') = 'auditor'
  );

create policy "usuarios autorizados pueden leer documentos de auditoria"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'auditorias'
    and (select auth.jwt() -> 'user_metadata' ->> 'role') in ('auditor', 'autoridad')
  );

-- En el modo de Auditor único, cada sesión administra únicamente sus propias huertas.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'huertos' and policyname = 'auditor puede leer sus huertas') then
    create policy "auditor puede leer sus huertas" on public.huertos for select to authenticated using ((select auth.uid()) = propietario_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'huertos' and policyname = 'auditor puede crear sus huertas') then
    create policy "auditor puede crear sus huertas" on public.huertos for insert to authenticated with check ((select auth.uid()) = propietario_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'huertos' and policyname = 'auditor puede editar sus huertas') then
    create policy "auditor puede editar sus huertas" on public.huertos for update to authenticated using ((select auth.uid()) = propietario_id) with check ((select auth.uid()) = propietario_id);
  end if;
end $$;
