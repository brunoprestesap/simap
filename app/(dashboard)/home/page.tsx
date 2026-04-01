import { requireAuth } from "@/lib/auth-guard";
import { GestorHome } from "@/components/views/home/GestorHome";
import { ResponsavelHome } from "@/components/views/home/ResponsavelHome";
import { SemapHome } from "@/components/views/home/SemapHome";
import { TecnicoHome } from "@/components/views/home/TecnicoHome";
import {
  getGestorHomeData,
  getResponsavelHomeData,
  getSemapHomeData,
  getTecnicoHomeData,
} from "@/server/queries/home";

function getFirstName(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome;
}

export default async function HomePage() {
  const user = await requireAuth();

  const { id: userId, matricula, nome, perfil } = user;
  const firstName = getFirstName(nome);

  switch (perfil) {
    case "TECNICO_TI": {
      const data = await getTecnicoHomeData(userId);
      return <TecnicoHome firstName={firstName} data={data} />;
    }

    case "SERVIDOR_RESPONSAVEL": {
      const data = await getResponsavelHomeData(userId, matricula);
      return <ResponsavelHome firstName={firstName} data={data} />;
    }

    case "SERVIDOR_SEMAP": {
      const data = await getSemapHomeData(userId);
      return <SemapHome firstName={firstName} data={data} />;
    }

    case "GESTOR_ADMIN": {
      const data = await getGestorHomeData(userId);
      return <GestorHome firstName={firstName} data={data} />;
    }
  }

  return null;
}
