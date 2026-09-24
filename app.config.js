/**
 * Endereço do BFF na build.
 *
 * O `app.json` continua sendo a configuração do app: o Expo lê os dois e entrega o
 * JSON como `config` para esta função. Este arquivo existe por uma razão só, derivar
 * `extra.apiBaseUrl` de `process.env` no momento do build, que o JSON não sabe fazer.
 *
 * ⚠️ **E RECUSAR uma build de produção que sairia apontando para lugar nenhum.**
 *
 * Antes disto, `expo export` sem a variável gerava um bundle silenciosamente apontado
 * para `http://localhost:8090`. Numa build de loja, `localhost` é o próprio celular: o
 * app instalaria, abriria e falharia em toda requisição, sem nenhum erro em tempo de
 * build para avisar quem compilou. O erro só apareceria com o app já publicado.
 *
 * `EXPO_PUBLIC_*` é embutido no bundle pelo SDK: aqui entra **endereço, nunca segredo**.
 */

/**
 * ⚠️ `expo export` define `NODE_ENV=production` sozinho, e `expo start` define
 * `development`. É isso que separa a build de loja do dia a dia sem exigir nenhuma
 * flag extra de quem compila.
 *
 * ⚠️ Risco residual conhecido: um caminho de build que não defina `NODE_ENV` faria as
 * guardas abaixo dormirem. Os dois únicos caminhos hoje são `export:android` e
 * `export:ios`, que definem. Quando o EAS entrar, o `eas.json` precisa trazer
 * `EXPO_PUBLIC_API_URL` por perfil, e estas guardas viram a segunda linha de defesa.
 */
const PRODUCAO = process.env.NODE_ENV === "production";

/** Endereços que existem na sua máquina e não existem no celular de ninguém. */
const REDE_LOCAL =
  /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|192\.168\.|172\.(1[6-9]|2\d|3[01])\./;

module.exports = ({ config }) => {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || null;

  if (PRODUCAO) {
    if (!url) {
      throw new Error(
        "EXPO_PUBLIC_API_URL não está definida, e esta é uma build de produção.\n\n" +
          "Sem ela o app sairia apontando para http://localhost:8090, que num celular\n" +
          "é o próprio aparelho. Defina antes de exportar:\n\n" +
          "  EXPO_PUBLIC_API_URL=https://api-app.rookhub.com.br npm run export:android\n",
      );
    }

    if (!url.startsWith("https://")) {
      throw new Error(
        `EXPO_PUBLIC_API_URL precisa ser https em produção, e veio "${url}".\n\n` +
          "Android e iOS bloqueiam tráfego em claro por padrão, então o app\n" +
          "instalaria e falharia em toda requisição.\n",
      );
    }

    if (REDE_LOCAL.test(url)) {
      throw new Error(
        `EXPO_PUBLIC_API_URL aponta para um endereço de rede local ("${url}").\n\n` +
          "Isso funciona no emulador e não funciona em celular nenhum fora da sua\n" +
          "rede. Use o endereço público do BFF.\n",
      );
    }
  }

  return { ...config, extra: { ...config.extra, apiBaseUrl: url } };
};
