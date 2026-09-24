import Constants from "expo-constants";

import { ApiError, problemDetailsParaErro } from "@/lib/api-error";

/**
 * A fronteira de rede do app.
 *
 * Só `src/features/<nome>/api.ts` chama daqui. Tela nenhuma importa este arquivo,
 * pela mesma razão que tela nenhuma importa `src/mocks`: a fronteira é o `api.ts`
 * da feature, e ela continua exatamente onde estava quando tudo era simulado.
 *
 * ⚠️ O app fala **somente com o BFF** (`System-mobile-back`), nunca direto com o
 * `Backend-web`. É o BFF que repassa o JWT, agrega a home numa chamada só e divide
 * o multipart do checklist em fotos mais JSON.
 */

/**
 * Endereço do BFF.
 *
 * A variável de ambiente é lida uma única vez pelo `app.config.js`, que a grava em
 * `extra.apiBaseUrl` na configuração que acompanha a build. Não a lemos direto
 * aqui: o carregamento de `.env` do Expo durante o bundling pode divergir do
 * ambiente usado para avaliar o `app.config.js` e acabar embutindo outra URL.
 */
function baseUrl(): string {
  const doApp = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof doApp === "string" && doApp) return doApp.replace(/\/+$/, "");

  /*
   * ⚠️ `localhost` não é o computador, é o próprio aparelho. Num celular de verdade
   * este padrão nunca alcança nada, e isso é melhor que um endereço de produção
   * escondido no código: quem for rodar em aparelho precisa apontar a variável para
   * o IP da máquina na rede, e a falha diz isso na hora.
   */
  return "http://localhost:8090";
}

/**
 * Como o token entra na requisição.
 *
 * Injetado aqui, e lido de `useAuthStore.getState()` **fora do React**: quem chama é
 * `api.ts`, que não é componente e não pode usar hook. Deixar cada chamada passar o
 * token seria a mesma decisão repetida em dezenas de lugares, e bastaria um esquecer.
 *
 * O import é dinâmico para quebrar o ciclo: a store importa `@/lib/storage`, e o
 * `api.ts` de auth importa este arquivo.
 */
async function autorizacao(): Promise<Record<string, string>> {
  const { useAuthStore } = await import("@/features/auth/store");
  const token = useAuthStore.getState().session?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Opcoes extends Omit<RequestInit, "body"> {
  /**
   * Objeto vira JSON. `FormData` e binário cru passam intactos (ver abaixo).
   *
   * ⚠️ Binário cru existe por causa do áudio ditado: o corpo é um arquivo só, sem
   * campo nenhum junto, e o `Content-Type` do pedido já diz o formato. Multipart
   * acrescentaria uma camada de fronteira para transportar exatamente a mesma coisa.
   */
  body?: unknown;
  /** Rota pública: não injeta token e não tenta renovar em 401. Login e refresh. */
  publica?: boolean;
}

export async function request<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  try {
    return await enviar<T>(caminho, opcoes);
  } catch (erro) {
    if (!(erro instanceof ApiError) || erro.status !== 401 || opcoes.publica) throw erro;

    /*
     * 401 é o access token vencido, e ele vence a cada 60 minutos: o motorista não
     * pode ser mandado para o login por isso. Renova uma vez e repete a chamada.
     * Falhando a renovação, aí sim a sessão acabou de verdade.
     */
    await renovarSessao();
    return await enviar<T>(caminho, opcoes);
  }
}

/**
 * Renovação em voo único.
 *
 * ⚠️ Sem a promessa compartilhada, as quatro chamadas que a home dispara juntas
 * levariam 401 juntas e renovariam quatro vezes. Como o servidor **rotaciona** o
 * refresh a cada uso, a segunda renovação invalidaria o token que a primeira acabou
 * de emitir, e o motorista cairia no login com a sessão perfeitamente válida.
 */
let renovacaoEmVoo: Promise<void> | null = null;

function renovarSessao(): Promise<void> {
  renovacaoEmVoo ??= (async () => {
    const { useAuthStore } = await import("@/features/auth/store");
    const refreshToken = useAuthStore.getState().session?.refreshToken;

    try {
      if (!refreshToken) throw new ApiError(401, "Sessão expirada");

      const { refresh } = await import("@/features/auth/api");
      useAuthStore.getState().setSession(await refresh(refreshToken));
    } catch (erro) {
      useAuthStore.getState().clearSession();
      throw erro;
    } finally {
      renovacaoEmVoo = null;
    }
  })();

  return renovacaoEmVoo;
}

async function enviar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { body, publica, headers, ...resto } = opcoes;
  const ehFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const ehBinario =
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body as ArrayBufferView);

  const cabecalhos: Record<string, string> = {
    Accept: "application/json",
    ...(publica ? {} : await autorizacao()),
    ...((headers as Record<string, string>) ?? {}),
  };

  /*
   * ⚠️ `FormData` NÃO leva `Content-Type` escrito por nós. O runtime precisa gerar o
   * cabeçalho com o `boundary`, e escrever `multipart/form-data` na mão produz um
   * corpo que o servidor não consegue separar, com erro que aponta para o servidor.
   */
  /*
   * ⚠️ Binário cru também fica de fora: o `Content-Type` dele é quem chama que sabe
   * ("audio/webm;codecs=opus", "audio/mp4"), e sobrescrever com JSON aqui faria o
   * servidor tentar ler bytes de áudio como objeto.
   */
  if (body !== undefined && !ehFormData && !ehBinario) {
    cabecalhos["Content-Type"] = "application/json";
  }

  const resposta = await fetch(`${baseUrl()}${caminho}`, {
    ...resto,
    headers: cabecalhos,
    body:
      body === undefined
        ? undefined
        : ehFormData || ehBinario
          ? (body as BodyInit)
          : JSON.stringify(body),
  });

  if (resposta.ok) {
    return (resposta.status === 204 ? undefined : await resposta.json()) as T;
  }

  throw problemDetailsParaErro(resposta.status, await corpoDeErro(resposta));
}

/** Resposta de erro sem JSON acontece (proxy fora do ar, 502): o status ainda vale. */
async function corpoDeErro(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}

export { ApiError };
