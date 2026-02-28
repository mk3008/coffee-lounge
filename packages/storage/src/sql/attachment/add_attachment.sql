INSERT INTO public.attachments (
  attachment_id,
  thread_id,
  message_id,
  name,
  mime_type,
  file_path,
  metadata_json,
  created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
