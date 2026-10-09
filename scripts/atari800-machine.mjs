// The emulated machine (S5-1, plan docs/plans/s5-boss-regions.md §4.7; owner
// decision: the target is the 64 KB Atari 65XE / 800XL class, PAL; the 130XE
// is a compatibility check only). Every Atari800 launch in the repository
// takes its machine flag from here - tests/target-machine.test.mjs refuses a
// literal machine flag anywhere else.
//
// Atari800: -xl is the 800XL with 64 KB (the 65XE's memory map: no PORTB bank
// switching); -xe is the 130XE with 128 KB.
export const TARGET_MACHINE = "-xl";
export const TARGET_MACHINE_NAME = "64 KB Atari 800XL / 65XE class";
// One boot-smoke session (scripts/runtime-wall-trace.mjs) runs on it, labelled.
export const COMPATIBILITY_MACHINE = "-xe";
export const COMPATIBILITY_MACHINE_NAME = "130XE (128 KB) compatibility check";
