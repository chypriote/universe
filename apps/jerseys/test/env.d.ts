/// <reference types="@cloudflare/vitest-plugin/types" />

declare namespace Cloudflare {
	interface Env {
		TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
		OWNER_PASSWORD: string;
		JWT_SECRET: string;
		THESPORTSDB_KEY: string;
	}
}
