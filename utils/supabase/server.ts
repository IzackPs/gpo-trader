import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Variáveis de ambiente Supabase em falta. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local'
    )
  }
  return { url, key }
}

/**
 * Cliente com sessão (cookies). Usar em rotas que dependem do utilizador (auth, criar oferta, etc.).
 * Nota: chamar cookies() torna a rota dinâmica e desativa ISR.
 */
export async function createClient() {
  const { url, key } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(
    url,
    key,
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
  const { url, key } = getSupabaseEnv()
  return createSupabaseClient(url, key)
}