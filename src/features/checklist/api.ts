import type {
  DriverChecklistReceipt,
  DriverChecklistSection,
  DriverChecklistSubmission,
  DriverChecklistTemplate,
} from "@/types";

import { mockSubmitChecklist } from "@/mocks/checklist";
import { request } from "@/lib/http";

/**
 * Fronteira entre as telas e o transporte. A tela não sabe que existe HTTP.
 */

/**
 * O modelo como o servidor o entrega: itens PLANOS, cada um com a sua seção.
 *
 * ⚠️ Formato diferente do `DriverChecklistTemplate` que as telas usam, e de propósito.
 * No banco a seção é um texto no item, porque ela não tem comportamento nenhum: só
 * agrupa na tela. Uma tabela de seções daria a ela uma identidade que ela não tem, e
 * a ordem já vem do `position` do item.
 *
 * O agrupamento acontece aqui, na fronteira, que é onde a tradução de formato mora.
 */
interface ModeloDoServidor {
  id: string;
  vehicleType: string;
  name: string;
  version: number;
  itens: {
    id: string;
    section: string;
    label: string;
    hint: string | null;
    blocking: boolean;
    requiresPhotoOnFail: boolean;
    position: number;
  }[];
}

/**
 * ⚠️ Agrupa preservando a ordem de chegada, e nunca ordena as seções por nome.
 *
 * O servidor já entrega por `position`, e essa ordem é a do trabalho: documento antes
 * de freio, freio antes de carga. Reordenar alfabeticamente poria "Cabine" antes de
 * "Documentação" e mandaria o motorista andar em volta do caminhão em ziguezague.
 */
function agrupar(modelo: ModeloDoServidor): DriverChecklistTemplate {
  const secoes: DriverChecklistSection[] = [];

  for (const item of modelo.itens) {
    let secao = secoes.find((s) => s.title === item.section);
    if (!secao) {
      secao = { title: item.section, items: [] };
      secoes.push(secao);
    }
    secao.items.push({
      id: item.id,
      label: item.label,
      hint: item.hint ?? undefined,
      blocking: item.blocking,
      requiresPhotoOnFail: item.requiresPhotoOnFail,
    });
  }

  return { id: modelo.id, name: modelo.name, version: modelo.version, sections: secoes };
}

/**
 * O checklist do caminhão que o motorista assumiu.
 *
 * ⚠️ Não recebe parâmetro nenhum, e isso é o fluxo: o veículo vem do vínculo aberto e
 * o modelo vem do tipo dele, resolvidos no servidor. Sem vínculo o servidor responde
 * 409, que a tela traduz em "escaneie o QR do caminhão".
 */
export async function getTemplate(): Promise<DriverChecklistTemplate> {
  return agrupar(await request<ModeloDoServidor>("/v1/checklist/template"));
}

/**
 * ⚠️ AINDA MOCK. O envio real entra na próxima fatia, junto com as fotos, a
 * idempotência e o travamento do caminhão por item crítico reprovado.
 */
export function submitChecklist(
  submission: DriverChecklistSubmission,
): Promise<DriverChecklistReceipt> {
  return mockSubmitChecklist(submission);
}
