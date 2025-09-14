import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Upload, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CSVWizard from "./CSVWizard";
import EditBasicInfo from "./EditBasicInfo";

interface EditDebriefingModalProps {
  debriefing: any;
  onUpdate: () => void;
}

export default function EditDebriefingModal({ debriefing, onUpdate }: EditDebriefingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'data'>('info');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho': return 'bg-yellow-100 text-yellow-800';
      case 'processando': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rascunho': return 'Rascunho';
      case 'processando': return 'Processando';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    onUpdate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Editar Debriefing
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            Editar Debriefing: {debriefing.nome_lancamento}
            <Badge className={getStatusColor(debriefing.status)}>
              {getStatusLabel(debriefing.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Navegação entre abas */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'info' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('info')}
            >
              Informações Básicas
            </button>
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'data' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('data')}
            >
              Importar/Atualizar Dados
            </button>
          </div>

          {/* Aba Informações Básicas */}
          {activeTab === 'info' && (
            <EditBasicInfo 
              debriefing={debriefing} 
              onUpdate={onUpdate}
            />
          )}

          {/* Aba Importar/Atualizar Dados */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Importar Novos Dados</h4>
                    <p className="text-sm text-blue-700">
                      Você pode reimportar dados CSV para atualizar este debriefing ou adicionar dados que estavam faltando.
                    </p>
                  </div>
                </div>
              </div>

              <CSVWizard 
                debriefingData={debriefing} 
                onComplete={handleComplete}
                isEditMode={true}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}