import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign } from "lucide-react";
interface VerbaDestaqueProps {
  investimentoTotal: number;
  metaInvestimento: number | null;
  verbasPorFase: {
    captacao?: {
      percentual: number;
    };
    aquecimento?: {
      percentual: number;
    };
    evento?: {
      percentual: number;
    };
    lembrete?: {
      percentual: number;
    };
    impulsionar?: {
      percentual: number;
    };
    venda?: {
      percentual: number;
    };
  };
}
const fasesCores = {
  captacao: "bg-blue-500",
  aquecimento: "bg-purple-500",
  evento: "bg-yellow-500",
  lembrete: "bg-orange-500",
  impulsionar: "bg-pink-500",
  venda: "bg-green-500"
};
const fasesNomes = {
  captacao: "Captação",
  aquecimento: "Aquecimento",
  evento: "Evento",
  lembrete: "Lembrete",
  impulsionar: "Impulsionar",
  venda: "Venda"
};
export default function VerbaDestaque({
  investimentoTotal,
  metaInvestimento,
  verbasPorFase
}: VerbaDestaqueProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };
  const percentualUsado = metaInvestimento ? investimentoTotal / metaInvestimento * 100 : 0;
  return <Card className="overflow-hidden border-2">
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
            <DollarSign className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Verba Total</h2>
        </div>
        <div className="text-4xl font-bold mb-1">
          {formatarMoeda(investimentoTotal)}
        </div>
        {metaInvestimento && <div className="text-sm opacity-90">
            Meta: {formatarMoeda(metaInvestimento)} ({percentualUsado.toFixed(0)}%)
          </div>}
      </div>

      
    </Card>;
}