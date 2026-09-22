import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Alvo do link do e-mail de primeiro acesso: `rookhub://acesso?empresa=&email=`.
 *
 * Não desenha nada e não decide nada: só repassa os parâmetros para o login, que
 * sabe o que fazer com eles. Existe porque um deep link precisa de uma rota com
 * nome estável, e `login` já tem dono.
 *
 * ⚠️ O link é atalho, nunca caminho único. O mesmo e-mail traz o código da empresa,
 * o endereço e a senha escritos por extenso, porque `rookhub://` não é clicável em
 * webmail e o motorista que abrir a mensagem no computador precisa conseguir digitar.
 */
export default function Acesso() {
  const { empresa, email } = useLocalSearchParams<{ empresa?: string; email?: string }>();

  return (
    <Redirect
      href={{
        pathname: "/login",
        params: {
          ...(empresa ? { empresa } : {}),
          ...(email ? { email } : {}),
        },
      }}
    />
  );
}
