import { createApp } from './app.js';
import { createRuntime } from './runtime.js';
const port = Number(process.env.PORT ?? 3001);
const runtime = await createRuntime();
const server = createApp(runtime).listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(`Research Twin synthetic demo: http://localhost:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () =>
    server.close(() => {
      runtime.close();
      process.exit(0);
    }),
  );
