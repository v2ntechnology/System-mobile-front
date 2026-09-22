import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";

/**
 * Armazenamento persistente dos stores.
 *
 * No aparelho é o keychain/keystore via `expo-secure-store`: celular de motorista
 * roda em pátio, é emprestado e é roubado, então o token não fica em claro.
 *
 * No preview web esse módulo não existe, e chamá-lo derruba a hidratação —
 * `useHydrated()` nunca conclui e o app trava no splash. Lá vale o
 * `localStorage`, que é suficiente para a única coisa que a web faz aqui: olhar
 * a tela em uma janela grande durante o desenvolvimento. Nada sensível de
 * verdade passa por esse caminho; quando o backend existir, o token real
 * continua sendo problema do aparelho.
 */

const keychain: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

/** Sem `localStorage` (SSR, janela restrita) o preview roda sem persistir. */
const memory = new Map<string, string>();

const browser: StateStorage = {
  getItem: (name) => globalThis.localStorage?.getItem(name) ?? memory.get(name) ?? null,
  setItem: (name, value) => {
    memory.set(name, value);
    globalThis.localStorage?.setItem(name, value);
  },
  removeItem: (name) => {
    memory.delete(name);
    globalThis.localStorage?.removeItem(name);
  },
};

export const persistentStorage: StateStorage = Platform.OS === "web" ? browser : keychain;

/**
 * O código da empresa do último login que deu certo.
 *
 * Fica fora do store de sessão de propósito: ele precisa **sobreviver ao logout**.
 * Guardado junto da sessão, sumiria junto, e o motorista teria de digitar o slug da
 * transportadora toda vez que saísse do app, que é justamente o atrito que o campo
 * lembrado existe para evitar.
 *
 * Só é gravado depois de um login bem-sucedido: slug digitado errado não é lembrado.
 */
const CHAVE_EMPRESA = "rookhub.last-tenant";

export async function lerUltimaEmpresa(): Promise<string | null> {
  try {
    return await persistentStorage.getItem(CHAVE_EMPRESA);
  } catch {
    /* Conveniência, não requisito: falhar aqui só devolve o campo à tela. */
    return null;
  }
}

export async function guardarUltimaEmpresa(slug: string): Promise<void> {
  try {
    await persistentStorage.setItem(CHAVE_EMPRESA, slug);
  } catch {
    /* Idem: não poder lembrar não pode impedir o motorista de entrar. */
  }
}
