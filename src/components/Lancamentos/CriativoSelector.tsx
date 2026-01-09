import { useState, useEffect } from "react";
import { Search, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CriativoSelectorProps {
  clienteId: string;
  selectedIds: string[]; // This will now store folder names
  onSelectionChange: (ids: string[]) => void;
  className?: string;
}

export function CriativoSelector({
  clienteId,
  selectedIds,
  onSelectionChange,
  className
}: CriativoSelectorProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (clienteId) {
      loadFolders();
    } else {
      setFolders([]);
    }
  }, [clienteId]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      // Fetch unique folder names directly using Supabase
      const { data, error } = await supabase
        .from('creatives')
        .select('folder_name')
        .eq('client_id', clienteId)
        .not('folder_name', 'is', null);

      if (error) throw error;

      // Extract unique folder names and sort them
      const uniqueFolders = Array.from(new Set(data.map(item => item.folder_name))).sort();
      setFolders(uniqueFolders);
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (folderName: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, folderName]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== folderName));
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!clienteId) {
    return (
      <div className="text-center p-4 text-muted-foreground bg-muted/30 rounded-md border border-dashed">
        Selecione um cliente para ver as pastas disponíveis.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pastas de criativos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="border rounded-md">
        <div className="p-2 border-b bg-muted/30 items-center justify-between flex">
          <span className="text-sm font-medium text-muted-foreground">
            {filteredFolders.length} de {folders.length} encontradas
          </span>
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} selecionadas
          </span>
        </div>

        <ScrollArea className="h-[200px] p-2">
          {loading ? (
            <div className="flex justify-center p-4">Carregando...</div>
          ) : filteredFolders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma pasta encontrada.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFolders.map((folder) => (
                <div
                  key={folder}
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors border border-transparent",
                    selectedIds.includes(folder) && "bg-accent/50 border-accent"
                  )}
                >
                  <Checkbox
                    id={folder}
                    checked={selectedIds.includes(folder)}
                    onCheckedChange={(checked) => toggleSelection(folder, checked as boolean)}
                    className="mt-0"
                  />
                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor={folder}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      <Folder className="h-4 w-4 text-yellow-500" />
                      {folder}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
