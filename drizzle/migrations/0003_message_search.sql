alter table public.emails add column embedding extensions.vector(3072);
create index emails_embedding_idx on public.emails
  using hnsw ((embedding::extensions.halfvec(3072)) extensions.halfvec_cosine_ops);

create or replace function public.match_messages(query_embedding extensions.vector(3072), match_count int default 6)
returns table (id uuid, channel text, channel_name text, subject text, from_address text, received_at timestamptz, body text, similarity float)
language sql stable set search_path = public, extensions as $$
  select e.id, e.channel, e.channel_name, e.subject, e.from_address, e.received_at, coalesce(e.body, e.snippet, ''),
    1 - (e.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from public.emails e
  where e.embedding is not null
  order by e.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count
$$;
grant execute on function public.match_messages to authenticated, service_role;