"use client";

import { useCallback, useRef } from "react";
import { renderToString } from "react-dom/server";
import L from "leaflet";
import MapMarkerComponent from "./map-marker";

export interface MapMarkerData {
  lat: number;
  lng: number;
  label?: string;
  popupHtml?: string;
}

export interface MapClientProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  showPolygon?: boolean;
  polygonColor?: string;
  className?: string;
}

export default function MapClient({
  center = [41.683298, -0.88442],
  zoom = 17,
  markers = [],
  showPolygon = true,
  polygonColor = "#22c55e",
  className = "",
}: MapClientProps) {
  const mapRef = useRef<L.Map | null>(null);

  const containerCallback = useCallback(
    (el: HTMLDivElement | null) => {
      // Cleanup previous instance
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      if (!el) return;

      const map = L.map(el, {
        center,
        zoom,
        scrollWheelZoom: true,
        dragging: true,
      });

      mapRef.current = map;

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
        const html = renderToString(<MapMarkerComponent label={m.label} />);
        const icon = L.divIcon({
          html,
          className: "",
          iconSize: [32, 48],
          iconAnchor: [16, 48],
          popupAnchor: [0, -48],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        if (m.popupHtml) marker.bindPopup(m.popupHtml);
      });

      if (showPolygon && markers.length >= 3) {
        const latlngs: L.LatLngExpression[] = markers.map((m) => [m.lat, m.lng]);
        L.polygon(latlngs, {
          color: polygonColor,
          weight: 2,
          fillColor: polygonColor,
          fillOpacity: 0.25,
        }).addTo(map);
      }

      setTimeout(() => map.invalidateSize(), 200);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div
      ref={containerCallback}
      className={className}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
