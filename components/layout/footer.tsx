import Link from "next/link";

export function Footer() {
  return (
    <footer className="glass mt-auto border-t border-white/10">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            GPO Trader não é afiliado, endossado ou de qualquer forma ligado à
            Roblox Corporation ou ao jogo Grand Piece Online. Todas as marcas
            são de seus respectivos donos.
          </p>
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-4 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-slate-400 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-slate-300"
                >
                  Termos de uso
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
