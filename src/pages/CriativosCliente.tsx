import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { DriveCreativesView } from "@/components/Criativos/DriveCreativesView";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CriativosCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [clienteNome, setClienteNome] = useState<string>("");
  const [loadingCliente, setLoadingCliente] = useState(true);

  useEffect(() => {
    const carregarCliente = async () => {
      if (!clienteId) return;
      
      setLoadingCliente(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', clienteId)
        .maybeSingle();
      
      if (error) {
        toast({
          title: "Erro ao carregar cliente",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        setClienteNome(data.nome);
      }
      setLoadingCliente(false);
    };
    
    carregarCliente();
  }, [clienteId, toast]);

  if (!clienteId) {
    return <div className="text-center">Cliente não encontrado</div>;
  }

  return (
    <>
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => {
            const from = location.state?.from || `/painel/${clienteId}`;
            navigate(from);
          }}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {loadingCliente ? "Voltar" : `Voltar para ${clienteNome}`}
        </Button>
        
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Catálogo de Criativos</h1>
            {loadingCliente ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <Badge variant="secondary" className="text-base px-3 py-1">
                {clienteNome}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {loadingCliente 
              ? "Carregando informações do cliente..." 
              : `Gerencie todos os materiais criativos e assets de ${clienteNome}`
            }
          </p>
        </div>
      </div>

      <DriveCreativesView clienteId={clienteId} />
    </>
  );
}