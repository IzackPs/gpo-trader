import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente com sessão (cookies). Usar em rotas que dependem do utilizador (auth, criar oferta, etc.).
 * Nota: chamar cookies() torna a rota dinâmica e desativa ISR.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignorar erro se chamado de um Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignorar erro se chamado de um Server Component
          }
        },
      },
    }
  )
}

/**
 * Cliente sem sessão (não lê cookies). Usar apenas em páginas públicas de leitura
 * (ex.: /market, /market/analytics) para permitir ISR: Next.js pode cachear o HTML
 * e revalidar a cada revalidate segundos sem tornar a rota dinâmica.
 */
export function createClientPublic() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}