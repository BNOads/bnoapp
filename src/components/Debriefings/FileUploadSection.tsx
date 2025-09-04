import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Users, TrendingUp, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface FileUploadSectionProps {
  debriefingData: any;
  onComplete: () => void;
}

interface UploadedFile {
  name: string;
  type: 'leads' | 'compradores' | 'trafego';
  status: 'uploaded' | 'processing' | 'validated' | 'error';
  data?: any[];
  errors?: string[];
}

export default function FileUploadSection({ debriefingData, onComplete }: FileUploadSectionProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeTab, setActiveTab] = useState("leads");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'leads' | 'compradores' | 'trafego') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const newFile: UploadedFile = {
      name: file.name,
      type: fileType,
      status: 'uploaded'
    };

    setUploadedFiles(prev => [...prev.filter(f => f.type !== fileType), newFile]);
    
    try {
      // Simulate file processing
      setUploadedFiles(prev => prev.map(f => 
        f.type === fileType ? { ...f, status: 'processing' } : f
      ));

      // Here would be the actual file parsing logic
      await new Promise(resolve => setTimeout(resolve, 2000));

      setUploadedFiles(prev => prev.map(f => 
        f.type === fileType ? { ...f, status: 'validated' } : f
      ));

      toast.success(`Arquivo ${file.name} processado com sucesso!`);
    } catch (error) {
      setUploadedFiles(prev => prev.map(f => 
        f.type === fileType ? { ...f, status: 'error', errors: ['Erro ao processar arquivo'] } : f
      ));
      toast.error(`Erro ao processar ${file.name}`);
    }
  };

  const getFileStatus = (type: 'leads' | 'compradores' | 'trafego') => {
    const file = uploadedFiles.find(f => f.type === type);
    return file?.status || 'none';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error': return <div className="h-4 w-4 bg-red-500 rounded-full" />;
      default: return null;
    }
  };

  const canProceed = () => {
    return uploadedFiles.some(f => f.status === 'validated');
  };

  const fileTypes = [
    {
      id: 'leads',
      title: 'Leads',
      description: 'Dados de captação de leads',
      icon: Users,
      required: false,
      fields: ['lead_id', 'data_captura', 'nome', 'email', 'telefone', 'utm_source', 'utm_medium', 'utm_campaign']
    },
    {
      id: 'compradores',
      title: 'Compradores',
      description: 'Dados de vendas e faturamento',
      icon: TrendingUp,
      required: false,
      fields: ['pedido_id', 'lead_id', 'data_compra', 'valor', 'meio_pagamento', 'produto']
    },
    {
      id: 'trafego',
      title: 'Tráfego',
      description: 'Dados de investimento em anúncios',
      icon: FileText,
      required: false,
      fields: ['data', 'plataforma', 'campanha', 'investimento', 'cliques', 'leads']
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {fileTypes.map((type) => (
            <TabsTrigger key={type.id} value={type.id} className="flex items-center space-x-2">
              <type.icon className="h-4 w-4" />
              <span>{type.title}</span>
              {getStatusIcon(getFileStatus(type.id as any))}
            </TabsTrigger>
          ))}
        </TabsList>

        {fileTypes.map((type) => (
          <TabsContent key={type.id} value={type.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <type.icon className="h-5 w-5" />
                  <span>Upload - {type.title}</span>
                </CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Arraste e solte seu arquivo aqui ou clique para selecionar
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, type.id as any)}
                    className="hidden"
                    id={`file-${type.id}`}
                  />
                  <Button variant="outline" asChild>
                    <label htmlFor={`file-${type.id}`}>
                      Selecionar Arquivo
                    </label>
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-2">Campos esperados:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {type.fields.map((field) => (
                      <span key={field} className="font-mono bg-muted px-2 py-1 rounded">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                {uploadedFiles.find(f => f.type === type.id)?.errors && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Erros encontrados:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {uploadedFiles.find(f => f.type === type.id)?.errors?.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-between items-center pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          {uploadedFiles.filter(f => f.status === 'validated').length} arquivo(s) processado(s) com sucesso
        </p>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
          <Button 
            onClick={onComplete}
            disabled={!canProceed()}
          >
            Processar Debriefing
          </Button>
        </div>
      </div>
    </div>
  );
}