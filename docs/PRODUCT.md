# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

O app roda em iOS e Android a partir do mesmo código Expo. A linguagem visual é única nas duas
plataformas; o que se adapta são as affordances nativas (safe area, gesto/botão de voltar, feedback
de toque, teclado).

## Users

Motorista de caminhão de uma transportadora rodoviária de carga, cliente da plataforma RookHub.
Usa o app em campo: em pé no pátio antes de sair, dentro da cabine parada, no posto na hora de
abastecer. Muitas vezes de luva, com sol na tela, com pressa e com uma mão só. Não é usuário de
escritório e não tem tempo de aprender interface.

## Product Purpose

RookHub é uma plataforma SaaS que reúne a operação de uma transportadora em um só lugar. Este
repositório entrega a ponta de campo: o app do motorista, para Play Store e App Store.

É o app que fecha o ciclo do dado. O motorista acompanha a viagem e a rota, preenche o checklist
antes de sair e registra o abastecimento com foto do comprovante — é isso que alimenta o custo por
quilômetro, o bloqueio de veículo e o score de segurança que o gestor vê no painel administrativo.
O próprio motorista também entende a composição da nota e a premiação parametrizada pela empresa.
Sucesso é o dado nascer correto na origem, sem papel e sem foto perdida no WhatsApp.

## Positioning

O dado da frota nasce no app do motorista, não é digitado depois por alguém no escritório. O
checklist não é formulário: item crítico reprovado trava a saída do veículo. O abastecimento apura
km/l na hora e explica a anomalia de consumo. Um concorrente que só rastreia veículo não tem essa
ponta.

## Operating Context

- Uso ao ar livre, em pé, sob sol, frequentemente com luva e com uma mão só.
- Conectividade instável em rodovia é a norma da operação.
- Fluxos reais: conferir viagem do dia → checklist pré-viagem → dirigir → abastecer com foto do
  comprovante → registrar chegada.
- O outro lado da plataforma é o painel web (`../System-web`), que consome esses mesmos dados.

## Capabilities and Constraints

- Fase 1 (MVP): app navegável com dados simulados. Sem backend, autenticação real, telemetria real
  ou chamadas a modelos de IA.
- Telas nunca acessam mocks: dependem de `src/features/<nome>/api.ts`. A troca por HTTP na Fase 2
  não pode exigir reescrita de tela.
- Stack fixa: Expo SDK 54, React Native 0.81, React 19, expo-router 6, TypeScript estrito, npm.
- iOS e Android são os produtos. A web existe somente como preview de desenvolvimento do mesmo
  app, dentro da moldura de aparelho; não recebe tela, rota ou regra própria.
- Sessão no keychain do sistema via `expo-secure-store`; a rota inicial só é decidida após
  `useHydrated()`.
- Textos de interface em pt-BR; código, arquivos e pastas em inglês.
- Gates antes de fechar mudança: `npm run validate`, `npm run export:android`, `npm run export:ios`.
- Não há ESLint nem suíte de testes.

## Brand Commitments

- Marca RookHub, com logo versionada em `assets/brand/`.
- Paleta e raios em `src/theme/tokens.ts` são espelho manual da paleta usada no painel web e no
  site institucional. As âncoras são compromisso de marca: grafite `#212121`, papel morno
  `#F4F2EF`, terracota `#D5623A` como primária e marinho `#010066` como secundária.
- O app tem dois esquemas de cor — grafite e papel —, com a escolha seguindo o aparelho e podendo
  ser fixada pelo motorista no Perfil. A tela de login é sempre clara. Decisão do usuário em
  15/08/2026, com a paleta alinhada ao ecossistema em 22/09/2026: o preto de cabine e o acento
  indigo/ciano que valiam antes saíram, e a âncora grafite entrou.
- Referência estrutural vinculante para o redesign: `docs/design-reference/` (protótipo web). Dela
  vêm a arquitetura de tela e os padrões de componente, não as cores.
- Tipografia espelhada do painel: **Sora** em título e **Inter** no resto, por ser neutra e
  desenhada para tela. A Inter foi escolhida pelo usuário em 15/08/2026 e a Sora entrou em
  22/09/2026, junto com o alinhamento de paleta. Métrica fica na Inter, que tem figura tabular.
- Conta de demonstração fictícia: `motorista@rookhub.com` / `rookhub123`.

## Evidence on Hand

- `docs/design-reference/`: protótipo React/Tailwind com sete telas de referência (painel de
  cargas, detalhe de carga, veículos, rotas/diesel, postos, recompensas, perfil).
- Referências externas escolhidas pelo usuário: [Container Delivery Driver UI](https://dribbble.com/shots/26439156-Container-Delivery-Driver-UI-Port-Logistics-App)
  e [FastFleet Driver Home](https://dribbble.com/shots/25485495-FastFleet-Fleet-Driver-App-Home-screen-Design-Fibo-Studio).
- `../System-web`: implementação MapLibre da operação, usada como referência de contrato e rota;
  o mobile recebe apenas o recorte do motorista autenticado.
- `src/mocks/`: dados simulados de sessão, jornada, checklist, abastecimento e perfil.
- `assets/brand/`: logo RookHub.
- Não existem métricas de uso, depoimentos, clientes nomeados ou dados de operação real. Nada disso
  pode ser fabricado em tela.

## Product Principles

1. O dado nasce no campo — cada tela existe para registrar ou conferir algo real, não para enfeitar.
2. Legibilidade sob sol e luva vence densidade: alvo de toque de 48pt é regra, não sugestão.
3. Número é conteúdo. Valor operacional (R$, km/l, litro, placa, prazo) tem hierarquia própria.
4. Regra de negócio aparece como consequência, não como aviso: bloqueio é bloqueio.
5. A interface não promete o que a Fase 1 não tem; estado simulado nunca se disfarça de real.

## Accessibility & Inclusion

- Alvo de toque mínimo de 48pt em todo controle usado em campo.
- Contraste precisa sobreviver a tela sob sol; texto sobre superfície clara e sobre superfície
  escura seguem tokens distintos, já separados no tema.
- Rótulos e papéis de acessibilidade em pt-BR nos controles interativos.
