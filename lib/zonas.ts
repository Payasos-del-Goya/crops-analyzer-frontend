/**
 * Superficie de cada zona en el mapa: a cada baliza le toca el terreno que
 * tiene más cerca (celda de Voronoi), recortado al contorno de la finca
 * (envolvente convexa de todas las balizas, un poco ampliada). Las celdas de
 * una zona juntas son su superficie: no se solapan con las de otras zonas.
 */
type XY = [number, number];
export type LatLng = [number, number];

/** Margen alrededor de las balizas del borde, en metros. */
const MARGIN_M = 25;

function projector(lat0: number) {
  const k = 111_320 * Math.cos((lat0 * Math.PI) / 180);

  return {
    toXY: ([lat, lng]: LatLng): XY => [lng * k, lat * 110_540],
    toLatLng: ([x, y]: XY): LatLng => [y / 110_540, x / k],
  };
}

const cross = (o: XY, a: XY, b: XY) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Envolvente convexa (cadena monótona), en sentido antihorario. */
function hull(points: XY[]): XY[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  if (p.length < 3) return p;
  const lower: XY[] = [];
  const upper: XY[] = [];

  for (const q of p) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0
    )
      lower.pop();
    lower.push(q);
  }
  for (const q of [...p].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0
    )
      upper.pop();
    upper.push(q);
  }

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Aleja cada vértice del centro `margin` metros (contorno con margen). */
function grow(polygon: XY[], margin: number): XY[] {
  const cx = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;

  return polygon.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;

    return [x + ((x - cx) / d) * margin, y + ((y - cy) / d) * margin];
  });
}

/** Parte del polígono más cerca de `a` que de `b` (Sutherland–Hodgman con la mediatriz). */
function clipCloser(polygon: XY[], a: XY, b: XY): XY[] {
  const nx = b[0] - a[0];
  const ny = b[1] - a[1];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const side = (p: XY) => (p[0] - mx) * nx + (p[1] - my) * ny; // <= 0: lado de a
  const out: XY[] = [];

  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    const sp = side(p);
    const sq = side(q);

    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);

      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  });

  return out;
}

/** Área (con signo) y centroide de un polígono. */
function areaCentroid(polygon: XY[]): { area: number; c: XY } {
  let a = 0;
  let cx = 0;
  let cy = 0;

  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    const f = p[0] * q[1] - q[0] * p[1];

    a += f;
    cx += (p[0] + q[0]) * f;
    cy += (p[1] + q[1]) * f;
  });

  return { area: a / 2, c: a ? [cx / (3 * a), cy / (3 * a)] : polygon[0] };
}

/** ¿Está p dentro del polígono convexo? (las celdas de Voronoi lo son) */
function insideConvex(p: XY, polygon: XY[]): boolean {
  let sign = 0;

  for (let i = 0; i < polygon.length; i++) {
    const c = cross(polygon[i], polygon[(i + 1) % polygon.length], p);

    if (c === 0) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }

  return true;
}

export interface ZoneArea {
  polygons: LatLng[][];
  /** Dónde poner el nombre: centro de la superficie si cae dentro, si no el de su trozo mayor. */
  label: LatLng;
}

/**
 * Superficie (lat, lng) de cada zona y dónde escribir su nombre.
 * `points`: posición de cada baliza; `zoneOf`: zona de cada baliza.
 */
export function zoneAreas(
  points: Record<string, LatLng>,
  zoneOf: Record<string, number>,
): Record<number, ZoneArea> {
  const ids = Object.keys(zoneOf).filter((id) => points[id]);

  if (ids.length === 0) return {};
  const { toXY, toLatLng } = projector(points[ids[0]][0]);
  const xy = Object.fromEntries(
    ids.map((id) => [id, toXY(points[id])]),
  ) as Record<string, XY>;
  const outline = grow(hull(ids.map((id) => xy[id])), MARGIN_M);
  const cells: Record<number, XY[][]> = {};

  if (outline.length < 3) return {};
  ids.forEach((id) => {
    let cell = outline;

    for (const other of ids) {
      if (other === id || cell.length === 0) continue;
      const [ax, ay] = xy[id];
      const [bx, by] = xy[other];

      if (ax === bx && ay === by) continue; // dos balizas en el mismo punto
      cell = clipCloser(cell, xy[id], xy[other]);
    }
    if (cell.length >= 3) (cells[zoneOf[id]] ??= []).push(cell);
  });

  const areas: Record<number, ZoneArea> = {};

  Object.entries(cells).forEach(([zone, polygons]) => {
    const parts = polygons.map((p) => ({ p, ...areaCentroid(p) }));
    const total = parts.reduce((s, x) => s + Math.abs(x.area), 0) || 1;
    const centre: XY = [
      parts.reduce((s, x) => s + x.c[0] * Math.abs(x.area), 0) / total,
      parts.reduce((s, x) => s + x.c[1] * Math.abs(x.area), 0) / total,
    ];
    const largest = parts.reduce((a, b) =>
      Math.abs(b.area) > Math.abs(a.area) ? b : a,
    );
    const label = parts.some((x) => insideConvex(centre, x.p))
      ? centre
      : largest.c;

    areas[Number(zone)] = {
      polygons: polygons.map((p) => p.map(toLatLng)),
      label: toLatLng(label),
    };
  });

  return areas;
}
