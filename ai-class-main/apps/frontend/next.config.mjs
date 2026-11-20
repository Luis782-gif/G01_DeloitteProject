/** O browser só fala com o Next; o Next reencaminha /api/* para o backend (BACKEND_URL). */
const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';

export default {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};
