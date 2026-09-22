import { z } from "zod";

/**
 * ⚠️ O `tenantSlug` é obrigatório, e é o que diferencia este login do painel.
 *
 * O navegador manda `Origin` e o servidor descobre a empresa por ele. O `fetch`
 * nativo não manda, e sem o slug o login cairia na empresa padrão configurada, o que
 * faria o motorista de uma transportadora entrar no schema de outra.
 *
 * O formato espelha o dos slugs do servidor (minúsculas, números e hífen). Validar
 * aqui evita uma ida à rede para receber 401 por causa de um espaço colado no fim,
 * que é o erro mais provável de quem digita no celular.
 */
export const loginSchema = z.object({
  tenantSlug: z
    .string()
    .min(2, "Informe o código da empresa")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginValues = z.infer<typeof loginSchema>;

/**
 * A senha que o motorista escolhe no primeiro acesso.
 *
 * O mínimo de 8 espelha o `@Size(min = 8)` do `PasswordChangeRequest` no servidor:
 * validar com outro número aqui só produziria um 400 que a tela não sabe explicar.
 * Não é política de senha do produto, é o freio que impede a senha provisória
 * sorteada de virar a senha definitiva.
 */
export const firstAccessSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha provisória que você recebeu"),
    newPassword: z.string().min(8, "Use ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Repita a senha nova"),
  })
  .refine((valores) => valores.newPassword === valores.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não são iguais",
  })
  .refine((valores) => valores.newPassword !== valores.currentPassword, {
    path: ["newPassword"],
    message: "A senha nova precisa ser diferente da provisória",
  });

export type FirstAccessValues = z.infer<typeof firstAccessSchema>;
