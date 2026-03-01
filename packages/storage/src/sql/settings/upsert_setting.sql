insert into public.settings (key, value_json, updated_at)
values ($1, $2::jsonb, $3::timestamptz)
on conflict (key) do update
set value_json = excluded.value_json,
    updated_at = excluded.updated_at
returning key, value_json, updated_at
