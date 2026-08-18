import { loadPgPoolForStore, activePgPools, isPgActive } from './src/db/connection';
async function test() {
  await loadPgPoolForStore('default');
  console.log("activePgPools['default']:", !!activePgPools['default']);
  console.log("isPgActive:", isPgActive());
}
test().catch(console.error);
