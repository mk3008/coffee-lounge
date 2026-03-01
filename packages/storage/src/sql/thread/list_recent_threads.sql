select thread_id, title, created_at, updated_at, last_message_at
from public.threads
order by last_message_at desc
limit $1
