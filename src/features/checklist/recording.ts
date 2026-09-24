import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { Platform } from "react-native";

/**
 * A gravação da observação falada.
 *
 * <h2>⚠️ TRÊS FORMATOS, PORQUE SÃO TRÊS PLATAFORMAS</h2>
 *
 * Isto **não** é uma bifurcação de tela: é a mesma tela, o mesmo componente e os
 * mesmos pixels em todo lugar. O que muda é o codec que o aparelho sabe gravar, e
 * nenhuma das três plataformas grava o formato da outra.
 *
 * A lista é a interseção entre o que a plataforma grava e o que o reconhecedor de
 * fala aceita:
 *
 * | Plataforma | Formato  | Por quê |
 * | ---------- | -------- | ------- |
 * | Web        | WebM/Opus | o que o `MediaRecorder` do navegador entrega |
 * | iOS        | WAV (LINEAR16) | o iPhone grava PCM sem esforço |
 * | Android    | AMR-WB   | o único aceito entre os que o Android grava |
 *
 * ⚠️ **O padrão do Android é AAC em `.m4a`, e o Google NÃO aceita AAC.** Usar o
 * preset pronto faria o áudio subir e a transcrição voltar vazia, que na tela vira
 * "não entendi": todo mundo procuraria defeito no reconhecimento, e o problema
 * seria o formato. É por isso que o Android aqui é configurado à mão, em vez de
 * usar `RecordingPresets.HIGH_QUALITY`.
 *
 * ⚠️ AMR-WB é 16 kHz por definição do codec, e o servidor declara essa taxa ao
 * Google. Mudar o `sampleRate` daqui sem mudar lá faz a fala sair arrastada e o
 * texto voltar em pedaços, sem nenhum erro que aponte para a taxa.
 */
const GRAVACAO: RecordingOptions = {
  extension: Platform.select({ ios: ".wav", android: ".amr", default: ".webm" }) ?? ".webm",
  sampleRate: Platform.OS === "android" ? 16000 : 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    outputFormat: "amrwb",
    audioEncoder: "amr_wb",
  },
  ios: {
    /* LINEARPCM em `.wav`: o cabeçalho do arquivo é o que diz a taxa ao servidor. */
    outputFormat: "lpcm",
    audioQuality: RecordingPresets.HIGH_QUALITY.ios?.audioQuality,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

/**
 * O `Content-Type` que acompanha os bytes.
 *
 * ⚠️ Tem de casar com o que foi gravado de verdade: é por ele que o servidor decide
 * o encoding a declarar ao Google. Um tipo errado aqui não dá erro em lugar nenhum,
 * só devolve texto vazio.
 */
export function tipoDoAudio(): string {
  return Platform.select({
    ios: "audio/wav",
    android: "audio/amr-wb",
    default: "audio/webm",
  })!;
}

/**
 * O gravador, já configurado, e o estado dele.
 *
 * ⚠️ **`recorder.isRecording` NÃO faz a tela redesenhar.** Ele é uma propriedade do
 * objeto, não estado de React: lida direto, o botão do microfone nunca muda de
 * aparência, e o motorista aperta, não vê nada acontecer e conclui, com razão, que
 * não funciona. Quem avisa a tela é o `useAudioRecorderState`.
 *
 * Foi exatamente este o defeito do primeiro corte desta tela, em 24/09/2026.
 */
export function useGravadorDeObservacao() {
  const gravador = useAudioRecorder(GRAVACAO);
  const estado = useAudioRecorderState(gravador);

  return { gravador, gravando: estado.isRecording };
}

/**
 * Pede o microfone e prepara o áudio.
 *
 * ⚠️ Quem concede é o sistema, sempre, e nada guardado aqui muda isso. Negar não
 * pode travar o preenchimento: o motorista volta a digitar, e é por isso que o
 * teclado nunca sai da tela.
 *
 * @returns falso quando o microfone foi negado
 */
export async function prepararMicrofone(): Promise<boolean> {
  const permissao = await AudioModule.requestRecordingPermissionsAsync();
  if (!permissao.granted) return false;

  /*
   * ⚠️ No iPhone, sem `allowsRecording`, a gravação sai muda sem erro nenhum: o
   * arquivo existe, tem duração e não tem som, e a transcrição volta vazia.
   */
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  return true;
}
