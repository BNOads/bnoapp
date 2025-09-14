import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditBasicInfoProps {
  debriefing: any;
  onUpdate: () => void;
}

export default function EditBasicInfo({ debriefing, onUpdate }: EditBasicInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome_lancamento: debriefing.nome_lancamento,
    cliente_nome: debriefing.cliente_nome
  });

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

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('debriefings')
        .update({
          nome_lancamento: formData.nome_lancamento,
          cliente_nome: formData.cliente_nome
        })
        .eq('id', debriefing.id);

      if (error) throw error;

      toast.success('Informações atualizadas com sucesso!');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar debriefing:', error);
      toast.error('Erro ao atualizar as informações');
    }
  };

  const handleCancel = () => {
    setFormData({
      nome_lancamento: debriefing.nome_lancamento,
      cliente_nome: debriefing.cliente_nome
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Informações do Lançamento</CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cliente_nome">Cliente</Label>
                  <Input
                    id="cliente_nome"
                    value={formData.cliente_nome}
                    onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="nome_lancamento">Nome do Lançamento</Label>
                  <Input
                    id="nome_lancamento"
                    value={formData.nome_lancamento}
                    onChange={(e) => setFormData({ ...formData, nome_lancamento: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleCancel} size="sm">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Cliente</label>
                <p className="text-sm text-muted-foreground">{debriefing.cliente_nome}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Nome do Lançamento</label>
                <p className="text-sm text-muted-foreground">{debriefing.nome_lancamento}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Período</label>
                <p className="text-sm text-muted-foreground">
                  {debriefing.periodo_inicio ? new Date(debriefing.periodo_inicio).toLocaleDateString('pt-BR') : 'N/A'} - {' '}
                  {debriefing.periodo_fim ? new Date(debriefing.periodo_fim).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <div>
                  <Badge className={getStatusColor(debriefing.status)}>
                    {getStatusLabel(debriefing.status)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {debriefing.status === 'concluido' && (
        <Card>
          <CardHeader>
            <CardTitle>Métricas Atuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-blue-600">{debriefing.leads_total || 0}</div>
                <p className="text-sm text-muted-foreground">Leads</p>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-green-600">{debriefing.vendas_total || 0}</div>
                <p className="text-sm text-muted-foreground">Vendas</p>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-red-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debriefing.investimento_total || 0)}
                </div>
                <p className="text-sm text-muted-foreground">Investimento</p>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {debriefing.roas ? `${debriefing.roas.toFixed(2)}x` : '-'}
                </div>
                <p className="text-sm text-muted-foreground">ROAS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}