import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Força o carregamento da raiz do backend
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

// 🚀 Ação: Cria e exporta o cliente Supabase. 
// O '!' garante ao TypeScript que as variáveis existem no runtime. 
export const supabase = createClient(supabaseUrl, supabaseKey); 
console.log("Supabase client initialized."); 
// NOTA: Para chamadas de autenticação (auth.service.ts), o Supabase consegue 
// usar a chave service_key, mas para chamadas REST ao banco com RLS, 
// o cliente precisa de um JWT de um usuário logado.