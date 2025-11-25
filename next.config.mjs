/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Ignora erros do ESLint durante o build de produção
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;


