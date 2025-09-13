import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ReferenciaCreativos } from "@/components/Clientes/ReferenciaCreativos";
export const ReferenciasView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleVoltar = () => {
    const from = location.state?.from || '/';
    navigate(from);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          
          <div>
            <h1 className="text-3xl font-bold">Referências de Criativos</h1>
            <p className="text-muted-foreground">
              Gerencie documentos multimídia para referência da equipe
            </p>
          </div>
        </div>
      </div>
      
      <ReferenciaCreativos clienteId="geral" />
    </div>;
};