import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('offline application shell', () => {
  it('does not load styling, fonts, or modules from a CDN', () => {
    const sources = [
      readFileSync(resolve(process.cwd(), 'index.html'), 'utf8'),
      ...readdirSync(resolve(process.cwd(), 'components'))
        .filter(name => name.endsWith('.tsx'))
        .map(name => readFileSync(resolve(process.cwd(), 'components', name), 'utf8')),
    ].join('\n');
    expect(sources).not.toContain('cdn.tailwindcss.com');
    expect(sources).not.toContain('fonts.googleapis.com');
    expect(sources).not.toContain('fonts.gstatic.com');
    expect(sources).not.toContain('esm.sh');
  });
});
