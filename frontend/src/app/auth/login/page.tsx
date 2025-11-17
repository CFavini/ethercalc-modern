"use client";

import { useState } from "react";
import { useSupabase } from "@/providers/SupabaseProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col gap-4 p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Login</h1>

      <input
        className="p-2 border rounded"
        placeholder="E-mail"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        className="p-2 border rounded"
        placeholder="Senha"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="p-2 bg-blue-600 text-white rounded"
        onClick={handleLogin}
      >
        Entrar
      </button>
    </div>
  );
}
