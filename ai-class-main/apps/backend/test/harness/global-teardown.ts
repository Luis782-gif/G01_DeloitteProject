export default async function globalTeardown() {
  await (globalThis as any).__TEST_PG__?.stop();
}
