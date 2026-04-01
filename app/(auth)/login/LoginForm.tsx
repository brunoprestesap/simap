"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Loader2, AlertCircle, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PerfilUsuario } from "@/lib/generated/prisma/client";
import { getHomeByPerfil } from "@/lib/profile-home";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const matricula = formData.get("matricula") as string;
    const senha = formData.get("senha") as string;

    if (!matricula || !senha) {
      setError("Preencha matrícula e senha.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        matricula,
        senha,
        redirect: false,
      });

      if (result?.error) {
        setError("Matrícula ou senha incorretos.");
        setIsLoading(false);
        return;
      }

      // Fetch session to get profile for redirect
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const perfil = session?.user?.perfil as PerfilUsuario | undefined;
      const home = perfil ? getHomeByPerfil(perfil) : "/home";
      router.push(home);
      router.refresh();
    } catch {
      setError("Erro ao conectar ao servidor de autenticação.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="matricula" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Matrícula
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              <User className="h-5 w-5" />
            </div>
            <input
              id="matricula"
              name="matricula"
              type="text"
              required
              autoComplete="username"
              placeholder="Ex: AP20151"
              disabled={isLoading}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10 h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="senha" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Senha
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Sua senha de rede"
              disabled={isLoading}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10 h-12"
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-medium" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Autenticando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Utilize suas credenciais de rede (LDAP/AD) da JFAP
        </p>
      </div>
    </form>
  );
}
