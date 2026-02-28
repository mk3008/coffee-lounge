select
  m.message_id,
  m.thread_id,
  m.role,
  m.content,
  m.provider,
  m.model,
  m.created_at,
  t.title as thread_title
from public.messages m
inner join public.threads t
  on t.thread_id = m.thread_id
where m.content ilike $1
order by m.created_at desc
limit $2
