/**
 * Contratos de domínio do app do motorista.
 *
 * Escritos à mão APENAS enquanto não existe backend. Quando o servidor expuser o
 * OpenAPI 3.1 (BE-04), o cliente e os tipos passam a ser gerados e este arquivo
 * fica restrito ao que for puramente de frontend.
 *
 * ⚠️ Este é um **recorte** do domínio, não o domínio inteiro: o painel de gestão
 * (projeto `System-web`) tem a sua própria cópia, com as ~130 estruturas de
 * frota, custos, manutenção e segurança que o motorista nunca vê. Os dois lados
 * falam com o mesmo servidor, então o que existir nos dois — `Session`, `Trip`,
 * `Driver`, `FuelingRecord` — precisa ter **a mesma forma**. Mudança de campo
 * aqui é mudança de contrato: espelhar lá, na mão.
 */

/* -------------------------------------------------------------------------- */
/* Veículo e vínculo                                                          */
/* -------------------------------------------------------------------------- */

/** Tipo do veículo, como o cadastro da frota o classifica. Decide o checklist. */
export type VehicleType = "truck" | "tractor_unit" | "trailer" | "van" | "light";

export interface Vehicle {
  id: string;
  plate: string;
  /** Número de frota, quando a transportadora usa. Costuma vir vazio. */
  fleetNumber?: string | null;
  type: VehicleType;
  model?: string | null;
}

/**
 * O caminhão que o motorista está dirigindo agora.
 *
 * ⚠️ Não é cadastro nem preferência: é o turno em curso, aberto ao escanear o QR do
 * adesivo e fechado ao encerrar, ao trocar de caminhão ou quando outro motorista
 * assume. O histórico fica no servidor, e é dele que o gestor lê o rodízio.
 *
 * Nada no app funciona sem isto: o checklist só é liberado para o veículo vinculado.
 */
export interface VehicleBinding {
  id: string;
  veiculo: Vehicle;
  driverId: string;
  driverName: string;
  abertoEm: string;
  odometroKm?: number | null;
}

/**
 * O que o 409 de caminhão ocupado carrega, nas propriedades do Problem Details.
 *
 * ⚠️ Vem no próprio erro de propósito. Sem estes campos a folha de confirmação
 * precisaria de uma segunda chamada, que no 3G do pátio é mais uma espera antes de
 * uma decisão que o motorista já quer tomar.
 */
export interface VehicleTakeover {
  motoristaAtual: string;
  desde: string;
  placa: string;
}

/* -------------------------------------------------------------------------- */
/* Identidade e sessão                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Papéis de usuário (RF-003).
 *
 * `DRIVER` é o único que entra neste app; os demais entram no painel. Todos
 * moram no mesmo union porque a autorização é do backend e o token é o mesmo —
 * separar o tipo daria a impressão de dois sistemas de identidade, que não é o
 * caso.
 */
export type Role = "OWNER" | "MANAGER" | "OPERATOR" | "MAINTENANCE" | "SUPER_ADMIN" | "DRIVER";

/**
 * A empresa, exatamente como o `TenantSummary` do servidor a entrega.
 *
 * ⚠️ O `slug` é o código que o motorista digita no campo "Empresa" do login, e é o
 * mesmo que vai no e-mail de primeiro acesso. Guardado depois do primeiro login para
 * o campo sumir das próximas vezes.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
}

/**
 * A conta, exatamente como o `UserSummary` do servidor a entrega.
 *
 * ⚠️ Em 22/09/2026 saíram daqui `modules`, `operatorSeesFinancials`, `mfaEnabled`,
 * `avatarUrl` e `driverId`. Eles vinham do desenho anterior ao contrato real e nunca
 * tiveram origem: só o mock os preenchia, e nenhuma tela chegou a lê-los. Manter
 * campo que o servidor não manda cria a ilusão de um gate que não existe.
 *
 * O `driverId` em especial não faz falta: quem resolve o motorista a partir da conta
 * é o servidor, dentro do vínculo e da submissão do checklist. O app nunca precisa
 * mandá-lo, e mandar seria dar ao aparelho a escolha de qual motorista ele é.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
}

export interface Session {
  user: User;
  tenant: Tenant;
  /** JWT de acesso, com validade de 60 min. Renovado pelo `refreshToken`. */
  accessToken: string;
  expiresAt: string;
  /**
   * O refresh, que no app vem **no corpo** da resposta e não em cookie.
   *
   * ⚠️ O servidor só o entrega assim para quem manda `X-Rookhub-Client: mobile`, que
   * é o BFF. O painel web continua recebendo cookie `httpOnly`, e lá o campo vem nulo.
   * O motivo: o argumento do `httpOnly` é XSS no DOM, e não há DOM aqui; o análogo
   * correto no aparelho é o keychain, que é onde a store guarda.
   *
   * ⚠️ O servidor **rotaciona** a cada uso: renovar duas vezes em paralelo invalida a
   * sessão. Ver a renovação em voo único em `src/lib/http.ts`.
   */
  refreshToken: string;
  /**
   * Senha provisória ainda não trocada.
   *
   * ⚠️ Enquanto for verdadeiro, **toda** rota da API responde 403 menos trocar senha,
   * ver a sessão, renovar e sair. Por isso o app decide o desvio para
   * `/primeiro-acesso` por este campo, **antes de chamar qualquer outra coisa**:
   * chamar a home primeiro devolveria um 403 vindo de dentro da agregação, e a tela
   * mostraria erro genérico no lugar do caminho de saída.
   */
  mustChangePassword: boolean;
}

/* -------------------------------------------------------------------------- */
/* Viagens (RF-011)                                                            */
/* -------------------------------------------------------------------------- */

/** Máquina de estados da viagem (RF-011). A ordem aqui é a ordem do fluxo. */
export type TripStatus =
  "PLANEJADA" | "EM_CARREGAMENTO" | "EM_TRANSITO" | "EM_DESCARGA" | "CONCLUIDA" | "CANCELADA";

export interface TripEvent {
  status: TripStatus;
  at: string;
  note?: string;
}

export interface Trip {
  id: string;
  code: string;
  status: TripStatus;
  origin: string;
  destination: string;
  distanceKm: number;
  driverName: string;
  plate: string;
  cargo: string;
  startedAt: string;
  /** Prazo acordado com o cliente, ISO 8601. */
  dueAt: string;
  /** Conclusão real; ausente enquanto a viagem não terminou. */
  finishedAt?: string;
  /** Progresso 0–100 da distância percorrida. */
  progressPercent: number;
  timeline: TripEvent[];
}

/** Ponto geográfico usado apenas no recorte de rota do aplicativo. */
export interface RoutePoint {
  latitude: number;
  longitude: number;
}

/**
 * Fotografia da rota em andamento retornada junto da home do motorista.
 *
 * O mapa administrativo acompanha toda a frota; aqui chega somente o trecho do
 * motorista autenticado para reduzir consumo de rede e manter o foco da tela.
 */
export interface DriverRouteSnapshot {
  origin: RoutePoint;
  destination: RoutePoint;
  currentPosition: RoutePoint;
  path: RoutePoint[];
  speedKph: number;
  etaMinutes: number;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Motorista                                                                   */
/* -------------------------------------------------------------------------- */

export type DriverStatus = "EM_VIAGEM" | "DISPONIVEL" | "DESCANSO" | "AFASTADO";

export interface Driver {
  id: string;
  name: string;
  avatarUrl?: string;
  status: DriverStatus;
  /** Score de segurança 0–100 (RF-031). */
  score: number;
  /** Variação do score contra o período anterior, em pontos. */
  scoreDelta: number;
  tripsCount: number;
  kmDriven: number;
  criticalEvents: number;
  cnhCategory: string;
  /** Vencimento da CNH, ISO 8601. */
  cnhExpiresAt: string;
  currentVehiclePlate?: string;
}

/** Faixa de premiação configurada pela empresa para o período. */
export interface DriverRewardTier {
  minScore: number;
  amount: number;
}

/**
 * Prévia da premiação variável do motorista.
 *
 * As faixas vêm do backend da empresa; o app apenas explica o valor corrente e
 * qual é o próximo objetivo. Isso evita esconder uma regra financeira na UI.
 */
export interface DriverReward {
  programName: string;
  periodLabel: string;
  estimatedAmount: number;
  maxAmount: number;
  closesAt: string;
  position: number;
  participantCount: number;
  tiers: DriverRewardTier[];
}

/** Parcela parametrizada que compõe o score de segurança. */
export interface DriverScoreFactor {
  id: string;
  label: string;
  description: string;
  score: number;
  weightPercent: number;
}

export type WarningSeverity = "LEVE" | "MEDIA" | "GRAVE";

/**
 * Mídia de um evento de segurança.
 *
 * RN-092 — o RookHub **não armazena vídeo**. Guarda metadados e uma URL assinada
 * que aponta para o fornecedor (Hik-Connect), com expiração máxima de 15 minutos
 * (RNF-022). Por isso a URL é pedida sob demanda, e não vem na listagem.
 */
export interface EventMedia {
  provider: string;
  durationSeconds: number;
  /** Instante do clipe, ISO 8601. */
  recordedAt: string;
  /** Preenchida só quando o usuário pede para assistir. */
  signedUrl?: string;
  expiresAt?: string;
}

export interface DriverWarning {
  id: string;
  title: string;
  description: string;
  severity: WarningSeverity;
  /** Data da advertência, ISO 8601. */
  at: string;
  /** Quem aplicou. */
  issuedBy: string;
  /** Trecho onde ocorreu, quando houver. */
  location?: string;
  vehiclePlate?: string;
  /** Motorista contestou a advertência (RF-029). */
  contested?: boolean;
  media?: EventMedia;
}

export type RoadEventType =
  | "EXCESSO_VELOCIDADE"
  | "FRENAGEM_BRUSCA"
  | "CURVA_AGRESSIVA"
  | "JORNADA_EXCEDIDA"
  | "DISTRACAO"
  | "SONOLENCIA";

export interface RoadEventCount {
  type: RoadEventType;
  label: string;
  count: number;
  /** Variação contra o período anterior, em ocorrências. */
  delta: number;
  /** Efeito consolidado do evento no score atual, já calculado pela empresa. */
  scoreImpact: number;
  /** Orientação curta e acionável para recuperar pontos. */
  guidance: string;
}

/** Ficha completa do motorista — a tela de perfil do app. */
export interface DriverProfile {
  driverId: string;

  /* Pessoais */
  birthDate: string;
  cpfMasked: string;
  phone: string;
  city: string;
  state: string;

  /* Habilitação */
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiresAt: string;
  /** Exerce Atividade Remunerada — obrigatório para motorista profissional. */
  cnhEar: boolean;
  /** Pontos na CNH (0–40 antes da suspensão). */
  cnhPoints: number;

  /* Contrato */
  hiredAt: string;
  role: string;
  /** Salário base mensal. Só chega ao cliente se o papel puder ver (RF-007). */
  monthlySalary?: number;
  contractType: string;

  /* Operação no período */
  avgFuelEfficiency: number;
  onTimeDeliveryRate: number;
  hoursDriven: number;

  /** Evolução do score de segurança. */
  scoreHistory: { month: string; score: number }[];
  scoreFactors: DriverScoreFactor[];
  reward: DriverReward;
  roadEvents: RoadEventCount[];
  warnings: DriverWarning[];
}

/* -------------------------------------------------------------------------- */
/* Abastecimento (RF-022)                                                      */
/* -------------------------------------------------------------------------- */

/** Abastecimento individual, com a marcação de anomalia (RF-022). */
export interface FuelingRecord {
  id: string;
  at: string;
  plate: string;
  driverName: string;
  station: string;
  liters: number;
  pricePerLiter: number;
  total: number;
  /** km/l apurado desde o abastecimento anterior. */
  efficiency: number;
  /**
   * Fora do padrão histórico do veículo. O motivo acompanha porque "anomalia"
   * sem explicação não ajuda ninguém a decidir.
   */
  anomaly?: string;
}

export interface DriverFuelEntryInput {
  plate: string;
  tripId?: string;
  station: string;
  liters: number;
  pricePerLiter: number;
  /** Odômetro no momento do abastecimento — sem ele não há km/l. */
  odometerKm: number;
  at: string;
  receiptPhotoUri?: string;
}

/** Confirmação do abastecimento, já com o km/l apurado pelo servidor. */
export interface DriverFuelEntryReceipt {
  id: string;
  total: number;
  efficiency: number;
  /** Fora do padrão do veículo — texto explicativo, não só um sinalizador. */
  anomaly?: string;
}

/* -------------------------------------------------------------------------- */
/* Checklist pré-viagem (RF-012 a RF-017)                                      */
/* -------------------------------------------------------------------------- */

export type ChecklistResult = "APROVADO" | "REPROVADO";

export interface DriverChecklistItem {
  id: string;
  label: string;
  hint?: string;
  /** Reprovar este item bloqueia a saída do veículo (RF-016). */
  blocking: boolean;
  /** Reprovação exige foto anexada (RN-040). */
  requiresPhotoOnFail: boolean;
}

export interface DriverChecklistSection {
  title: string;
  items: DriverChecklistItem[];
}

export interface DriverChecklistTemplate {
  id: string;
  name: string;
  /**
   * Gravada em cada preenchimento: o template muda, o histórico não.
   *
   * ⚠️ Número, e não texto (era `"v4"` no mock). O servidor compara a versão enviada
   * com a do modelo ativo e recusa submissão de versão velha, que é o caso do
   * motorista que deixou a tela aberta enquanto o gestor publicou a versão 2. Texto
   * livre não se compara, e "v10" viria antes de "v9" em qualquer ordenação.
   */
  version: number;
  sections: DriverChecklistSection[];
}

export interface DriverChecklistAnswer {
  itemId: string;
  result: ChecklistResult;
  note?: string;
  /** URI local da foto no aparelho; o upload é do app, não deste contrato. */
  photoUri?: string;
}

export interface DriverChecklistSubmission {
  templateId: string;
  templateVersion: number;
  plate: string;
  tripId?: string;
  /** Relógio do aparelho (RN-054) — o servidor carimba o dele na chegada. */
  filledAt: string;
  answers: DriverChecklistAnswer[];
}

export interface DriverChecklistReceipt {
  id: string;
  result: ChecklistResult;
  blocking: boolean;
  receivedAt: string;
  /** Mensagem pronta para a tela: o que acontece agora com o veículo. */
  message: string;
}

/* -------------------------------------------------------------------------- */
/* Tela inicial e erros                                                        */
/* -------------------------------------------------------------------------- */

/**
 * O que o motorista vê ao abrir o app.
 *
 * É uma composição de `Trip` e `Driver` recortada pela ótica de quem dirige: uma
 * viagem corrente, o que vem depois e as pendências que travam a saída. No
 * backend isto é um único `GET /v1/driver/home` — o app de campo roda em rede
 * ruim, e três chamadas na abertura custam caro.
 */
export interface DriverHome {
  driver: Driver;
  /** Viagem em andamento; ausente quando o motorista está livre. */
  currentTrip?: Trip;
  nextTrips: Trip[];
  /** RF-016 — checklist do dia ainda não enviado para o veículo atual. */
  checklistPending: boolean;
  /** Bloqueio ativo por checklist reprovado (RN-040): veículo não pode sair. */
  blockedByChecklist: boolean;
  /** Odômetro do último abastecimento — base do km/l do próximo. */
  lastOdometerKm: number;
  cnhExpiresAt: string;
  /** Rota em andamento; ausente quando não há viagem ativa. */
  route?: DriverRouteSnapshot;
  /** Estimativa parametrizada pela empresa para o período corrente. */
  reward: DriverReward;
}

/** Erro no padrão RFC 9457 (Problem Details) — convenção do backend (BE-04). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}
