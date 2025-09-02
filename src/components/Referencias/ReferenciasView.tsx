import { ReferenciaCreativos } from "@/components/Clientes/ReferenciaCreativos";

export const ReferenciasView = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Referências de Criativos</h1>
          <p className="text-muted-foreground">
            Gerencie documentos multimídia para referência da equipe
          </p>
        </div>
      </div>
      
      <ReferenciaCreativos clienteId="geral" />
    </div>
  );
};