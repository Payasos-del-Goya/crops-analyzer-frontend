import Dashboard from "@/components/dashboard";
import { BACKEND_URL, Baliza, CropInfo } from "@/lib/api";

async function fetchBackend<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store" });

    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [balizasRes, cropsRes] = await Promise.all([
    // El backend devolvía las balizas bajo la clave `crops`; aceptamos ambas.
    fetchBackend<{ balizas?: Baliza[]; crops?: Baliza[] }>("/balizas"),
    fetchBackend<{ crops?: CropInfo[] }>("/crops_info"),
  ]);

  return (
    <Dashboard
      backendError={!balizasRes || !cropsRes}
      crops={cropsRes?.crops ?? []}
      initialBalizas={balizasRes?.balizas ?? balizasRes?.crops ?? []}
    />
  );
}
