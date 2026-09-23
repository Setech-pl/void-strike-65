 Plan — resident direct-SIO sector reader (roadmap 4.3), between-levels load into the BASIC window

 Planning session on main at b2a1710, worktree clean. Plan only; nothing implemented, nothing committed.

 Context

 Owner decisions 23 §10.1 (levels load from disk), B (the window $A000-$BC1F is open and proven), O (loader screen: AI line + per-sector animation) and W (direct SIO, not SIOV) together make a resident sector reader the next infrastructure item (project-overview.md §4.3). Without it, per-level content (hull art at 1,253 B per variant, LevelDef pages) has nowhere to come from: the resident tails are 3 B (BROADSIDE), 1 B (ENTITY_CODE) and 215 B (arena). This plan turns the reader into a bounded implementation: read-only, single device (D1:), standard speed, invoked only at a level boundary, landing whole sectors in a page-aligned buffer inside the window.

 Repo facts verified this session (and where the brief was stale)

 ┌────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │       Claim in the brief       │                                                                                             Verified state                                                                                             │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ "prior-art survey in           │ Not in the repo. No file under docs/diagnostics/ mentions HiassofT, XF551 or IRQST. The survey's conclusions exist only as the paraphrases in STATUS §W, design-4.6 §3 and project-overview.md         │
 │ docs/diagnostics"              │ §4.3/§6.2, and in the brief itself. The plan treats the brief's survey summary as the survey.                                                                                                          │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ no cli; every NMIEN store is   │ True. grep finds no cli in src/; all 11 NMIEN stores are $00 or $80; sei at start (main.s:1077) and boot_stage2_error. The game never writes IRQEN, SKCTL, SEROUT, PBCTL (no equates exist for them).  │
 │ $00/$80                        │                                                                                                                                                                                                        │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ arena 215 B free, BROADSIDE 3  │                                                                                                                                                                                                        │
 │ B, ENTITY_CODE 1 B, window     │ True at HEAD (build/manifest.json residentCapacity). Note STATUS's "Owner decision B" section still lists arena 440 / ENTITY_CODE 22 — a stale copy; the checkpoint table is right.                    │
 │ 7,194 B                        │                                                                                                                                                                                                        │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ "the frame-300 loader          │ Already fixed. STATUS "boot-smoke loader checkpoint: re-based (2026-09-20)": atr_loader_frames baseline 297 with +10 warn / +50 fail bands in docs/boot-deadline-baseline.json. A new record must      │
 │ checkpoint will trip on the    │ re-record that file deliberately (standing rule), not fight a fixed frame.                                                                                                                             │
 │ first window record"           │                                                                                                                                                                                                        │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ "Every timing figure the       │ Half true, and the half matters. Atari800's ESC_enable_sio_patch only hooks SIOV $E459 (esc.c:250). The register-level path — PBCTL bit 3 → SIO_SwitchCommandFrame, SEROUT → SIO_PutByte, SERIN fed by │
 │ emulator gives about this is   │  POKEY_DELAYED_SERIN_IRQ — runs regardless (pokey.c:291-345, sio.c:1365-1620,1842). Byte spacing is 8 scanlines (912 cycles vs the real ≈931 at 19040 baud); ACK after 44 lines; COMPLETE 32 lines     │
 │ fiction"                       │ later; data back-to-back. So the gate models the wire at roughly real speed and models no drive latency, no jitter, no errors, no command-line hold check. Per-sector wall time in the emulator ≈ 3.8  │
 │                                │ frames and is a regression signal for the reader's own overhead only, never a hardware figure.                                                                                                         │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ the OS-shadow "hard            │ Void under W. Direct SIO runs no OS code, so SDLSTL/H, RAMTOP, MEMTOP are never consulted. The plan writes none of them and the implementation commit corrects the three documents (they already       │
 │ requirement" (design-4.6 §3,   │ concede the reason was wrong).                                                                                                                                                                         │
 │ STATUS, overview §6.2)         │                                                                                                                                                                                                        │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ the level boundary exists      │ It does not. After EVENT_BOSS_HANDOFF the Director sets FLAG_COMPLETE, update_sector_completion drains into SECTOR_CAPITAL_COMPLETE, and sector_c_complete_scroll_tick returns early forever. The only │
 │                                │  boundary a level crosses today is START GAME (handle_main_menu_input → jmp start_gameplay, main.s:1544).                                                                                              │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ the XEX                        │ The README makes the ATR the product and the XEX the development build "the automated gates run against". Every wall-trace session except the ATR boot smokes runs -run x.xex with no disk mounted     │
 │                                │ (SIO_drive_status = SIO_OFF → a command frame gets silence).                                                                                                                                           │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ MAIN free bytes                │ 9 B (CODE ends $3174, RODATA ends $3FF6). Any hook in CODE must be operand-only.                                                                                                                       │
 ├────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │                                │ IRQST bit 5 (serial in) and bit 4 (out needed) latch only if the IRQEN bit is already set when the event fires ("Interrupt missed" otherwise); writing IRQEN re-arms them (IRQST |= ~byte & $F7). Bit  │
 │ emulator IRQST semantics       │ 3 (XMTDONE) is not latched: set to 1 on a SEROUT write, cleared 15 lines later unconditionally. SERIN is loaded even with the IRQ disabled. SEROUT reaches the SIO model only with SKCTL & $70 == $20  │
 │                                │ and POKEY_siocheck(): AUDF3 ∈ {$28,$10,$08,$0A}, AUDF4 = 0, AUDCTL & $28 == $28. Matches real POKEY closely enough that one code path serves both.                                                     │
 └────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Decisions for the owner at approval (defaults stated; the plan is complete under the defaults)

 1. Level-1 origin per medium (materially changes gate coverage). Default: the reader is medium-agnostic and skips the read when the buffer already holds the requested image (header magic + version + id). The XEX carries the level-1 image as an XEX-only block at LEVEL_BUFFER (behind the INITAD record the build already emits for blocks ≥ $A000), so XEX sessions never touch SIO and the PAL gate set is unchanged. The ATR does not boot-load it; every ATR cold boot readslevel 1 at START GAME, so the four ATR boot-smoke sessions exercise the reader end to end. Alternative: a tenth DFMC record boot-loads level 1 on both media (costs ATR boot sectors twice over and MAX_CHUNKS 10).
 2. Scope of the boundary. Default: this task hooks the reader at START GAME only and exposes sector_reader_load(A = level id) plus a named drain predicate for the level→level transition, which is roadmap 4.9 (score/lives/booster mustsurvive start_gameplay's init_state, a separate change). The reader's first payload is an inert, validated level-1 image; the first consumer is 4.6.
 3. Device ERROR retry. Default per the borrowed lesson: none. A 1050 has already retried internally before it answers $45; SIO2SD and emulators answer $45 only for a bad sector number or image. Alternative: one retry.

 ---

 1. The reader

 1.1 Registers and constants (new equates in src/main.s; verify every value against Altirra HRM ch. 9 before use)

 ┌────────────────────┬──────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │      Register      │                  Value                   │                                                                       Purpose                                                                        │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ PBCTL $D303        │ $34 assert command / $3C release         │ PIA CB2 drives the SIO command line                                                                                                                  │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ SKCTL $D20F        │ $13  [C1] SUPERSEDED -> $23 / $33        │ async receive (bit 4), transmit/receive clock from channel 4, keyboard scan bits left as the OS set them; $00 then $13 resets the serial shift logic │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ AUDCTL $D208       │ $28                                      │ ch3 at 1.79 MHz, ch3+ch4 joined = the 19040-baud clock                                                                                               │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ AUDF3/AUDF4        │ $28 / $00                                │ 19040 baud                                                                                                                                           │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ AUDC3/AUDC4        │ $A0                                      │ volume 0 (silence; the emulator's siocheck does not read them)                                                                                       │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ SEROUT/SERIN $D20D │ —                                        │ one register, write/read                                                                                                                             │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ IRQEN/IRQST $D20E  │ $20 in, $10 out-needed, $08 XMTDONE      │ polled with I set; no vector is ever taken                                                                                                           │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ SKSTAT $D20F read  │ b7 framing, b6 ovr [C2] -> b5            │ checked after every received byte; SKRES $D20A clears                                                                                                │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ WSYNC $D40A        │ 12 stores                                │ the 650-950 µs command hold (see 1.3)                                                                                                                │
 ├────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ VCOUNT $D40B       │ —                                        │ the timeout clock (§2)                                                                                                                               │
 └────────────────────┴──────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Audio must already be silent (pause_silence_audio zeroes AUDCTL); the reader owns POKEY from sector_reader_load entry until it returns, then leaves AUDCTL = 0, IRQEN = 0, SKCTL = $13. [C1: the resting value $13 is unchanged and correct — it is a receive-side mode. Only the value used while TRANSMITTING was wrong.]

 CORRECTIONS TO THIS SECTION — measured 2026-09-20, implementation session, commit e9f3a19

 This table was approved with three errors in it. Every value was checked against the Altirra Hardware Reference Manual 2026-01-02 edition ch. 9 and §5.6, as this section's own
 heading instructs, and three did not survive. The rows above are left as approved and marked [C1]/[C2] so the change is visible rather than silent; the contract the implementation
 is built against is the one below. Evidence: docs/diagnostics/sio-register-probe-2026-09-20.json; facts and citations: docs/diagnostics/sio-protocol-facts.md.

 [C1] SKCTL — the serious one.
      Plan said:  $13 for both directions.
      It is:      $23 to transmit the command frame, $33 to receive the reply and data.
      Source:     HRM §5.6 Table 10 (p.115) gives the mode table; Figure 9 (p.116) captures both values by name — "transmitting $4F at 19200 baud with SKCTL=$23" and "receiving
                  $43 at 19200 baud with SKCTL=$33 (asynchronous)". Corroborated independently by Atari800 src/pokey.c:301, which hands SEROUT to the SIO device model only when
                  (POKEY_SKCTL & 0x70) == 0x20.
      Why:        $13 is clock mode %001, whose OUTPUT clock is the external clock — a line nothing on a standard SIO bus drives. A command frame written to SEROUT in that mode is
                  never clocked onto the wire.
      Measured:   with $13 a mounted ATR answers silence, byte-identical to having no disk. As approved, this reader would have returned NO_DEVICE on every medium, forever, and
                  every automated gate would have passed it: the XEX sessions expect silence, and the ATR boot smoke did not yet assert an image.

 [C2] SKSTAT error mask.
      Plan said:  bit 7 framing, bit 6 overrun (mask $C0).
      It is:      bit 7 framing, bit 5 serial overrun (mask $A0). Bit 6 is the KEYBOARD overrun.
      Source:     HRM SKSTAT register reference (D7 SF, D6 KO, D5 SO, D4 SI). HRM §5.6 n.21 (p.114) footnotes this exact confusion: "Credit to HiassofT for noting that the SKSTAT
                  reference on [ATA82] III.18 has D5 and D6 swapped."
      Why:        mask $C0 watches the keyboard, not the wire. Every real serial overrun would read as clean and land a corrupt byte in the buffer, leaving the data-frame checksum
                  as the only defence against a class the hardware can report directly.

 [C3] The command frame is missing its first delay — see §1.2.
      Plan said:  one hold, 650-950 us, after the five bytes and before the command line is raised (12 x WSYNC).
      It is:      TWO delays. HRM ch.9 step 1 (p.218) also requires 750-1600 us AFTER asserting the command line and BEFORE the first byte: "A delay of 750us-1600us is introduced
                  for the peripheral to notice the command line state."
      Note:       the manual's "the OS violates the minimum on this" caveat attaches to the SECOND delay, not this one.
      Why:        without it a peripheral may still be sampling the command line when the first byte arrives, and miss the frame.
      Visibility: the emulator models no command-line hold at all, so this one cannot fail a gate in either direction. It is hardware-only correctness — emulator-green, and
                  intermittently deaf on a real drive. 16 x WSYNC ~ 1028 us sits inside the window with margin at both ends.

 Verified correct and unchanged, with citations, in sio-protocol-facts.md: PBCTL $34/$3C (HRM ch.2 p.34, verbatim), AUDCTL $28, AUDF3/AUDF4 $28/$00 (HRM §5.6 p.115: "for disk
 operation at 19200 baud, it is $0028"), AUDC3/AUDC4 $A0, the IRQEN/IRQST bit assignments and their latching behaviour (bits 5 and 4 latched, bit 3 not), SKRES, WSYNC/VCOUNT, and
 the 19040-baud byte period (HRM §5.6 p.116, verbatim) = 931 PAL CPU cycles per byte, which confirms §1.6's figure.


 1.2 Control flow

 sector_reader_load(A = level id 1..16)              ; C=0 ok / C=1 fail, A = status code
   if LEVEL_BUFFER header == {magic, version, id}     -> return OK (resident skip; default decision 1)
   look up level_directory[id]: first sector (16-bit), sector count (1..44)
   dst = LEVEL_BUFFER; sectors_left = count
   for each sector:
       attempts = 3
       read_one_sector:                               ; §3 decides what consumes an attempt
           POKEY setup; IRQEN = $00 ; IRQEN = $20|$10  ; receiver ARMED before the command
           SKCTL = $23                                ; [C1] transmit mode %010, NOT $13
           PBCTL = $34
           16 x sta WSYNC                             ; [C3] 750-1600 us: let the device see the line
           for b in {$31, $52, sec_lo, sec_hi, sum}:  ; sum = carry-wrapped 8-bit sum of the 4
               IRQEN = $20 ; IRQEN = $30              ; re-arm "out needed" latch
               SEROUT = b
               wait IRQST bit4 == 0, budget 2 frames  ; emulator clears it 8 lines after the write
           wait IRQST bit3 == 0, budget 2 frames      ; XMTDONE, not latched; ready-before-complete
           12 x sta WSYNC                             ; 707-771 us hold (the SECOND delay)
           PBCTL = $3C
           SKCTL = $33                                ; [C1] async receive mode %011
           IRQEN = $00 ; IRQEN = $20 ; SKRES          ; arm the input latch, clear sticky SKSTAT
           wait byte, budget 3 frames  -> $41 ACK | $4E NAK -> wire | silence -> NO_DEVICE
           wait byte, budget 200 frames -> $43 COMPLETE | $45 ERROR -> DEVICE | other -> wire
           y = 0; sum = 0
           128 x: wait byte, budget 2 frames; check SKSTAT & $A0 ([C2], not $C0); (dst),y = byte; sum += byte (adc, adc #0)
                  ; every received byte re-arms IRQEN bit 5: that reset IS the acknowledgement, and
                  ; overruns are not detected at all while the interrupt is unarmed (HRM §5.6 p.114)
           wait byte (checksum), budget 2 frames; != sum -> wire
           ok: dst += 128; sector++; sectors_left--; animation_step(); next sector
       on wire/timeout: settle (SKCTL $00, IRQEN $00, wait 2 frames); attempts--; retry or fail
                       ; SKCTL $00 is a full serial reset (HRM §5.6 p.117); the next attempt sets $23 itself
   validate header (magic 'V','S'; version; id == requested; sector count == directory) -> OK | BAD_IMAGE

 Status codes: 0 OK, 1 NO_DEVICE (no ACK, twice), 2 WIRE_EXHAUSTED, 3 DEVICE_ERROR, 4 BAD_IMAGE. Bytes land directly in the buffer through (zp),y; no bounce buffer (design-4.6 §3). A failed sector leaves a partial buffer, which is fine because the buffer is invalid until the final header check passes.

 1.3 Why 12 × WSYNC for the command hold

 A counted loop under a live text display is stretched by ANTIC DMA (mode 2 rows steal up to ~35 % of a line), so 1,400 counted cycles can reach ~1,070 µs and violate the 950 µs ceiling. WSYNC halts to the end of the current line whateverDMA does: 12 stores = 11-12 full PAL lines = 707-771 µs, inside 650-950 with margin on both sides, on hardware and in the emulator, with the display on. The emulator does not check the hold at all; this property is hardware-trust by construction, not by measurement.

 1.4 Record layouts

 Level image on disk (build-generated, contiguous sectors, raw, 128-B multiple, ≤ 44 sectors = 5,632 B):

 ┌────────┬───────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Offset │ Bytes │                                                     Field                                                      │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      0 │     2 │ magic 'V','S'                                                                                                  │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      2 │     1 │ format version (1)                                                                                             │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      3 │     1 │ level id (1-16; the campaign is 12 since AC)                                                                                                │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      4 │     1 │ sector count                                                                                                   │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      5 │     2 │ payload length (little-endian)                                                                                 │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      7 │     1 │ reserved (0)                                                                                                   │
 ├────────┼───────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │      8 │     n │ payload (v1: an inert known pattern the gate reads back byte-exact; 4.6 replaces it with LevelDef / hull data) │
 └────────┴───────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 Resident level directory (16 × 3 B = 48 B, in the reader record) [NOTE 2026-09-22: these are CODE figures and are deliberately left at sixteen — `LEVEL_MAX_ID = 16` in `src/hybrid/sector-reader.s:131`, asserted at `:903`, generated by `scripts/build.mjs:622`. Owner decision AC sets the 1.0 campaign at TWELVE levels, which would make this 12 × 3 B = 36 B and free 12 B resident; that is a code change with its own test, not a documentation edit, and no session has made it]: sector_lo, sector_hi, count per level; entry 0 unused or level 1 at index 0 — executor's choice, asserted by a test. Generated by the build from the fixed level base sector (§7), so its values never feed back into the transport size.

 Reader BSS (≈ 12 B): requested_id, attempts, frames_left, vcount_last, sector_lo/hi, sectors_left, status, anim_phase, text_index; plus 2 B zero page for the destination pointer (ZEROPAGE ends $9F; take $A0-$A1 with an assert in main.sthat the segment stays below $A0).

 1.5 Byte estimate — reader core 300-360 B (ESTIMATE) — [C4] MEASURED 682 B, see below

 POKEY setup 20 · command frame send 50 · wait-with-timeout primitive 40 · ACK / C-E handling 35 · data loop + checksum 50 · retry shell + settle 60 · sector loop + directory 45 · header validation + resident skip 35 · equates/status 10. What makes it larger: a per-level CRC-16 (+~45 B; deliberately not in v1 — the wire checksum plus the header check covers the failure modes the gates can produce), a status command before the first read (+40), any write path (forbidden), a second device or unit (+20), high-speed negotiation (rejected), any bounce buffer (rejected).

 [C4] MEASURED 2026-09-20 at commit cfa044d, implementation step 2.

 The core is 682 B, not 300-360. The whole module is 730 B: 682 B of code plus the 48-B level directory, which 9 already counted separately. Linked at $A000 by
 cfg/sector-reader.cfg; read the figure out of build/sector-reader.map, not out of this paragraph.

 Where the estimate went: it costed the reader as one routine with a retry shell around it and did not carry build_frame (41 B), lookup (49 B), resident_hit (33 B), validate (27 B), quiesce (19 B),
 begin_receive (19 B) or pokey_setup (39 B) as separate routines — 227 B between them. The rest is the error taxonomy of 3 being real branches rather than a line in a table. Nothing here is bloat and
 nothing was traded away to shrink it (rule 14); the figure is recorded so the window budget is planned against it rather than against the estimate.

 What this changes downstream: nothing is displaced and no placement fails, but 4's "~1.2-1.5 KB raw" for the record and 9's "~830-1,260 B" window total must now be read against 682 + 48. With the
 display driver (150-200) and the v1 text pool (320) still to land at step 4, the window total is tracking toward ~1,200-1,250 B of the 7,194 available — inside 9's envelope, at its top end rather than
 its middle. Step 4 should size the text pool knowing that, rather than discovering it.

 [C6] MEASURED 2026-09-20, step 4 (commit eb1a1c0), owner-decided.

 The AI text pool ships at EIGHT lines of 38 characters, not sixteen. With the reader core, the loader-mode display driver, the failure screen and an eight-line pool, the module is 1,466 B of the
 1,536-B $A000-$A5FF area: 70 B free. Sixteen lines cost 608 B against eight lines' 304, so they would overflow by roughly 234 B. Decision O specifies 8-16 and eight is inside it; the owner's real
 lines replace the placeholders one-for-one at the same width, so the tail does not move when they are written.

 If sixteen lines are ever wanted, there are two ways and they are not equal:
   * shrink the level buffer below 44 sectors - REJECTED by the owner 2026-09-20. Those sectors are 4.6's LevelDef space (sector path, wave and path definitions, hull parameters, weapon_class
     records). Trading foundation for decoration is the wrong way round.
     [C7] SUPERSEDED IN PART, 2026-09-21, owner decision X. The buffer DID shrink, 44 -> 32 sectors, and the freed $B600-$BBFF became the Light kernel's code window. The rejection above still
     stands as written: the buffer was not traded for TEXT. It was re-sized because owner decision F made capital art parametric after this plan was approved - four art sets for the whole game
     instead of one per level - so the per-level need is ~512 B of LevelDef plus ~1,253 B of one art set, and 32 sectors still leave over 2 KB of headroom. A sixteen-line AI pool is still not
     funded from here: packing the texts remains the answer, as the next bullet says.
   * pack the texts - the cheaper answer, and the one to reach for first. The pool is stored as fixed 38-byte records of plain ASCII drawn from a ~43-glyph alphabet, so it is paying 8 bits for
     roughly 5.4 bits of entropy per character and paying full width for every short line. Either a terminator-and-index scheme or a nibble/5-bit packing recovers most of the difference, at the cost
     of an unpack step into the existing 38-byte slot that render_frontend_data already reads. Not built: v1 does not need it.

 1.6 Cycle cost

 Not a visible-frame cost: the reader runs only with gameplay torn down. Polling latency per byte ≤ ~60 CPU cycles (~120 wall with DMA stealing) against a 931-cycle byte period: 7-15× margin. Emulator-measured wall time per sector ≈ 3.8 PAL frames (5×8 + 15 + 12 + 44 + 32 + 129×8 lines); a 2-sector v1 level ≈ 8 frames, a full 44-sector level ≈ 170 frames. Hardware ESTIMATE only: SIO2SD 4-6 frames/sector, real 1050 5-10 (debt item 5, interleave).

 1.7 Page-boundary rule for the receive loop

 Not load-bearing at 19040 baud (a page-crossing branch costs 1 cycle against a 900-cycle margin). Enforce anyway, at zero cost, because it keeps the loop's cycle count a constant the harness can pin: .assert >sector_reader_rx_loop =>sector_reader_rx_loop_end, error, "receive loop crosses a page". The transmit loop gets the same assert.

 ---

 2. The timeout source — VCOUNT frame counting (decided)

 Mechanism. One primitive wait_serial(X = IRQST mask, A = frame budget): loop { lda IRQST; and mask; beq got_it; lda VCOUNT; cmp vcount_last; sta vcount_last; bcs same_frame; dec frames_left; beq timeout }. VCOUNT decreases exactly onceper PAL frame (the wrap at line 312), so "new < last" is a frame edge whatever the display does; resolution 20 ms; cost 2 B of state, ~18 cycles per poll iteration.

 Budgets: ACK 3 frames (≥ 40 ms guaranteed, ≤ 60 ms; the device deadline is 16 ms); COMPLETE/ERROR 200 frames (4.0 s: a 1050 with a bad sector answers ERROR after ~2-3 s of internal retries, a long seek is < 1 s); each data byte 2 frames;each transmit step 2 frames; settle 2 frames.

 Why not the alternatives.
 - POKEY timer (ch1+2, 16-bit, 1.79 MHz): AUDCTL bits are compatible with the serial clock ($28 | $50), but it adds a second unmeasured hardware dependency (timer IRQ latching in IRQST with I set — never exercised by this project, modelled in Atari800 through a deferred-cycle path), needs AUDF1/2/STIMER setup, and its 36.6 ms maximum period gives no better resolution than a frame. Same bytes, more risk, no gain.
 - Cycle-counted loop: the loader-mode display steals DMA cycles unevenly, so the calibration is ±30 % unless the display is switched off during waits — which would freeze the screen, the exact product failure decision O exists to avoid — and any later edit to the loop or the display invalidates it silently.
 - VCOUNT: already the project's only timing primitive (wait_frame_at_line, wait_frame_start), independent of DMA, IRQ and audio, correct in the emulator by construction (the whole PAL gate rests on it), and adequate for both deadlines.

 PAL assumption: 312 lines per frame = 20 ms. On NTSC the same code counts 16.7 ms frames and every budget shrinks by a sixth; irrelevant for a PAL-only target, recorded so nobody "fixes" it.

 Late versus never. A drive that answers inside a budget is simply late and accepted. An ACK that arrives after its 3-frame budget lands during the settle phase, where SKCTL = $00 discards it, and the retry's new command-line assertiontells the drive to abandon whatever it was sending (SIO devices abort output when the command line falls). A COMPLETE later than 4 s is treated as never; the same retry-abort applies. A drive that answers while the host is transmittingthe next command frame is the one case the protocol cannot fully exclude; the framing/overrun check on the next expected byte catches it and it costs one wire-class attempt.

 ---

 3. Error taxonomy and retry shape

 ┌──────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────┬────────────────────────────────────┬────────────────────────────────────────────────┐
 │  Class   │                                                     Signals                                                     │      Consumes       │               Count                │                    Meaning                     │
 ├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┼────────────────────────────────────┼────────────────────────────────────────────────┤
 │ Wire     │ NAK $4E; framing or overrun (SKSTAT); data checksum mismatch; timeout waiting for COMPLETE or for a data byte;  │ one attempt of the  │ 3 attempts per sector, then        │ the link lost a byte; a retry usually succeeds │
 │          │ unknown byte where ACK or C/E was expected                                                                      │ sector              │ WIRE_EXHAUSTED                     │                                                │
 ├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┼────────────────────────────────────┼────────────────────────────────────────────────┤
 │ No       │ no ACK within 3 frames                                                                                          │ one probe           │ 2 probes (≈ 0.2 s total), then     │ absent, powered-off or busy drive; the         │
 │ device   │                                                                                                                 │                     │ NO_DEVICE                          │ XEX-without-disk case                          │
 ├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┼────────────────────────────────────┼────────────────────────────────────────────────┤
 │ Device   │ ERROR $45 at the C/E position                                                                                   │ the whole read      │ 0 retries (default decision 3),    │ bad sector number or image; retrying repeats   │
 │          │                                                                                                                 │                     │ DEVICE_ERROR                       │ the failure                                    │
 ├──────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────┼────────────────────────────────────┼────────────────────────────────────────────────┤
 │ Image    │ header magic/version/id/count mismatch after a clean read                                                       │ —                   │ no retry, BAD_IMAGE                │ wrong or stale ATR                             │
 └──────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────┴────────────────────────────────────┴────────────────────────────────────────────────┘

 Every path is bounded: worst case is 44 sectors × 3 attempts × (4.0 s + 0.04 s + settle) if a drive answers ACK and then stalls every time — ~9 minutes, still finite and visibly animating; the ordinary failure cases end within seconds. Exhaustion reaches a defined state: the loader-mode screen replaces the AI line with a fixed message (DISK READ FAILED + a two-word status) and waits for FIRE, then quit_gameplay_to_menu's teardown path returns to the main menu with RAM state intact (difficulty, scores, furthest level per decision L). No hang, no OS, no reboot.

 ---

 4. Placement

 [C5] AMENDED 2026-09-20, implementation step 2 (commit cfa044d), owner-approved.

 This section said: a new segment in the MAIN link, because the reader must call clear_screen, render_frontend_data, wait_frame_start, pause_silence_audio, clear_pmg_graphics_latches,
 frontend_text_display_list and start_gameplay, and "linking the reader with main.s needs zero ABI plumbing".

 What is being done instead: the reader is its OWN link — src/hybrid/sector-reader.s with cfg/sector-reader.cfg, built by buildResidentModule the way capital-player-collision.s already is — and reaches
 the main-link symbols above through a generated include, the pattern director-abi.inc and integration-abi.inc already establish in this repository. Run address, record shape, window layout and the
 $A000 destination are all unchanged; only which link owns the object changes.

 Why:
   1. It is what made step 2 testable. The core has no main-link dependency at all — it touches hardware registers and its own BSS — so it assembles, links and runs on the 6502 harness before any
      transport exists. In the main link it could not have been unit-tested until step 3 had landed, which is the ordering the plan itself chose to avoid for the register probe.
   2. main.s is a single-object link today. Putting the reader in it means either making the link multi-object or .include-ing 700+ B of hardware code into a 12,300-line source file. The plan costed
      neither; "zero ABI plumbing" was true only against an assumption about the link that this section did not state.
   3. A raw DFMC record wants exactly what a standalone link produces: one contiguous image with a fixed final destination. The arena record already works this way.

 Cost of the change: one generated include (the display's symbols, step 4), against a multi-object main link that was never budgeted. The ABI direction is the same one director-abi.inc already runs.

 Everything below stands as approved, with "main-link segment" read as "its own link, same run address".


 Where: a new main-link segment SECTOR_READER (ca65, src/hybrid/sector-reader.s), run address $A000, transported as its own raw DFMC record (the ninth slot decision B opened), holding the reader, the loader-mode display driver, the AI text pool, the level directory and the reader BSS. The level buffer is the rest of the window: LEVEL_BUFFER = $A600, 5,632 B = 44 sectors, ending $BBFF [C7: 4,096 B = 32 sectors, ending $B5FF since owner decision X]; $BC00-$BC19 (26 B) takes the BSS; the six-byte guard at $BC1A stays.

 Why the main link, not the encounter-director link where BASIC_WINDOW is declared: the reader must call clear_screen, render_frontend_data, wait_frame_start, pause_silence_audio, clear_pmg_graphics_latches, frontend_text_display_list andfinally start_gameplay. Those are main-link symbols; the director link only receives addresses through the generated director-abi.inc in the other direction, and integration-abi.inc (main → glue) is generated after main links. Linking the reader with main.s needs zero ABI plumbing. The director link's BASIC_WINDOW_RAM shrinks to nothing or is retargeted so the two links never both own $A000; scripts/build.mjs's "window record must land at $A000" check learns the newrecord. Decision B's INITAD emission already covers XEX blocks ≥ $A000.

 What it displaces: nothing resident. Cost is transport: ~1.2-1.5 KB raw ≈ 10-12 ATR sectors for the reader record, +2 sectors for the v1 level-1 image (read at runtime, not boot transport), and the XEX grows by the same image. ExpectedATR menu movement ≈ +20 frames (rule-of-thumb only; STATUS says the rule is frame-quantised) — inside the +50 fail band, but the standing rule requires docs/boot-deadline-baseline.json to be re-recorded in the same commit with the reason.

 Why not the arena / BROADSIDE / ENTITY_CODE: 215 / 3 / 1 B free; the reader alone is 300+ B and decision O's texts are up to 640 B more. Why raw, not LZ: the level directory's sector numbers depend on the fixed level base only (§7), so a raw record makes the transport size a pure function of the source and the build stays single-pass.

 Hook, 0 bytes in MAIN: the operand of jmp start_gameplay at main.s:1544 (the START GAME dispatch) becomes jmp sector_reader_start_gameplay, a window-resident entry that runs the boundary sequence (§5, §6) and ends jmp start_gameplay. The review-harness jmp start_gameplay variants (:11045, :11047) stay.

 Named guards (rule 4, memory-map): .assert __SECTOR_READER_RAM_LAST__ <= LEVEL_BUFFER, LEVEL_BUFFER + 5632 = $BC00, LEVEL_BUFFER & $7F = 0, BSS end ≤ $BC1A; build.mjs refuses any level image over 44 sectors or any level run overlappingthe transport or another level.

 ---

 5. The quiesce contract

 Before the read (at START GAME the state is already the frontend's): DMACTL = 0, GRACTL = 0, clear_pmg_graphics_latches (also stores NMIEN = 0), pause_silence_audio (AUDCTL = 0), clear_pmg, clear_screen. That is exactly enter_pause's teardown plus the audio zero. No DLI, no VBI, no PMG DMA exist while the reader runs; the loader-mode display is a DLI-free ANTIC 2 list (§6), so the receive loop runs with no NMI source enabled at all — the "custom display list, DLI and PMG that must survive" problem the survey found no prior art for is dissolved rather than solved: nothing needs to survive, because start_gameplay rebuilds display lists, charset base, PMG, palette, DLI vector and NMIEN from scratch (main.s:2444-2521).

 After the read: the reader leaves IRQEN = 0, SKCTL = $13, AUDCTL = 0, PBCTL = $3C, NMIEN = 0, DMACTL = 0, then jmp start_gameplay, which re-establishes everything it always did. Nothing else is re-established because nothing else was torn down.

 The level→level boundary (4.9, not built here) reuses the drain, by name. sector_c_update_first_capital embeds the drain clause asm_sector_pressure_active() || light_state != INACTIVE || light_screen_hi != 0 || CAPITAL_SECTOR_STATE != SECTOR_FIGHTER. This task extracts it as sector_c_drain_clear() (C, arena, ~15 B; sector_c_update_first_capital calls it — the seam decision C asked for in project-overview.md §3.2 item 3) and exposes it through director-abi.inc. The level boundary predicate 4.9 will need is FLAG_COMPLETE && CAPITAL_SECTOR_STATE == SECTOR_CAPITAL_COMPLETE && sector_c_drain_clear() && PLAYER_LIFECYCLE == ALIVE && no hostile shots && no live pickup, followed by the same teardown as above. The gate set has run the drain clause clean on every capital entry; the level boundary can reuse it unchanged. Decision 2 keeps the transition itself out of this task.

 ---

 6. The loader-mode display (product requirement, decision O)

 Mechanism — reuse, no new display code path. frontend_text_display_list (ANTIC 2, 24 rows, LMS SCREEN $4000, no DLI), FRONTEND_CHARSET $4800 (survives gameplay; memory-map "post-loader low memory"), DMACTL = $22, NMIEN = 0, colours via the existing frontend palette routine. Text goes through render_frontend_data records (addr_lo, addr_hi, text…, 0, list ends $FF) and encode_frontend_character.

 Content. (1) a fixed frame: title row and a status row; (2) one AI line chosen at entry by STATE_RNG (or frame_counter) masked to the pool size — v1 ships 8 placeholder lines of ≤ 38 characters, marked PLACEHOLDER for the owner's later writing session; each line is its own record list so the renderer draws it with the existing loop; (3) the animation: one 40-cell row of 8 glyph phases from the frontend glyph set (a sweeping "signal" bar), stepped once per completedsector by rewriting the row (40 stores ≈ 300 cycles), which is the decision-O contract "one frame per sector, not a progress bar". No bitmap, no PMG, no new charset.

 Cost. Driver ≈ 120-160 B; texts ≈ 8 × 40 = 320 B for v1 (640 B at 16 full lines); animation phases 0 B if drawn from existing glyphs, ≤ 64 B if authored. All inside the reader record (§4).

 Coexistence with a CPU-holding reader. ANTIC needs no CPU once the list and screen are set; with NMIEN = 0 there is no DLI to service. The only interaction is DMA cycle stealing during the receive loop, already inside the §1.6 margin. The animation step runs between sectors, where the drive is idle and no byte is in flight, so it never competes with the wire. During a wait the screen is static, which decision O explicitly accepts (a visibly hesitating animation is thediagnostic).

 Failure screen. The AI line is replaced by DISK READ FAILED and one of NO DRIVE, READ ERROR, BAD DISK, WRONG DISK; wait for FIRE (poll TRIG0 with frontend_input_armed semantics); return to the menu via quit_gameplay_to_menu's tail.

 ---

 7. Build and transport changes

 - cfg/atari-boot.cfg: READERFILE load area + SECTOR_READER_RAM $A000 size $0600 (run), LEVEL_BUFFER_RAM $A600 size $1600 (bss, file = ""), READER_BSS_RAM $BC00 size $001A. cfg/encounter-director.cfg: BASIC_WINDOW_RAM shrinks or is removed so only one link owns $A000-$BC19; the guard stays. so only one link owns $A000-$BC19; the guard stays.
 - scripts/build.mjs: (a) the reader record as a raw DFMC record (pattern: the arena record at :2040-2055, the window record at :1529-1540); (b) level images: generate v1's level-1 image (header §1.4 + pattern), write it into the ATR at afixed level base sector (e.g. 320; assert totalTransportSectors < base; assert every level run inside 1..720 and disjoint), emit build/level-directory.inc; (c) XEX-only block of the level-1 image at $A600 (default decision 1), after the existing INITAD record; (d) manifest: residentCapacity.basicWindow → { reader: …, levelBuffer: {address, capacityBytes, sectors} }, transportCapacity.levelSectors, remainingAtrSectors net of level runs; (e) re-record docs/boot-deadline-baseline.json with the reason.
 - scripts/chunk-loader.mjs: nothing new if the record is raw (CHUNK_TYPE_RAW exists) and lands at $A000.
 - scripts/formats.mjs / tests/formats.test.mjs: the XEX gains one block; tests/starfield.test.mjs pins initialBootSectors (unchanged: the record is extension transport).
 - docs/memory-map.md (window rows, new segment table row, free tails), docs/STATUS.md, docs/architecture.md (runtime disk I/O now exists at one boundary), design-4.6 §3 / project-overview.md §6.2 / STATUS §W correction (OS-shadowrequirement void under W), ADR-004 marked superseded (already decided by 23/B/W). docs/hardware-testing.md: add the reader's SIO2SD checklist (§8 "hardware only").

 ---

 8. Gate plan — what is provable where

 Existing gates, unchanged and re-run: PAL timing audit over the focused set (no main-loop byte changes; XEX sessions cross START GAME through the resident-skip path only); tests/frontend.test.mjs (the START dispatch operand); segmentguards; build:candidate; boot smoke 8/8.

 Existing gates, extended (Atari800, trace header + --prepare rebuild):
 1. Boot smoke ATR ×4: FIRE at 3050 now triggers the level-1 read; the frame-3300 gameplay snapshot must still read game_state 6; the observer already records the window's first 16 bytes — extend to the level header and a hash of the image at LEVEL_BUFFER, byte-exact against build/level-1.bin, on all four ATR sessions and (resident path) all four XEX sessions.
 2. New milestones/counters in the trace header: sio_command_frames, sio_bytes_in, sio_wire_retries, level_load_begin/end frames. Assert XEX sessions: 0 command frames; ATR: exactly count frames, 0 retries, end − begin inside a recorded emulator baseline with a band (a regression signal for the reader's own overhead, labelled EMULATOR-MEASURED).
 3. Negative controls (opt-in env vars in scripts/atari800-wall-trace.h, the way DFTRACE_* already works): DFTRACE_SIO_CORRUPT_BYTE=n flips one SERIN byte once → the reader must succeed with exactly one wire retry; DFTRACE_SIO_FORCE_ERROR=1 substitutes $45 → DEVICE_ERROR screen, FIRE returns to the menu, game_state observed; an ATR session with -nobasic and no disk after boot is not expressible, so the no-device path is proven by the XEX with its level block deliberately stripped (a build flag), reaching the failure screen within a recorded frame budget. Each control fails on a build with the corresponding check removed (negative control of the control, the project's rule).
 4. 6502 harness (scripts/nmos6502.mjs, new tests/sector-reader.test.mjs): a scripted POKEY/PIA stub (IRQST, SERIN, SKSTAT, VCOUNT sequences) drives the reader deterministically through every class in §3: ACK-then-silence exhausts at 3 attempts; NAK ×3; framing error; checksum error then success; $45; a header id mismatch; the VCOUNT wrap counting across the $9B→0 edge; the no-device path ending in 2 probes. This is where the taxonomy and retry counts are provenexhaustively; the emulator only samples them.

 Only on hardware (owner-accepted deferral, decision R; recorded in hardware-testing.md): the command-line hold window (deterministic by construction, unmeasured); async-receive reliability with a real drive (SKCTL $13); ACK/COMPLETE latency and jitter; back-to-back C/E→data on a real 1050/XF551/SIO2SD; any real bit error; per-sector time (debt items 2 and 5); behaviour with a drive that is present but has no disk. Taken on trust: that a stock 65XE's POKEY latches IRQST bits exactly as the emulator and the manual describe with I set. Recommended first hardware smoke: SIO2SD, ATR, cold boot, START GAME twice (cold read, then resident skip), then power the SIO2SD off and START GAME → failure screen → menu.

 ---

 9. Byte and cycle budget (ESTIMATE unless marked)

 [C4] MEASURED 2026-09-20, step 2: the "Reader core 300-360" row is 682 B, and "Reader BSS ~12 + 2 ZP" is 20 B at $BC00-$BC13 plus 2 B at $A0-$A1. The "Level directory 48" row is exact. The window
 total therefore starts from 730 B, not from 348-408, and the "~830-1,260" row should be read as tracking its top end once the display driver and text pool land. See 1.5 [C4] for where the estimate
 went and why nothing was traded away to close the gap. Every other row in this table is still ESTIMATE.


 ┌─────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┬──────────────────────────────┐
 │                    Item                     │                            Bytes                            │            Where             │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ Reader core                                 │                                                     300-360 │ SECTOR_READER record         │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ Loader-mode display driver + failure screen │                                                     150-200 │ same                         │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ AI text pool (v1 8 lines / final 16)        │                                                   320 / 640 │ same                         │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ Level directory                             │                                                          48 │ same                         │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ Reader BSS                                  │                                                  ~12 + 2 ZP │ $BC00, $A0                   │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ sector_c_drain_clear extraction             │                                                         ~15 │ arena (215 → ~200 free)      │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ Equates, asserts, operand redirect in MAIN  │                                                           0 │ —                            │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ Resident window total                       │                                                  ~830-1,260 │ of 7,194; level buffer 5,632 │
 ├─────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┼──────────────────────────────┤
 │ ATR transport                               │ +10-12 sectors record, +2 level sectors (outside transport) │ boot baseline re-recorded    │
 └─────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┴──────────────────────────────┘

 Cycles: 0 in any visible gameplay frame (MEASURED requirement: the PAL audit must be byte-for-byte neutral on the focused set). Boundary cost: emulator ≈ 8 frames for v1's 2-sector level; hardware unmeasured.

 ---

 10. Risks and STOP conditions during implementation

 Stop and report (BLOCKED_<REASON> or OWNER_DECISION_REQUIRED) if:
 1. The emulator never delivers a byte on the register path with SKCTL $13 / AUDCTL $28 / AUDF3 $28: verify POKEY_siocheck and PIA_PBCTL writes first with a 20-line probe before writing the reader; if the model rejects the setup, the setup is wrong for hardware too — do not "fix" it by patching the emulator.
 2. A DFMC/INITAD/ownership check in build.mjs refuses the second window owner in a way that needs a transport-format change beyond a raw ninth record and one XEX block: report the exact byte/sector requirement.
 3. The ATR boot-smoke gameplay snapshot at 3300 no longer reads game_state 6 because the read plus start_gameplay exceeds the 250-frame handoff: measure level_load_end; if > ~120 frames for 2 sectors something is wrong with the waitprimitive, not the budget.
 4. Any PAL audit row moves on the focused set: the change must be byte-neutral below $A000; a moved row means an unintended edit.
 5. ZEROPAGE already reaches $A0, or $BC00-$BC19 is written by anything (the boot smoke's window-tail assertion), or the 12-B BSS does not fit: report, do not squeeze.
 6. The transport passes the +50 boot fail band after the record lands: report the sector count; the record must not be LZ'd to hide it (see §4 raw rationale).
 7. Owner decision 1 is answered differently from the default — the XEX-only block versus a tenth DFMC record changes the build work and the gate list; do not build both.

 Accepted risks carried, not re-litigated: the RESET/BASIC ROM remap (debt 1), real per-sector rate (2), decision A on hardware (3), interleave (5). New accepted-on-trust item to add to decision R's register: the command-line hold and async receive are unverified on hardware until the first SIO2SD smoke.

 ---

 11. GO / NO-GO

 GO, under the three defaults in "Decisions for the owner". The design uses one primitive the project already trusts (VCOUNT), one display path it already ships (frontend text screens), one transport path already proven (a window recordread back byte-exact on eight cold boots), and adds no NMI, no OS call, no new dependency. The unprovable part is exactly the part the owner deferred by decision R, and it is listed by name in §8. NO-GO triggers are the STOP conditions in §10; none is expected from what was measured this session.

 ---

 12. Executor prompt (Opus Medium implementation session)

 ▎ Branch main at b2a1710 (verify), worktree clean. Implement roadmap 4.3, the resident direct-SIO sector reader, exactly as ~/.claude/plans/this-is-a-planning-sparkling-phoenix.md specifies, under its default answers to the three ownerdecisions unless the owner's approval message says otherwise. Read AGENTS.md, docs/STATUS.md §"Owner decision B", docs/memory-map.md §"Owner decision B plumbing", src/main.s:1477-1560, 2444-2530, 2625-2660, 2885-2960, 3037-3060, 7169-7180, 11600-11760, src/hybrid/c-asm-abi.s:280-370, src/c/lifecycle.c:296-380, scripts/build.mjs:1529-1575, 2040-2100, scripts/chunk-loader.mjs:1-80, scripts/atari800-wall-trace.h:790-990. Verify every POKEY/PIA value in plan §1.1 against the Altirra Hardware Reference Manual ch. 9 before writing them; do not transcribe any third-party SIO source. Order of work: (1) a 20-line register probe under the trace emulator proving one command frame gets an ACK on the ATR path and silence on the XEX path — stop if not; (2) src/hybrid/sector-reader.s core + wait_serial + the 6502-harness test with the scripted POKEY stub, all §3 classes passing; (3) build/transport (§7) with the raw record, level-1 image, XEX block, directory include, re-recorded boot baseline; (4) loader-mode display and failure screen (§6), START GAME operand redirect; (5) sector_c_drain_clear extraction and its ABI export; (6) trace-header counters, negative controls, boot-smoke extensions (--prepare rebuild), then run: build:candidate, npm run boot:smoke, the focused PAL set, node --test tests/sector-reader.test.mjs tests/frontend.test.mjs tests/formats.test.mjs tests/starfield.test.mjstests/hybrid-c-arena.test.mjs; (7) docs per §7, including the OS-shadow correction and the hardware-testing.md checklist. Report MEASURED vs ESTIMATE separately, the window/arena free tails, the transport sector count, boot milestones, XEX/ATR SHA-256, and label the result OWNER-SMOKE CANDIDATE. Stop at any §10 condition and report it rather than working around it. Do not touch the PAL main loop, .claude/, or unrelated tests.

 ---

 13. Verification (end to end)

 1. node scripts/build.mjs --candidate --quiet succeeds; build/manifest.json shows the reader record at $A000, the level buffer at $A600, 44-sector capacity, ATR level run at the fixed base, XEX xexInitAd non-null.
 2. node --test tests/sector-reader.test.mjs: every §3 class, the VCOUNT wrap, the resident skip, header validation — all green; each test red when its check is removed from the reader (negative control).
 3. npm run boot:smoke (after node scripts/runtime-wall-trace.mjs --prepare): 8/8; ATR sessions show sio_command_frames == level sectors, image hash equal to build/level-1.bin, game_state 6 at 3300; XEX sessions 0 command frames, samehash; loader/menu milestones inside the re-recorded baseline bands.
 4. Negative-control runs: corrupt-byte → 1 retry then success; forced ERROR → failure screen → FIRE → menu (game_state 1); stripped-XEX → NO_DEVICE screen within the recorded frame budget.
 5. Focused PAL audit set: 0 distinct miss events, worst fence margin 1,464 unchanged (byte-neutral below $A000).
 6. Hardware (deferred, decision R): the SIO2SD sequence in §8 — recorded as not run.