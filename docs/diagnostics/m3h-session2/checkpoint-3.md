# M3-H checkpoint 3 — readable Bomber ramp

OWNER-SMOKE CANDIDATE. Owner passed checkpoint 2 at `f33fcdc` and authorized
3–6; next owner smoke is after 6. HP1..5 use luminances 4/6/8/8/8, hue C;
flash/charge priority and +4 remain. No movement, fire, HP or damage wiring change.

Normal gated build PASS; focused Bomber/package/look tests **31/31 PASS**.
Linked NMOS matched-state member ticks add **3–4 instruction cycles**, 6–8 per
pair (90 cases: difficulties, slots, HP, cruise/charge/flash); no new row-tick
or idle dispatcher work. Native DMA-on quick checks follow final integration.
Arena **830/832 B (+3)**; window **2,159 B (+91 for session, +6 this checkpoint)**.
Home 612/1,920; content record 15 sectors unchanged. No reserved range changes.

[Measurements and play ATR SHA-256](checkpoint-3.json). Play ATR:
`build/play/m3h-session2/checkpoint-3/campaign.atr`. No damage holes are enabled.
