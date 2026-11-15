"use client";

import type { ReactNode } from "react";
import type { MapClientProps } from "./map-client";

import dynamic from "next/dynamic";

// Leaflet requires `window`, so we must skip SSR
const MapClient = dynamic(() => import("./map-client"), { ssr: false });

export type { MapMarkerData, MapClientProps, MapLink } from "./map-client";

/** `children` se pinta encima del mapa (botones, formularios...). */
export default function Map({
  children,
  ...props
}: MapClientProps & { children?: ReactNode }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-emerald-950/40">
      <MapClient {...props} />
      {children}
    </div>
  );
}
