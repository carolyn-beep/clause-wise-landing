-- Add AI telemetry columns to analyses table
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS ai_provider   TEXT,
  ADD COLUMN IF NOT EXISTS ai_model      TEXT,
  ADD COLUMN IF NOT EXISTS ai_tokens_in  INTEGER CHECK (ai_tokens_in >= 0),
  ADD COLUMN IF NOT EXISTS ai_tokens_out INTEGER CHECK (ai_tokens_out >= 0),
  ADD COLUMN IF NOT EXISTS ai_latency_ms INTEGER CHECK (ai_latency_ms >= 0),
  ADD COLUMN IF NOT EXISTS ai_raw        JSONB;