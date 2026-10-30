# M3-H session 2 — checkpoint 1

H16 metadata and H10/H11 default body install, before any new look or holes.
Baseline main `7fe9040`. Owner authorizes proceeding to checkpoint 2 without
an intermediate owner-smoke pause. This is not owner-accepted gameplay.

The ASM admission wrapper calls existing C profile selection, resets eight
metadata bytes, installs body base/height/member indices, and returns to the
unchanged colour publisher before either forced PMG draw. Body bytes stay in
the original roster. The existing 32-B damage buffer is never read/copied by
this checkpoint. Fixed operands and source-table addresses are link-asserted.

MEASURED: window **2,068→2,112 B (+44)**, arena827 unchanged, content612
unchanged; new BSS8 B at `$54BE–$54C5` leaves30 B to STARFIELD. No reservation
or phase claim grows. Total additional used RAM52 B (44 resident code +8 B
state); body buffer32 B was already reserved. Initial content12,865 and all
eleven record sector counts remain unchanged; transport211 sectors.
Record8 packed1,726/1,771; BROADSIDE5,592/5,611, both retain their sectors.
[Manifest-derived evidence and ATR SHA-256s](checkpoint-1.json).

Actual NMOS old/new body-loop comparison covers two shapes, both slots and11
clipped Y values: exact PMG equality, **−8 cycles per forced copy**, identical
idle cycles and zero stationary PMG writes. Poisoned metadata resets correctly
through repeated Raider/Bomber admissions; the lazy body buffer stays intact.
Every common later BROADSIDE label is unchanged. Existing movement/hold/dodge,
pause/resume, hit cleanup and both full-draw paths pass their focused checks.

Reset (E/M/H identical): assault1,804, armoured1,806, Bomber2,449 cycles;
delta versus session-1 current main **+129**, versus Phase0 +192/+194/+204.
The historical combined+150 component target is exceeded by42/44/54, reported
under current AGENTS policy. No frame gate is weakened. Assault moving-path
work saves the measured8 cycles per copy; no Director row-tick work is added.

Normal build/computed gates PASS with stale release evidence pending.
Focused45: **44 PASS/1 shared FAIL**, exact first assertion matched to main
in [focused audit](checkpoint-1-focused.json). Two self-resolved stale cases:
the old reset component stop is now a measured report as required by the
current gate policy; the source-pattern pin follows admission-cached height,
with real NMOS plane/cycle coverage replacing the old per-copy lookup pin.
Full-suite task comparison is performed at checkpoint2 delivery, not repeated
between these incremental commits.

Both registered quick native routes PASS: Spread NORMAL30,465;
capital-960 NORMAL31,153; worst **31,153**, hard margin1,415. No misses, extra
VBI, DLI errors, shifted rows or stale L2 accesses. No full native/home matrix,
separate boss stress, boot or release trace. Play ATRs live under
`build/play/m3h-session2/checkpoint-1/`. Build/log/native files live under
`build/m3h-session2/checkpoint-1/`; emulator source is private/in-repo.

NEXT: checkpoint2, payload-driven armoured Raider art, then owner smoke pause.
