"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const matricula = formData.get("matricula") as string;
  const senha = formData.get("senha") as string;

  if (!matricula || !senha) {
    return { error: "Preencha matrícula e senha." };
  }

  try {
    await signIn("credentials", {
      matricula,
      senha,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Matrícula ou senha incorretos." };
      }
      return { error: "Erro ao conectar ao servidor de autenticação." };
    }
    throw error;
  }

  return null;
}
