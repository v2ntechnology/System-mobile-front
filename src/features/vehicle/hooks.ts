import { useQuery, useQueryClient } from "@tanstack/react-query";

import { currentBinding } from "./api";

/**
 * A chave do vínculo no cache.
 *
 * ⚠️ Exportada porque **toda** tela que muda o vínculo precisa invalidá-la: escanear,
 * encerrar e enviar checklist. Sem isso a home continua mostrando o caminhão antigo
 * depois de o motorista já ter trocado, e é o tipo de erro que só aparece em campo.
 */
export const CHAVE_VINCULO = ["vehicle", "binding"] as const;

/**
 * O caminhão que o motorista está dirigindo agora.
 *
 * Sem store próprio: o React Query já é o estado, e um Zustand ao lado seria uma
 * segunda cópia da mesma verdade, com a garantia de divergirem um dia.
 */
export function useCurrentBinding() {
  return useQuery({
    queryKey: CHAVE_VINCULO,
    queryFn: currentBinding,
    /*
     * ⚠️ Mais curto que o padrão de 60s do app. O vínculo é a coisa que mais muda
     * de fora: outro motorista pode assumir o caminhão a qualquer momento, e a tela
     * precisa descobrir isso sem o motorista ter de fechar e abrir o app.
     */
    staleTime: 15_000,
  });
}

/** Força a releitura do vínculo. Usar depois de escanear, encerrar ou enviar checklist. */
export function useInvalidarVinculo() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: CHAVE_VINCULO });
}
