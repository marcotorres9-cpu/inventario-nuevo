/** @type {import('next').NextConfig} */
const nextConfig = {
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
