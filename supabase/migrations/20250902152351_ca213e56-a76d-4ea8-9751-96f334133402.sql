-- Adicionar trigger para histórico de orçamentos
CREATE TRIGGER create_orcamento_history_trigger
AFTER UPDATE ON public.orcamentos_funil
FOR EACH ROW
EXECUTE FUNCTION public.create_orcamento_history();

-- Função para gerar link público único
CREATE OR REPLACE FUNCTION public.generate_public_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.link_publico IS NULL THEN
    NEW.link_publico = 'https://app.bnoads.com/referencia/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para gerar link público
CREATE TRIGGER generate_referencia_link_trigger
BEFORE INSERT ON public.referencias_criativos
FOR EACH ROW
EXECUTE FUNCTION public.generate_public_link();