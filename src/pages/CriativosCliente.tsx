import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DriveCreativesView } from "@/components/Criativos/DriveCreativesView";
import { Header } from "@/components/Layout/Header";
import { useToast } from "@/hooks/use-toast";

export default function CriativosCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  if (!clienteId) {
    return <div className="text-center">Cliente não encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeTab="clientes" 
        onTabChange={(tab) => {
          if (tab === 'clientes') return; // Já estamos na seção de clientes
          navigate(`/?tab=${tab}`);
        }} 
      />
      
      <div className="container mx-auto p-6 max-w-7xl">
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
            Voltar para Painel do Cliente
          </Button>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
            <h1 className="text-3xl font-bold mb-2">Catálogo de Criativos</h1>
            <p className="text-muted-foreground">
              Gerencie todos os materiais criativos e assets do cliente
            </p>
          </div>
        </div>

        <DriveCreativesView clienteId={clienteId} />
      </div>
    </div>
  );
}