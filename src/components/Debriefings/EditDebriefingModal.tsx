import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Upload, Download, FileText, RefreshCw, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CSVWizard from "./CSVWizard";
import EditBasicInfo from "./EditBasicInfo";
import SelectiveImportModal from "./SelectiveImportModal";
import EditDataModal from "./EditDataModal";

interface EditDebriefingModalProps {
  debriefing: any;
  onUpdate: () => void;
}

export default function EditDebriefingModal({ debriefing, onUpdate }: EditDebriefingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'data' | 'selective' | 'edit'>('info');
  const [showSelectiveImport, setShowSelectiveImport] = useState(false);
  const [showEditData, setShowEditData] = useState(false);

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
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'selective' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('selective')}
            >
              Reimportar Específico
            </button>
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'edit' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('edit')}
            >
              Editar Dados Manualmente
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

          {/* Aba Reimportação Específica */}
          {activeTab === 'selective' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <RefreshCw className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">Reimportação Seletiva</h4>
                    <p className="text-sm text-amber-700">
                      Reimporte apenas um tipo específico de dados sem afetar os demais.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col"
                  onClick={() => setShowSelectiveImport(true)}
                >
                  <RefreshCw className="h-6 w-6 mb-2" />
                  <span>Reimportar Dados CSV</span>
                  <span className="text-xs text-muted-foreground">Vendas, Leads, Tráfego, etc.</span>
                </Button>
              </div>
            </div>
          )}

          {/* Aba Editar Dados Manualmente */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Edit3 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">Edição Manual</h4>
                    <p className="text-sm text-green-700">
                      Edite métricas, insights e dados diretamente na interface.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-24 flex flex-col"
                  onClick={() => setShowEditData(true)}
                >
                  <Edit3 className="h-6 w-6 mb-2" />
                  <span>Editar Métricas e Insights</span>
                  <span className="text-xs text-muted-foreground">Leads, vendas, ROAS, etc.</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modais Internos */}
      <SelectiveImportModal
        debriefingId={debriefing.id}
        isOpen={showSelectiveImport}
        onClose={() => setShowSelectiveImport(false)}
        onComplete={() => {
          setShowSelectiveImport(false);
          handleComplete();
        }}
      />
      
      <EditDataModal
        debriefingId={debriefing.id}
        debriefingData={debriefing}
        isOpen={showEditData}
        onClose={() => setShowEditData(false)}
        onComplete={() => {
          setShowEditData(false);
          handleComplete();
        }}
      />
    </Dialog>
  );
}