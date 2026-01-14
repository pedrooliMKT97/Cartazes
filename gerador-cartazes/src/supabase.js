import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Trava de Segurança: Se não tiver chave, avisa no console e não quebra o site
if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 ERRO CRÍTICO: As chaves do Supabase não foram encontradas!");
  console.error("Crie um arquivo .env.local na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY");
}

// Cria o cliente (mesmo que vazio, para não travar a tela branca imediata)
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder")