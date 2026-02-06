import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Heart } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ViewOnlyBadge } from "@/components/ui/ViewOnlyBadge";
import { TimeEmCampoTab } from "./TimeEmCampo/TimeEmCampoTab";
import { MissaoVisaoValoresTab } from "./MissaoVisaoValores/MissaoVisaoValoresTab";

export const CulturaTimeView = () => {
  const { isAdmin } = useUserPermissions();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Cultura & Time</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Nosso time, nossa cultura, nossos valores
          </p>
        </div>
      </div>

      {!isAdmin && <ViewOnlyBadge />}

      <Tabs defaultValue="time-em-campo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="time-em-campo" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Time em Campo</span>
          </TabsTrigger>
          <TabsTrigger value="missao-visao-valores" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span>Missão, Visão & Valores</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="time-em-campo">
          <TimeEmCampoTab />
        </TabsContent>

        <TabsContent value="missao-visao-valores">
          <MissaoVisaoValoresTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
