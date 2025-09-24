-- Fix backfill public_token generation using hex encoding
UPDATE public.referencias_criativos
SET 
  public_token = COALESCE(public_token, encode(gen_random_bytes(24), 'hex'))
WHERE ativo = true AND (public_token IS NULL OR public_token = '');