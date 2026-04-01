interface TomboInfo {
  numero: string;
  descricao: string;
}

interface MovimentacaoEmailData {
  tombos: TomboInfo[];
  origemDescricao: string;
  destinoDescricao: string;
  tecnicoNome: string;
  data: string;
}

function layoutBase(titulo: string, conteudo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#F2F2F2;font-family:Inter,Century Gothic,Calibri,sans-serif;color:#333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2F2F2;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:8px;border:1px solid #E0E0E0;">
          <!-- Header -->
          <tr>
            <td style="background-color:#003366;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
              <span style="color:#FFFFFF;font-size:20px;font-weight:bold;letter-spacing:1px;">SIMAP</span>
              <br>
              <span style="color:rgba(255,255,255,0.8);font-size:12px;">Movimentação e Acompanhamento Patrimonial — JFAP</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              ${conteudo}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #E0E0E0;text-align:center;">
              <span style="font-size:11px;color:#666666;">
                Este é um e-mail automático do sistema SIMAP. Não responda a esta mensagem.
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function tabelaTombos(tombos: TomboInfo[]): string {
  const rows = tombos
    .map(
      (t) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #E0E0E0;font-weight:600;">${t.numero}</td><td style="padding:8px 12px;border-bottom:1px solid #E0E0E0;">${t.descricao}</td></tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E0E0E0;border-radius:4px;margin:16px 0;">
    <tr style="background-color:#F2F2F2;">
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666666;font-weight:600;">Nº Tombo</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666666;font-weight:600;">Descrição</th>
    </tr>
    ${rows}
  </table>`;
}

/**
 * E-mail de saída (enviado ao responsável da unidade de ORIGEM)
 * Contém link de confirmação com token.
 */
export function templateEmailSaida(
  dados: MovimentacaoEmailData & { linkConfirmacao: string },
): string {
  const conteudo = `
    <h2 style="margin:0 0 16px;color:#003366;font-size:18px;">Confirmação de Saída de Patrimônios</h2>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">
      Uma movimentação patrimonial foi registrada envolvendo bens sob sua responsabilidade.
      Por favor, confirme a saída dos tombos listados abaixo.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#F2F2F2;border-radius:4px;">
      <tr>
        <td style="padding:12px;">
          <strong style="color:#666666;font-size:12px;">Origem</strong><br>
          <span style="font-size:14px;">${dados.origemDescricao}</span>
        </td>
        <td style="padding:12px;text-align:center;font-size:18px;color:#003366;">→</td>
        <td style="padding:12px;">
          <strong style="color:#666666;font-size:12px;">Destino</strong><br>
          <span style="font-size:14px;">${dados.destinoDescricao}</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:13px;color:#666666;">
      <strong>Técnico:</strong> ${dados.tecnicoNome} &nbsp;|&nbsp; <strong>Data:</strong> ${dados.data}
    </p>

    ${tabelaTombos(dados.tombos)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${dados.linkConfirmacao}" style="display:inline-block;background-color:#003366;color:#FFFFFF;font-weight:600;font-size:14px;padding:12px 32px;border-radius:6px;text-decoration:none;">
            Confirmar Saída
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#666666;text-align:center;">
      Este link expira em ${process.env.TOKEN_EXPIRY_DAYS ?? "7"} dias. Caso não reconheça esta movimentação, entre em contato com a SEMAP.
    </p>`;

  return layoutBase(
    "Movimentação Patrimonial - Confirmação de Saída",
    conteudo,
  );
}

/**
 * E-mail de entrada (enviado ao responsável da unidade de DESTINO)
 * Informativo, sem link de confirmação.
 */
export function templateEmailEntrada(dados: MovimentacaoEmailData): string {
  const conteudo = `
    <h2 style="margin:0 0 16px;color:#003366;font-size:18px;">Entrada de Patrimônios</h2>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">
      Informamos que os seguintes bens patrimoniais foram movimentados para sua unidade.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#F2F2F2;border-radius:4px;">
      <tr>
        <td style="padding:12px;">
          <strong style="color:#666666;font-size:12px;">Origem</strong><br>
          <span style="font-size:14px;">${dados.origemDescricao}</span>
        </td>
        <td style="padding:12px;text-align:center;font-size:18px;color:#003366;">→</td>
        <td style="padding:12px;">
          <strong style="color:#666666;font-size:12px;">Destino</strong><br>
          <span style="font-size:14px;">${dados.destinoDescricao}</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:13px;color:#666666;">
      <strong>Técnico:</strong> ${dados.tecnicoNome} &nbsp;|&nbsp; <strong>Data:</strong> ${dados.data}
    </p>

    ${tabelaTombos(dados.tombos)}

    <p style="margin:16px 0 0;font-size:13px;color:#666666;">
      Nenhuma ação é necessária da sua parte. Os bens serão registrados no SICAM pela SEMAP.
    </p>`;

  return layoutBase("Movimentação Patrimonial - Entrada de Tombos", conteudo);
}
