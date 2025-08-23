import React from 'react';
import { PerfilColaborador } from '@/components/Colaboradores/PerfilColaborador';

const Perfil = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <PerfilColaborador />
      </div>
    </div>
  );
};

export default Perfil;