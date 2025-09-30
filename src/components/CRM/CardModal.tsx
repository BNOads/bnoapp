import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface CardModalProps {
  isOpen: boolean;
  card: any;
  onClose: () => void;
  onSave: () => void;
}

export const CardModal = ({ isOpen, card, onClose, onSave }: CardModalProps) => {
  const [formData, setFormData] = useState<any>({
    title: '',
    instagram: '',
    segment: '',
    origin: 'Frio',
    company: '',
    phone: '',
    email: '',
    description: '',
    amount: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (card?.id) {
      setFormData({
        ...card,
        amount: card.amount || '',
        tags: card.tags || []
      });
    } else if (card?.column_id) {
      setFormData({
        title: '',
        instagram: '',
        segment: '',
        origin: 'Frio',
        company: '',
        phone: '',
        email: '',
        description: '',
        amount: '',
        tags: [],
        column_id: card.column_id
      });
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const dataToSave = {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        created_by: user.id
      };

      if (card?.id) {
        const { error } = await supabase
          .from('crm_cards')
          .update(dataToSave)
          .eq('id', card.id);

        if (error) throw error;

        toast({
          title: 'Card atualizado',
          description: 'As alterações foram salvas com sucesso'
        });
      } else {
        const { error } = await supabase
          .from('crm_cards')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: 'Card criado',
          description: 'Novo lead adicionado com sucesso'
        });
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o card',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag: string) => tag !== tagToRemove)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {card?.id ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Nome do Lead *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Nome da pessoa ou empresa"
              />
            </div>

            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@username"
              />
            </div>

            <div>
              <Label htmlFor="segment">Segmento</Label>
              <Input
                id="segment"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                placeholder="Infoproduto, Serviços, etc."
              />
            </div>

            <div>
              <Label htmlFor="origin">Origem</Label>
              <Select 
                value={formData.origin} 
                onValueChange={(value) => setFormData({ ...formData, origin: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Frio">Frio</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Orgânico">Orgânico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="company">Empresa/Marca</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="amount">Valor Potencial (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Informações adicionais sobre o lead..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Adicionar tag..."
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};