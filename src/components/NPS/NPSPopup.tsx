import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NPSPopupProps {
  clienteId: string;
  clienteNome: string;
}

export function NPSPopup({ clienteId, clienteNome }: NPSPopupProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'semanal' | 'nps' | 'motivo-semanal' | 'motivo-nps'>('semanal');
  const [satisfacaoSemanal, setSatisfacaoSemanal] = useState<number>(0);
  const [motivoSemanal, setMotivoSemanal] = useState('');
  const [notaNPS, setNotaNPS] = useState<number | null>(null);
  const [motivoNPS, setMotivoNPS] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    verificarSeDeveExibir();
  }, [clienteId]);

  const verificarSeDeveExibir = async () => {
    try {
      // Usar client público para acesso sem autenticação
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();

      const { data, error } = await publicSupabase
        .from('nps_controle_popup' as any)
        .select('proxima_exibicao, forcado_por_ia')
        .eq('cliente_id', clienteId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar controle de popup:', error);
        return;
      }

      // Se não existe registro ou passou de 30 dias ou forçado pela IA
      if (!data || 
          !(data as any).proxima_exibicao || 
          new Date((data as any).proxima_exibicao) <= new Date() ||
          (data as any).forcado_por_ia) {
        setOpen(true);
      }
    } catch (error) {
      console.error('Erro ao verificar NPS:', error);
    }
  };

  const handleSemanalSubmit = () => {
    if (satisfacaoSemanal <= 3) {
      setStep('motivo-semanal');
    } else {
      setStep('nps');
    }
  };

  const handleMotivoSemanalSubmit = () => {
    setStep('nps');
  };

  const handleNPSSubmit = () => {
    if (notaNPS === null) return;
    
    if (notaNPS < 7) {
      setStep('motivo-nps');
    } else {
      enviarResposta();
    }
  };

  const enviarResposta = async () => {
    if (notaNPS === null) return;
    
    setLoading(true);
    try {
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();

      // Salvar resposta
      const { error: respostaError } = await publicSupabase
        .from('nps_respostas' as any)
        .insert({
          cliente_id: clienteId,
          satisfacao_semanal: satisfacaoSemanal || null,
          motivo_satisfacao_baixa: motivoSemanal || null,
          nota_nps: notaNPS,
          motivo_nps: motivoNPS || null,
          tipo_respondente: 'neutro' // será atualizado pelo trigger
        });

      if (respostaError) throw respostaError;

      toast({
        title: "✅ Obrigado!",
        description: "Sua opinião faz a diferença para nós",
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Erro ao enviar resposta NPS:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua resposta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (count: number, selected: number, onSelect: (n: number) => void) => {
    return (
      <div className="flex gap-2 justify-center">
        {[...Array(count)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i + 1)}
            className={`transition-all hover:scale-110 ${
              i < selected ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            <Star className="h-10 w-10 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  const renderNPSButtons = () => {
    return (
      <div className="grid grid-cols-11 gap-2">
        {[...Array(11)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setNotaNPS(i)}
            className={`h-12 rounded-lg font-semibold transition-all hover:scale-105 ${
              notaNPS === i
                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            Nos ajude a ser melhores para você 💙
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'semanal' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-medium text-lg mb-4">
                  Como você está percebendo nossa entrega nesta semana?
                </p>
                {renderStars(5, satisfacaoSemanal, setSatisfacaoSemanal)}
              </div>
              <Button
                onClick={handleSemanalSubmit}
                disabled={satisfacaoSemanal === 0}
                className="w-full"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          )}

          {step === 'motivo-semanal' && (
            <div className="space-y-4">
              <p className="font-medium text-center">
                O que aconteceu essa semana que poderíamos melhorar?
              </p>
              <Textarea
                value={motivoSemanal}
                onChange={(e) => setMotivoSemanal(e.target.value)}
                placeholder="Conte-nos o que podemos melhorar..."
                rows={4}
              />
              <Button
                onClick={handleMotivoSemanalSubmit}
                className="w-full"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          )}

          {step === 'nps' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-medium text-lg mb-4">
                  De 0 a 10, o quanto você recomendaria a BNOads para outros empresários?
                </p>
                {renderNPSButtons()}
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Muito improvável</span>
                  <span>Muito provável</span>
                </div>
              </div>
              <Button
                onClick={handleNPSSubmit}
                disabled={notaNPS === null}
                className="w-full"
                size="lg"
              >
                {notaNPS !== null && notaNPS < 7 ? 'Continuar' : 'Enviar'}
              </Button>
            </div>
          )}

          {step === 'motivo-nps' && (
            <div className="space-y-4">
              <p className="font-medium text-center">
                {notaNPS && notaNPS < 7 
                  ? 'O que precisamos melhorar para elevar essa nota?'
                  : 'O que estamos fazendo que mais te surpreende?'
                }
              </p>
              <Textarea
                value={motivoNPS}
                onChange={(e) => setMotivoNPS(e.target.value)}
                placeholder="Sua opinião é muito importante para nós..."
                rows={4}
              />
              <Button
                onClick={enviarResposta}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Enviando...' : 'Enviar e continuar'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
