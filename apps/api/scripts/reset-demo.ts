/**
 * Restores the synthetic Harpreet scenario (same as the admin console's
 * "Reset demo" button). Identities and passwords are not touched.
 * Usage: npm run demo:reset
 */
import { resetScenario } from '../src/seed/scenario.ts';
import { connectDb, step } from './lib.ts';

const db = connectDb();
try {
  step('Resetting the Harpreet scenario');
  const s = await resetScenario(db, { userId: null, role: 'cli' });
  console.log(`  ✓ ${s.scenario_version} reset at ${s.reset_at}: ${s.profiles_reset} profiles, ${s.skills_seeded} inferred skills`);
} finally {
  await db.close();
}
