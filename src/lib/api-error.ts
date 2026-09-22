/**
 * Erro no padrão RFC 9457 (Problem Details), a mesma forma que o servidor fala.
 *
 * ⚠️ Morava em `src/mocks/latency.ts` e subiu para cá em 22/09/2026, quando o app
 * passou a ter HTTP de verdade: erro deixou de ser coisa de mock. O arquivo antigo
 * reexporta esta classe, então os mocks que sobreviveram continuam valendo, e não
 * existem duas classes `ApiError` com o mesmo nome e formas diferentes.
 *
 * O servidor liga o `problemdetails` do Spring de propósito, para o corpo de um 409
 * carregar a frase que resolve em vez do código: "já existe um motorista cadastrado
 * com este CPF" vale, e "erro na requisição (409)" não vale nada para alguém em pé
 * no pátio, de luva, sem ter a quem perguntar. É por isso que `detail` é o que a
 * tela mostra, e `title` é só o fallback.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
    /**
     * O `type` do Problem Details, quando o servidor manda um. É por ele que a tela
     * reconhece um caso específico sem depender da frase, que muda.
     *
     * O caso vivo é `urn:rookhub:vinculo-ocupado`: o 409 de escanear um caminhão que
     * ainda está com outro motorista.
     */
    readonly type?: string,
    /**
     * As propriedades extras do Problem Details, fora dos campos padrão.
     *
     * ⚠️ É aqui que chegam `motoristaAtual` e `desde` do vínculo ocupado, e é com os
     * dois que a folha de confirmação se monta. Sem este campo a tela precisaria de
     * uma segunda chamada para descobrir quem está com o caminhão.
     */
    readonly extras?: Record<string, unknown>,
  ) {
    super(detail ?? title);
    this.name = "ApiError";
  }
}

/** Campos do Problem Details que já têm lugar próprio e não devem ir para `extras`. */
const CAMPOS_PADRAO = new Set(["type", "title", "status", "detail", "instance"]);

/**
 * Monta o `ApiError` a partir do corpo que o servidor devolveu.
 *
 * Aceita corpo ausente ou ilegível: resposta de erro sem JSON acontece (proxy fora do
 * ar, 502 do Caddy), e nesses casos o status ainda é a informação mais útil que temos.
 */
export function problemDetailsParaErro(status: number, corpo: unknown): ApiError {
  if (typeof corpo !== "object" || corpo === null) {
    return new ApiError(status, "Não foi possível completar a ação");
  }

  const problema = corpo as Record<string, unknown>;
  const extras: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(problema)) {
    if (!CAMPOS_PADRAO.has(chave)) {
      extras[chave] = valor;
    }
  }

  return new ApiError(
    typeof problema.status === "number" ? problema.status : status,
    typeof problema.title === "string" ? problema.title : "Não foi possível completar a ação",
    typeof problema.detail === "string" ? problema.detail : undefined,
    typeof problema.type === "string" && problema.type !== "about:blank"
      ? problema.type
      : undefined,
    Object.keys(extras).length > 0 ? extras : undefined,
  );
}
