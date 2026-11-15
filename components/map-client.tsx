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
  /** Color de su zona en la recomendación. */
  zoneColor?: string;
}

/** Superficie de una zona: polígonos rellenos de su color y su nombre en el centro. */
export interface MapArea {
  color: string;
  polygons: [number, number][][];
  label?: { lat: number; lng: number; text: string };
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
  areas?: MapArea[];
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
  zoneColor?: string,
) {
  return L.divIcon({
    html: renderToString(
      <MapMarkerComponent
        label={label}
        role={role}
        variant={variant}
        zoneColor={zoneColor}
      />,
    ),
    className: "",
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    popupAnchor: [0, -MARKER_SIZE / 2],
  });
}

const LABEL_MIN_ZOOM = 17;

// Estilo en línea (no en globals.css): así no depende de que el navegador
// haya recargado la hoja de estilos.
const ZONE_LABEL_STYLE =
  "position:absolute;transform:translate(-50%,-50%);white-space:nowrap;" +
  "padding:2px 8px;font-size:12px;font-weight:600;line-height:1.4;color:#fff;" +
  "background:rgba(7,19,13,0.85);border:2px solid;border-radius:6px;pointer-events:none;";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Todas las líneas llevan un "borde" oscuro debajo para verse igual sobre
// cualquier fondo del satélite.
const CASING: L.PolylineOptions = {
  color: "#03140c",
  opacity: 0.6,
  lineCap: "round",
};
const LINK_STYLE: Record<"route" | "mesh" | "down", L.PolylineOptions> = {
  route: { color: "#10b981", weight: 4, opacity: 1, lineCap: "round" },
  mesh: {
    color: "#a7f3d0",
    weight: 2.5,
    opacity: 0.95,
    dashArray: "6 6",
    lineCap: "round",
  },
  down: { color: "#f87171", weight: 3, opacity: 0.95, dashArray: "6 6" },
};

export default function MapClient({
  center = [41.683298, -0.88442],
  zoom = 17,
  markers = [],
  links = [],
  areas = [],
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
      // Sin botones: se acerca con la rueda o pellizcando.
      zoomControl: false,
    });

    // Sin el «Leaflet» delante: solo el crédito de las imágenes, que Esri exige.
    map.attributionControl.setPrefix(false);

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

    // Con muchas balizas juntas los nombres se pisan al alejarse: por debajo
    // de LABEL_MIN_ZOOM solo se ven los iconos (y el nombre de las caídas).
    const toggleLabels = () =>
      map
        .getContainer()
        .classList.toggle("labels-hidden", map.getZoom() < LABEL_MIN_ZOOM);

    map.on("zoomend", toggleLabels);
    toggleLabels();

    map.on("click", (e: L.LeafletMouseEvent) =>
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng),
    );

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    fittedRef.current = false; // mapa nuevo (p. ej. remontaje en dev): volver a encuadrar

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

    // Debajo de todo, la superficie de cada zona y su nombre.
    areas.forEach((a) => {
      a.polygons.forEach((polygon) =>
        L.polygon(polygon, {
          stroke: false,
          fillColor: a.color,
          fillOpacity: 0.3,
          interactive: false,
        }).addTo(layer),
      );
    });

    // Primero la malla y luego las rutas, para que queden por encima.
    [...links]
      .sort((a, b) => Number(a.kind === "route") - Number(b.kind === "route"))
      .forEach((l) => {
        if (!pos[l.from] || !pos[l.to]) return;
        const line = [pos[l.from], pos[l.to]];
        const style = l.down ? LINK_STYLE.down : LINK_STYLE[l.kind];

        L.polyline(line, {
          ...CASING,
          weight: (style.weight ?? 2) + 3,
          interactive: false,
        }).addTo(layer);
        L.polyline(line, { ...style, interactive: false }).addTo(layer);
      });

    // Encuadrar las balizas la primera vez que llegan.
    if (!fittedRef.current && markers.length > 0 && mapRef.current) {
      fittedRef.current = true;
      mapRef.current.fitBounds(
        L.latLngBounds(markers.map((m) => [m.lat, m.lng] as L.LatLngTuple)),
        { padding: [40, 40], maxZoom: 19 },
      );
    }

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(m.label, m.variant, m.role, m.zoneColor),
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

    // Nombre del cultivo de cada zona, encima de todo.
    areas.forEach((a) => {
      if (!a.label) return;
      L.marker([a.label.lat, a.label.lng], {
        icon: L.divIcon({
          html: `<span style="${ZONE_LABEL_STYLE}border-color:${a.color}">${escapeHtml(a.label.text)}</span>`,
          className: "",
          iconSize: [0, 0],
        }),
        interactive: false,
        zIndexOffset: 2000,
      }).addTo(layer);
    });

    if (pendingPoint) {
      L.marker(pendingPoint, {
        icon: markerIcon("Nueva", "pending"),
        interactive: false,
      }).addTo(layer);
    }
  }, [markers, links, areas, pendingPoint]);

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
