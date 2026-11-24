import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

// Tests run in the Workers runtime (workerd) on a real local D1. The schema migrations are applied
// (test/apply-migrations.ts); the data migration is left out so each test seeds the rows it needs.
export default defineConfig(async () => {
  const migrations = (await readD1Migrations('./migrations')).filter(
    (migration) => !migration.name.includes('journal_data'),
  );
  return {
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: '2026-08-01',
          d1Databases: ['DB'],
          r2Buckets: ['PHOTOS'],
          bindings: {
            TEST_MIGRATIONS: migrations,
            PHOTOS_URL: 'https://photos.test',
            OWNER_PASSWORD: 'test-password',
            JWT_SECRET: 'test-jwt-secret',
          },
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
