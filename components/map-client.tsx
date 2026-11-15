"use client";

import { useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import L from "leaflet";

import MapMarkerComponent, { MarkerVariant } from "./map-marker";

export interface MapMarkerData {
  /** Identificador estable: permite mantener abierto su popup al refrescar. */
  id?: string;
  lat: number;
  lng: number;
  label?: string;
  popupHtml?: string;
  variant?: MarkerVariant;
}

export interface MapClientProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  showPolygon?: boolean;
  polygonColor?: string;
  className?: string;
  /** Punto provisional (p. ej. la baliza que se está dando de alta). */
  pendingPoint?: [number, number] | null;
  /** Si está activo, el cursor cambia y cada click llama a `onMapClick`. */
  picking?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

function markerIcon(label?: string, variant: MarkerVariant = "ok") {
  return L.divIcon({
    html: renderToString(
      <MapMarkerComponent label={label} variant={variant} />,
    ),
    className: "",
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });
}

export default function MapClient({
  center = [41.683298, -0.88442],
  zoom = 17,
  markers = [],
  showPolygon = true,
  polygonColor = "#22c55e",
  className = "",
  pendingPoint = null,
  picking = false,
  onMapClick,
}: MapClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  // Popup abierto, para reabrirlo cuando los marcadores se redibujan.
  const openPopupIdRef = useRef<string | null>(null);
  const redrawingRef = useRef(false);

  onMapClickRef.current = onMapClick;

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      dragging: true,
      zoomControl: false,
    });

    // Zoom abajo a la derecha: arriba a la izquierda va "¿Qué quieres plantar?".
    L.control.zoom({ position: "bottomright" }).addTo(map);

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

    map.on("click", (e: L.LeafletMouseEvent) =>
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng),
    );

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redibujar marcadores/polígono cuando cambian.
  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) return;
    const reopenId = openPopupIdRef.current;

    redrawingRef.current = true;
    layer.clearLayers();
    redrawingRef.current = false;

    if (showPolygon && markers.length >= 3) {
      L.polygon(
        markers.map((m) => [m.lat, m.lng] as L.LatLngTuple),
        {
          color: polygonColor,
          weight: 2,
          fillColor: polygonColor,
          fillOpacity: 0.25,
        },
      ).addTo(layer);
    }

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(m.label, m.variant),
        zIndexOffset: m.variant === "down" ? 1000 : 0,
      }).addTo(layer);

      if (!m.popupHtml) return;
      marker.bindPopup(m.popupHtml, { maxWidth: 300 });
      marker.on("popupopen", () => (openPopupIdRef.current = m.id ?? null));
      marker.on("popupclose", () => {
        if (!redrawingRef.current) openPopupIdRef.current = null;
      });
      if (m.id && m.id === reopenId) marker.openPopup();
    });

    if (pendingPoint) {
      L.marker(pendingPoint, {
        icon: markerIcon("Nueva", "pending"),
        interactive: false,
      }).addTo(layer);
    }
  }, [markers, pendingPoint, showPolygon, polygonColor]);

  useEffect(() => {
    const el = mapRef.current?.getContainer();

    if (el) el.style.cursor = picking ? "crosshair" : "";
  }, [picking]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
