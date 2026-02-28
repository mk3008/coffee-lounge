CREATE TABLE IF NOT EXISTS public.threads (
  thread_id text PRIMARY KEY,
  title text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  last_message_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.messages (
  message_id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES public.threads(thread_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created_at
  ON public.messages(thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.attachments (
  attachment_id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES public.threads(thread_id) ON DELETE CASCADE,
  message_id text REFERENCES public.messages(message_id) ON DELETE SET NULL,
  name text NOT NULL,
  mime_type text,
  file_path text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.memory_slots (
  memory_slot_id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES public.threads(thread_id) ON DELETE CASCADE,
  slot_key text NOT NULL,
  content text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL
);
