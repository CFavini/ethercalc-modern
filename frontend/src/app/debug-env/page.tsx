export default function DebugEnv() {
  return (
    <pre>
{JSON.stringify(
  {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  null,
  2
)}
    </pre>
  );
}
