const nextConfig = {
  eslint: {
    // Ignorar erros de ESLint durante o build para produção
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar erros de TypeScript durante o build para produção
    ignoreBuildErrors: true,
  },
  // Configuração para Docker - standalone output
  output: 'standalone',
  // Otimizações para produção
  compress: true,
  poweredByHeader: false,
  // Configuração de imagens para Docker
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
};

export default nextConfig;