-- Row Level Security, grants and the private PDF bucket.
--
-- Access model (single-admin account):
--   anon           — no access to anything
--   authenticated  — read assets/asset_types/documents/document_items; write assets and asset_types
--   service_role   — the only writer of `documents` (status, paths) and of Storage objects
--
-- Because the secret key bypasses RLS, it stays server-side and is never exposed to a
-- NEXT_PUBLIC_* variable. See docs/operations.md.

alter table public.asset_types    enable row level security;
alter table public.assets         enable row level security;
alter table public.documents      enable row level security;
alter table public.document_items enable row level security;

-- Start from a clean slate: no implicit access.
revoke all on public.asset_types, public.assets, public.documents, public.document_items
  from anon, authenticated;

grant select, insert, update on public.asset_types to authenticated;
grant select, insert, update on public.assets to authenticated;
-- Documents are written only by the server-side generation pipeline (service role).
grant select on public.documents to authenticated;
grant select on public.document_items to authenticated;

grant all on public.asset_types, public.assets, public.documents, public.document_items
  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
create policy "authenticated read asset types"
  on public.asset_types for select to authenticated using (true);

create policy "authenticated write asset types"
  on public.asset_types for insert to authenticated with check (true);

create policy "authenticated update asset types"
  on public.asset_types for update to authenticated using (true) with check (true);

create policy "authenticated read assets"
  on public.assets for select to authenticated using (true);

create policy "authenticated insert assets"
  on public.assets for insert to authenticated with check (true);

create policy "authenticated update assets"
  on public.assets for update to authenticated using (true) with check (true);

create policy "authenticated read documents"
  on public.documents for select to authenticated using (true);

create policy "authenticated read document items"
  on public.document_items for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Private bucket for generated PDFs
-- PDF is not implicitly allowed by a bucket, so the MIME type is declared here.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('generated-pdfs', 'generated-pdfs', false, 20971520, array['application/pdf'])
    on conflict (id) do update
      set public             = false,
          file_size_limit    = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

-- No policies are created on storage.objects on purpose: the bucket is private and both
-- uploads and signed URLs are performed by the server with the secret key, after the
-- request has been authorised in application code.
