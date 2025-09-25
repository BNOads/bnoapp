import { useState, useEffect } from "react";
import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: string;
}

interface CreativeTableSettingsProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  clienteId: string;
}

export const CreativeTableSettings = ({ 
  columns, 
  onColumnsChange, 
  clienteId 
}: CreativeTableSettingsProps) => {
  const getStorageKey = () => `catalogo_colunas_${clienteId}`;

  const saveColumnPreferences = (updatedColumns: ColumnConfig[]) => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedColumns));
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  };

  const handleColumnToggle = (columnId: string, visible: boolean) => {
    const updatedColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible } : col
    );
    onColumnsChange(updatedColumns);
    saveColumnPreferences(updatedColumns);
  };

  const handleResetColumns = () => {
    const defaultColumns = columns.map(col => ({ ...col, visible: true }));
    onColumnsChange(defaultColumns);
    saveColumnPreferences(defaultColumns);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Configurar Colunas</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetColumns}
              className="h-6 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Redefinir
            </Button>
          </div>
          
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={column.id}
                  checked={column.visible}
                  onCheckedChange={(checked) => 
                    handleColumnToggle(column.id, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={column.id} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};