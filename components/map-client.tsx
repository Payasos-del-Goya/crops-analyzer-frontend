"use client";

import { useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import L from "leaflet";

import MapMarkerComponent, {
  MARKER_SIZE,
  MarkerRole,
  MarkerVariant,
} from "./map-marker";

export interface MapMarkerData {
  /** Identificador estable: permite mantener abierto su popup al refrescar. */
  id?: string;
  lat: number;
  lng: number;
  label?: string;
  popupHtml?: string;
  variant?: MarkerVariant;
  role?: MarkerRole;
}

/** Enlace de la red mesh entre dos marcadores (por id). */
export interface MapLink {
  from: string;
  to: string;
  /** route: camino real hacia el puente; mesh: vecinos en la malla. */
  kind: "route" | "mesh";
  down?: boolean;
}

export interface MapClientProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  links?: MapLink[];
  className?: string;
  /** Punto provisional (p. ej. la baliza que se está dando de alta). */
  pendingPoint?: [number, number] | null;
  /** Si está activo, el cursor cambia y cada click llama a `onMapClick`. */
  picking?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

function markerIcon(
  label?: string,
  variant: MarkerVariant = "ok",
  role: MarkerRole = "nodo",
) {
  return L.divIcon({
    html: renderToString(
      <MapMarkerComponent label={label} role={role} variant={variant} />,
    ),
    className: "",
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    popupAnchor: [0, -MARKER_SIZE / 2],
  });
}

const LINK_STYLE: Record<string, L.PolylineOptions> = {
  route: { color: "#34d399", weight: 3, opacity: 0.9, className: "mesh-route" },
  mesh: {
    color: "#d1fae5",
    weight: 3,
    opacity: 0.85,
    dashArray: "1 8",
    lineCap: "round",
  },
  down: { color: "#f87171", weight: 2.5, opacity: 0.85, dashArray: "4 6" },
};

export default function MapClient({
  center = [41.683298, -0.88442],
  zoom = 17,
  markers = [],
  links = [],
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
  const fittedRef = useRef(false);

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

  // Redibujar marcadores y enlaces de la malla cuando cambian.
  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) return;
    const reopenId = openPopupIdRef.current;

    redrawingRef.current = true;
    layer.clearLayers();
    redrawingRef.current = false;

    const pos = Object.fromEntries(
      markers.filter((m) => m.id).map((m) => [m.id, [m.lat, m.lng]]),
    ) as Record<string, L.LatLngTuple>;

    // Primero la malla y luego las rutas, para que queden por encima.
    [...links]
      .sort((a, b) => Number(a.kind === "route") - Number(b.kind === "route"))
      .forEach((l) => {
        if (!pos[l.from] || !pos[l.to]) return;
        const style = l.down ? LINK_STYLE.down : LINK_STYLE[l.kind];

        L.polyline([pos[l.from], pos[l.to]], {
          ...style,
          interactive: false,
        }).addTo(layer);
      });

    // Encuadrar las balizas la primera vez que llegan.
    if (!fittedRef.current && markers.length > 0 && mapRef.current) {
      fittedRef.current = true;
      mapRef.current.fitBounds(
        L.latLngBounds(markers.map((m) => [m.lat, m.lng] as L.LatLngTuple)),
        { padding: [80, 80], maxZoom: 19 },
      );
    }

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(m.label, m.variant, m.role),
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
  }, [markers, links, pendingPoint]);

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
