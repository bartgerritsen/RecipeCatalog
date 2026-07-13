/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "static.ah.nl" },
      { protocol: "https", hostname: "static.ahold.com" },
      { protocol: "https", hostname: "*.ah.nl" },
    ],
  },
};

export default nextConfig;
