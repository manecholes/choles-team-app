export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-turqui-800 via-turqui-700 to-turqui-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl font-bold">
            CT
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Choles Team App</h1>
          <p className="mt-1 text-sm text-turqui-100">
            &ldquo;Juntos, somos Choles Team.&rdquo;
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
