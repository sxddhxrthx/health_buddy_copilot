import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve('.local/e2e');
rmSync(directory, { recursive: true, force: true });
process.env.RESEARCH_TWIN_DATA_DIR = directory;
process.env.APP_ORIGIN = 'http://127.0.0.1:3001';
process.env.PORT = '3001';
await import('../../server/index.js');
