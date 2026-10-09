/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle for small container images.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
