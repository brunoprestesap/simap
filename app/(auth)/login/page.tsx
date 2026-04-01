import { auth, getHomeByPerfil } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(getHomeByPerfil(session.user.perfil));
  }

  return <LoginForm />;
}
