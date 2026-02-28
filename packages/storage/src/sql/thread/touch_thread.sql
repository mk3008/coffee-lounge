update public.threads
set updated_at = $2::timestamptz,
    last_message_at = $2::timestamptz
where thread_id = $1
returning thread_id
