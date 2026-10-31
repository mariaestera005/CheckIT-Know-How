alter table public.documents add column renewed_at timestamptz not null default now();
update public.documents set renewed_at = created_at;
comment on column public.documents.renewed_at is 'When the content was last confirmed up to date; a reminder shows once the renewal period has passed.';