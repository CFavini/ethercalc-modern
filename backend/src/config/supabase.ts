import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Força o carregamento da raiz do backend
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
