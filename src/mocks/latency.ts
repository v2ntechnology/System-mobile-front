/** Simula latência de rede — em campo a conexão é pior, por isso o piso é maior que o do painel. */
export function delay(ms = 900): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * O `ApiError` mudou de casa em 22/09/2026 e agora mora em `@/lib/api-error`.
 *
 * Erro deixou de ser coisa de mock quando o app ganhou HTTP de verdade. A reexportação
 * fica aqui para os mocks que sobreviveram continuarem valendo sem edição, e existe
 * uma classe só: dois `ApiError` com o mesmo nome e formas diferentes fariam o
 * `instanceof` do cliente HTTP falhar exatamente no erro que veio do mock.
 */
export { ApiError } from "@/lib/api-error";
