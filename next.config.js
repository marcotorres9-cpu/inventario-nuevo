/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force this directory as root to avoid workspace detection issues
  outputFileTracingRoot: '/home/z/my-project/inventario-nuevo',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/app.html',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
