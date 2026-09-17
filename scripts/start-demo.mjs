process.env.PORT ??= '8080';
process.env.APP_ORIGIN ??= `http://localhost:${process.env.PORT}`;
await import('../server/index.ts');
