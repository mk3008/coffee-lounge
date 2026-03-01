INSERT INTO public.messages (
  message_id,
  thread_id,
  role,
  content,
  provider,
  model,
  created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
