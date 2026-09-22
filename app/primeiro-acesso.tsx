import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, Field, SheetScreen, Text } from "@/components/ui";
import { changePassword, logout } from "@/features/auth/api";
import { firstAccessSchema, type FirstAccessValues } from "@/features/auth/schema";
import { useAuthStore, useSession } from "@/features/auth/store";
import { HIT_TARGET, theme, useColors, useThemedStyles, type Scheme } from "@/theme";

/**
 * Onde a senha provisória morre.
 *
 * ⚠️ Esta tela é a única saída de um estado em que o servidor responde 403 em tudo.
 * Enquanto `mustChangePassword` for verdadeiro, o `SenhaProvisoriaFilter` barra toda
 * rota menos trocar senha, ver a sessão, renovar e sair. Por isso ela **não chama
 * nenhuma API ao montar**: um pedido de dados aqui viraria um 403 que a tela teria de
 * explicar, no lugar exato onde o motorista já está confuso.
 *
 * Também não há botão de voltar. Voltar para onde? A sessão existe e não serve para
 * nada até a troca acontecer. O que existe é "sair", que devolve ao login.
 */
export default function PrimeiroAcesso() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const session = useSession();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const { control, handleSubmit, formState } = useForm<FirstAccessValues>({
    resolver: zodResolver(firstAccessSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: FirstAccessValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      /*
       * ⚠️ Substitui a sessão INTEIRA, e não só o access token. A obrigação de trocar
       * viaja dentro do token, então guardar só o token novo deixaria o app achando
       * que ainda precisa trocar, e o desvio de `app/index.tsx` giraria em círculo.
       */
      setSession(await changePassword(values.currentPassword, values.newPassword));
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível trocar a senha. Tente de novo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function sair() {
    /* O servidor pode recusar; sair da conta no aparelho não pode depender disso. */
    try {
      if (session) await logout(session.refreshToken);
    } catch {
      /* ignorado de propósito */
    }
    clearSession();
    router.replace("/login");
  }

  return (
    <SheetScreen
      hero={
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons color={colors.accent} name="key-outline" size={22} />
          </View>
          <Text variant="headlineMd">Crie sua senha</Text>
          <Text tone="variant" variant="bodyMd">
            A senha que você recebeu por e-mail é provisória e vale uma vez só. Escolha uma senha
            sua para continuar.
          </Text>
        </View>
      }
    >
      <View style={styles.form}>
        {formError ? (
          <View accessibilityRole="alert" style={styles.alerta}>
            <Ionicons color={colors.error} name="alert-circle-outline" size={20} />
            <Text tone="error" variant="labelMd" style={styles.alertaTexto}>
              {formError}
            </Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="currentPassword"
          render={({ field }) => (
            <Field
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              editable={!submitting}
              error={formState.errors.currentPassword?.message}
              label="Senha provisória"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="a que veio no e-mail"
              placeholderTextColor={colors.onSurfaceFaint}
              secureTextEntry={!showPasswords}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field }) => (
            <Field
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!submitting}
              error={formState.errors.newPassword?.message}
              label="Sua senha nova"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="ao menos 8 caracteres"
              placeholderTextColor={colors.onSurfaceFaint}
              secureTextEntry={!showPasswords}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <Field
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!submitting}
              error={formState.errors.confirmPassword?.message}
              label="Repita a senha nova"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              onSubmitEditing={handleSubmit(onSubmit)}
              placeholder="digite de novo"
              placeholderTextColor={colors.onSurfaceFaint}
              returnKeyType="go"
              secureTextEntry={!showPasswords}
              value={field.value}
            />
          )}
        />

        {/* Mostrar a senha importa mais aqui que no login: a provisória tem 14
            caracteres sorteados e é digitada olhando para outra tela. */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: showPasswords }}
          hitSlop={8}
          onPress={() => setShowPasswords((atual) => !atual)}
          style={styles.mostrar}
        >
          <Ionicons
            color={colors.onSurfaceMuted}
            name={showPasswords ? "eye-off-outline" : "eye-outline"}
            size={20}
          />
          <Text tone="variant" variant="labelMd">
            {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
          </Text>
        </Pressable>

        <Button
          label="Salvar e entrar"
          loading={submitting}
          onPress={handleSubmit(onSubmit)}
          shape="pill"
          style={styles.salvar}
        />

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          hitSlop={8}
          onPress={() => void sair()}
          style={styles.sair}
        >
          <Text tone="muted" variant="labelMd">
            Entrar com outra conta
          </Text>
        </Pressable>
      </View>
    </SheetScreen>
  );
}

const makeStyles = (colors: Scheme) =>
  StyleSheet.create({
    hero: { gap: theme.space.sm },
    badge: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      backgroundColor: colors.accentSoft,
      marginBottom: theme.space.xs,
    },
    form: { gap: 18 },
    alerta: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
      padding: theme.space.md,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.error,
      backgroundColor: colors.errorSoft,
    },
    alertaTexto: { flex: 1 },
    mostrar: {
      minHeight: HIT_TARGET,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
    },
    salvar: { minHeight: 56 },
    sair: { minHeight: HIT_TARGET, alignItems: "center", justifyContent: "center" },
  });
