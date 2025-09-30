-- Move extensions to the recommended 'extensions' schema to satisfy security linter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
    ALTER EXTENSION unaccent SET SCHEMA extensions;
  END IF;
END $$;