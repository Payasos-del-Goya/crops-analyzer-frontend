import { redirect } from "next/navigation";

import Dashboard from "@/components/dashboard";
import { Baliza, CropInfo } from "@/lib/api";
import { backendFetch } from "@/lib/server";

export default async function Home() {
  const [balizasRes, cropsRes] = await Promise.all([
    // El backend devolvía las balizas bajo la clave `crops`; aceptamos ambas.
    backendFetch<{ balizas?: Baliza[]; crops?: Baliza[] }>("/balizas"),
    backendFetch<{ crops?: CropInfo[] }>("/crops_info"),
  ]);

  // Sesión caducada o no válida.
  if (
    (!balizasRes.ok && balizasRes.unauthorized) ||
    (!cropsRes.ok && cropsRes.unauthorized)
  )
    redirect("/login");

  const balizas = balizasRes.ok
    ? (balizasRes.data.balizas ?? balizasRes.data.crops ?? [])
    : [];

  return (
    <Dashboard
      backendError={!balizasRes.ok || !cropsRes.ok}
      crops={cropsRes.ok ? (cropsRes.data.crops ?? []) : []}
      initialBalizas={balizas}
    />
  );
}
