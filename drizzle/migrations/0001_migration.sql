create policy "Team reads document files" on storage.objects for select to authenticated using (bucket_id = 'documents');
create policy "Team uploads document files" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
create policy "Team deletes document files" on storage.objects for delete to authenticated using (bucket_id = 'documents');