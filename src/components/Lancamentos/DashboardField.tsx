import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Copy, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
interface DashboardFieldProps {
  value: string;
  onSave: (url: string) => Promise<void>;
  editable?: boolean;
}
export default function DashboardField({
  value,
  onSave,
  editable = true
}: DashboardFieldProps) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('✔ Link copiado!', {
        duration: 2000
      });
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(url);
      setEditing(false);
      toast.success('Dashboard atualizado');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };
  const normalizeUrl = (rawUrl: string) => {
    if (!rawUrl) return rawUrl;
    if (!/^https?:\/\//i.test(rawUrl)) {
      return `https://${rawUrl}`;
    }
    return rawUrl;
  };
  return <Card className="border-2 border-primary/20 bg-primary/5">
      
    </Card>;
}