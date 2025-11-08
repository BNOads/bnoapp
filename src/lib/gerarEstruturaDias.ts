// Gera a estrutura completa de meses e dias para o Lexical
export function gerarEstruturaDias(ano: number) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const children = [
    // Título principal
    {
      children: [{
        detail: 0,
        format: 1, // bold
        mode: "normal",
        style: "",
        text: `Arquivo de Reunião ${ano}`,
        type: "text",
        version: 1
      }],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "heading",
      version: 1,
      tag: "h1"
    }
  ];

  // Para cada mês
  meses.forEach((nomeMes, mesIndex) => {
    // Heading do mês
    children.push({
      children: [{
        detail: 0,
        format: 1, // bold
        mode: "normal",
        style: "",
        text: `${nomeMes} ${ano}`,
        type: "text",
        version: 1
      }],
      direction: "ltr",
      format: "",
      indent: 0,
      type: "heading",
      version: 1,
      tag: "h2"
    });

    // Calcular quantos dias tem esse mês
    const diasNoMes = new Date(ano, mesIndex + 1, 0).getDate();

    // Para cada dia do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mesIndex, dia);
      const diaSemanaTexto = diasSemana[data.getDay()];
      const diaFormatado = dia.toString().padStart(2, '0');
      const mesFormatado = (mesIndex + 1).toString().padStart(2, '0');

      // Heading do dia (h3)
      children.push({
        children: [{
          detail: 0,
          format: 0,
          mode: "normal",
          style: "",
          text: `${diaFormatado}/${mesFormatado}/${ano} - ${diaSemanaTexto}`,
          type: "text",
          version: 1
        }],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "heading",
        version: 1,
        tag: "h3"
      });

      // Parágrafo vazio para escrever
      children.push({
        children: [],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
      } as any);

      // Linha em branco
      children.push({
        children: [],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
      } as any);
    }
  });

  return {
    root: {
      children,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1
    }
  };
}
