-- Add missing ai_fallback_used column to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS ai_fallback_used BOOLEAN DEFAULT false;