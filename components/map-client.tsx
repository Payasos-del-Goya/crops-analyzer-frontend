"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapMarker {
  lat: number;
  lng: number;
  popupHtml?: string;
}

export interface MapClientProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
}

export default function MapClient({
  center = [41.683298, -0.88442],
  zoom = 17,
  markers = [],
  className = "",
}: MapClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!mounted || !el) return;

    // Clean any existing instance on this container
    if ((el as any)._leaflet_id) {
      (el as any)._leaflet_id = null;
      el.innerHTML = "";
    }

    const map = L.map(el, {
      center,
      zoom,
      scrollWheelZoom: true,
      dragging: true,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      },
    ).addTo(map);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { pane: "overlayPane" },
    ).addTo(map);

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng]).addTo(map);
      if (m.popupHtml) marker.bindPopup(m.popupHtml);
    });

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
    };
  }, [mounted]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: "100%", width: "100%" }}
    />
  );
}
