import { mkdirSync, chownSync, chmodSync } from 'node:fs';

mkdirSync('/data', { recursive: true, mode: 0o700 });
chownSync('/data', 1000, 1000);
chmodSync('/data', 0o700);
