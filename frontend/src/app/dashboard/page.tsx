"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/providers/SupabaseProvider";
import { useRouter } from "next/navigation";

import { listSheets, createSheet } from "@/services/sheets";

export default function DashboardPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [user, setUser] = useState<any>(null);
  const [sheets, setSheets] = useState<any[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(true);

  // Carrega sessão e planilhas
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }

      setUser(data.user);

     // const list = await listSheets();
     const list = await listSheets(data.user.id);
      setSheets(list);
      setLoadingSheets(false);
    }

    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  async function handleCreateSheet() {
    const title = prompt("Nome da nova planilha:");
    if (!title) return;

    const sheet = await createSheet(title);
    setSheets([sheet, ...sheets]);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {user && (
        <p className="mb-6">
          Logado como: <strong>{user.email}</strong>
        </p>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleCreateSheet}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          ➕ Nova Planilha
        </button>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Sair
        </button>
      </div>

      <hr className="my-6" />

      <h2 className="text-xl font-semibold mb-3">Minhas Planilhas</h2>

      {loadingSheets && <p>Carregando...</p>}

      {!loadingSheets && sheets.length === 0 && (
        <p>Nenhuma planilha criada ainda.</p>
      )}

      <ul className="mt-4">
        {sheets.map((sheet) => (
          <li
            key={sheet.id}
            className="p-3 border rounded cursor-pointer hover:bg-gray-100 mb-2"
            onClick={() => router.push(`/sheet/${sheet.id}`)}
          >
            📄 {sheet.title}
            <br />
            <span className="text-sm text-gray-500">
              Criada em: {new Date(sheet.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
