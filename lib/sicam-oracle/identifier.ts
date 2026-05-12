// Validação de identificadores Oracle (nomes de tabela/owner) antes de interpolar
// em SQL. Bind variables não podem ser usadas para nomes de objeto, então qualquer
// valor que termine como texto literal no SQL passa por aqui.

const ORACLE_IDENTIFIER_REGEX = /^[A-Z0-9_$#]+$/;

export function assertSafeOracleIdentifier(
  value: string,
  label: string,
): string {
  const up = value.toUpperCase();
  if (!ORACLE_IDENTIFIER_REGEX.test(up) || up.length > 128) {
    throw new Error(`${label} inválido: "${value}"`);
  }
  return up;
}

export function isSafeOracleIdentifier(value: string): boolean {
  const up = value.toUpperCase();
  return ORACLE_IDENTIFIER_REGEX.test(up) && up.length <= 128;
}
