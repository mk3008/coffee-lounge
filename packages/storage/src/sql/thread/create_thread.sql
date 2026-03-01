insert into public.threads (
  thread_id,
  title,
  created_at,
  updated_at,
  last_message_at
) values ($1, $2, $3::timestamptz, $3::timestamptz, $3::timestamptz)
returning thread_id, title, created_at, updated_at, last_message_at
