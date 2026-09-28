-- Provider Availability: Working Hours, Emergency 24H, Workshop
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS is_emergency_24h boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_workshop boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS workshop_name text,
  ADD COLUMN IF NOT EXISTS workshop_address text,
  ADD COLUMN IF NOT EXISTS working_hours_structured jsonb;

-- Index for emergency 24h providers search/filter
CREATE INDEX IF NOT EXISTS idx_providers_emergency_24h ON public.providers (is_emergency_24h) WHERE is_emergency_24h = true;
CREATE INDEX IF NOT EXISTS idx_providers_has_workshop ON public.providers (has_workshop) WHERE has_workshop = true;
