"use client";

import dynamic from "next/dynamic";
import type { MapClientProps } from "./map-client";

// Leaflet requires `window`, so we must skip SSR
const MapClient = dynamic(() => import("./map-client"), { ssr: false });

export type { MapMarkerData, MapClientProps } from "./map-client";

export default function Map(props: MapClientProps) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-emerald-950/40 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <MapClient {...props} />
    </div>
  );
}
