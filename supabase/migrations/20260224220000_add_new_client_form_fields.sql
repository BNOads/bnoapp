-- Add new client onboarding form fields to clientes table
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS descricao_breve text,
  ADD COLUMN IF NOT EXISTS investimento_mensal text,
  ADD COLUMN IF NOT EXISTS promessas_cliente text,
  ADD COLUMN IF NOT EXISTS whatsapp_cliente text,
  ADD COLUMN IF NOT EXISTS instagram_cliente text,
  ADD COLUMN IF NOT EXISTS localizacao text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS prometeu_pagina text;
