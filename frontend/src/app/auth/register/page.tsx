"use client";

import { useState } from "react";
import { useSupabase } from "@/providers/SupabaseProvider";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    alert("Conta criada! Verifique seu e-mail.");
    router.push("/auth/login");
  }

  return (
    <div className="flex flex-col gap-4 p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Criar Conta</h1>

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
        className="p-2 bg-green-600 text-white rounded"
        onClick={handleRegister}
      >
        Registrar
      </button>
    </div>
  );
}
