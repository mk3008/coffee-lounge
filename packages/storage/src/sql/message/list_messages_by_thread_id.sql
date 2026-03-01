select message_id, thread_id, role, content, provider, model, created_at
from public.messages
where thread_id = $1
order by created_at desc
limit $2
