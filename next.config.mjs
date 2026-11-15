const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin el botón «N» de Next en desarrollo (tapa el mapa); los errores se siguen mostrando.
  devIndicators: false,
  // Proxy del backend: el navegador llama a /api/* (mismo origen) y Next lo
  // reenvía a FastAPI, así no hace falta configurar CORS en el backend.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
};

export default nextConfig;
