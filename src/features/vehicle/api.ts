import type { VehicleBinding, VehicleTakeover } from "@/types";

import { ApiError } from "@/lib/api-error";
import { request } from "@/lib/http";

/**
 * O vínculo do motorista com o caminhão.
 *
 * Fronteira única entre as telas e o transporte, a mesma convenção das outras
 * features. A tela não sabe que existe HTTP.
 */

/**
 * Abre o vínculo com o que a câmera leu.
 *
 * ⚠️ Quando o caminhão está com outro motorista e `confirmTakeover` é falso, isto
 * **lança** um `ApiError` com `type === TIPO_OCUPADO`. Não é falha: é a pergunta que
 * a tela precisa fazer. Quem chama trata esse caso mostrando a confirmação, e só
 * chama de novo com `confirmTakeover: true` se o motorista confirmar.
 */
export function bindByQr(
  qrToken: string,
  opcoes: { confirmTakeover?: boolean; odometerKm?: number } = {},
): Promise<VehicleBinding> {
  return request<VehicleBinding>("/v1/vehicle-bindings", {
    method: "POST",
    body: {
      qrToken,
      /*
       * ⚠️ Os dois campos vão SEMPRE, mesmo indefinidos. O servidor usa Jackson 3,
       * onde `FAIL_ON_NULL_FOR_PRIMITIVES` é padrão: campo ausente que lá é
       * primitivo responde 400 "Failed to read request", sem dizer qual faltou.
       * O lado do servidor foi corrigido para aceitar a ausência, e mandar assim
       * mesmo custa nada e sobrevive a alguém reintroduzir o primitivo.
       */
      confirmTakeover: opcoes.confirmTakeover ?? false,
      odometerKm: opcoes.odometerKm ?? null,
    },
  });
}

/**
 * O caminhão de agora, ou `null` quando o motorista ainda não escaneou nenhum.
 *
 * ⚠️ `null` é estado normal, e não erro: é assim que o app abre no começo do turno.
 * O servidor responde 204, que o cliente HTTP entrega como `undefined`.
 */
export async function currentBinding(): Promise<VehicleBinding | null> {
  return (await request<VehicleBinding | undefined>("/v1/vehicle-bindings/current")) ?? null;
}

/** Fim de turno. Depois disto o checklist volta a ficar indisponível. */
export function unbind(): Promise<void> {
  return request<void>("/v1/vehicle-bindings/current", { method: "DELETE" });
}

/** O `type` do Problem Details que o servidor usa para "caminhão ocupado". */
export const TIPO_OCUPADO = "urn:rookhub:vinculo-ocupado";

/**
 * Lê os dados da tomada de dentro do erro, se for esse o caso.
 *
 * ⚠️ Compara o `type`, e nunca a frase: mensagem muda com revisão de texto, e um
 * `if` em cima da string quebraria sem nada falhar.
 */
export function tomadaPendente(erro: unknown): VehicleTakeover | null {
  if (!(erro instanceof ApiError) || erro.type !== TIPO_OCUPADO) return null;

  const extras = erro.extras;
  if (!extras) return null;

  return {
    motoristaAtual: String(extras.motoristaAtual ?? "outro motorista"),
    desde: String(extras.desde ?? ""),
    placa: String(extras.placa ?? ""),
  };
}
