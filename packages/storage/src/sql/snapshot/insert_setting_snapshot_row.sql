INSERT INTO public.settings (
  key,
  value_json,
  updated_at
) VALUES ($1, $2::jsonb, $3::timestamptz)
