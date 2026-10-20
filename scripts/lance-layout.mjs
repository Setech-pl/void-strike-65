// M6 stage 1 (docs/plans/m6-void-lance.md §3, §6; owner decision BD 6): the
// lance run's layout check, shared by scripts/build.mjs and its test
// (tests/lance.test.mjs). The lance's RAM is the top of the window's unclaimed
// tail, allocated from $BBFF down; its disk run the boss code reservation's
// last sectors. The window's record grows up from $AE00 into the same tail:
// the build fails when the two meet.
export const LANCE_RAM_END = 0xbc00;

// The charge (decisions BD 2, BF; tuned at the owner's smoke): FIRE + stick UP
// held this many frames over a target fires the lance (75: 1.5 s at 50 Hz),
// and while it builds the ship moves at 1 / LANCE_CHARGE_SPEED_DIVISOR of its
// speed in every direction (a power of two; 1: full speed). scripts/build.mjs
// passes both to src/c/lance.c and src/hybrid/lance.s and records them in the
// manifest (boss.lance).
export const LANCE_CHARGE_FRAMES = 75;
export const LANCE_CHARGE_SPEED_DIVISOR = 2;

// windowEnd: the address after the window's last byte (the Light kernel
// link's __LIGHT_KERNEL_RAM_LAST__); address / bytes: the lance's RAM; used:
// the bytes its segments take; sector / sectors: its run; reservationEnd: the
// sector after the boss code reservation.
export function checkLanceLayout({ windowEnd, address, bytes, used, sector, sectors, reservationEnd }) {
  const hex = (value) => `$${value.toString(16).toUpperCase()}`;
  if (!Number.isInteger(windowEnd) || windowEnd > address) {
    throw new Error(`M6 (decision BD 6): the window's record ends at ${hex(windowEnd ?? 0)}, ` +
      `inside the lance's RAM ${hex(address)}-${hex(LANCE_RAM_END - 1)}`);
  }
  if (address + bytes !== LANCE_RAM_END || bytes !== sectors * 128 || !(used > 0 && used <= bytes) ||
    sector + sectors !== reservationEnd) {
    throw new Error(`M6: the lance run is ${used} B; it lands in ${bytes} (${sectors} sectors, ` +
      `${hex(address)}-${hex(LANCE_RAM_END - 1)}, sectors ${sector}-${sector + sectors - 1}; the reservation ends ` +
      `before ${reservationEnd})`);
  }
  return { windowSlack: address - windowEnd, free: bytes - used };
}
