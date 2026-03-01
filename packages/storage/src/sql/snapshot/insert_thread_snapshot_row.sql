INSERT INTO public.threads (
  thread_id,
  title,
  created_at,
  updated_at,
  last_message_at
) VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5::timestamptz)
