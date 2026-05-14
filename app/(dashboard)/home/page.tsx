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
import { listarMeusTombos } from "@/server/queries/tombo";

function getFirstName(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome;
}

export default async function HomePage() {
  const user = await requireAuth();

  const { id: userId, matricula, nome, perfil } = user;
  const firstName = getFirstName(nome);

  const meusTombosPromise = listarMeusTombos(userId, matricula, {
    pagina: 1,
    porPagina: 5,
  });

  switch (perfil) {
    case "TECNICO_TI": {
      const [data, meusTombosInicial] = await Promise.all([
        getTecnicoHomeData(userId),
        meusTombosPromise,
      ]);
      return (
        <TecnicoHome
          firstName={firstName}
          data={data}
          meusTombosInicial={meusTombosInicial}
        />
      );
    }

    case "SERVIDOR_RESPONSAVEL": {
      const [data, meusTombosInicial] = await Promise.all([
        getResponsavelHomeData(userId, matricula),
        meusTombosPromise,
      ]);
      return (
        <ResponsavelHome
          firstName={firstName}
          data={data}
          meusTombosInicial={meusTombosInicial}
        />
      );
    }

    case "SERVIDOR_SEMAP": {
      const [data, meusTombosInicial] = await Promise.all([
        getSemapHomeData(userId),
        meusTombosPromise,
      ]);
      return (
        <SemapHome
          firstName={firstName}
          data={data}
          meusTombosInicial={meusTombosInicial}
        />
      );
    }

    case "GESTOR_ADMIN": {
      const [data, meusTombosInicial] = await Promise.all([
        getGestorHomeData(userId),
        meusTombosPromise,
      ]);
      return (
        <GestorHome
          firstName={firstName}
          data={data}
          meusTombosInicial={meusTombosInicial}
        />
      );
    }
  }

  return null;
}
