const parseDateLocal = (dateStr: string): Date | null => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

export const calcularDiasParaAniversario = (dataNascimento: string | null): number | null => {
  if (!dataNascimento) return null;

  try {
    const nascimento = parseDateLocal(dataNascimento);
    if (!nascimento) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const anoAtual = hoje.getFullYear();
    const aniversarioEsteAno = new Date(anoAtual, nascimento.getMonth(), nascimento.getDate());

    if (aniversarioEsteAno < hoje) {
      aniversarioEsteAno.setFullYear(anoAtual + 1);
    }

    const diferenca = Math.ceil((aniversarioEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diferenca;
  } catch {
    return null;
  }
};

export const formatarAniversario = (dataNascimento: string | null): string => {
  if (!dataNascimento) return 'Não informado';
  const diasRestantes = calcularDiasParaAniversario(dataNascimento);
  if (diasRestantes === null) return 'Data inválida';

  if (diasRestantes === 0) return 'Hoje! 🎂';
  if (diasRestantes === 1) return 'Amanhã! 🎂';
  if (diasRestantes <= 7) return `${diasRestantes} dias 🍰`;
  return `Faltam ${diasRestantes} dias`;
};

export const formatarNivelAcesso = (nivel: string): string => {
  const mapa: Record<string, string> = {
    dono: 'Dono',
    admin: 'Administrador',
    gestor_trafego: 'Gestor de Tráfego',
    gestor_projetos: 'Gestor de Projetos',
    webdesigner: 'Webdesigner',
    editor_video: 'Editor de Vídeo',
    cs: 'Customer Success',
    midia_buyer: 'Mídia Buyer',
    copywriter: 'Copywriter',
    designer: 'Designer',
  };
  return mapa[nivel] || nivel;
};
