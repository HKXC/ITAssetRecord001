-- Atomic creation of a document row plus its register items.
--
-- Why a function: supabase-js cannot run a multi-statement transaction. If the document
-- row were inserted and the item insert then failed, a register export could exist whose
-- stored asset set does not match the selection — exactly what requirement E forbids.
-- A foreign-key violation inside this function aborts the whole thing, leaving no row.

create or replace function public.create_document_with_items(
  p_document_number text,
  p_document_type   text,
  p_asset_id        uuid,
  p_revision        integer,
  p_created_by      uuid,
  p_asset_ids       uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
begin
  insert into public.documents (
    document_number, document_type, asset_id, revision, generation_status, created_by
  )
  values (
    p_document_number, p_document_type, p_asset_id, p_revision, 'pending', p_created_by
  )
  returning id into v_document_id;

  if p_document_type = 'register' then
    if p_asset_ids is null or coalesce(array_length(p_asset_ids, 1), 0) = 0 then
      raise exception 'a register document requires at least one asset'
        using errcode = '22023';
    end if;

    insert into public.document_items (document_id, asset_id, row_order)
    select v_document_id, item.asset_id, item.ord::integer
      from unnest(p_asset_ids) with ordinality as item (asset_id, ord);
  end if;

  return v_document_id;
end;
$$;

revoke all on function public.create_document_with_items(text, text, uuid, integer, uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.create_document_with_items(text, text, uuid, integer, uuid, uuid[])
  to service_role;
