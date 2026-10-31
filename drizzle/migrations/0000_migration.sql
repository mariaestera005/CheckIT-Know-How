create extension if not exists vector with schema extensions;

create type public.app_role as enum ('admin', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Team can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Team can view roles" on public.user_roles for select to authenticated using (true);
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant insert, update, delete on public.user_roles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'member');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  gmail_id text not null unique,
  subject text,
  from_address text,
  received_at timestamptz,
  snippet text,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);
grant select on public.emails to authenticated;
grant all on public.emails to service_role;
alter table public.emails enable row level security;
create policy "Team reads emails" on public.emails for select to authenticated using (true);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded',
  error text,
  summary text,
  source text not null default 'upload',
  source_email_id uuid references public.emails(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "Team reads documents" on public.documents for select to authenticated using (true);
create policy "Team adds documents" on public.documents for insert to authenticated with check (auth.uid() = created_by);
create policy "Team updates documents" on public.documents for update to authenticated using (true);
create policy "Team deletes documents" on public.documents for delete to authenticated using (true);
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(3072) not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;
alter table public.document_chunks enable row level security;
create policy "Team reads chunks" on public.document_chunks for select to authenticated using (true);
create policy "Team adds chunks" on public.document_chunks for insert to authenticated with check (true);
create policy "Team deletes chunks" on public.document_chunks for delete to authenticated using (true);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw ((embedding::extensions.halfvec(3072)) extensions.halfvec_cosine_ops);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_name_unique on public.products (lower(name));
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Team reads products" on public.products for select to authenticated using (true);
create policy "Team writes products" on public.products for insert to authenticated with check (true);
create policy "Team updates products" on public.products for update to authenticated using (true);
create policy "Team deletes products" on public.products for delete to authenticated using (true);
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version text not null,
  release_date date,
  notes text,
  source_document_id uuid references public.documents(id) on delete set null,
  source_email_id uuid references public.emails(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, version)
);
grant select, insert, update, delete on public.product_versions to authenticated;
grant all on public.product_versions to service_role;
alter table public.product_versions enable row level security;
create policy "Team reads versions" on public.product_versions for select to authenticated using (true);
create policy "Team writes versions" on public.product_versions for insert to authenticated with check (true);
create policy "Team updates versions" on public.product_versions for update to authenticated using (true);
create policy "Team deletes versions" on public.product_versions for delete to authenticated using (true);

create table public.change_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version text,
  change_date date,
  change_type text not null default 'changed',
  summary text not null,
  source_document_id uuid references public.documents(id) on delete set null,
  source_email_id uuid references public.emails(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.change_entries to authenticated;
grant all on public.change_entries to service_role;
alter table public.change_entries enable row level security;
create policy "Team reads changes" on public.change_entries for select to authenticated using (true);
create policy "Team writes changes" on public.change_entries for insert to authenticated with check (true);
create policy "Team updates changes" on public.change_entries for update to authenticated using (true);
create policy "Team deletes changes" on public.change_entries for delete to authenticated using (true);

create table public.email_change_proposals (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  product_name text not null,
  product_description text,
  version text,
  change_date date,
  change_type text not null default 'changed',
  summary text not null,
  confidence real not null default 0,
  status text not null default 'pending',
  applied_change_id uuid references public.change_entries(id) on delete set null,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);
grant select, update on public.email_change_proposals to authenticated;
grant all on public.email_change_proposals to service_role;
alter table public.email_change_proposals enable row level security;
create policy "Team reads proposals" on public.email_change_proposals for select to authenticated using (true);
create policy "Team reviews proposals" on public.email_change_proposals for update to authenticated using (true);

create table public.email_sync_state (
  id int primary key default 1 check (id = 1),
  history_id text,
  auto_apply boolean not null default false,
  auto_apply_threshold real not null default 0.85,
  enabled boolean not null default true,
  paused_reason text,
  lock_until timestamptz,
  last_run_at timestamptz,
  last_error text
);
insert into public.email_sync_state (id) values (1);
grant select, update on public.email_sync_state to authenticated;
grant all on public.email_sync_state to service_role;
alter table public.email_sync_state enable row level security;
create policy "Team reads sync state" on public.email_sync_state for select to authenticated using (true);
create policy "Admins update sync state" on public.email_sync_state for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.match_document_chunks(query_embedding extensions.vector(3072), match_count int default 8)
returns table (id uuid, document_id uuid, content text, similarity float)
language sql stable set search_path = public, extensions as $$
  select c.id, c.document_id, c.content,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.document_chunks c
  order by c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count
$$;
grant execute on function public.match_document_chunks to authenticated, service_role;