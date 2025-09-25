import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrafficMetric {
  key: string;
  title: string;
  value: number | null;
  format: 'currency' | 'number' | 'percentage';
}

interface EditMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: TrafficMetric[];
  onSave: (overrides: Record<string, number>) => void;
}

export default function EditMetricsModal({ 
  open, 
  onOpenChange, 
  metrics, 
  onSave 
}: EditMetricsModalProps) {
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const handleValueChange = (key: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatInitialValue = (value: number | null, format: string): string => {
    if (value === null || value === undefined) return "";
    
    switch (format) {
      case 'currency':
        return value.toString();
      case 'percentage':
        return value.toString();
      case 'number':
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  };

  const handleSave = () => {
    const overrides: Record<string, number> = {};
    
    Object.entries(editValues).forEach(([key, value]) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && value.trim() !== '') {
        overrides[key] = numValue;
      }
    });
    
    onSave(overrides);
    onOpenChange(false);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditValues({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Editar valores do debrief</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div key={metric.key} className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor={metric.key} className="font-medium">
                  {metric.title}
                </Label>
                <Input
                  id={metric.key}
                  type="number"
                  step="any"
                  placeholder={formatInitialValue(metric.value, metric.format)}
                  value={editValues[metric.key] || ""}
                  onChange={(e) => handleValueChange(metric.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}