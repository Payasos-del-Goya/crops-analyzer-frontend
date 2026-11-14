"use client";

import dynamic from "next/dynamic";
import type { MapClientProps } from "./map-client";

// Leaflet requires `window`, so we must skip SSR
const MapClient = dynamic(() => import("./map-client"), { ssr: false });

export type { MapMarker, MapClientProps } from "./map-client";

export default function Map(props: MapClientProps) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <MapClient {...props} />
    </div>
  );
}
