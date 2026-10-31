alter table public.change_entries add column embedding extensions.vector(3072);
create index change_entries_embedding_idx on public.change_entries
  using hnsw ((embedding::extensions.halfvec(3072)) extensions.halfvec_cosine_ops);

create or replace function public.match_change_entries(query_embedding extensions.vector(3072), match_count int default 8)
returns table (id uuid, item_name text, version text, change_date date, change_type text, summary text,
  source_document_id uuid, source_email_id uuid, similarity float)
language sql stable set search_path = public, extensions as $$
  select c.id, p.name, c.version, c.change_date, c.change_type, c.summary, c.source_document_id, c.source_email_id,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.change_entries c
  join public.products p on p.id = c.product_id
  where c.embedding is not null
  order by c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count
$$;
grant execute on function public.match_change_entries to authenticated, service_role;