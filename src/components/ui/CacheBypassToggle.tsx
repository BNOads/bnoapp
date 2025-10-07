import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HardDriveDownload } from "lucide-react";

export function CacheBypassToggle() {
  const [bypassEnabled, setBypassEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBypassStatus();
  }, []);

  async function checkBypassStatus() {
    try {
      const cache = await caches.open('bnoads-settings');
      const response = await cache.match('bnoads-bypass-cache');
      if (response) {
        const data = await response.json();
        setBypassEnabled(data.enabled === true);
      }
    } catch (err) {
      console.warn('Failed to check bypass status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBypass(enabled: boolean) {
    setLoading(true);
    try {
      const cache = await caches.open('bnoads-settings');
      const data = { enabled, timestamp: Date.now() };
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put('bnoads-bypass-cache', response);
      
      setBypassEnabled(enabled);
      
      if (enabled) {
        // Limpar todos os caches quando ativar bypass
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name !== 'bnoads-settings')
            .map(name => caches.delete(name))
        );
        
        toast.success("Bypass de cache ativado", {
          description: "Todos os caches foram limpos. Recarregue a página."
        });
        
        // Força reload da página após 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.success("Cache normal ativado", {
          description: "O sistema voltará a usar cache. Recarregue a página."
        });
        
        // Força reload da página após 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to toggle bypass:', err);
      toast.error("Erro ao alterar modo de cache");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center space-x-3 p-4 rounded-lg border bg-card">
      <HardDriveDownload className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <Label htmlFor="cache-bypass" className="cursor-pointer font-medium">
          Bypass de Cache (DEV)
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          {bypassEnabled 
            ? "Modo DEV: Sem cache, todas as requisições diretas" 
            : "Modo normal: Cache ativo para performance"
          }
        </p>
      </div>
      <Switch
        id="cache-bypass"
        checked={bypassEnabled}
        onCheckedChange={toggleBypass}
        disabled={loading}
      />
    </div>
  );
}
