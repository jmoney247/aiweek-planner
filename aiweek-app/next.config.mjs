/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the map/leaflet imports working cleanly with SSR.
  // (Leaflet itself is only ever imported inside client components
  // loaded via dynamic(..., { ssr: false }).)
};

export default nextConfig;
