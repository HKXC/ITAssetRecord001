-- Dashboard statistics in a single round trip.
--
-- RLS still applies (security invoker), so this is safe to expose to authenticated users
-- and saves the dashboard from fetching every asset row just to count them.

create or replace function public.asset_stats()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'total', (select count(*)::int from public.assets),
    'documents_total', (select count(*)::int from public.documents where generation_status = 'ready'),
    'documents_failed', (select count(*)::int from public.documents where generation_status = 'failed'),
    'by_status', coalesce(
      (
        select json_agg(row_to_json(s))
          from (
            select a.status, count(*)::int as count
              from public.assets a
             group by a.status
             order by a.status
          ) s
      ),
      '[]'::json
    ),
    'by_type', coalesce(
      (
        select json_agg(row_to_json(t))
          from (
            select at.id, at.code, at.name, count(a.id)::int as count
              from public.asset_types at
              left join public.assets a on a.asset_type_id = at.id
             where at.is_active
             group by at.id, at.code, at.name, at.sort_order
             order by at.sort_order, at.name
          ) t
      ),
      '[]'::json
    )
  );
$$;

grant execute on function public.asset_stats() to authenticated, service_role;
revoke execute on function public.asset_stats() from anon, public;
