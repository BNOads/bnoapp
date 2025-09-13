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
      
      
      <ReferenciaCreativos clienteId="geral" />
    </div>;
};