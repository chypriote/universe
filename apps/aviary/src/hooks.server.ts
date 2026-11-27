import { catalogFromPlatform } from '#lib/server/catalog';
import { createGuard } from '#lib/server/guard';

export const handle = createGuard((token) => catalogFromPlatform().verifyToken(token));
