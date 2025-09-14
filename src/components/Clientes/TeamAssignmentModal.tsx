import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { User, Users, Star, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  user_id: string;
  nome: string;
  email: string;
  avatar_url?: string;
  nivel_acesso: string;
  is_assigned?: boolean;
  is_primary?: boolean;
  since?: string;
}

interface TeamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
  onSuccess?: () => void;
}

export const TeamAssignmentModal: React.FC<TeamAssignmentModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  clienteNome,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gestores, setGestores] = useState<TeamMember[]>([]);
  const [cssMembers, setCssMembers] = useState<TeamMember[]>([]);
  const [selectedGestor, setSelectedGestor] = useState<string>('');
  const [selectedCs, setSelectedCs] = useState<Set<string>>(new Set());
  const [primaryCs, setPrimaryCs] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTeamData();
    }
  }, [isOpen, clienteId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Load all potential team members
      const { data: colaboradores, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select(`
          user_id, nome, email, avatar_url, nivel_acesso
        `)
        .eq('ativo', true);

      if (colaboradoresError) throw colaboradoresError;

      // Load current assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('client_roles')
        .select('*')
        .eq('client_id', clienteId);

      if (assignmentsError) throw assignmentsError;

      // Process gestores
      const gestoresData = colaboradores
        ?.filter(c => ['admin', 'gestor_trafego'].includes(c.nivel_acesso))
        .map(gestor => {
          const assignment = assignments?.find(a => a.user_id === gestor.user_id && a.role === 'gestor');
          return {
            ...gestor,
            is_assigned: !!assignment,
            is_primary: assignment?.is_primary || false
          };
        }) || [];

      // Process CS members
      const csData = colaboradores
        ?.filter(c => ['admin', 'cs'].includes(c.nivel_acesso))
        .map(cs => {
          const assignment = assignments?.find(a => a.user_id === cs.user_id && a.role === 'cs');
          return {
            ...cs,
            is_assigned: !!assignment,
            is_primary: assignment?.is_primary || false,
            since: assignment?.since
          };
        }) || [];

      setGestores(gestoresData);
      setCssMembers(csData);

      // Set current selections
      const currentGestor = gestoresData.find(g => g.is_assigned);
      const currentCs = csData.filter(c => c.is_assigned);
      const currentPrimaryCs = csData.find(c => c.is_primary);

      setSelectedGestor(currentGestor?.user_id || '');
      setSelectedCs(new Set(currentCs.map(c => c.user_id)));
      setPrimaryCs(currentPrimaryCs?.user_id || '');

    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da equipe",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Remove all current assignments
      const { error: deleteError } = await supabase
        .from('client_roles')
        .delete()
        .eq('client_id', clienteId);

      if (deleteError) throw deleteError;

      const newAssignments = [];

      // Add gestor assignment
      if (selectedGestor) {
        newAssignments.push({
          client_id: clienteId,
          user_id: selectedGestor,
          role: 'gestor',
          is_primary: true
        });
      }

      // Add CS assignments
      Array.from(selectedCs).forEach(csUserId => {
        newAssignments.push({
          client_id: clienteId,
          user_id: csUserId,
          role: 'cs',
          is_primary: csUserId === primaryCs
        });
      });

      // Insert new assignments
      if (newAssignments.length > 0) {
        const { error: insertError } = await supabase
          .from('client_roles')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      toast({
        title: "Sucesso",
        description: "Equipe atualizada com sucesso"
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Error saving team assignments:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar atribuições da equipe",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCsToggle = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedCs);
    if (checked) {
      newSelected.add(userId);
      // If this is the first CS, make them primary
      if (newSelected.size === 1) {
        setPrimaryCs(userId);
      }
    } else {
      newSelected.delete(userId);
      // If removing the primary CS, assign primary to another CS
      if (userId === primaryCs && newSelected.size > 0) {
        setPrimaryCs(Array.from(newSelected)[0]);
      } else if (newSelected.size === 0) {
        setPrimaryCs('');
      }
    }
    setSelectedCs(newSelected);
  };

  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Equipe - {clienteNome}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="gestor" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gestor" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Gestor
            </TabsTrigger>
            <TabsTrigger value="cs" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              CS ({selectedCs.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gestor" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione o gestor principal para este cliente:
              </p>

              <RadioGroup value={selectedGestor} onValueChange={setSelectedGestor}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="no-gestor" />
                  <Label htmlFor="no-gestor" className="text-sm text-muted-foreground">
                    Nenhum gestor atribuído
                  </Label>
                </div>

                {gestores.map(gestor => (
                  <div key={gestor.user_id} className="flex items-center space-x-2">
                    <RadioGroupItem value={gestor.user_id} id={`gestor-${gestor.user_id}`} />
                    <Label htmlFor={`gestor-${gestor.user_id}`} className="flex items-center gap-3 cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={gestor.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(gestor.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{gestor.nome}</p>
                        <p className="text-sm text-muted-foreground">{gestor.email}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        {gestor.nivel_acesso === 'admin' ? 'Admin' : 'Gestor'}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </TabsContent>

          <TabsContent value="cs" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione os CS atribuídos a este cliente:
              </p>

              {primaryCs && selectedCs.size > 1 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">CS Primário:</p>
                  <RadioGroup value={primaryCs} onValueChange={setPrimaryCs}>
                    {Array.from(selectedCs).map(userId => {
                      const cs = cssMembers.find(c => c.user_id === userId);
                      if (!cs) return null;
                      return (
                        <div key={userId} className="flex items-center space-x-2">
                          <RadioGroupItem value={userId} id={`primary-${userId}`} />
                          <Label htmlFor={`primary-${userId}`} className="flex items-center gap-2 cursor-pointer">
                            <Star className="h-3 w-3" />
                            {cs.nome}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {cssMembers.map(cs => (
                  <div key={cs.user_id} className="flex items-center space-x-3 p-2 border rounded-lg">
                    <Checkbox
                      id={`cs-${cs.user_id}`}
                      checked={selectedCs.has(cs.user_id)}
                      onCheckedChange={(checked) => handleCsToggle(cs.user_id, !!checked)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={cs.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(cs.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{cs.nome}</p>
                      <p className="text-sm text-muted-foreground">{cs.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedCs.has(cs.user_id) && cs.user_id === primaryCs && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primário
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {cs.nivel_acesso === 'admin' ? 'Admin' : 'CS'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};