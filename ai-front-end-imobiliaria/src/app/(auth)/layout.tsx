export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen grid place-items-center bg-zinc-950 text-slate-50 relative overflow-hidden">
            {/* Elemento de background decorativo: grid escuro premium */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]"></div>

            {/* Gradientes flutuantes para dar volume ao fundo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen pointer-events-none"></div>

            <main className="z-10 w-full max-w-[420px] p-4 relative">
                {children}
            </main>
        </div>
    );
}
