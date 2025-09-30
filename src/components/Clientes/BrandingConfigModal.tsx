import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { AlertCircle, Upload, RotateCcw, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBrandingValidation } from '@/hooks/useBrandingValidation';

interface BrandingConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: any;
  onSuccess?: () => void;
}

export const BrandingConfigModal = ({ open, onOpenChange, cliente, onSuccess }: BrandingConfigModalProps) => {
  const { toast } = useToast();
  const { validateColor, normalizeHex, adjustColorForContrast, getContrastRatio } = useBrandingValidation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    branding_enabled: false,
    branding_logo_url: '',
    branding_primary: '',
    branding_secondary: '',
    branding_bg: '',
    branding_description: ''
  });

  const [colorValidation, setColorValidation] = useState({
    primary: { isValid: true, contrast: 0, needsAdjustment: false },
    secondary: { isValid: true, contrast: 0, needsAdjustment: false }
  });

  useEffect(() => {
    if (cliente && open) {
      setFormData({
        branding_enabled: cliente.branding_enabled || false,
        branding_logo_url: cliente.branding_logo_url || '',
        branding_primary: cliente.branding_primary || '',
        branding_secondary: cliente.branding_secondary || '',
        branding_bg: cliente.branding_bg || '',
        branding_description: cliente.branding_description || ''
      });
    }
  }, [cliente, open]);

  useEffect(() => {
    if (formData.branding_primary || formData.branding_secondary) {
      const bgColor = formData.branding_bg || '#FFFFFF';
      
      const primaryValidation = validateColor(formData.branding_primary, bgColor);
      const secondaryValidation = validateColor(formData.branding_secondary, bgColor);
      
      setColorValidation({
        primary: primaryValidation,
        secondary: secondaryValidation
      });
    }
  }, [formData.branding_primary, formData.branding_secondary, formData.branding_bg]);

  const handleAutoAdjustColor = (field: 'branding_primary' | 'branding_secondary') => {
    const bgColor = formData.branding_bg || '#FFFFFF';
    const adjusted = adjustColorForContrast(formData[field], bgColor);
    
    setFormData(prev => ({ ...prev, [field]: adjusted }));
    
    toast({
      title: 'Cor ajustada',
      description: 'A cor foi ajustada automaticamente para atender o contraste mínimo.'
    });
  };

  const handleResetToDefault = () => {
    setFormData({
      branding_enabled: false,
      branding_logo_url: '',
      branding_primary: '',
      branding_secondary: '',
      branding_bg: '',
      branding_description: ''
    });
    
    toast({
      title: 'Branding restaurado',
      description: 'As configurações foram restauradas para o padrão BNOads.'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalize hex colors
      const updateData = {
        branding_enabled: formData.branding_enabled,
        branding_logo_url: formData.branding_logo_url || null,
        branding_primary: formData.branding_primary ? normalizeHex(formData.branding_primary) : null,
        branding_secondary: formData.branding_secondary ? normalizeHex(formData.branding_secondary) : null,
        branding_bg: formData.branding_bg ? normalizeHex(formData.branding_bg) : null,
        branding_description: formData.branding_description || null
      };

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', cliente.id);

      if (error) throw error;

      toast({
        title: 'Branding atualizado!',
        description: 'As configurações de branding foram salvas com sucesso.'
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar branding:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const charCount = formData.branding_description.length;
  const charLimit = 500;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuração de Branding
          </DialogTitle>
          <DialogDescription>
            Personalize a identidade visual do painel do cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ativar/Desativar Branding */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Branding Personalizado</Label>
              <p className="text-sm text-muted-foreground">
                Aplica a identidade visual customizada no painel do cliente
              </p>
            </div>
            <Switch
              checked={formData.branding_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, branding_enabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações */}
            <div className="space-y-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo"
                    value={formData.branding_logo_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, branding_logo_url: e.target.value }))}
                    placeholder="https://exemplo.com/logo.svg"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">PNG ou SVG, máx. 1MB</p>
              </div>

              {/* Cor Primária */}
              <div className="space-y-2">
                <Label htmlFor="primary">Cor Primária</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="primary"
                      value={formData.branding_primary}
                      onChange={(e) => setFormData(prev => ({ ...prev, branding_primary: e.target.value }))}
                      placeholder="#0E4FFF"
                      className="pr-10"
                    />
                    <input
                      type="color"
                      value={formData.branding_primary ? normalizeHex(formData.branding_primary) || '#0E4FFF' : '#0E4FFF'}
                      onChange={(e) => setFormData(prev => ({ ...prev, branding_primary: e.target.value }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer border"
                    />
                  </div>
                  {colorValidation.primary.needsAdjustment && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoAdjustColor('branding_primary')}
                    >
                      Ajustar
                    </Button>
                  )}
                </div>
                {colorValidation.primary.needsAdjustment && (
                  <div className="flex items-start gap-2 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3 mt-0.5" />
                    <span>Contraste baixo ({colorValidation.primary.contrast.toFixed(2)}:1). Recomendado: 4.5:1</span>
                  </div>
                )}
              </div>

              {/* Cor Secundária */}
              <div className="space-y-2">
                <Label htmlFor="secondary">Cor Secundária</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="secondary"
                      value={formData.branding_secondary}
                      onChange={(e) => setFormData(prev => ({ ...prev, branding_secondary: e.target.value }))}
                      placeholder="#1E293B"
                      className="pr-10"
                    />
                    <input
                      type="color"
                      value={formData.branding_secondary ? normalizeHex(formData.branding_secondary) || '#1E293B' : '#1E293B'}
                      onChange={(e) => setFormData(prev => ({ ...prev, branding_secondary: e.target.value }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer border"
                    />
                  </div>
                  {colorValidation.secondary.needsAdjustment && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoAdjustColor('branding_secondary')}
                    >
                      Ajustar
                    </Button>
                  )}
                </div>
                {colorValidation.secondary.needsAdjustment && (
                  <div className="flex items-start gap-2 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3 mt-0.5" />
                    <span>Contraste baixo ({colorValidation.secondary.contrast.toFixed(2)}:1). Recomendado: 4.5:1</span>
                  </div>
                )}
              </div>

              {/* Cor de Fundo */}
              <div className="space-y-2">
                <Label htmlFor="bg">Cor de Fundo (Opcional)</Label>
                <div className="relative">
                  <Input
                    id="bg"
                    value={formData.branding_bg}
                    onChange={(e) => setFormData(prev => ({ ...prev, branding_bg: e.target.value }))}
                    placeholder="#FFFFFF"
                    className="pr-10"
                  />
                  <input
                    type="color"
                    value={formData.branding_bg ? normalizeHex(formData.branding_bg) || '#FFFFFF' : '#FFFFFF'}
                    onChange={(e) => setFormData(prev => ({ ...prev, branding_bg: e.target.value }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer border"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Deixe vazio para usar o padrão</p>
              </div>

              {/* Descritivo */}
              <div className="space-y-2">
                <Label htmlFor="description">Descritivo do Cliente</Label>
                <Textarea
                  id="description"
                  value={formData.branding_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, branding_description: e.target.value.slice(0, 500) }))}
                  placeholder="Texto curto exibido no topo do painel..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {charCount}/{charLimit} caracteres
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <Label>Preview do Painel</Label>
              <Card 
                className="p-6 space-y-4"
                style={{
                  backgroundColor: formData.branding_bg ? normalizeHex(formData.branding_bg) || undefined : undefined
                }}
              >
                {/* Header Preview */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  {formData.branding_logo_url ? (
                    <img 
                      src={formData.branding_logo_url} 
                      alt="Logo" 
                      className="h-10 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs">
                      Logo
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{cliente?.nome || 'Nome do Cliente'}</h3>
                    {formData.branding_description && (
                      <p className="text-sm opacity-80 line-clamp-2">{formData.branding_description}</p>
                    )}
                  </div>
                </div>

                {/* Elements Preview */}
                <div className="space-y-3">
                  <Button 
                    type="button"
                    style={{
                      backgroundColor: formData.branding_primary ? normalizeHex(formData.branding_primary) || undefined : undefined,
                      color: '#FFFFFF'
                    }}
                  >
                    Botão Primário
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    style={{
                      borderColor: formData.branding_secondary ? normalizeHex(formData.branding_secondary) || undefined : undefined,
                      color: formData.branding_secondary ? normalizeHex(formData.branding_secondary) || undefined : undefined
                    }}
                  >
                    Botão Secundário
                  </Button>
                  <div className="flex gap-2">
                    <div 
                      className="px-3 py-1 rounded text-sm"
                      style={{
                        backgroundColor: formData.branding_primary ? `${normalizeHex(formData.branding_primary)}15` : undefined,
                        color: formData.branding_primary ? normalizeHex(formData.branding_primary) || undefined : undefined
                      }}
                    >
                      Badge Primário
                    </div>
                    <div 
                      className="px-3 py-1 rounded text-sm"
                      style={{
                        backgroundColor: formData.branding_secondary ? `${normalizeHex(formData.branding_secondary)}15` : undefined,
                        color: formData.branding_secondary ? normalizeHex(formData.branding_secondary) || undefined : undefined
                      }}
                    >
                      Badge Secundário
                    </div>
                  </div>
                </div>
              </Card>

              {/* Reset Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleResetToDefault}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repor Padrão BNOads
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
