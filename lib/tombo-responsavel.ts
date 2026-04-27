/** Nome para exibição: cadastro SIMAP ou snapshot SICAM. */
export function nomeResponsavelExibicao(tombo: {
  usuarioResponsavel?: { nome: string } | null;
  nomeResponsavel?: string | null;
}): string | null {
  return tombo.usuarioResponsavel?.nome ?? tombo.nomeResponsavel ?? null;
}
