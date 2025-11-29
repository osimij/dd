-- Add voice columns if they do not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'twins' 
      AND column_name = 'elevenlabs_voice_id'
  ) THEN
    ALTER TABLE public.twins ADD COLUMN elevenlabs_voice_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'twins' 
      AND column_name = 'voice_sample_url'
  ) THEN
    ALTER TABLE public.twins ADD COLUMN voice_sample_url TEXT;
  END IF;
END $$;

