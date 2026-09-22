import type { Role, Session } from "@/types";

import { request } from "@/lib/http";

/**
 * Fronteira única entre as telas e o transporte de dados, a mesma convenção do
 * painel. A tela não sabe que existe HTTP, e não soube quando isto era mock.
 */

/**
 * O `TokenResponse` do servidor, como ele vem.
 *
 * Declarado aqui e não em `@/types` de propósito: é o formato do transporte, e só
 * este arquivo o vê. O que atravessa para as telas é `Session`, e a tradução entre
 * os dois mora numa função só, logo abaixo.
 */
interface TokenResponse {
  accessToken: string;
  expiresInSeconds: number;
  scope: string;
  mustChangePassword: boolean;
  refreshToken: string;
  user: { id: string; tenantId: string; name: string; email: string; role: string };
  /** ⚠️ Nulo no login de plataforma. Aqui nunca deveria ser, e a tradução recusa. */
  tenant: { id: string; name: string; slug: string; plan: string; status: string } | null;
}

/**
 * ⚠️ O servidor devolve `expiresInSeconds`, e a `Session` guarda `expiresAt`.
 *
 * A conversão é feita aqui, no instante em que a resposta chega, porque duração só
 * significa alguma coisa junto do momento em que foi emitida. Guardar a duração crua
 * e somar depois daria um vencimento errado toda vez que o app ficasse parado.
 */
function paraSessao(resposta: TokenResponse): Session {
  if (!resposta.tenant) {
    throw new Error("Esta conta não pertence a uma transportadora.");
  }

  return {
    user: { ...resposta.user, role: resposta.user.role as Role },
    tenant: resposta.tenant,
    accessToken: resposta.accessToken,
    expiresAt: new Date(Date.now() + resposta.expiresInSeconds * 1000).toISOString(),
    refreshToken: resposta.refreshToken,
    mustChangePassword: resposta.mustChangePassword,
  };
}

/**
 * ⚠️ O `tenantSlug` não é opcional aqui, e é isso que diferencia o app do painel.
 *
 * O navegador manda `Origin` e o servidor descobre a empresa por ele; o `fetch`
 * nativo não manda, e sem o slug o login cairia na empresa padrão configurada, o
 * que faria o motorista de uma transportadora entrar no schema de outra.
 */
export function login(tenantSlug: string, email: string, password: string): Promise<Session> {
  return request<TokenResponse>("/v1/auth/login", {
    method: "POST",
    publica: true,
    body: { tenantSlug, email, password },
  }).then(paraSessao);
}

/**
 * Renova a sessão.
 *
 * ⚠️ Não use direto: quem chama é a renovação em voo único de `src/lib/http.ts`. O
 * servidor **rotaciona** o refresh a cada uso, então duas chamadas em paralelo fazem
 * a segunda invalidar o token que a primeira acabou de emitir.
 */
export function refresh(refreshToken: string): Promise<Session> {
  return request<TokenResponse>("/v1/auth/refresh", {
    method: "POST",
    publica: true,
    body: { refreshToken },
  }).then(paraSessao);
}

/**
 * Troca a senha provisória pela do motorista.
 *
 * ⚠️ Devolve uma sessão **inteira** nova, e ela substitui a anterior no store. A
 * obrigação de trocar viaja dentro do token, então guardar só o access token novo
 * deixaria o app achando que ainda precisa trocar. O servidor também derruba todas
 * as outras sessões da conta, que é como a senha provisória morre de verdade.
 */
export function changePassword(currentPassword: string, newPassword: string): Promise<Session> {
  return request<TokenResponse>("/v1/auth/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  }).then(paraSessao);
}

/** Revoga o refresh no servidor. O access token já emitido segue válido até vencer. */
export function logout(refreshToken: string): Promise<void> {
  return request<void>("/v1/auth/logout", {
    method: "POST",
    publica: true,
    body: { refreshToken },
  });
}
