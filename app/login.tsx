import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RookhubLogo } from "@/components/brand/rookhub-logo";
import { Button, Field, Text } from "@/components/ui";
import { login } from "@/features/auth/api";
import { loginSchema, type LoginValues } from "@/features/auth/schema";
import { useAuthStore } from "@/features/auth/store";
import { guardarUltimaEmpresa, lerUltimaEmpresa } from "@/lib/storage";
import { ForceScheme, HIT_TARGET, theme, useColors, useThemedStyles, type Scheme } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface AuthFieldProps extends TextInputProps {
  label: string;
  error?: string;
  icon: IconName;
  trailing?: ReactNode;
}

function AuthField({ label, error, icon, trailing, style, ...props }: AuthFieldProps) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.authField}>
      <Text variant="overline" tone="muted" style={styles.fieldLabel}>
        {label}
      </Text>

      <View style={styles.inputWrap}>
        <View style={styles.leadingIcon}>
          <Ionicons color={colors.onSurfaceMuted} name={icon} size={19} />
        </View>

        <Field
          {...props}
          error={error}
          hideLabel
          label={label}
          /* Dica mais leve que o texto digitado: no claro o cinza médio do resto
             do app competia com o valor que o motorista acabou de escrever. */
          placeholderTextColor={colors.onSurfaceFaint}
          shape="pill"
          style={[styles.authInput, trailing ? styles.authInputWithTrailing : null, style]}
        />

        {trailing ? <View style={styles.trailingIcon}>{trailing}</View> : null}
      </View>
    </View>
  );
}

/**
 * Entrada sempre no claro.
 *
 * É a única tela que alguém de fora da operação vê — gestor avaliando o produto,
 * motorista no primeiro dia. Clara ela lê como documento assinado, e não muda de
 * cara conforme o aparelho de quem abriu.
 */
export default function LoginScreen() {
  return (
    <ForceScheme scheme="light">
      <StatusBar style="dark" />
      <LoginForm />
    </ForceScheme>
  );
}

function LoginForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const setSession = useAuthStore((state) => state.setSession);

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /* Lembrado de um login anterior. Enquanto houver, o campo Empresa fica recolhido. */
  const [empresaLembrada, setEmpresaLembrada] = useState<string | null>(null);

  const { control, handleSubmit, formState, setValue, clearErrors } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: "", email: "", password: "" },
  });

  /*
   * O deep link do e-mail de primeiro acesso (`rookhub://acesso?empresa=&email=`)
   * chega aqui como parâmetro de rota e vence o que estava lembrado: quem clicou no
   * link está entrando pela primeira vez, ou trocando de empresa.
   */
  const { empresa: empresaDoLink, email: emailDoLink } = useLocalSearchParams<{
    empresa?: string;
    email?: string;
  }>();

  useEffect(() => {
    let vivo = true;

    if (empresaDoLink) {
      setValue("tenantSlug", empresaDoLink.toLowerCase());
      setEmpresaLembrada(empresaDoLink.toLowerCase());
      if (emailDoLink) setValue("email", emailDoLink);
      return;
    }

    void lerUltimaEmpresa().then((slug) => {
      if (!vivo || !slug) return;
      setValue("tenantSlug", slug);
      setEmpresaLembrada(slug);
    });

    return () => {
      vivo = false;
    };
  }, [empresaDoLink, emailDoLink, setValue]);

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      const session = await login(values.tenantSlug, values.email, values.password);
      /* Só lembra o que funcionou: slug digitado errado não volta na próxima vez. */
      await guardarUltimaEmpresa(values.tenantSlug);
      setSession(session);
      /*
       * `/` decide para onde ir, e a decisão inclui o desvio de senha provisória.
       * ⚠️ Nenhuma chamada de API entre aqui e lá: com `mustChangePassword`, tudo
       * menos trocar a senha responde 403, e o erro apareceria como falha genérica.
       */
      router.replace("/");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível entrar. Tente de novo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /** Devolve o campo Empresa à tela, para quem dirige para mais de uma transportadora. */
  function trocarEmpresa() {
    setEmpresaLembrada(null);
    setValue("tenantSlug", "", { shouldDirty: true });
  }

  function fillDemoCredentials() {
    setFormError(null);
    clearErrors();
    setValue("tenantSlug", "servioeste", { shouldDirty: true, shouldValidate: true });
    setValue("email", "motorista@rookhub.com", { shouldDirty: true, shouldValidate: true });
    setValue("password", "12345678", { shouldDirty: true, shouldValidate: true });
  }

  // O gradiente cobre o topo da tela inteira e se dissolve no fundo, sem bloco:
  // a altura acompanha o aparelho para a marca ficar centrada na área colorida.
  const brandHeight = Math.max(300, height * 0.4);

  return (
    <View style={styles.root}>
      <View style={[styles.backdrop, { height: brandHeight }]}>
        {/* Gradiente de marca: a terracota da RookHub, clareando no topo e
            fechando embaixo. É a mesma cor da ação, com profundidade. */}
        <LinearGradient
          colors={[...theme.brandGradient]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["transparent", colors.background]}
          locations={[0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + theme.space.lg,
              paddingBottom: insets.bottom + theme.space.xl,
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shell}>
            <View style={[styles.brand, { height: brandHeight * 0.72 }]}>
              {/* Assinatura chapada no branco: o destaque em terracota do lockup
                  sumiria por cima do gradiente, que é terracota também. É o caso
                  de uma cor só que o componente documenta. */}
              <RookhubLogo
                accentColor={colors.onAccentSolid}
                color={colors.onAccentSolid}
                height={44}
              />
              <Text tone="onAccent" variant="labelSm" style={styles.brandProduct}>
                APP DO MOTORISTA
              </Text>
            </View>

            <View style={styles.body}>
              <View style={styles.form}>
                {formError ? (
                  <View accessibilityRole="alert" style={styles.errorAlert}>
                    <Ionicons color={colors.error} name="alert-circle-outline" size={20} />
                    <Text tone="error" variant="labelMd" style={styles.errorText}>
                      {formError}
                    </Text>
                  </View>
                ) : null}

                {/* A empresa vem primeiro: é ela que escolhe onde as credenciais
                    abaixo serão procuradas. Recolhida quando já é conhecida, porque
                    o motorista digita a mesma todo dia. */}
                {empresaLembrada ? (
                  <View style={styles.empresaLembrada}>
                    <Ionicons color={colors.onSurfaceMuted} name="business-outline" size={18} />
                    <Text tone="variant" variant="labelMd" style={styles.empresaNome}>
                      {empresaLembrada}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={submitting}
                      hitSlop={12}
                      onPress={trocarEmpresa}
                    >
                      <Text tone="accent" variant="labelMd">
                        Trocar
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Controller
                    control={control}
                    name="tenantSlug"
                    render={({ field }) => (
                      <AuthField
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!submitting}
                        error={formState.errors.tenantSlug?.message}
                        icon="business-outline"
                        label="Empresa"
                        onBlur={field.onBlur}
                        onChangeText={(texto) => field.onChange(texto.trim().toLowerCase())}
                        placeholder="código da transportadora"
                        value={field.value}
                      />
                    )}
                  />
                )}

                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <AuthField
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      editable={!submitting}
                      error={formState.errors.email?.message}
                      icon="mail-outline"
                      inputMode="email"
                      keyboardType="email-address"
                      label="E-mail"
                      onBlur={field.onBlur}
                      onChangeText={field.onChange}
                      placeholder="nome@empresa.com.br"
                      value={field.value}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <AuthField
                      autoCapitalize="none"
                      autoComplete="current-password"
                      autoCorrect={false}
                      editable={!submitting}
                      error={formState.errors.password?.message}
                      icon="lock-closed-outline"
                      label="Senha"
                      onBlur={field.onBlur}
                      onChangeText={field.onChange}
                      onSubmitEditing={handleSubmit(onSubmit)}
                      placeholder="Digite sua senha"
                      returnKeyType="go"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      trailing={
                        <Pressable
                          accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => setShowPassword((current) => !current)}
                          style={({ pressed }) => [
                            styles.iconButton,
                            pressed && styles.iconButtonPressed,
                          ]}
                        >
                          <Ionicons
                            color={colors.onSurfaceMuted}
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                          />
                        </Pressable>
                      }
                      value={field.value}
                    />
                  )}
                />

                <Button
                  label="Entrar"
                  loading={submitting}
                  onPress={handleSubmit(onSubmit)}
                  shape="pill"
                  style={styles.submit}
                />
              </View>

              {__DEV__ ? (
                <Pressable
                  accessibilityHint="Preenche o e-mail e a senha de demonstração"
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={fillDemoCredentials}
                  style={({ pressed }) => [
                    styles.demo,
                    pressed && styles.demoPressed,
                    submitting && styles.demoDisabled,
                  ]}
                >
                  <Ionicons color={colors.accent} name="sparkles-outline" size={20} />
                  <View style={styles.demoCopy}>
                    <Text variant="labelMd">Usar conta de demonstração</Text>
                    <Text tone="muted" variant="labelSm">
                      Preenche as credenciais automaticamente
                    </Text>
                  </View>
                  <Ionicons color={colors.onSurfaceMuted} name="chevron-forward" size={18} />
                </Pressable>
              ) : null}
            </View>

            <Text tone="muted" variant="labelSm" style={styles.footer}>
              © 2026 RookHub · Gestão inteligente de frotas
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: Scheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    keyboard: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: theme.space.xl },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      overflow: "hidden",
      pointerEvents: "none",
    },
    shell: { flexGrow: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
    brand: { alignItems: "center", justifyContent: "center", gap: theme.space.md },
    brandProduct: { opacity: 0.88, letterSpacing: 1.2, textTransform: "uppercase" },
    // Cresce até o rodapé sem comprimir os campos com o teclado aberto; o formulário
    // fica logo abaixo da marca e a folga sobrante cai antes do rodapé.
    body: { flexGrow: 1, paddingTop: theme.space.md, paddingBottom: theme.space.xl },
    form: { gap: 18 },
    // Linha discreta, e não um campo: a empresa já está resolvida e não é o assunto
    // da tela. Vira campo de novo só quando o motorista toca em "Trocar".
    empresaLembrada: {
      minHeight: HIT_TARGET,
      paddingHorizontal: theme.space.md,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: colors.surfaceSunken,
    },
    empresaNome: { flex: 1 },
    authField: { gap: theme.space.sm },
    fieldLabel: { paddingHorizontal: theme.space.xs },
    inputWrap: { position: "relative" },
    authInput: {
      width: "100%",
      minHeight: 54,
      paddingLeft: 48,
      backgroundColor: colors.surface,
    },
    authInputWithTrailing: { paddingRight: 52 },
    leadingIcon: { position: "absolute", zIndex: 2, left: 18, top: 18, pointerEvents: "none" },
    trailingIcon: { position: "absolute", zIndex: 2, top: 7, right: 8 },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
    },
    iconButtonPressed: { backgroundColor: colors.surfaceSunken },
    errorAlert: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.sm,
      padding: theme.space.md,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.error,
      backgroundColor: colors.errorSoft,
    },
    errorText: { flex: 1 },
    submit: { minHeight: 56, marginTop: theme.space.xs },
    demo: {
      minHeight: 58,
      marginTop: theme.space.xl,
      paddingHorizontal: theme.space.md,
      paddingVertical: theme.space.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.space.md,
      borderRadius: theme.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
    },
    demoPressed: { borderColor: colors.outlineStrong, backgroundColor: colors.surfaceSunken },
    demoDisabled: { opacity: 0.5 },
    demoCopy: { flex: 1, gap: 2 },
    footer: { textAlign: "center" },
  });
