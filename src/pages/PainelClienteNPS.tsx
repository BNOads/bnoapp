import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const PainelClienteNPS = () => {
  const { clienteSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'semanal' | 'motivo-semanal' | 'nps' | 'motivo-nps' | 'concluido'>('semanal');
  
  // Form states
  const [satisfacaoSemanal, setSatisfacaoSemanal] = useState<number | null>(null);
  const [motivoSemanal, setMotivoSemanal] = useState('');
  const [notaNPS, setNotaNPS] = useState<number | null>(null);
  const [motivoNPS, setMotivoNPS] = useState('');

  useEffect(() => {
    if (clienteSlug) {
      carregarDadosCliente();
    }
  }, [clienteSlug]);

  const carregarDadosCliente = async () => {
    try {
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();
      
      const { data, error } = await publicSupabase
        .from('clientes')
        .select('*')
        .eq('slug', clienteSlug)
        .single();

      if (error) throw error;
      setCliente(data);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar cliente:', error);
      toast({
        title: "Erro",
        description: "Cliente não encontrado",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleSemanalSubmit = () => {
    if (satisfacaoSemanal === null) return;
    
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
    
    if (notaNPS < 7 || notaNPS > 8) {
      setStep('motivo-nps');
    } else {
      enviarResposta();
    }
  };

  const enviarResposta = async () => {
    try {
      const { createPublicSupabaseClient } = await import('@/lib/supabase-public');
      const publicSupabase = createPublicSupabaseClient();

      const { error } = await (publicSupabase as any)
        .from('nps_respostas')
        .insert({
          cliente_id: cliente.id,
          satisfacao_semanal: satisfacaoSemanal,
          motivo_satisfacao: motivoSemanal || null,
          nota_nps: notaNPS,
          motivo_nps: motivoNPS || null,
        });

      if (error) throw error;

      setStep('concluido');
      
      toast({
        title: "✅ Obrigado!",
        description: "Sua opinião faz a diferença",
      });

      setTimeout(() => {
        navigate(`/painel/${clienteSlug}`);
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao enviar resposta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua resposta. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number | null) => {
    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setSatisfacaoSemanal(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-10 w-10 ${
                rating !== null && star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderNPSButtons = () => {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setNotaNPS(num)}
            className={`w-12 h-12 rounded-lg border-2 transition-all ${
              notaNPS === num
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">Cliente não encontrado</p>
              <Button onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Avaliar ${cliente.nome} - BNOads`}</title>
      </Helmet>

      

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/painel/${clienteSlug}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Painel
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Nos ajude a ser melhores para você 💙
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'semanal' && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-medium">
                    Como você está percebendo nossa entrega nesta semana?
                  </h3>
                  {renderStars(satisfacaoSemanal)}
                </div>
                <Button
                  onClick={handleSemanalSubmit}
                  disabled={satisfacaoSemanal === null}
                  className="w-full"
                >
                  Continuar
                </Button>
              </div>
            )}

            {step === 'motivo-semanal' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-center">
                    O que aconteceu essa semana que poderíamos melhorar?
                  </h3>
                  <Textarea
                    value={motivoSemanal}
                    onChange={(e) => setMotivoSemanal(e.target.value)}
                    placeholder="Compartilhe seus pensamentos..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleMotivoSemanalSubmit} className="w-full">
                  Continuar
                </Button>
              </div>
            )}

            {step === 'nps' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-center">
                    De 0 a 10, o quanto você recomendaria a BNOads para outros empresários?
                  </h3>
                  {renderNPSButtons()}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Não recomendaria</span>
                    <span>Recomendaria muito</span>
                  </div>
                </div>
                <Button
                  onClick={handleNPSSubmit}
                  disabled={notaNPS === null}
                  className="w-full"
                >
                  Continuar
                </Button>
              </div>
            )}

            {step === 'motivo-nps' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-center">
                    {notaNPS! < 7
                      ? 'O que precisamos melhorar para elevar essa nota?'
                      : 'O que estamos fazendo que mais te surpreende?'}
                  </h3>
                  <Textarea
                    value={motivoNPS}
                    onChange={(e) => setMotivoNPS(e.target.value)}
                    placeholder="Compartilhe seus pensamentos..."
                    rows={4}
                  />
                </div>
                <Button onClick={enviarResposta} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar e continuar
                </Button>
              </div>
            )}

            {step === 'concluido' && (
              <div className="text-center space-y-4 py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold">Obrigado!</h3>
                <p className="text-muted-foreground">
                  Sua opinião faz a diferença
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PainelClienteNPS;
