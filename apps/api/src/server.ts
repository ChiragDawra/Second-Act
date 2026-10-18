import { networkInterfaces } from 'node:os';
import { createApp } from './app.ts';
import { createSupabaseVerifier } from './auth/verifier.ts';
import { loadConfig } from './config.ts';
import { createPgDb } from './db/pg.ts';

const config = loadConfig();
const db = createPgDb(config.SUPABASE_DB_URL);
const auth = createSupabaseVerifier(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
const app = createApp({ db, auth, adminEmails: config.ADMIN_EMAILS, corsOrigins: config.CORS_ORIGINS, logRequests: true });

const server = app.listen(config.PORT, config.HOST, async () => {
  const latency = await db.ping().catch((e: Error) => {
    console.error(`Database check failed: ${e.message}`);
    return null;
  });
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => `http://${n!.address}:${config.PORT}`);
  console.log(`Second Act API listening on http://localhost:${config.PORT}`);
  if (lan.length) console.log(`On your network (use one as EXPO_PUBLIC_API_URL for phones): ${lan.join(', ')}`);
  console.log(latency === null ? 'Database: UNREACHABLE — check SUPABASE_DB_URL' : `Database: ok (${latency} ms)`);
});

const shutdown = () => {
  server.close(() => void db.close().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
