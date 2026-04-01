export default function ConfirmarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 pt-12">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold">
          S
        </div>
        <h1 className="mt-3 text-xl font-bold text-primary">SIMAP</h1>
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
