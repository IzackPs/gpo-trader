import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Callback OAuth (Discord). Troca o code por sessão.
 * O profile é criado/atualizado pelo trigger handle_new_user() no Supabase.
 * O parâmetro "next" é validado para evitar open redirect (apenas paths relativos).
 */
function safeRedirectPath(next: string): string {
  const trimmed = next.trim()
  // Apenas paths relativos: começa com / e não contém "//" (evita protocol-relative ou absoluto)
  if (trimmed.startsWith("/") && !trimmed.includes("//")) {
    return trimmed
  }
  return "/dashboard"
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = safeRedirectPath(nextParam)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}