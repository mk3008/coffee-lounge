select thread_id, title, created_at, updated_at, last_message_at
from public.threads
where thread_id = $1
