import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding & Info */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-white lg:flex">
        <div>
          {/* Container branco com bordas arredondadas para garantir o contraste e visibilidade da logo */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-lg">
            <img
              src="/logo-simap.svg"
              alt="SIMAP Logo"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Gestão inteligente do<br />patrimônio da JFAP
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md leading-relaxed">
            O SIMAP moderniza o controle e a rastreabilidade de equipamentos, 
            integrando a TI e a SEMAP em uma plataforma única e eficiente.
          </p>
        </div>

        <div className="text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Justiça Federal do Amapá. Todos os direitos reservados.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            {/* Mobile logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <img
                src="/logo-simap.svg"
                alt="SIMAP"
                className="h-20 w-20 object-contain"
              />
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Acessar SIMAP
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sistema de Movimentação e Acompanhamento Patrimonial
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
