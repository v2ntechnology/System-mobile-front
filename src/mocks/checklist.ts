import type {
  DriverChecklistReceipt,
  DriverChecklistSubmission,
  DriverChecklistTemplate,
} from "@/types";

import { journeyState } from "./journey";
import { ApiError, delay } from "./latency";

/** ⚠️ Template fictício, no espírito do checklist pré-viagem de carreta (RF-016). */
const TEMPLATE: DriverChecklistTemplate = {
  id: "tpl-preview-carreta",
  name: "Pré-viagem — Carreta",
  version: 4,
  sections: [
    {
      title: "Documentação",
      items: [
        {
          id: "doc-crlv",
          label: "CRLV do cavalo e do reboque",
          blocking: true,
          requiresPhotoOnFail: false,
        },
        {
          id: "doc-cnh",
          label: "CNH dentro da validade",
          blocking: true,
          requiresPhotoOnFail: false,
        },
      ],
    },
    {
      title: "Segurança",
      items: [
        {
          id: "seg-freio",
          label: "Freios e sistema pneumático",
          hint: "Teste de estanqueidade e curso do pedal",
          blocking: true,
          requiresPhotoOnFail: true,
        },
        {
          id: "seg-pneus",
          label: "Pneus e estepe",
          hint: "Sulco, calibragem e parafusos",
          blocking: true,
          requiresPhotoOnFail: true,
        },
        {
          id: "seg-luzes",
          label: "Faróis, setas e luz de freio",
          blocking: true,
          requiresPhotoOnFail: true,
        },
        {
          id: "seg-extintor",
          label: "Extintor no prazo",
          blocking: false,
          requiresPhotoOnFail: false,
        },
      ],
    },
    {
      title: "Carga",
      items: [
        { id: "car-amarr", label: "Amarração e cintas", blocking: true, requiresPhotoOnFail: true },
        { id: "car-lona", label: "Lona e lacres", blocking: false, requiresPhotoOnFail: true },
      ],
    },
    {
      title: "Cabine",
      items: [
        {
          id: "cab-limpa",
          label: "Limpeza e organização",
          blocking: false,
          requiresPhotoOnFail: false,
        },
        {
          id: "cab-tacog",
          label: "Tacógrafo funcionando",
          blocking: false,
          requiresPhotoOnFail: false,
        },
      ],
    },
  ],
};

const BLOCKING_ITEMS = new Set(
  TEMPLATE.sections.flatMap((section) =>
    section.items.filter((item) => item.blocking).map((item) => item.id),
  ),
);

/** Substituto do `GET /v1/driver/checklist/template`. */
export async function mockChecklistTemplate(): Promise<DriverChecklistTemplate> {
  await delay(600);
  return TEMPLATE;
}

/**
 * Substituto do `POST /v1/driver/checklist`.
 *
 * RN-054 — o `filledAt` do aparelho vai junto, mas quem carimba o recebimento é
 * o servidor: divergência acima de 6h vira flag de auditoria no painel.
 */
export async function mockSubmitChecklist(
  submission: DriverChecklistSubmission,
): Promise<DriverChecklistReceipt> {
  await delay(1200);

  const answered = new Set(submission.answers.map((answer) => answer.itemId));
  const total = TEMPLATE.sections.reduce((sum, section) => sum + section.items.length, 0);
  if (answered.size < total) {
    throw new ApiError(422, "Checklist incompleto", "Responda todos os itens antes de enviar.");
  }

  const failures = submission.answers.filter((answer) => answer.result === "REPROVADO");
  const blocking = failures.some((answer) => BLOCKING_ITEMS.has(answer.itemId));

  journeyState.checklistSentToday = true;
  journeyState.blocked = blocking;

  return {
    id: `chk-${Date.now()}`,
    result: failures.length > 0 ? "REPROVADO" : "APROVADO",
    blocking,
    receivedAt: new Date().toISOString(),
    message: blocking
      ? "Item crítico reprovado. O veículo está bloqueado para saída e a manutenção já foi avisada."
      : failures.length > 0
        ? "Checklist enviado com ressalvas. A manutenção vai avaliar os itens reprovados."
        : "Checklist aprovado. Boa viagem.",
  };
}
