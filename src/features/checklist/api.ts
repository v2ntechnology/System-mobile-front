import type {
  ChecklistAttachmentKind,
  DriverChecklistDraft,
  DriverChecklistReceipt,
  DriverChecklistSection,
  DriverChecklistSubmission,
  DriverChecklistTemplate,
  DriverChecklistUploadTarget,
  DriverTranscription,
} from "@/types";

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
 * Abre o checklist do caminhão assumido.
 *
 * ⚠️ Cria o rascunho E devolve o modelo na mesma resposta, de propósito. Abrir o
 * formulário é uma ação só, e no 3G do pátio uma segunda ida à rede antes da
 * primeira pergunta é espera visível. Tocar duas vezes devolve o mesmo rascunho.
 */
export async function startChecklist(): Promise<DriverChecklistDraft> {
  const resposta = await request<{
    id: string;
    modelo: ModeloDoServidor;
    placa: string;
    odometroDoVinculo: number | null;
  }>("/v1/checklist/start", { method: "POST" });

  return {
    id: resposta.id,
    modelo: agrupar(resposta.modelo),
    placa: resposta.placa,
    odometroDoVinculo: resposta.odometroDoVinculo ?? undefined,
  };
}

/**
 * Fecha o checklist.
 *
 * ⚠️ Não recebe o id do rascunho, e isso não é esquecimento: o servidor o resolve
 * pelo motorista do token. Mandar o id daqui seria oferecer um campo para alguém
 * assinar o checklist de outra pessoa.
 */
export function submitChecklist(
  submission: DriverChecklistSubmission,
): Promise<DriverChecklistReceipt> {
  return request<DriverChecklistReceipt>("/v1/checklist/submit", {
    method: "POST",
    body: submission,
  });
}

/* -------------------------------------------------------------------------- */
/* Anexos: pedir, subir, confirmar                                             */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ O ARQUIVO NÃO SOBE PELA NOSSA API.
 *
 * O servidor autoriza e devolve uma URL assinada curta; o aparelho faz o PUT direto
 * no object storage; e só então confirma. Mandar o arquivo pela API faria toda foto
 * de celular atravessar o servidor duas vezes, com a memória dele no meio.
 *
 * Os três passos vivem juntos em {@link anexar}, porque separá-los na tela seria
 * oferecer três formas de esquecer o terceiro.
 */
async function autorizarUpload(
  itemId: string,
  kind: ChecklistAttachmentKind,
  contentType: string,
  filename?: string,
): Promise<DriverChecklistUploadTarget> {
  return request<DriverChecklistUploadTarget>("/v1/checklist/attachments/upload-url", {
    method: "POST",
    body: { itemId, kind, contentType, filename },
  });
}

/**
 * Sobe o arquivo e confirma.
 *
 * @returns o id do anexo, que é o que a tela guarda. ⚠️ Nunca a URL: ela vence.
 */
export async function anexar(
  itemId: string,
  kind: ChecklistAttachmentKind,
  arquivo: { uri: string; contentType: string; filename?: string },
): Promise<string> {
  const alvo = await autorizarUpload(itemId, kind, arquivo.contentType, arquivo.filename);

  /*
   * ⚠️ `fetch` direto, e não o `request` do app: esta chamada NÃO vai para a nossa
   * API. Mandar o `Authorization` do motorista para o storage vazaria o token para
   * fora do nosso domínio, e a URL assinada já é a autorização desta operação.
   *
   * ⚠️ O `Content-Type` é o que o servidor devolveu, e não o que achamos: ele entra
   * na assinatura, e qualquer outro faz o storage recusar com um 403 que parece
   * problema de credencial.
   */
  const corpo = await (await fetch(arquivo.uri)).blob();
  const resposta = await fetch(alvo.url, {
    method: "PUT",
    headers: { "Content-Type": alvo.requiredContentType },
    body: corpo,
  });

  if (!resposta.ok) {
    throw new Error("Não deu para enviar o arquivo. Tente de novo.");
  }

  await request("/v1/checklist/attachments/confirm", {
    method: "POST",
    body: { attachmentId: alvo.id },
  });

  return alvo.id;
}

/**
 * Apaga um anexo.
 *
 * ⚠️ `POST .../delete`, e não `DELETE`. Entre o aparelho e o servidor há Cloudflare
 * e Caddy, e intermediário pode descartar o corpo de um DELETE: a chamada
 * responderia bem e o anexo continuaria lá, porque o id nunca chegou.
 */
export function apagarAnexo(attachmentId: string): Promise<void> {
  return request<void>("/v1/checklist/attachments/delete", {
    method: "POST",
    body: { attachmentId },
  });
}

/* -------------------------------------------------------------------------- */
/* Observação falada                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Transcreve o que o motorista falou.
 *
 * ⚠️ **Escrever é a barreira, não ler.** Boa parte dos motoristas não escreve, e
 * digitar no celular é o que trava o campo de observação. O texto transcrito volta
 * para a tela e é ele que o motorista confere antes de enviar.
 *
 * ⚠️ Esta chamada pode responder 503 em três casos previstos (sem provedor, teto
 * mensal atingido, falha do provedor), e nos três a saída é digitar. **O teclado
 * nunca pode sumir da tela**: item crítico sem descrição não pode ser enviado.
 */
export async function transcrever(audio: {
  uri: string;
  contentType: string;
}): Promise<DriverTranscription> {
  const bytes = await (await fetch(audio.uri)).blob();

  return request<DriverTranscription>("/v1/checklist/dictate", {
    method: "POST",
    headers: { "Content-Type": audio.contentType },
    body: bytes,
  });
}
