select key, value_json, updated_at
from public.settings
where key = $1
