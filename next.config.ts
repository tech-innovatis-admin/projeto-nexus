const nextConfig = {
  eslint: {
    // Ignorar erros de ESLint durante o build para produção
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar erros de TypeScript durante o build para produção
    ignoreBuildErrors: true,
  },
};

export default nextConfig;