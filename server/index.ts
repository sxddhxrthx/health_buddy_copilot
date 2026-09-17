import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3001);
const server = createApp().listen(port, '0.0.0.0', () =>
  console.log(`Research Twin synthetic demo: http://localhost:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
