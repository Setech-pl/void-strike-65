; ============================================================================
; Void Strike 65 — the boss overlay (M5b-S3, the layered engine of M5b-S4a-i)
; ============================================================================
;
; docs/plans/m5-loading-boss.md §5.1-5.3, §5.6, §5.11, §5.13; owner answers
; Q-S1-Q-S6, Q-B1-Q-B8, decisions 9, 32 and A-G. One link, four homes:
;
;   BOSS_HEAD .. BOSS_CODE    overlay slot A ($6DE8-$75E7), read by the
;                             window's boss entry, sized to use: the per-frame
;                             code, the boss DLI, the region reads, the
;                             drawing, the column map and the hand-off
;   BOSS_INSTALL              the staging RAM at $7810 (the pause backup), the
;                             shared 3-sector install run, read by the head
;                             and run once, in place, before anything reuses
;                             that RAM
;   BOSS_C_*                  slot C ($1000-$17FF, the boss's low-RAM claim,
;                             Q-B5): the controller (src/c/boss.c), read by
;                             the head, sized to use
;   BOSS_SCRATCH, BOSS_BSS    the claim's scratch page ($1800-$18FF): the
;                             column map, S4a-ii's ring, this file's state
;   BOSS_D_*                  slot D ($1900-$1FFF, the claim grown by owner
;                             decision Q7, M5b-S4b): the lasers and the boss's
;                             shots inside the band, read by the head after
;                             slot C, sized to use
;   BOSS_E_*                  slot E ($4C00-$4E3F, over the expanded hull
;                             maps, M5b-S4b.5): the capsule rule and the
;                             player's shots drawn in the band
;
; The region's charset lands at $0C00 (the claim's first KB): the band's DLI
; points CHBASE at it under the band and back at the gameplay charset for the
; ring below.
;
; It links LAST, against main, the Director link, the Light kernel, the reader
; and the summary module of the same build, through generated includes, so
; none of the addresses it names can drift (Q-S3). The controller - hit points,
; cover and exposure, stages, the tier, the defeat, the fire countdown, the
; chain, the bonus, the clock - is C; this file owns what is hardware or
; publication: the band, the DLI, the collision scan, the cell writes, the
; flash and the hand-off.
;
; The boss sector, frame by frame (plan §5.2): the world scroll is stopped
; (both scroll rates 0), the display list is HUD, divider, the 8-row band with
; HSCROL and LMS into slot B, then 19 ring rows; three DLIs (decision 9). The
; capital vector table carries this overlay's image, so the resident calls
; that reached the capital group reach the boss instead:
;
;   UPDATE             boss_update      PairShots inside the band (drawn up to
;                                        the cell that stops them, decision M)
;                                        and their feedback, the C tick, the
;                                        boss's fire, one queued module draw,
;                                        the nozzles
;   PREPARE_ROW        boss_motion      the band's drift and the win's shake
;   SECTOR_COMPLETION  boss_shots_late  the PairShots' cells in the band, once
;                                        the band has been shown (slot E,
;                                        fix/smoke-2026-10-07 P1); then
;                      boss_completion  the hand-off to the level summary
;   every other entry  boss_rts         (INIT keeps init_broadside: it runs
;                                        only from start_gameplay, after the
;                                        START GAME restore)
.setcpu "6502"

.include "boss-layout.inc"
.include "boss-imports.inc"
.include "fighter-weapons.inc"
.include "level-summary-abi.inc"
.include "level-def.inc"

HSCROL          = $D404
VCOUNT          = $D40B
HPOSM0          = $D004
SIZEM           = $D00C
WSYNC           = $D40A
CHBASE          = $D409
DLISTL          = $D402
DLISTH          = $D403
DMACTL          = $D400
NMIEN           = $D40E
GRACTL          = $D01D
HITCLR          = $D01E
COLPF0          = $D016
COLPF1          = $D017
COLPF2          = $D018
COLPF3          = $D019
COLBK           = $D01A
AUDF3           = $D204
AUDC3           = $D205
VDSLST          = $0200

LEVEL_IMAGE     = $A600
LEVEL_ID        = LEVEL_IMAGE + 3
; The Director's sector index (src/c/director.c STATE_SECTOR); the build checks
; the define against this value.
DIRECTOR_STATE_SECTOR = $80F6
SR_BAD_IMAGE    = 4

; The band: display rows 1-8 under the divider, scanlines 24-87 (plan §5.3).
; feat/boss-r1-twin-lasers (owner smoke of 2026-10-13): the list shows the band
; only down to its last row holding a cell (boss_band_measure, at the install);
; the rows under it are ring rows, so a shot there has the playfield's charset
; and colours. BAND_BOTTOM_Y stays the 8-row band's edge for the player's reach
; and the shots' meeting test; the shown edge is patched into
; boss_hostile_bottom_operand, boss_late_bottom_operand and
; boss_capsule_y_operand, the last shown row into boss_band_last_operand.
BAND_TOP_Y      = GAMEPLAY_TOP + 8
BAND_BOTTOM_Y   = BAND_TOP_Y + BOSS_BAND_ROWS * 8
; A shot that reaches the band's bottom edge has reached the band; the player
; stays below it (plan §5.11.4 item 9).
BOSS_PLAYER_Y_MIN = BAND_BOTTOM_Y
; With the HSCROL bit a normal-width row fetches 48 bytes and shows byte k at
; colour clock 32 + 4k + HSCROL: four bytes left of the window at HSCROL 0,
; one colour clock later per step (Atari800 src/antic.c, the HSCROL write:
; ch_offset 4 - h/4, x_min moved by (h & 3) - 4; the HRM's horizontal-scroll
; rule). The normal window's first colour clock is HPOS 48.
BAND_ORIGIN_HPOS = 32
; The ring rows that stay visible under the band: from the first row under
; the shown band (display row 6 or 9) to display row 27.
RING_ROWS       = 27

; boss_draw_module's four ways to fill a module's cells (bits 7 and 6, read
; by BIT): copy a look from the look tail, fill one code, add to each code,
; or gone (owner decision L: the module disappears - its top cavityRows rows,
; inside the hull, become the region's cavity code, the rows below the hull
; band background; no rim, no outline).
BOSS_MODE_COPY  = $00
BOSS_MODE_FILL  = $40
BOSS_MODE_ADD   = $80
BOSS_MODE_GONE  = $C0
BOSS_MODE_NONE  = $01           ; a queued draw a later one superseded
; fix/boss-polish (owner answers of 2026-10-12, b3; plan boss-polish §9-§10): a
; module that takes a hit and lives flashes for BOSS_MFLASH_FRAMES frames instead of
; showing the spark - bit 7 of each non-blank cell toggled, so its pixel value
; 3 shows COLPF3's colour (the hull's dark red) instead of COLPF2's and back;
; no colour register is written. One FILL mode (bit 6, so @fill takes it; bit
; 0 tells it from the plain fill) toggles; the same draw toggles back, so the
; cells come back exactly with no buffer. Every other draw of the flashing
; module ends the flash first (boss_mflash_guard_q / _m).
BOSS_MODE_MFLASH = $41
BOSS_MFLASH_FRAMES = 3          ; the owner's b3 (2026-10-12)

; The fortress session (plan §5.15, decisions I-K, §5.15.6): the hit feedback,
; the boss's fire, the draw queue, the nozzles.
BOSS_RING_RECORDS  = 8          ; the cell-flash ring (§5.13.2 item 5)
BOSS_SPARK_FRAMES  = 2          ; a spark or a deflection: restored 2 frames on
BOSS_MUZZLE_FRAMES = 3
BOSS_QUEUE_ENTRIES = 8          ; one module drawn a frame (§5.15.6 item 2)
BOSS_TICK_FRAMES   = 2          ; the hit tick on channel 3 (Q-B4)
BOSS_TONE_DAMAGE   = 0
BOSS_TONE_ABSORB   = 1
BOSS_TONE_HULL     = 2
BOSS_BED_AUDF      = $68        ; the engine bed start_gameplay sets on channel 3
BOSS_BED_AUDC      = $22
; A boss shot is a PULSE shot of the shared hostile pool (§5.13.2 item 6):
; ACTIVE = (weapon_class << 3) | owner bits; class 1 is PULSE (main.s
; ENEMY_WEAPON_PULSE), the owner the Light kernel's (light-kernel.s
; LIGHT_PROJECTILE_OWNER = FIGHTER_PROJECTILE_INTERCEPTOR | 4). No Light flies
; in region 1's boss sector (owner answer, §5.15.6 item 4).
BOSS_SHOT_ACTIVE   = (1 << 3) | 2 | 4
.assert BOSS_SHOT_ACTIVE = $0E, error, "a boss shot is a PULSE shot with the Light owner bits"
.assert (BOSS_RING_RECORDS & (BOSS_RING_RECORDS - 1)) = 0, error, "the ring's steal walks a power of two"
.assert (BOSS_QUEUE_ENTRIES & (BOSS_QUEUE_ENTRIES - 1)) = 0, error, "the queue wraps on a power of two"

; The head's run table (boss-runs.inc): the install, slots C, D, E and (M6)
; G, then per region its band A, band B, charset and block runs, 5 bytes a run.
BOSS_RUN_INSTALL = 0
BOSS_RUN_SLOT_C  = 5
BOSS_RUN_SLOT_D  = 10
BOSS_RUN_SLOT_E  = 15
BOSS_RUN_SLOT_G  = 20
BOSS_RUN_REGIONS = 25
BOSS_SHARED_RUNS = 5                    ; the install, slots C, D, E, G
BOSS_REGION_RUNS = 4

.assert BOSS_BAND_ROWS = 8, error, "the band is 8 rows (owner answer Q2)"
.assert hull_scroll_rates = world_scroll_rates + 3, error, "the two scroll-rate tables are no longer one 6-B run"
.assert (BOSS_CHARSET & $03FF) = 0, error, "an ANTIC 4 charset starts on a 1 KB boundary"

.export boss_head, boss_vector_image, boss_dli, boss_update, boss_motion
.export boss_completion, boss_install, boss_shown_pos, boss_dli_pos, boss_pos
.export boss_rts, boss_runs, boss_draw_module, boss_apply_pos, boss_module_scored
.export boss_column_map, boss_column_at, boss_rebuild_module, boss_prepare
.export boss_mx, boss_mxe, boss_look_operand, boss_shake_timer
.export boss_ring_lo, boss_ring_hi, boss_ring_saved, boss_ring_timer, boss_ring_module, boss_ring_glyph
.export boss_tick_timer, boss_queue_head, boss_queue_tail
.export boss_nozzle_dark, boss_column_from, boss_ring_set
.export boss_stop_y, boss_shot_lo, boss_shot_hi, boss_hull_stop_operand, boss_shot_meet
.export boss_band_last_operand, boss_hostile_bottom_operand, boss_late_bottom_operand
.export boss_dli_publish, boss_pal_src1, boss_pal_src3   ; feat/boss-art: for the harness
.export boss_capsule_y_operand, boss_band_measure
.export boss_shots_late
; The controller's view of the region's tables, the level, main and the
; summary (src/c/boss.c): every address it reads is one of this link's.
.export _boss_tables, _boss_module_table, _boss_level, _boss_def
.export _boss_difficulty, _boss_active_frame, _boss_stats_bonus
_boss_tables       = BOSS_TABLES
_boss_module_table = BOSS_T_MODULES
_boss_level        = LEVEL_IMAGE
_boss_def          = LEVEL_PAYLOAD_BOSS_DEF
_boss_difficulty   = DIFFICULTY_SETTING
_boss_active_frame = ACTIVE_GAMEPLAY_FRAME_LO
_boss_stats_bonus  = STATS_BONUS
; feat/boss-escort-flow: the Director's escort calls (the Director link).
.export _director_c_boss_weapon_down, _director_c_boss_escort_frame
.import _boss_c_init, _boss_c_hit, _boss_c_tick
.import _boss_hit_module, _boss_hit_cell, _boss_stage_module, _boss_stage_add
.import _boss_score_module, _boss_newly_lo, _boss_newly_hi, _boss_kind, _boss_hp
.import _boss_blast, _boss_handoff, _boss_clock_lo, _boss_clock_hi, _boss_phase
.import _boss_fire_module, _boss_fire_offset, _boss_heavy
.import _boss_exposed_lo, _boss_exposed_hi
.import _boss_armed_lo, _boss_armed_hi, _boss_count, _boss_cursor, _boss_n, _boss_bit_table
.export _boss_next_armed
.export boss_laser_slots, _boss_laser_slots
_boss_laser_slots = boss_laser_slots

; ===========================================================================
; Slot A's head: the entry, then the vector table image.
; ===========================================================================
.segment "BOSS_HEAD"

boss_slot:
    jmp boss_head

; The capital vector table's meanings (scripts/build.mjs CAPITAL_VECTORS), in
; its order; the install copies this over the window table.
boss_vector_image:
    jmp init_broadside                  ; INIT: resident, start_gameplay only
    jmp boss_update                     ; UPDATE
    jmp boss_rts                        ; TICK_EXPLOSIONS
    jmp lance_tick                      ; TICK_FLASHES (M6: the VOID LANCE, slot G - src/hybrid/lance.s)
    jmp boss_rts                        ; ENGINE
    jmp boss_rts                        ; HULL_CONTACT
    jmp boss_rts                        ; RENDER_FLASHES
    jmp boss_rts                        ; RENDER_EXPLOSIONS
    jmp boss_shots_late                 ; SECTOR_COMPLETION (P1: the shots, then boss_completion)
    jmp boss_rts                        ; RESTORE_MUZZLES
    jmp boss_motion                     ; PREPARE_ROW
    jmp boss_rts                        ; SCROLL_HULL
boss_vector_image_end:
.assert boss_vector_image_end - boss_vector_image = CAPITAL_VECTOR_COUNT * 3, error, "the boss vector image is not the capital table's shape"

.segment "BOSS_CODE"

; The rest of the entry (plan §5.11.7 (4), §5.13.4): the shared install run,
; slot C, then the region's band A, band B and charset runs, through the
; reader's own sector loop at sector numbers the build baked into boss_runs;
; then the install.
boss_head:
    ; audit-hardening (AUD-02): slot A itself was checked by the reader's run
    ; read before it ran, which leaves the disk guard's fold at zero; the
    ; eight runs the head reads (S5-1: the region block too) are folded on.
    ldy #BOSS_RUN_INSTALL
    jsr boss_read_run
    ldy #BOSS_RUN_SLOT_C
    jsr boss_read_run
    ldy #BOSS_RUN_SLOT_D
    jsr boss_read_run
    ldy #BOSS_RUN_SLOT_E                ; S4b.5: slot E, over the hull maps
    jsr boss_read_run
    ldx #$00
    lda LEVEL_ID
    sec
    sbc #$01
@region:
    ; S5-1: the last region's test first, so the SBC's carry is the CMP's
    ; (the window's entry half had and fixed the same order, c-asm-abi.s).
    cpx #$03
    beq @have_region
    cmp #$03
    bcc @have_region
    sbc #$03                            ; C=1 from the CMP
    inx
    bne @region
@have_region:
    stx boss_head_region                ; S5-1: the check's index (20-B stride)
    lda boss_region_runs,x
    ldx #BOSS_REGION_RUNS
@run:
    pha
    tay
    txa
    pha
    jsr boss_read_run
    pla
    tax
    pla
    clc
    adc #$05
    dex
    bne @run
    jmp boss_head_check

; Y = a run's offset in boss_runs: {sector lo, sector hi, count, dst lo, dst hi}.
boss_read_run:
    lda boss_runs+2,y
    beq boss_wrong_disk                 ; a region this disk does not carry
    sta sr_sectors_left
    lda boss_runs,y
    sta sr_sector_lo
    lda boss_runs+1,y
    sta sr_sector_hi
    lda boss_runs+3,y
    sta sr_dst
    lda boss_runs+4,y
    sta sr_dst+1
    jsr sector_reader_read_sectors
    bcs boss_read_failed
    rts
boss_wrong_disk:
    lda #SR_BAD_IMAGE
boss_read_failed:
    jmp sector_reader_failure_screen

boss_rts:
    rts

boss_region_runs:
    .repeat 4, R
        .byte BOSS_RUN_REGIONS + R * BOSS_REGION_RUNS * 5
    .endrepeat
boss_runs:
    .include "boss-runs.inc"

; ===========================================================================
; audit-hardening (AUD-02, docs/plans/audit-hardening.md §3): the head's check,
; in a segment of its own at slot A's end, so that the head and every routine
; behind it keep their addresses. Nothing the head read is run or used - the
; install, slots C-E (M6: and G), the band and its tables - unless the nine
; runs check against the region's value; then the module count is bounded to 1..16
; before the controller can index its 16-entry arrays with it. Either refusal
; is the reader's failure screen (WRONG DISK), as a missing region is.
; S5-1: eight runs - the region's block (slot F) is its fourth - and the
; region's index from the head (boss_head_region), the run table's 20-B
; stride no longer naming it by the last offset's top nibble.
; ===========================================================================
.segment "BOSS_HEAD_CHECK"

boss_head_check:
    ldx boss_head_region
    lda boss_head_sums_lo,x
    ldy boss_head_sums_hi,x
    jsr guard_compare
    bcs @refused
    ldx BOSS_T_MODULE_COUNT
    dex                                 ; 1..16 -> 0..15; 0 -> $FF
    cpx #BOSS_MAX_MODULES
    bcs @refused
    jmp boss_install
@refused:
    jmp boss_wrong_disk

; The expected fold of the nine runs banner_reads reads after the boss code
; (M6: slot G after slot E), per region (scripts/build.mjs).
    .include "boss-sums.inc"

.assert BOSS_RUN_REGIONS + 4 * BOSS_REGION_RUNS * 5 <= 256, error, "the run table outgrows the head's 8-bit offsets"

.segment "BOSS_CODE"

; ===========================================================================
; The boss DLI (decision 9: the third DLI, in the boss sector only).
;   phase 0, the HUD's last line: the PAL-frame token, the region's charset
;            (the divider row and the band are drawn in it) and the band's
;            own palette (the divider row shows it too);
;   phase 1, the band's last line: the gameplay charset and the ring's
;            palette back; then, with the band behind ANTIC, next frame's
;            HSCROL and, on a coarse step, the band rows' LMS;
;   phase 2, the last ring line: the HUD, exactly as gameplay_dli's tail.
; A is the only register it may assume saved; X is saved where it is used.
; ===========================================================================
boss_dli:
    pha
    cld                                 ; AUD-03: the NMI keeps the interrupted D (the scoring's SED); the RTI restores it
    lda gameplay_dli_phase
    bne @below_hud
    inc PHYSICAL_PAL_FRAME_ID
    sta WSYNC
    lda #>BOSS_CHARSET
    sta CHBASE
    lda BOSS_T_PALETTE                  ; the region's (S4b.5: no band flash)
    sta COLPF0
    lda BOSS_T_PALETTE+1
    sta COLPF1
    lda BOSS_T_PALETTE+2
    sta COLPF2
    lda BOSS_T_PALETTE+3
    sta COLPF3
@publish:
    jsr laser_publish                   ; S4b: the lasers' HPOS and SIZEM (A only)
    inc gameplay_dli_phase
    pla
    rti
@below_hud:
    lsr                                 ; phase 1 -> C=1; phase 2 -> C=0
    bcc @hud
    sta WSYNC
    ; QA2's COLPF3-first order is superseded by B2 (no laser pixel is COLPF3):
    ; the charset first. S5-4 (owner decision of 2026-10-14, the scanline
    ; fix): COLPF2 next - on the first line under the band the later stores
    ; land after the line has begun, and COLPF2 is the player's shot's colour,
    ; so its top pixel there takes the playfield's (measured on all four
    ; regions' routes, plan s5-boss-regions §6.4.3); 0 B, 0 cycles.
    lda #>CHARSET
    sta CHBASE
    lda #GAMEPLAY_COLPF2
    sta COLPF2
    lda #GAMEPLAY_COLPF0
    sta COLPF0
    lda gameplay_dli_allied_colpf1_load+1   ; the level's allied steel
    sta COLPF1
    lda #GAMEPLAY_COLPF3
    sta COLPF3
    inc gameplay_dli_phase
    lda boss_dli_pos
    cmp boss_shown_pos
    beq @same
    txa
    pha
    jsr boss_apply_pos
    pla
    tax
@same:
    pla
    rti
@hud:
    jmp gameplay_dli_sync_hud
; feat/boss-art: boss_pal_prepare points phase 0's publish at boss_pal_frame.
boss_dli_publish = @publish + 1

; Publish band position p = boss_dli_pos (colour clocks, 0..travel): with the
; LMS L cells in and HSCROL h, L*4 - h = p and h is 0..15, so the coarse LMS
; moves once every 16 colour clocks. A shot's band column is then simply
; (x - BAND_ORIGIN_HPOS + p) / 4. Touches A and X.
boss_apply_pos:
    lda boss_dli_pos
    sta boss_shown_pos
    clc
    adc #15
    and #$F0
    tax                                 ; X = L*4
    sec
    sbc boss_shown_pos
    sta HSCROL
    txa
    lsr
    lsr
    cmp boss_shown_lms
    beq @done
    sta boss_shown_lms
@last:
    ldx #(BOSS_BAND_ROWS - 1)           ; the band's last shown row (the install)
@row:
    lda boss_shown_lms
    ora boss_band_lo,x                  ; each row is 64 B on a 64-B boundary
    sta boss_lms_target
    lda boss_dl_lms_offsets,x
    stx boss_dli_x
    tax
    lda boss_lms_target
    sta PLAYFIELD_DLIST_A,x
    ldx boss_dli_x
    dex
    bpl @row
@done:
    rts
boss_band_last_operand = @last + 1

; ===========================================================================
; PREPARE_ROW, every frame from update_starfield (the world is stopped, so it
; is reached through the no-hull-step path on every frame): the band drifts
; one colour clock every framesPerStep frames across its travel and back
; (plan §5.2); the win's shake jitters it by the region's amplitude for
; shakeFrames frames (Q-S5). One byte is published for the DLI.
; ===========================================================================
boss_motion:
    dec boss_step_timer
    bne @place
    lda BOSS_T_FRAMES_PER_STEP
    sta boss_step_timer
    lda boss_pos
    clc
    adc boss_dir
    sta boss_pos
    beq @turn
    cmp BOSS_T_TRAVEL
    bne @place
@turn:
    lda boss_dir
    eor #$FE                            ; +1 <-> -1
    sta boss_dir
@place:
    lda boss_pos
    ldx boss_shake_timer
    beq @publish
    dec boss_shake_timer
    lda frame_counter
    lsr
    lda boss_pos
    bcc @shake_left
    adc BOSS_T_SHAKE_AMPLITUDE          ; C=1: +amplitude+1, the far side
    cmp BOSS_T_TRAVEL
    bcc @publish
    lda BOSS_T_TRAVEL
    bcs @publish
@shake_left:
    sbc BOSS_T_SHAKE_AMPLITUDE          ; C=0: -amplitude-1
    bcs @publish
    lda #$00
@publish:
    sta boss_dli_pos
    rts

; ===========================================================================
; UPDATE, in handle_collisions right after the PairShots moved: every player
; shot inside the band flies on until it reaches the cell that stops it
; (decision M, plan §5.16): per column the front intact module's bottom row,
; else the hull's own stop row, else nothing - it leaves the band's top and is
; removed. Its cell is drawn later in the frame, once the band has been shown
; (boss_shots_late, fix/smoke-2026-10-07 P1). Only the girders' named cells are see-through
; (decision M); no hull art is drawn under a weapon (decision O). Hull absorbs (no
; damage, not a hit, Q-B7); a module column goes to the controller, which
; decides whether the module is exposed (damage) or covered (absorbed). Every hit reads
; (decision J): a spark in the struck cell, the band flash and the damage
; tick on a damaging hit; a deflection and the absorb or hull tick otherwise.
; Then the controller's tick - the exposure a kill asked for, the next firing,
; the chain - the boss's shot, one queued module draw, the nozzles.
; ===========================================================================
boss_update:
    ; The player's post-hit damage cooldown, counted down every frame as the
    ; capital UPDATE (update_broadside) counts it: without it a boss shot
    ; could never hurt again after one hit (MEASURED, plan §5.15.7).
    lda BROAD_DAMAGE_COOLDOWN
    beq :+
    dec BROAD_DAMAGE_COOLDOWN
:
    lda #$00
    sta boss_frame_heavy
    jsr boss_frame_timers
    jsr laser_frame                     ; S4b: the lasers, the boss's shots in the band
    ldx #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
@shot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @next
    lda FIGHTER_PROJECTILE_Y,x
    cmp #BAND_BOTTOM_Y
    bcs @next
    jsr boss_shot_admit                 ; AUD-04: two meetings a frame (slot D)
    bcc @next
    sta _boss_hit_module
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    sty _boss_hit_cell
    stx boss_slot_save
    jsr boss_hit
    ldx boss_slot_save
@next:
    dex
    bpl @shot
    jsr _boss_c_tick
    jsr laser_first_shot                ; S4b.4: a shield just fell (slot D)
    jsr boss_open_looks
    jsr boss_fire
    lda _boss_blast
    bmi @queue
    jsr boss_mflash_guard_m             ; slot E: the blast's module, its flash off first
    ; One link of the chain (plan §5.6, §5.11.4 item 4): blast glyphs over
    ; the module, the shared enemy-explosion slot's COLBK flash, the band's
    ; shake and the capital explosion's sound.
    tax
    and #$01
    tay
    lda BOSS_T_BLAST_A,y
    sta boss_fill
    lda #BOSS_MODE_FILL
    sta boss_mode
    txa
    jsr boss_draw_module
    lda #SHARED_FIGHTER_EXPLOSION_TOTAL
    sta FIGHTER_EXPLOSION_TIMER + FIGHTER_EXPLOSION_ENEMY_SLOT
    lda BOSS_T_SHAKE_FRAMES
    sta boss_shake_timer
    lda #CAPITAL_EXPLOSION_DURATION
    sta CAPITAL_EXPLOSION_SOUND_TIMER
@queue:
    ; A kill frame (the rebuild) and the exposure check's frame leave their
    ; queued draw to the next frame (plan §5.15.7: the worst frame's budget).
    lda boss_frame_heavy
    ora _boss_heavy
    bne :+
    jsr boss_mflash_frame               ; slot E: the flash's draw, else the queue's
:
    jmp boss_nozzles

; A shot reached a band column that is not open sky: _boss_hit_module is the
; column map's value, _boss_hit_cell the column. After the defeat a shot is
; only spent.
boss_hit:
    lda _boss_phase
    beq :+
    rts
:
    ; The struck cell: the one that stopped the shot (the column's stop
    ; line, read before the controller's hit can rebuild the column) - a
    ; module's bottom row, or (S5-5) the row region 2's block moved its stop
    ; to; the hull's stop cell - a cell of the hull no module owns (not a
    ; girder's), so no module's draw can take it while the ring holds it (the
    ; stray glyph of plan §5.16.1).
    ldy _boss_hit_cell
    sty boss_column
    lda boss_stop_y,y
    sec
    sbc #(BAND_TOP_Y + 8)               ; the stop line - (BAND_TOP_Y + 8) = row * 8
    lsr
    lsr
    lsr
    pha                                 ; its row
    lda _boss_hit_module
    cmp #BOSS_COLUMN_ARMOUR
    bne @module
    ; The hull: the deflection there, the hull tick.
    pla
    tax
    jsr boss_cell_at
@hull:
    lda #$FF
    sta boss_ring_tag
    ldx #BOSS_TONE_HULL
    bne boss_deflect
@module:
    jsr _boss_c_hit
    sta boss_hit_result
    cmp #$00                            ; cc65 returns in A; the flags are X's
    beq :+
    jsr boss_after_hit
:
    ldx _boss_hit_module
    stx boss_ring_tag
    pla                                 ; the struck cell's row
    tax
    jsr boss_cell_at
    lda boss_hit_result
    beq @absorbed
    ; fix/boss-polish (b3): a hit the module lives through asks for its flash
    ; (slot E, boss_mflash_frame) and ticks; a kill keeps the spark.
    ldx #BOSS_TONE_DAMAGE
    lda _boss_score_module
    bpl @kill
    lda _boss_hit_module
    sta boss_mflash_req
    jmp boss_tick_sound
@kill:
    lda BOSS_T_SPARK
    ldx #BOSS_TONE_DAMAGE
    jmp boss_feedback
@absorbed:
    ldx #BOSS_TONE_ABSORB
boss_deflect:
    lda BOSS_T_DEFLECT
; A = the glyph, X = the tick's tone, dst_ptr = the cell, boss_ring_tag.
boss_feedback:
    pha
    jsr boss_tick_sound
    pla
    ldy #BOSS_SPARK_FRAMES
    jmp boss_ring_set

; X = a band row, boss_column a column -> dst_ptr = that cell. Keeps X.
boss_cell_at:
    lda boss_band_lo,x
    ora boss_column                     ; each row is 64 B on a 64-B boundary
    sta dst_ptr
    lda boss_band_hi,x
    sta dst_ptr+1
    rts

; A module took damage: the accuracy stat, then what the controller asked
; for - a damage stage (+K to every cell, §5.13.2 item 4), or the kill. Both
; draws go through the queue: one module drawn a frame (§5.15.6 item 2).
boss_after_hit:
    inc STATS_HITS
    bne :+
    inc STATS_HITS+1
:
    lda _boss_stage_module
    bmi boss_after_stage
    ldx #BOSS_MODE_ADD
    ldy _boss_stage_add
    jsr boss_enqueue
boss_after_stage:
    ldx _boss_score_module
    bmi boss_after_done
    ; S5-1 (plan s5-boss-regions §4.1): the kill's scoring lives in slot D
    ; now, so slot A has room for the regions' fourth run.
    jmp boss_module_scored
boss_after_done:
    rts

; Every module the tick's exposure check exposed shows its open look (the S3
; core's shutters, a cannon's lit barrel), queued, lowest index first.
boss_open_looks:
    lda _boss_newly_lo
    sta boss_bits_lo
    lda _boss_newly_hi
    sta boss_bits_hi
    ldx #$00
@open:
    lda boss_bits_lo
    ora boss_bits_hi
    beq @done
    lsr boss_bits_hi
    lda boss_bits_lo
    ror
    sta boss_bits_lo
    bcc @next
    lda BOSS_T_OPEN,x
    cmp #BOSS_NO_LOOK
    beq @next
    tay
    stx boss_open_x
    txa
    ldx #BOSS_MODE_COPY
    jsr boss_enqueue
    ldx boss_open_x
@next:
    inx
    bne @open
@done:
    rts

; The controller named a firing module (§5.13.2 item 6): the muzzle flash in
; its bottom row at its centre column (+ a salvo's offset), and one PULSE
; shot of the shared hostile pool straight down from the band's bottom edge -
; when that column is on screen and a slot is free (a full pool drops it).
boss_fire:
    lda _boss_fire_module
    bmi @done
    tax
    lda _boss_kind,x                    ; S4b.1 (D1): an emitter never fires a
    cmp #BOSS_KIND_EMITTER              ; pulse shot - its laser is slot D's own
    beq @done
    stx boss_ring_tag
    jsr boss_record_of
    lda BOSS_T_MODULES + BOSS_M_WIDTH,y
    lsr
    clc
    adc BOSS_T_MODULES + BOSS_M_X,y
    clc
    adc _boss_fire_offset
    sta boss_column
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    and #$0F                            ; the height (bits 4-7: cavityRows)
    clc
    adc BOSS_T_MODULES + BOSS_M_ROW,y
    tax
    dex
    jsr boss_cell_at
    txa                                 ; QA1: the shot is born on the line
    asl                                 ; under the gun's bottom row (X <= 7)
    asl
    asl
    adc #(BAND_TOP_Y + 8)
    sta boss_fire_y
    lda BOSS_T_MUZZLE
    ldy #BOSS_MUZZLE_FRAMES
    jsr boss_ring_set
    ; The shot's HPOS: column * 4 + 32 - p, +1 and even (the two-pixel core
    ; inside one cell); the column must lie in the screen's window.
    lda boss_column
    asl
    asl
    sec
    sbc boss_shown_pos
    bcc @done                           ; left of the band's first byte
    adc #BAND_ORIGIN_HPOS               ; C = 1: + 33
    bcs @done
    cmp #GAMEPLAY_LEFT_HPOS
    bcc @done
    cmp #(GAMEPLAY_LEFT_HPOS + GAMEPLAY_SCREEN_COLUMNS * 4 - 1)
    bcs @done
    and #$FE
    ldx #INTERCEPTOR_PROJECTILE_SLOT_BASE
@slot:
    ldy FIGHTER_PROJECTILE_ACTIVE,x
    beq @spawn
    inx
    cpx #(INTERCEPTOR_PROJECTILE_SLOT_BASE + INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT)
    bne @slot
@done:
    rts
@spawn:
    sta FIGHTER_PROJECTILE_X,x
    lda boss_fire_y                     ; QA1: at the muzzle, drawn in the band
    sta FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
    lda #INTERCEPTOR_PROJECTILE_LIFETIME
    sta FIGHTER_PROJECTILE_LIFETIME,x
    lda #BOSS_SHOT_ACTIVE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    rts

; ---------------------------------------------------------------------------
; The frame's timers: the ring's records expire (their cells get their codes
; back), the band flash ends after its frame, the tick gives channel 3 back to
; the engine bed after its two frames.
; ---------------------------------------------------------------------------
boss_frame_timers:
    ldx #(BOSS_RING_RECORDS - 1)
@ring:
    lda boss_ring_timer,x
    beq @next
    dec boss_ring_timer,x
    bne @next
    jsr boss_ring_restore
@next:
    dex
    bpl @ring
@tick:
    lda boss_tick_timer
    beq @done
    dec boss_tick_timer
    bne @done
    lda sound_enabled
    beq @done
    lda #BOSS_BED_AUDF
    sta AUDF3
    lda #BOSS_BED_AUDC
    sta AUDC3
@done:
    rts


; X = the tone: the tick over the engine bed for two frames (Q-B4), never
; when the sound is off. Keeps dst_ptr.
boss_tick_sound:
    lda boss_tick_timer
    cmp #BOSS_TICK_FRAMES
    beq @off                            ; this frame's first hit set the tick
    lda sound_enabled
    beq @off
    lda boss_tone_audf,x
    sta AUDF3
    lda boss_tone_audc,x
    sta AUDC3
    lda #BOSS_TICK_FRAMES
    sta boss_tick_timer
@off:
    rts

; ---------------------------------------------------------------------------
; The cell-flash ring (§5.13.2 item 5): records of (cell, saved code, timer,
; module, glyph). A record on the struck cell is refreshed (its saved code
; stays the cell's own); else a free one is taken, else the next in turn
; gives its cell back first.
; ---------------------------------------------------------------------------

; A = the glyph, Y = its frames, dst_ptr = the cell, boss_ring_tag = the
; module whose draws carry the record along ($FF: none).
boss_ring_set:
    sta boss_ring_new
    sty boss_ring_frames
    ; Five shots on one cell in a frame: the record written last, at once.
    ldx boss_ring_last
    lda boss_ring_timer,x
    beq @search
    lda boss_ring_lo,x
    cmp dst_ptr
    bne @search
    lda boss_ring_hi,x
    cmp dst_ptr+1
    beq @refresh
@search:
    ldx #(BOSS_RING_RECORDS - 1)
@same:
    lda boss_ring_timer,x
    beq @next_same
    lda boss_ring_lo,x
    cmp dst_ptr
    bne @next_same
    lda boss_ring_hi,x
    cmp dst_ptr+1
    beq @refresh
@next_same:
    dex
    bpl @same
    ldx #(BOSS_RING_RECORDS - 1)
@free:
    lda boss_ring_timer,x
    beq @take
    dex
    bpl @free
    lda boss_ring_next
    clc
    adc #$01
    and #(BOSS_RING_RECORDS - 1)
    sta boss_ring_next
    tax
    jsr boss_ring_restore
@take:
    lda dst_ptr
    sta boss_ring_lo,x
    lda dst_ptr+1
    sta boss_ring_hi,x
    ldy #$00
    lda (dst_ptr),y
    sta boss_ring_saved,x
    lda boss_ring_tag
    sta boss_ring_module,x
@refresh:
    stx boss_ring_last
    lda boss_ring_new
    sta boss_ring_glyph,x
    ldy #$00
    sta (dst_ptr),y
    lda boss_ring_frames
    sta boss_ring_timer,x
    rts

; X = a record: its cell gets its saved code back. Keeps X.
boss_ring_restore:
    lda boss_ring_lo,x
    sta @cell+1
    lda boss_ring_hi,x
    sta @cell+2
    lda boss_ring_saved,x
@cell:
    sta $FFFF
    rts

; Around a module's draw (boss_draw_m): A = $00 before, every live record of
; that module gives its cell back; A = $FF after, each takes the new code as
; its saved code and shows its glyph again - a spark outlives a stage change.
boss_ring_rebase:
    sta boss_rebase_mode
    ldx #(BOSS_RING_RECORDS - 1)
@record:
    lda boss_ring_timer,x
    beq @next
    lda boss_ring_module,x
    cmp boss_draw_m
    bne @next
    lda boss_ring_lo,x
    sta @read+1
    sta @write+1
    lda boss_ring_hi,x
    sta @read+2
    sta @write+2
    bit boss_rebase_mode
    bmi @read
    lda boss_ring_saved,x
    jmp @write
@read:
    lda $FFFF
    sta boss_ring_saved,x
    lda boss_ring_glyph,x
@write:
    sta $FFFF
@next:
    dex
    bpl @record
    rts

; ---------------------------------------------------------------------------
; The draw queue (§5.15.6 item 2): a stage change, a gone module and an open look are
; drawn one module a frame, in the order asked; a full queue draws its oldest
; at once.
; ---------------------------------------------------------------------------

; A = the module, X = how (BOSS_MODE_*), Y = the value (the add or the look).
; A module's queued draws merge: its gone draw takes the place of the first of
; them and cancels the rest, a second damage stage adds into its queued one -
; so a burst of hits never fills the queue.
boss_enqueue:
    sta boss_q_module
    stx boss_q_mode
    sty boss_q_value
    lda #$00
    sta boss_q_placed
    ldx boss_queue_head
@walk:
    cpx boss_queue_tail
    beq @append
    lda boss_queue_module,x
    cmp boss_q_module
    bne @step
    lda boss_q_mode
    cmp #BOSS_MODE_GONE
    bne @add
    lda boss_q_placed
    bne @cancel
    inc boss_q_placed
    lda #BOSS_MODE_GONE
    sta boss_queue_mode,x
    bne @step
@cancel:
    lda #BOSS_MODE_NONE
    sta boss_queue_mode,x
    bne @step
@add:
    cmp #BOSS_MODE_ADD
    bne @step
    lda boss_queue_mode,x
    cmp #BOSS_MODE_ADD
    bne @step
    lda boss_queue_value,x
    clc
    adc boss_q_value
    sta boss_queue_value,x
    rts
@step:
    inx
    txa
    and #(BOSS_QUEUE_ENTRIES - 1)
    tax
    jmp @walk
@append:
    lda boss_q_placed
    beq :+
    rts
:
    lda boss_queue_tail
    clc
    adc #$01
    and #(BOSS_QUEUE_ENTRIES - 1)
    cmp boss_queue_head
    bne @room
    jsr boss_queue_draw
@room:
    ldx boss_queue_tail
    lda boss_q_module
    sta boss_queue_module,x
    lda boss_q_mode
    sta boss_queue_mode,x
    lda boss_q_value
    sta boss_queue_value,x
    inx
    txa
    and #(BOSS_QUEUE_ENTRIES - 1)
    sta boss_queue_tail
    rts

; The oldest entry, drawn (superseded ones are passed over); nothing when the
; queue is empty.
boss_queue_draw:
    ldx boss_queue_head
    cpx boss_queue_tail
    beq @empty
    lda boss_queue_mode,x
    cmp #BOSS_MODE_NONE
    bne @draw
    inx
    txa
    and #(BOSS_QUEUE_ENTRIES - 1)
    sta boss_queue_head
    jmp boss_queue_draw
@draw:
    jsr boss_mflash_guard_q             ; slot E: a flashing module's flash off first
    sta boss_mode
    lda boss_queue_value,x
    sta boss_add
    sta boss_look
    lda boss_queue_module,x
    pha
    inx
    txa
    and #(BOSS_QUEUE_ENTRIES - 1)
    sta boss_queue_head
    pla
    jmp boss_draw_module
@empty:
    rts

; ---------------------------------------------------------------------------
; The nozzles at both ends (decision K, §5.13.2 item 9): every framesPerPhase
; frames the next of three phase images is copied over the two nozzle codes'
; glyphs (the capital engine banks' mechanism: no cell is written); the
; defeat darkens both, for good, before the chain's first blast shows.
; ---------------------------------------------------------------------------
boss_nozzles:
    lda boss_nozzle_dark
    bne @done
    lda _boss_phase
    beq @lit
    inc boss_nozzle_dark
    jmp boss_nozzle_darken
@done:
    rts
@lit:
    dec boss_nozzle_timer
    bne @done
    lda BOSS_T_NOZZLE_FRAMES
    sta boss_nozzle_timer
    ldx boss_nozzle_phase
    inx
    cpx #3
    bne :+
    ldx #0
:
    stx boss_nozzle_phase
    txa
    asl
    asl
    asl
    tay
    ldx #$00
boss_nozzle_copy:
boss_nozzle_src_l:
    lda $FFFF,y
boss_nozzle_dst_l:
    sta $FFFF,x
boss_nozzle_src_r:
    lda $FFFF,y
boss_nozzle_dst_r:
    sta $FFFF,x
    iny
    inx
    cpx #8
    bne boss_nozzle_copy
    rts
; The dark phase: both glyphs' eight bytes zeroed, once.
boss_nozzle_darken:
    lda boss_nozzle_dst_l+1
    sta @left+1
    lda boss_nozzle_dst_l+2
    sta @left+2
    lda boss_nozzle_dst_r+1
    sta @right+1
    lda boss_nozzle_dst_r+2
    sta @right+2
    lda #$00
    ldx #7
@left:
    sta $FFFF,x
@right:
    sta $FFFF,x
    dex
    bpl @left
    rts

boss_tone_audf:
    .byte $18, $40, $28                 ; damage (high, pure), absorbed, hull
boss_tone_audc:
    .byte $A6, $A4, $C5                 ; pure tone, pure tone, poly4 (a clank)


; X = module -> Y = its record's offset in the module table (x 12). A, Y.
boss_record_of:
    txa
boss_record_a:                          ; A = module (S5-5: region 2's block)
    asl
    asl
    sta boss_record_x                   ; x 4
    asl                                 ; x 8, C = 0 (x < 16)
    adc boss_record_x
    tay
    rts

; A = module; boss_mode says how its cells are written, row by row:
;   BOSS_MODE_COPY  boss_look's cells from the region's look tail (the
;                   operand below is the tail's address, set by boss_prepare)
;   BOSS_MODE_FILL  boss_fill in every cell
;   BOSS_MODE_ADD   boss_add added to every staged cell's code (a damage stage)
;   BOSS_MODE_GONE  gone: the cavity above the hull line, background below (decision L)
; The ring's records on the module's cells are lifted before and laid back
; after, so a spark or a muzzle flash outlives the redraw.
boss_draw_module:
    sta boss_draw_m
    lda #$00
    jsr boss_ring_rebase
    ldx boss_draw_m
    jsr boss_record_of
    lda BOSS_T_MODULES + BOSS_M_ROW,y
    sta boss_row
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    pha
    and #$0F
    sta boss_rows_left
    pla
    lsr
    lsr
    lsr
    lsr
    sta boss_cavity_left                ; the rows inside the hull (decision L)
    lda BOSS_T_MODULES + BOSS_M_WIDTH,y
    sta boss_width
    lda BOSS_T_MODULES + BOSS_M_X,y
    sta boss_x
@row:
    ldx boss_row
    lda boss_band_lo,x
    ora boss_x                          ; x <= 63 inside a 64-B row
    sta dst_ptr
    lda boss_band_hi,x
    sta dst_ptr+1
    ldy #$00
@cell:
    bit boss_mode
    bmi @add
    bvs @fill
    ldx boss_look
    jsr boss_look_code
    inc boss_look
    jmp @store
@add:
    bvs @gone
    ; S4b.4 (owner decision 1): +K / +2K on the staged cells only - a plain
    ; cell (the lens-only emitter's tower) and a blank one keep their codes.
    lda (dst_ptr),y
    tax
    and #$7F
    beq @keep                           ; blank
    cmp BOSS_T_PLAIN_BASE
    bcs @keep                           ; plain: no stage
    txa
    adc boss_add                        ; C = 0: a staged code
    .byte $24                           ; BIT zp: skips the TXA
@keep:
    txa
    jmp @store
@gone:
    ; Gone: the cavity on the rows inside the hull, background below.
    lda boss_cavity_left
    beq @store
    lda BOSS_T_CAVITY
    jmp @store
@fill:
    lda boss_mode
    lsr                                 ; C: a flash's draw (bit 0)
    lda boss_fill
    bcc @store
    jsr boss_mflash_cell                ; slot E: A = the cell's code
@store:
    sta (dst_ptr),y
    iny
    cpy boss_width
    bne @cell
    lda boss_cavity_left
    beq :+
    dec boss_cavity_left
:
    inc boss_row
    dec boss_rows_left
    bne @row
    lda #$FF
    jmp boss_ring_rebase

; X = an offset into the region's look tail -> A = that cell's code. The
; operand is the tail's address, set by boss_prepare from the region's tables.
boss_look_code:
    lda $FFFF,x
    rts
boss_look_operand = boss_look_code + 1

; ===========================================================================
; The column map (§5.13.2 item 3): per band column the front intact module
; covering it - the first live module of the front-first table - else ARMOUR
; where the band has hull, else OPEN. Built whole once by boss_prepare; a kill
; rebuilds only the dead module's columns (§5.13.5 P2), which is the same as
; rebuilding the whole map (tests/boss-engine.test.mjs).
; ===========================================================================

; X = column; keeps X. boss_column_from: Y = the first module to consider.
boss_column_at:
    ldy #$00
boss_column_from:
@module:
    cpy BOSS_T_MODULE_COUNT
    beq @base
    lda _boss_hp,y
    beq @next
    txa
    cmp boss_mx,y
    bcc @next
    cmp boss_mxe,y
    bcc @found
@next:
    iny
    bne @module
@found:
    tya
    sta boss_column_map,x
    lda boss_mbottom_y,y
    sta boss_stop_y,x
    rts
@base:
; X = column: hull (ARMOUR) where the band has a cell no module owns and no
; girder's see-through cell, else OPEN (decisions M, O); and the column's stop line - under that hull
; cell, or 0 for open sky (the converter's hull-stop table, a nibble each).
boss_column_base:
    txa
    and #$07
    tay
    lda boss_bit,y
    sta boss_tmp
    txa
    lsr
    lsr
    lsr
    tay
    lda BOSS_T_ARMOUR,y
    ldy #BOSS_COLUMN_OPEN
    and boss_tmp
    beq :+
    ldy #BOSS_COLUMN_ARMOUR
:
    tya
    sta boss_column_map,x
    lda #$00
    cpy #BOSS_COLUMN_ARMOUR
    bne @stop
    txa
    lsr
    tay
@hull_stop:
    lda $FFFF,y                         ; the hull-stop table (boss_prepare)
    bcc :+
    lsr
    lsr
    lsr
    lsr
:
    and #$0F
    beq @stop
    asl
    asl
    asl
    adc #BAND_TOP_Y
@stop:
    sta boss_stop_y,x
    rts
boss_hull_stop_operand = @hull_stop + 1

; X = a destroyed module: its columns again - only those it was the front
; of. Every module before it in the front-first table was already dead in
; those columns, so the new front is the first live module after it whose
; columns meet its span: those few are listed once, then each column tries
; them in order, else hull or open sky (the same map a full rebuild gives,
; tests/boss-engine.test.mjs).
boss_rebuild_module:
    stx boss_dead
    lda boss_mx,x
    sta boss_col_start
    lda boss_mxe,x
    sta boss_col_end
    ldx #$00
    ldy boss_dead
@candidate:
    iny
    cpy BOSS_T_MODULE_COUNT
    beq @listed
    lda _boss_hp,y
    beq @candidate
    lda boss_mx,y
    cmp boss_col_end
    bcs @candidate                      ; starts at or past the span's end
    lda boss_mxe,y
    cmp boss_col_start
    bcc @candidate                      ; ends before the span's start
    beq @candidate
    tya
    sta boss_candidates,x
    inx
    bne @candidate
@listed:
    stx boss_candidate_count
    ldx boss_col_start
@column:
    lda boss_column_map,x
    cmp boss_dead
    bne @keep
    txa
    ldy #$00
@try:
    cpy boss_candidate_count
    beq @base
    sty boss_tmp
    pha
    lda boss_candidates,y
    tay
    pla
    cmp boss_mx,y
    bcc @not
    cmp boss_mxe,y
    bcc @found
@not:
    ldy boss_tmp
    iny
    bne @try
@found:
    tya
    sta boss_column_map,x
    lda boss_mbottom_y,y
    sta boss_stop_y,x
    jmp @keep
@base:
    jsr boss_column_base
@keep:
    inx
    cpx boss_col_end
    bne @column
    rts

; ===========================================================================
; SECTOR_COMPLETION, late in every frame: once the chain and its hold are
; over, the fight's clock becomes the level's time stat (owner decision
; 2026-10-03: the time grade counts the boss fight only) and the level-summary
; screen takes over (decision 30). Slot A stays marked as overlaid since the
; entry, so the summary's next START GAME restores the capital code and every
; setting the install patched (Q-S4).
; ===========================================================================
boss_completion:
    lda _boss_handoff
    bne :+
    rts
:
    lda _boss_clock_lo
    sta ACTIVE_GAMEPLAY_FRAME_LO
    lda _boss_clock_hi
    sta ACTIVE_GAMEPLAY_FRAME_LO+1
    jmp sector_reader_level_end

; ---------------------------------------------------------------------------
; Tables.
; ---------------------------------------------------------------------------
boss_bit:
    .byte $01, $02, $04, $08, $10, $20, $40, $80
; Band row r's first byte: rows 0-5 at $A880 in place of the level's hull
; block, rows 6-7 at $AC80 past the image (scripts/boss-assets.mjs).
boss_band_lo:
    .repeat BOSS_BAND_ROWS, R
        .if R < BOSS_BAND_A_ROWS
            .byte <(BOSS_BAND_A + R * BOSS_BAND_COLUMNS)
        .else
            .byte <(BOSS_BAND_B + (R - BOSS_BAND_A_ROWS) * BOSS_BAND_COLUMNS)
        .endif
    .endrepeat
boss_band_hi:
    .repeat BOSS_BAND_ROWS, R
        .if R < BOSS_BAND_A_ROWS
            .byte >(BOSS_BAND_A + R * BOSS_BAND_COLUMNS)
        .else
            .byte >(BOSS_BAND_B + (R - BOSS_BAND_A_ROWS) * BOSS_BAND_COLUMNS)
        .endif
    .endrepeat
; Band row r's LMS low byte in the display list: HUD 3 + divider 3, 3 a row.
boss_dl_lms_offsets:
    .repeat BOSS_BAND_ROWS, R
        .byte 7 + R * 3
    .endrepeat

; ---------------------------------------------------------------------------
; Once-per-entry code in slot C (BOSS_C_ASM, read with the controller): the
; plan's lever for slot A (§5.13.6), taken by the fortress session (§5.15.7).
; ---------------------------------------------------------------------------
.segment "BOSS_C_ASM"

; S5-1, owner decision 2026-10-09 (A): the controller's next-gun search, called
; from boss_fire_next (src/c/boss.c), which keeps the policy - the next armed
; module after the cursor, cyclic. _boss_n = that module. The C walk cost ~110
; native a module (boss_bit_of and the mask test each step); this one 24 (0-7)
; or 25 (8-15). The armed set is never empty here (boss_c_tick tests it).
_boss_next_armed:
    ldx _boss_cursor
@step:
    inx
    cpx _boss_count
    bcc @test
    ldx #$00
@test:
    cpx #$08
    bcs @high
    lda _boss_armed_lo
    and _boss_bit_table,x
    beq @step
    stx _boss_n
    rts
@high:
    lda _boss_armed_hi
    and _boss_bit_table - 8,x
    beq @step
    stx _boss_n
    rts

; Once, from the install, before it copies the divider over the charset's
; first codes, where the region's charset run carries the row palette
; (scripts/boss-assets.mjs bossRowPalette: the switch mask, the switches'
; count, their COLPF1s, their COLPF3s): the count and colours into slot D's
; BSS, the DLI bit on each switching row's instruction, the phase-0 publish
; through boss_pal_frame. Falls into boss_prepare.
boss_pal_prepare:
    lda BOSS_ROWS_MASK
    beq boss_prepare                    ; no row palette: as before
    ldx #(2 * BOSS_ROW_SWITCHES_MAX)
@copy:
    lda BOSS_ROWS_COUNT,x
    sta boss_pal_count,x
    dex
    bpl @copy
    ldy #6                              ; band row 0's instruction (after the HUD's 3 and the divider's 3)
@row:
    lsr BOSS_ROWS_MASK                  ; the divider's copy overwrites it
    bcc @next
    lda PLAYFIELD_DLIST_A,y
    ora #$80                            ; + the row's DLI
    sta PLAYFIELD_DLIST_A,y
@next:
    iny
    iny
    iny
    lda BOSS_ROWS_MASK
    bne @row
    lda #<boss_pal_frame
    sta boss_dli_publish
    lda #>boss_pal_frame
    sta boss_dli_publish+1
    .assert * = boss_prepare, error, "boss_pal_prepare falls into boss_prepare"

; Once, from the install, after the controller's init (its hit points are the
; map's alive test, §5.13.5): the look copy's operand, every module's column
; span, a capped emitter's plate (an emitter slot the tier did not enable is
; armour now, decision B), then the whole map.
boss_prepare:
    ; The frame state first (the capped draws below already rebase the ring):
    ; no record, an empty queue, no flash, no tick, the band's own colours.
    lda #$00
    ldx #(BOSS_RING_RECORDS - 1)
:
    sta boss_ring_timer,x
    dex
    bpl :-
    sta boss_queue_head
    sta boss_queue_tail
    sta boss_tick_timer
    sta boss_ring_next
    sta boss_ring_last
    sta boss_nozzle_phase
    sta boss_nozzle_dark
    ; The nozzles: the phase images in the look tail (left 0-2, right 3-5),
    ; the two nozzle codes' glyphs in the region's charset.
    lda BOSS_T_NOZZLE_FRAMES
    sta boss_nozzle_timer
    lda BOSS_T_LOOK_TAIL
    clc
    adc BOSS_T_NOZZLE_PHASES
    sta boss_nozzle_src_l+1
    lda BOSS_T_LOOK_TAIL+1
    adc #$00
    sta boss_nozzle_src_l+2
    lda boss_nozzle_src_l+1
    clc
    adc #(3 * 8)
    sta boss_nozzle_src_r+1
    lda boss_nozzle_src_l+2
    adc #$00
    sta boss_nozzle_src_r+2
    lda BOSS_T_NOZZLE_LEFT_CODE
    ldx #(boss_nozzle_dst_l + 1 - boss_nozzle_dst_l)
    jsr boss_nozzle_operand
    lda BOSS_T_NOZZLE_RIGHT_CODE
    ldx #(boss_nozzle_dst_r + 1 - boss_nozzle_dst_l)
    jsr boss_nozzle_operand
    lda BOSS_T_LOOK_TAIL
    sta boss_look_operand
    lda BOSS_T_LOOK_TAIL+1
    sta boss_look_operand+1
    ldx #$00
@span:
    cpx BOSS_T_MODULE_COUNT
    beq @map
    jsr boss_record_of
    lda BOSS_T_MODULES + BOSS_M_X,y
    sta boss_mx,x
    clc
    adc BOSS_T_MODULES + BOSS_M_WIDTH,y
    sta boss_mxe,x
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    and #$0F
    adc BOSS_T_MODULES + BOSS_M_ROW,y   ; C=0
    asl
    asl
    asl
    adc #BAND_TOP_Y
    sta boss_mbottom_y,x
    lda BOSS_T_MODULES + BOSS_M_KIND,y
    and #$0F
    cmp #BOSS_KIND_EMITTER
    bne @next_span
    lda _boss_kind,x
    .assert BOSS_KIND_ARMOUR = 0, error, "a capped emitter is read as kind 0"
    bne @next_span
    lda BOSS_T_CAPPED_CODE
    sta boss_fill
    lda #BOSS_MODE_FILL
    sta boss_mode
    stx boss_open_x
    txa
    jsr boss_draw_module
    ldx boss_open_x
@next_span:
    inx
    bne @span
@map:
    jsr boss_shots_prepare
    ldx #(BOSS_BAND_COLUMNS - 1)
:
    jsr boss_column_at
    dex
    bpl :-
    rts

; Decision M (plan §5.16): a player shot inside the band. X = the slot, its
; Y above BAND_BOTTOM_Y; keeps X. Per column boss_stop_y is the line under
; the cell that stops a shot - the front module's bottom row, else the hull's
; own stop row, else 0 (open sky) - kept with the column map. C=1: the shot
; has reached that cell (A = the column map's value, Y = the column); C=0: it
; flies on (boss_shots_late draws it), or it left the band's top and is
; removed.
boss_shot_meet:
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc #BAND_ORIGIN_HPOS
    clc
    adc boss_shown_pos
    lsr
    lsr
    tay
    lda FIGHTER_PROJECTILE_Y,x
    cmp boss_stop_y,y
    bcs @fly
    lda boss_column_map,y               ; it meets the stop cell now
    sec
    rts
@fly:
    cmp #BAND_TOP_Y
    bcs :+
    lda #FIGHTER_PROJECTILE_FREE         ; over open sky past the band's top
    sta FIGHTER_PROJECTILE_ACTIVE,x
:
    clc
    rts

; Once, from boss_prepare: no shot cell from before the entry (the scratch
; page is never read from disk, P1), and the hull-stop table's address in the
; look tail.
boss_shots_prepare:
    lda #$00
    ldx #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
:
    sta boss_shot_hi,x
    dex
    bpl :-
    lda BOSS_T_LOOK_TAIL
    clc
    adc BOSS_T_HULL_STOP
    sta boss_hull_stop_operand
    lda BOSS_T_LOOK_TAIL+1
    adc #$00
    sta boss_hull_stop_operand+1
    rts

; ---------------------------------------------------------------------------
; feat/boss-art (the owner's variant B, docs/plans/boss-art.md §3): a palette
; per band row. Row 0 is the region's palette, which the band DLI's phase 0
; sets; under each row whose next row differs (the region's switch mask) a DLI
; stores that row's COLPF1 and COLPF3. COLPF0 and COLPF2 stay the region's -
; the in-band shots' colours - and only two stores land on a row's first line
; in time after the WSYNC (plan s5-boss-regions §6.4.3: CHBASE and one colour
; store, the second written 12 cycles after it, landed; the next did not).
; Here COLPF1's value is loaded before the WSYNC: the stores are written 4 and
; 12 cycles after it, and the prolog is 11 cycles (phase 1's 20).
; A region without a row palette (mask 0) runs exactly as before: the phase-0
; publish stays laser_publish and no row carries a DLI.
; ---------------------------------------------------------------------------

; The band DLI's phase 0 (A only, after its WSYNC), when the region has a row
; palette: the rows' DLI takes the band's DLIs from the first switch on, its
; sources at the first switch; then the lasers' publish.
boss_pal_frame:
    lda #<boss_pal_dli
    sta VDSLST
    lda #>boss_pal_dli
    sta VDSLST+1
    lda #<boss_pal_colpf1
    sta boss_pal_src1
    lda #<boss_pal_colpf3
    sta boss_pal_src3
    lda boss_pal_count
    sta boss_pal_left
    jmp laser_publish

; The DLI under a switching row (A only): the switch's pair, its sources then
; stepped to the next; after the last switch the band's own DLI (phase 1, the
; band's end) is boss_dli's again.
boss_pal_dli:
    pha
boss_pal_src1 = * + 1
    lda boss_pal_colpf1
    sta WSYNC
    sta COLPF1                          ; written 4 cycles after the WSYNC
boss_pal_src3 = * + 1
    lda boss_pal_colpf3
    sta COLPF3                          ; and 12 (the edge that lands, s5-boss-regions §6.4.3)
boss_pal_landed:                        ; the trace's landing hook (both stores done)
    inc boss_pal_src1
    inc boss_pal_src3
    dec boss_pal_left
    bne @done
    lda #<boss_dli
    sta VDSLST
    lda #>boss_dli
    sta VDSLST+1
@done:
    pla
    rti

.segment "BOSS_D_BSS"
; The row palette's switches (feat/boss-art), copied as the run lays them out:
; the count, each switch's COLPF1, each switch's COLPF3. In slot D's BSS
; tail: slot C's RAM is full with the code.
boss_pal_count:     .res 1
boss_pal_colpf1:    .res BOSS_ROW_SWITCHES_MAX
boss_pal_colpf3:    .res BOSS_ROW_SWITCHES_MAX
boss_pal_left:      .res 1
.assert >boss_pal_colpf1 = >(boss_pal_colpf3 + BOSS_ROW_SWITCHES_MAX), error, "the row DLI steps its sources' low bytes only"
.assert BOSS_ROWS_COLPF1 = BOSS_ROWS_COUNT + 1 && BOSS_ROWS_COLPF3 = BOSS_ROWS_COLPF1 + BOSS_ROW_SWITCHES_MAX, error, "the run lays the row palette out as the BSS"

.segment "BOSS_CODE"

; ---------------------------------------------------------------------------
; The scratch page ($1800-$18FF, Q-B5): never read from disk; the install
; sets what must not start undefined.
; ---------------------------------------------------------------------------
.segment "BOSS_SCRATCH"
boss_column_map:    .res BOSS_BAND_COLUMNS  ; per band column: module, ARMOUR or OPEN
; The cell-flash ring, one array a field (§5.13.2 item 5).
boss_ring_lo:       .res BOSS_RING_RECORDS  ; the cell
boss_ring_hi:       .res BOSS_RING_RECORDS
boss_ring_saved:    .res BOSS_RING_RECORDS  ; the code the cell gets back
boss_ring_timer:    .res BOSS_RING_RECORDS  ; frames left; 0 = free
boss_ring_module:   .res BOSS_RING_RECORDS  ; the module whose draws carry it, $FF none
boss_ring_glyph:    .res BOSS_RING_RECORDS  ; the spark, deflection or muzzle flash
; The draw queue (§5.15.6 item 2).
boss_queue_module:  .res BOSS_QUEUE_ENTRIES
boss_queue_mode:    .res BOSS_QUEUE_ENTRIES
boss_queue_value:   .res BOSS_QUEUE_ENTRIES
boss_candidates:    .res BOSS_MAX_MODULES   ; a rebuild's modules behind the dead one
.assert boss_column_map = BOSS_SCRATCH, error, "the column map leads the scratch page"

; S5-1 (owner decision Q8): the HUD's booster cells across the entry - the
; window's entry half writes them before the WARNING screen, the install puts
; them back (cfg/boss.cfg pins the segment to the page's last ten bytes).
.segment "BOSS_HUD_BACKUP"
boss_hud_booster:   .res BOSS_HUD_BOOSTER_CELLS
.assert boss_hud_booster = BOSS_HUD_BOOSTER_BACKUP, lderror, "the HUD booster backup must be where the window's entry half writes it"

.segment "BOSS_BSS"
boss_mx:            .res BOSS_MAX_MODULES   ; each module's first column
boss_mxe:           .res BOSS_MAX_MODULES   ; and the column past its last
boss_pos:           .res 1      ; colour clocks, 0..travel
boss_dir:           .res 1      ; +1 / -1
boss_step_timer:    .res 1
boss_shake_timer:   .res 1
boss_dli_pos:       .res 1      ; the position the next phase-1 DLI publishes
boss_shown_pos:     .res 1      ; the position on screen now
boss_shown_lms:     .res 1
boss_dli_x:         .res 1
boss_lms_target:    .res 1
boss_slot_save:     .res 1
boss_tmp:           .res 1
boss_record_x:      .res 1
boss_mode:          .res 1
boss_fill:          .res 1
boss_add:           .res 1
boss_look:          .res 1
boss_row:           .res 1
boss_rows_left:     .res 1
boss_width:         .res 1
boss_x:             .res 1
boss_col_end:       .res 1
boss_bits_lo:       .res 1
boss_bits_hi:       .res 1
boss_open_x:        .res 1
boss_tick_timer:    .res 1
boss_ring_next:     .res 1      ; the record a full ring gives back next
boss_ring_new:      .res 1
boss_ring_frames:   .res 1
boss_ring_tag:      .res 1
boss_rebase_mode:   .res 1
boss_draw_m:        .res 1
boss_cavity_left:   .res 1      ; a gone draw's rows still inside the hull
boss_hit_result:    .res 1
boss_dead:          .res 1
boss_col_start:     .res 1
boss_candidate_count: .res 1
boss_frame_heavy:   .res 1
boss_head_region:   .res 1      ; S5-1: the region the head read, for its check
boss_column:        .res 1      ; the band column boss_cell_at reads
boss_queue_head:    .res 1
boss_queue_tail:    .res 1
boss_q_module:      .res 1
boss_q_mode:        .res 1
boss_q_value:       .res 1
boss_q_placed:      .res 1
boss_ring_last:     .res 1      ; the record boss_ring_set wrote last
boss_nozzle_timer:  .res 1
boss_nozzle_phase:  .res 1
boss_nozzle_dark:   .res 1
boss_shot_lo:       .res PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT   ; each slot's in-band cell, last frame (hi 0: none)
boss_shot_hi:       .res PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT
boss_shot_px:       .res 1
boss_shot_x:        .res 1

.segment "BOSS_C_BSS"
boss_stop_y:        .res BOSS_BAND_COLUMNS  ; per column, a shot above this line has met its stop cell (0: none)
boss_mbottom_y:     .res BOSS_MAX_MODULES   ; the line under each module's bottom row


; ===========================================================================
; Slot D ($1900-$1FFF, owner decision Q7; M5b-S4b): the lasers
; (docs/plans/boss-lasers.md §12, the owner's decisions of 2026-10-06) and the
; boss's shots inside the band (QA1). Read by the head after slot C.
;
; B2 (owner decision 2026-10-06, reversing Q1's option A - with the fifth-
; player bit the beam's band segment took COLPF3, the hull's $32, so the beam
; read as starting at the band's edge): each running laser - at most two
; (D3) - takes missile M1 or M2, in COLPM1 / COLPM2 = $46, set in the boss
; sector only and restored on leaving; PRIOR is never written. M1's and M2's
; columns are written once at the install, from the lens core down to the
; ring's last line, and erased when the boss sector ends (Q2); a laser is then
; only its missile's HPOS and SIZEM pair, published by the band DLI's phase 0
; from the band position that frame shows. Warning (Q3): the emitter's bottom cell heats through the
; cell-flash ring (its two heat glyphs every 4 frames - S4b.4, owner decision
; E2: the emitter's own, never a hit's spark / muzzle), the line pulses 1 / 2 colour
; clocks in 2-frame groups, a rising tone on channel 3 over the engine bed
; (Q4); beam: 4 colour clocks. The beam damages the player at most once a
; firing (Q5, boss_def's damage per difficulty, software compare) and absorbs
; the player's shots in its column (Q6). No laser starts and none shows while
; the player is not ALIVE; a dead emitter's laser goes off at once.
; ===========================================================================
; S5-1 (owner decision Q9, plan s5-boss-regions §4.1): the region's look tail
; - its open looks, the nozzle phases, the hull-stop table - is the region
; block, read by the head as the region's fourth run into slot F
; (BOSS_SLOT_F, the HUD charset's unused upper half); the region's tables
; point at it (BOSS_T_LOOK_TAIL). Until S5-1 it led slot D, which every region
; shares, so a disk could carry one region only.

.segment "BOSS_D_CODE"

LASERS              = 4
LASER_OFF           = 0
LASER_WARN          = 1
LASER_BEAM          = 2
LASER_NONE          = $FF
LASER_BEAM_CLOCKS   = 4         ; quad width: one missile bit, four colour clocks
LASER_LAST_LINE     = 239       ; the ring's last line
; src/main.s: MISSILES = PMG_BASE + $0300, PLAYER_LIVES = PLAYER_LIFECYCLE+$01,
; PLAYER_ALIVE = 0, PLAYER_VISIBLE_WIDTH_HPOS = 16 (the beam meets the ship as
; drawn: feat/boss-order-scale, the owner's decision of 2026-10-16; was 8).
LASER_MISSILES      = $3B00
; B2: M1 / M2 wear COLPM1 / COLPM2 under gameplay's PRIOR (no Heavy in the
; boss sector; P1 / P2 stay free for S5's force field).
HPOSM1              = $D005
HPOSM2              = $D006
HPOSM3              = $D007
COLPM1              = $D013
COLPM2              = $D014
B2_COLOUR           = $46       ; the beam's colour (as below the band before)
B2_COLUMN_BITS      = $28       ; M1's and M2's left bits: quad width, four clocks
B2_CORE_LINE        = 3         ; the beam leaves the lens core: its cell's line 3
LASER_PLAYER_LIVES  = PLAYER_LIFECYCLE + 1
LASER_PLAYER_ALIVE  = 0
LASER_PLAYER_WIDTH  = 16        ; the ship as drawn: P0 double-width, all 8 bits on rows 5-8
LASER_HEAT_FRAMES   = 4
LASER_MAX_ON        = 2         ; S4b.1 (owner decision D3): lasers in a warning or a beam at once
LASER_TONE_AUDF     = $18       ; + the warning's frames left: the pitch rises
LASER_TONE_AUDC     = $A6       ; pure tone, volume 6
LASER_ERASE_LINES   = 32        ; the column's erase, a frame (8 frames)

.export laser_tier, laser_prepare, laser_frame, laser_publish, boss_laser_damage

; Once, from the install, before the controller's init: decision 8's emitter
; slots, 1 / 2 / 4 on levels 1-4 / 5-8 / 9-16. A debug fixture build defines
; BOSS_LASER_TIER_OVERRIDE (scripts/build.mjs --laser-fixture); the default
; build has no such path.
laser_tier:
.ifdef BOSS_LASER_TIER_OVERRIDE
    lda #BOSS_LASER_TIER_OVERRIDE
.else
    lda LEVEL_ID
    ldx #1
    cmp #5
    bcc @set
    ldx #2
    cmp #9
    bcc @set
    ldx #4
@set:
    txa
.endif
    sta boss_laser_slots
    rts

; Once, from the install, after boss_prepare (the controller's kinds are the
; tier's): every enabled emitter slot k is laser k - its module, its centre,
; its bottom-centre cell - and M1's and M2's bits from its lens core down;
; the rest of the plane empty; COLPM1 / COLPM2 the beam's colour.
laser_prepare:
    lda #$00
    tay
@plane:
    sta LASER_MISSILES,y
    iny
    bne @plane
    sta boss_laser_sizem
    sta boss_laser_erase
    sta boss_laser_done
    sta laser_rr
.ifdef BOSS_TWIN
    sta laser_twin
.endif
    ldx #(LASERS - 1)
@reset:
    sta boss_laser_state,x
    sta boss_laser_edge,x
    sta boss_laser_hpos,x
    dex
    bpl @reset
    ldx #(INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT - 1)
:
    sta boss_hostile_hi,x
    dex
    bpl :-
    lda #LASER_NONE
    ldx #(LASERS - 1)
:
    sta boss_laser_module,x
    dex
    bpl :-
    lda BOSS_T_SHOT_CODE
    clc
    adc #BOSS_SHOT_CODES
    sta boss_hostile_code
    lda BOSS_T_START                    ; the band position the install shows
    sta boss_hostile_pos
    ldx #$00
@module:
    cpx BOSS_T_MODULE_COUNT
    bne :+
    jmp @done
:
    lda _boss_kind,x
    cmp #BOSS_KIND_EMITTER
    bne @next
    stx laser_m
    jsr boss_record_of                  ; Y = the record
    lda BOSS_T_MODULES + BOSS_M_KIND,y
    lsr
    lsr
    lsr
    lsr
    sta laser_i
    dec laser_i                         ; slot 1-4 -> laser 0-3
.ifdef BOSS_TWIN
    ; feat/boss-r1-twin-lasers (owner decision, variant A): slot 1's second
    ; emitter is its twin cannon - slot 2's laser (the converter refuses a
    ; slot-2 emitter beside it), one laser between them (laser_twin_on).
    bne :+
    jsr laser_twin_index
:
.endif
    lda BOSS_T_MODULES + BOSS_M_WIDTH,y
    asl
    sta laser_t
    lda BOSS_T_MODULES + BOSS_M_X,y
    asl
    asl
    adc laser_t                         ; C=0: the centre colour clock, x*4 + w*2
    ldx laser_i
    sta boss_laser_centre,x
    lda BOSS_T_MODULES + BOSS_M_WIDTH,y
    lsr
    clc
    adc BOSS_T_MODULES + BOSS_M_X,y
    sta boss_column                     ; the centre column
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    and #$0F
    clc
    adc BOSS_T_MODULES + BOSS_M_ROW,y
    sta laser_t                         ; the row under the emitter
    tax
    dex
    jsr boss_cell_at                    ; its bottom-centre cell: the heat's
    ldx laser_i
    lda dst_ptr
    sta boss_laser_cell_lo,x
    lda dst_ptr+1
    sta boss_laser_cell_hi,x
    lda laser_m
    sta boss_laser_module,x
    lda #B2_COLUMN_BITS                 ; B2: M1 and M2, from the lens core
    sta laser_b
    lda laser_t
    asl
    asl
    asl
    adc #(BAND_TOP_Y - 8 + B2_CORE_LINE) ; C=0: the core row's lens line
    tay
@line:
    lda LASER_MISSILES,y
    ora laser_b
    sta LASER_MISSILES,y
    iny
    cpy #(LASER_LAST_LINE + 1)
    bne @line
    ldx laser_m
@next:
    inx
    jmp @module
@done:
    jsr laser_all_off                   ; S4b.1 (D3): every laser off, its reload set
    ; S4b.4 (decision 4): an emitter covered at the install has a shield.
    ldx #(LASERS - 1)
@shield:
    lda #$00
    sta boss_laser_shielded,x
    lda boss_laser_module,x
    cmp #LASER_NONE
    beq @shield_next
    jsr laser_exposed
    bne @shield_next
    inc boss_laser_shielded,x
@shield_next:
    dex
    bpl @shield
    jmp b2_prepare                      ; PRIOR untouched: M1 / M2 in COLPM1 / COLPM2

; S4b.1 (owner decision D3, 2026-10-06): an emitter fires on its own cadence,
; not in the controller's pulse rotation (D1: the converter gives it no pulse
; reload, so the controller never arms it). X = an OFF laser: while its
; emitter is alive and exposed, its reload (boss_def, per difficulty) counts
; down; at 0 it is ready and waits for laser_admit. Keeps X.
; S4b.4 (owner decision 4, 2026-10-07): the first time a shielded emitter is
; exposed - its shield destroyed - its laser skips the reload and is ready at
; once, marked (bit 7) to go to the front of the queue; after that shot the
; normal reload applies.
laser_rearm:
    ldy boss_laser_module,x
    lda _boss_hp,y
    beq @done                           ; destroyed: never ready again
    jsr laser_exposed
    beq @done                           ; still covered
    lda boss_laser_shielded,x
    beq @reload
    lda #$00                            ; its shield just fell: the first shot
    sta boss_laser_shielded,x
    sta boss_laser_reload_lo,x
    sta boss_laser_reload_hi,x
    lda #$80
    sta boss_laser_ready,x
@done:
    rts
@reload:
    lda boss_laser_reload_lo,x
    ora boss_laser_reload_hi,x
    bne @count
    lda boss_laser_ready,x              ; a waiting first shot keeps its mark
    ora #$01
    sta boss_laser_ready,x
    rts
@count:
    lda boss_laser_reload_lo,x
    bne :+
    dec boss_laser_reload_hi,x
:
    dec boss_laser_reload_lo,x
    bne @done                           ; the frame it reaches 0 it is ready
    lda boss_laser_reload_hi,x
    bne @done
    lda #$01
    sta boss_laser_ready,x
    rts
; S5-5 (region 2's block, BOSS_RAIL): a cannon in its locked bay counts its
; reload here too (rail_frame) - the countdown alone, not the exposure it
; waits on above. (After the routine's last cheap label: an assignment ends
; their scope.)
laser_reload = @reload

; At most LASER_MAX_ON lasers in their warning or beam at once (D3): the ready
; ones start in turn from the rotating cursor, which moves past each one
; started, so no emitter starves.
.ifdef BOSS_TWIN
.segment "BOSS_E_CODE"                  ; slot D's RAM has no room for the twin's checks
.endif
laser_admit:
    ldy #$00
    ldx #(LASERS - 1)
:
    lda boss_laser_state,x
    beq :+
    iny
:
    dex
    bpl :--
    sty laser_n                         ; the lasers on
    ; S4b.4 (decision 4): a first shot goes ahead of the rotating order - with
    ; both places busy, it takes the first that frees.
    ldx #(LASERS - 1)
@first:
    lda laser_n
    cmp #LASER_MAX_ON
    bcs @done
    lda boss_laser_ready,x
    bpl @later
.ifdef BOSS_TWIN
    jsr laser_twin_on
    bne @later
.endif
    jsr laser_begin
    inc laser_n
@later:
    dex
    bpl @first
    lda laser_rr
    sta laser_t                         ; the cursor this frame
    ldy #LASERS
@try:
    lda laser_n
    cmp #LASER_MAX_ON
    bcs @done
    lda laser_t
    and #(LASERS - 1)
    tax
    lda boss_laser_ready,x
    beq @skip
.ifdef BOSS_TWIN
    jsr laser_twin_on
    bne @skip
.endif
    jsr laser_begin
    inc laser_n
    txa
    clc
    adc #$01
    and #(LASERS - 1)
    sta laser_rr
@skip:
    inc laser_t
    dey
    bne @try
@done:
    rts

.ifdef BOSS_TWIN
; feat/boss-r1-twin-lasers (owner decision, variant A), in slot E with
; laser_admit: the twin cannons - slot 1's two emitters, lasers 0 and 1 -
; fire one laser between them, in turn.

; laser_prepare, a slot-1 emitter (laser_i 0): when laser 0 is taken, this is
; its twin - slot 2's laser (the converter refuses a slot-2 emitter beside it).
laser_twin_index:
    lda boss_laser_module
    cmp #LASER_NONE
    beq :+
    inc laser_i
.ifdef BOSS_RAIL
    ; S5-5 (decision AC for region 2, levels 4-6): on a tier that enables
    ; slot 2 the twin is slot 2's own laser - the two cannons fire
    ; independently (two beams on levels 5-6, one on level 4).
    lda boss_laser_slots
    cmp #2
    bcs :+
.endif
    inc laser_twin
:
    rts

; X = a ready laser -> A (Z) nonzero when it is a
; twin cannon and the other is in its warning or beam: the twins never fire
; together. A ready laser is OFF, so lasers 0 and 1 OR to the other's state.
; Keeps X and Y.
laser_twin_on:
    lda laser_twin
    beq @rts
    cpx #2
    bcs @free
    lda boss_laser_state
    ora boss_laser_state+1
@rts:
    rts
@free:
    lda #$00
    rts

.segment "BOSS_D_CODE"

; Back in slot D (slot E's run stays 4 sectors). laser_off, X = a laser going
; off, its state not yet cleared: a twin's firing over (or its kill cutting
; it) restarts the other's reload, and the other is next in the waiting
; order - the turns alternate at the one cannon's cadence. A first shot
; waiting (S4b.4) keeps its mark; a kill while waiting leaves the other's
; count alone. Keeps X.
laser_twin_off:
    lda boss_laser_state,x
    beq @rts
    lda laser_twin
    beq @rts
    cpx #2
    bcs @rts
    stx laser_x
    txa
    eor #$01
    sta laser_rr
    tax
    lda boss_laser_ready,x
    and #$80
    sta boss_laser_ready,x
    ldy DIFFICULTY_SETTING
    lda LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_RELOAD,y
    sta boss_laser_reload_lo,x
    lda LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_RELOAD + 3,y
    sta boss_laser_reload_hi,x
    ldx laser_x
@rts:
    rts
.endif

; X = a ready laser: its warning starts, for the difficulty's frames. Keeps X.
laser_begin:
    lda #LASER_WARN
    sta boss_laser_state,x
    sty laser_m
    ldy DIFFICULTY_SETTING
    lda LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_WARNING,y
    sta boss_laser_timer,x
    sec                                 ; the heat's phase: from the warning's
    sbc #$01                            ; first frame, whatever its length
    and #(LASER_HEAT_FRAMES - 1)
    sta boss_laser_phase,x
    ldy laser_m
    lda #$00
    sta boss_laser_fired,x
    sta boss_laser_ready,x
    jmp b2_take

laser_module_bits:
    .byte $01, $02, $04, $08, $10, $20, $40, $80

.segment "BOSS_E_CODE"
; S4b.5 (owner decision F3): a destroyed module counts for the capsule rule as
; a destroyed enemy does (src/main.s, the kill path's
; weapon_pickup_record_qualified_kill): none while a capsule is pending or
; showing; the third kill earns one. The boss sector's Director grants no
; capsule (no pickups in its hazards), so this one shows at once, at the
; module's column just below the band, and falls as usual.
boss_capsule_kill:
    lda _boss_phase                     ; S4b.5 (owner decision 3): the defeating
    bne @rts                            ; kill neither counts nor spawns
    lda ENTITY_STATE + WEAPON_PICKUP_SLOT
    bne @rts
    inc ENTITY_HP + WEAPON_PICKUP_SLOT
    lda ENTITY_HP + WEAPON_PICKUP_SLOT
    cmp #WEAPON_PICKUP_QUALIFIED_KILLS
    bcc @rts
    ldx _boss_score_module
    jsr boss_record_of
    lda BOSS_T_MODULES + BOSS_M_X,y     ; the module's centre clock, x * 4 + w * 2
    asl
    asl
    adc BOSS_T_MODULES + BOSS_M_WIDTH,y
    adc BOSS_T_MODULES + BOSS_M_WIDTH,y
    sec
    sbc boss_shown_pos                  ; on screen
    clc
    adc #(BAND_ORIGIN_HPOS - 8)         ; the capsule centred on it (spawn adds 4)
    jsr weapon_pickup_spawn_capsule_at
    jsr integration_pickup_reveal_body
@capsule_y:
    lda #BAND_BOTTOM_Y                  ; the shown band's edge (the install)
    sta ENTITY_Y + WEAPON_PICKUP_SLOT
@rts:
    rts
boss_capsule_y_operand = @capsule_y + 1

; Every boss frame (from laser_frame): the boss sector's world is still (Q1),
; and a capsule falls at half the world's speed (src/main.s
; update_weapon_pickup_active) - so a capsule showing here gets the gameplay
; world's rate, and the unchanged pickup update moves it as it does elsewhere.
boss_capsule_fall:
    lda ENTITY_STATE + WEAPON_PICKUP_SLOT
    cmp #WEAPON_PICKUP_STATE_ACTIVE
    bne @rts
    ldx DIFFICULTY_SETTING
    lda ENTITY_TIMER + WEAPON_PICKUP_SLOT
    clc
    adc boss_capsule_rates,x
    sta ENTITY_TIMER + WEAPON_PICKUP_SLOT
@rts:
    rts
boss_capsule_rates:
    .byte GAMEPLAY_WORLD_RATE_EASY, GAMEPLAY_WORLD_RATE_MEDIUM, GAMEPLAY_WORLD_RATE_HARD

; fix/smoke-2026-10-07 P1 (decision M, plan §5.16): SECTOR_COMPLETION, every
; boss frame, late. The player's shots inside the band are drawn here, not in
; UPDATE: UPDATE runs while ANTIC is still fetching the band (MEASURED on
; main's debug route: its restore at scanlines 45-61, its draw at 60-86,
; against row r's fetch on line 24 + 8 r), so a shot in rows 3-5 was taken out
; before its row was fetched and put back after it - it vanished under the
; turrets. Once the band's last line has passed, last frame's cells get the
; blank back (each only while it still shows a shot: a module's draw since
; then owns it), then every shot still flying in the band is drawn in its cell
; when the cell is blank - behind anything drawn, never at or past the cell
; that stops it (UPDATE met it there, or AUD-04 holds it a frame). The band
; then shows every frame's shots on every row, a frame later, as the ring
; shows them (publish_fighter_projectile_overlays).
boss_shots_late:
@wait:
    lda VCOUNT                          ; the band is lines 24-87: VCOUNT 12-43
    cmp #(BAND_BOTTOM_Y / 2)
    bcs @shown
    cmp #(BAND_TOP_Y / 2)
    bcs @wait
@shown:
    lda BOSS_F_HOOK                     ; S5-3: a falling field half's next column
    beq :+                              ; (slot F), once the band has been shown
    jsr BOSS_F_HOOK + 3
:
    ldx #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
@restore:
    lda boss_shot_hi,x
    beq @restored
    sta dst_ptr+1
    lda boss_shot_lo,x
    sta dst_ptr
    ldy #$00
    tya
    sta boss_shot_hi,x
    lda (dst_ptr),y
    sec
    sbc BOSS_T_SHOT_CODE
    cmp #BOSS_SHOT_CODES
    bcs @restored
    tya
    sta (dst_ptr),y
@restored:
    dex
    bpl @restore
    ldx #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
@shot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @next
    lda FIGHTER_PROJECTILE_Y,x
@late_bottom:
    cmp #BAND_BOTTOM_Y                  ; the shown band's edge (the install)
    bcs @next                           ; below the band: the ring draws it
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc #BAND_ORIGIN_HPOS
    clc
    adc boss_shown_pos                  ; the position the next frame shows
    sta boss_shot_px
    lsr
    lsr
    sta boss_column
    tay
    lda FIGHTER_PROJECTILE_Y,x
    cmp boss_stop_y,y
    bcc @next                           ; at the cell that stops it
    sbc #BAND_TOP_Y                     ; C=1; UPDATE removed every shot above the band
    lsr
    lsr
    lsr
    tay                                 ; its band row
    lda boss_band_lo,y
    ora boss_column                     ; each row is 64 B on a 64-B boundary
    sta dst_ptr
    lda boss_band_hi,y
    sta dst_ptr+1
    ldy #$00
    lda (dst_ptr),y
    bne @next                           ; behind anything drawn
    lda FIGHTER_PROJECTILE_Y,x
    lsr
    and #$01
    sta boss_shot_x
    lda boss_shot_px                    ; the shot code: + 2 for the odd half
    and #$02                            ; of the cell, + 1 for the lower half
    ora boss_shot_x
    clc
    adc BOSS_T_SHOT_CODE
    sta (dst_ptr),y
    lda dst_ptr
    sta boss_shot_lo,x
    lda dst_ptr+1
    sta boss_shot_hi,x
@next:
    dex
    bpl @shot
    jmp boss_completion
boss_late_bottom_operand = @late_bottom + 1
.segment "BOSS_D_CODE"

; S4b.4 (owner decision 4): right after the controller's tick, which exposes
; a module on the tick after its cover's kill - the frame after the shield is
; destroyed: a shielded emitter exposed now is a first shot, ready at once and
; admitted this frame ahead of the rotating order (both places busy: it waits
; at the front). A tick that exposes nothing costs ~10 cycles.
laser_first_shot:
    lda _boss_newly_lo
    ora _boss_newly_hi
    beq @rts
    lda boss_laser_done
    ora _boss_phase
    ora PLAYER_LIFECYCLE
    bne @rts                            ; no laser starts but in the fight, alive
    ldx #(LASERS - 1)
@laser:
    lda boss_laser_shielded,x
    beq @next
    jsr laser_exposed
    beq @next
    lda #$00
    sta boss_laser_shielded,x
    sta boss_laser_reload_lo,x
    sta boss_laser_reload_hi,x
    lda #$80
    sta boss_laser_ready,x
@next:
    dex
    bpl @laser
    jmp laser_admit
@rts:
    rts

; X = a laser -> A (Z) its emitter's bit in the controller's exposed mask:
; nonzero when exposed. Keeps X. laser_exposed_module: Y = a module (M6: the
; VOID LANCE's target pick, src/hybrid/lance.s).
laser_exposed:
    ldy boss_laser_module,x
laser_exposed_module:
    cpy #8
    bcs @high
    lda _boss_exposed_lo
    and laser_module_bits,y
    rts
@high:
    lda _boss_exposed_hi
    and laser_module_bits-8,y
    rts

; At the install, after the column: M1 / M2 nobody's and in the beam's colour,
; M0 / M3 off screen. PRIOR is not written: it stays as gameplay has it.
b2_prepare:
    lda #$00
    sta b2_edge
    sta b2_edge+1
    sta HPOSM0
    sta HPOSM3
    ldx #(LASERS - 1)
:
    sta b2_missile,x
    dex
    bpl :-
    lda #$FF
    sta b2_owner
    sta b2_owner+1
    lda #B2_COLOUR
    sta COLPM1
    sta COLPM2
    sta b2_colour                       ; F1: the DLI publishes these
    sta b2_colour+1
    rts

; Leaving the boss sector: COLPM1 / COLPM2 as gameplay has them, M1 / M2 off.
b2_restore:
    lda #$00
    sta HPOSM1
    sta HPOSM2
    lda _heavy_hull_colour
    sta b2_colour                       ; F1: and the DLI publishes them
    sta b2_colour+1
    sta COLPM1
    sta COLPM2
    lda #$00
    rts

; X = a laser starting its warning: a free missile, M1 or M2, its pair bits. Keeps X.
b2_take:
    ldy #$00
:
    lda b2_owner,y
    bmi @got
    iny
    cpy #$02
    bne :-
    rts
@got:
    txa
    sta b2_owner,y
    lda b2_pair_one,y
    sta b2_one,x
    lda b2_pair_three,y
    sta b2_three,x
    iny
    tya
    sta b2_missile,x                    ; 1: M1, 2: M2
    rts

; X = a laser going off: its missile off screen and free. Keeps X.
b2_free:
    ldy b2_missile,x
    beq :+
    lda #$FF
    sta b2_owner-1,y
    lda #$00
    sta b2_edge-1,y
    sta b2_missile,x
:
    rts

b2_pair_one:
    .byte $04, $10                      ; SIZEM: M1, M2 double
b2_pair_three:
    .byte $0C, $30                      ; SIZEM: M1, M2 quad


; Every frame, from UPDATE before the player's shots meet the band: the boss's
; shots in the band; then, in the fight, the beams on screen this frame against
; the player and the shots, each laser's timer, warning and next position.
; The defeat or the last life lost ends the boss sector for the lasers: all
; off, the column erased, COLPM1 / COLPM2 restored.
laser_frame:
    ; S5-3: a region's field (its block's code, slot F) - BOSS_F_HOOK is 0 in
    ; a block without code.
    lda BOSS_F_HOOK
    beq :+
    jsr BOSS_F_HOOK
:
    jsr boss_capsule_fall               ; S4b.5 (F3): a capsule falls (slot E)
    ; M6: the operand is patched - the VOID LANCE's kill frame (src/hybrid/
    ; lance.s, its tick before UPDATE) leaves one meeting to the shots, the
    ; kill being the frame's other; every other frame of the beam puts two back.
laser_admit_operand := * + 1
    lda #BOSS_SHOT_ADMIT                ; AUD-04: this frame's meetings
    sta boss_shots_admit_left
    jsr laser_hostile_shots
    lda boss_laser_done
    bne @rts
    lda _boss_phase
    bne @leaving
    lda PLAYER_LIFECYCLE
    beq @fight
    lda LASER_PLAYER_LIVES
    beq @leaving
    jmp laser_all_off                   ; a death with a life left: held
@leaving:
    jsr laser_all_off
    jmp laser_erase_step
@rts:
    rts
@fight:
    jsr laser_collide
    lda #$00
    sta boss_laser_sizem
    ldx #(LASERS - 1)
@laser:
    lda boss_laser_module,x
    cmp #LASER_NONE
    beq @next
    lda boss_laser_state,x
    bne @on
    jsr laser_rearm
    jmp @next
@on:
    ldy boss_laser_module,x
    lda _boss_hp,y
    bne @live
    jsr laser_off                       ; its emitter destroyed
    jmp @next
@live:
    dec boss_laser_timer,x
    bne @running
    lda boss_laser_state,x
    cmp #LASER_WARN
    bne @ended
    jsr laser_cool                      ; the warning over: the beam
    lda #LASER_BEAM
    sta boss_laser_state,x
    lda BOSS_T_LASER_BEAM
    sta boss_laser_timer,x
    bne @place
@ended:
    jsr laser_off
    jmp @next
@running:
    lda boss_laser_state,x
    cmp #LASER_WARN
    bne @place
    jsr laser_warn
@place:
    jsr laser_place
@next:
    dex
    bpl @laser
    jmp laser_admit

; X = a laser in its warning: every 4 frames the heat look on its emitter's
; bottom cell - heat A, then heat B (E2) - (the ring carries it through a
; stage redraw); the rising tone.
laser_warn:
    lda boss_laser_timer,x
    and #(LASER_HEAT_FRAMES - 1)
    cmp boss_laser_phase,x
    bne @tone
    lda boss_laser_cell_lo,x
    sta dst_ptr
    lda boss_laser_cell_hi,x
    sta dst_ptr+1
    lda boss_laser_module,x
    sta boss_ring_tag
    stx laser_x
    lda boss_laser_timer,x
    and #LASER_HEAT_FRAMES
    beq @heat_a
    lda BOSS_T_LASER_HEAT_B             ; S4b.4 (E2): the emitter's own heat
    bne @heat                           ; glyphs (a region without emitter art:
@heat_a:                                ; the spark and the muzzle flash)
    lda BOSS_T_LASER_HEAT_A
@heat:
    ldy #LASER_HEAT_FRAMES
    jsr boss_ring_set
    ldx laser_x
@tone:
    lda sound_enabled
    beq @done
    lda boss_laser_timer,x
    clc
    adc #LASER_TONE_AUDF
    sta AUDF3
    lda #LASER_TONE_AUDC
    sta AUDC3
@done:
    rts

; X = a running laser: its next frame's left edge (the DLI subtracts the band
; position) and its SIZEM pair - the warning 1 / 2 clocks by 2-frame groups,
; the beam 4. Keeps X.
laser_place:
    lda boss_laser_state,x
    cmp #LASER_BEAM
    beq @beam
    ; S4b.5 (owner decision F1): the warning line in its own missile's colour,
    ; widening by thirds of the warning - 1, 2, then 4 colour clocks.
    jsr laser_warn_colour
    lda boss_laser_timer,x
    sta laser_t
    asl
    adc laser_t                         ; the frames left x 3 (C = 0: < 86)
    ldy DIFFICULTY_SETTING
    cmp LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_WARNING,y
    bcc @four                           ; the last third
    sbc LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_WARNING,y
    cmp LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_WARNING,y
    bcs @thin                           ; the first third
    lda b2_one,x
    ldy #1
    bne @size
@thin:
    lda #$00
    tay
    beq @size
@beam:
    lda #B2_COLOUR                      ; the beam: $46, four clocks
    jsr laser_colour
@four:
    lda b2_three,x
    ldy #2
@size:
    ora boss_laser_sizem
    sta boss_laser_sizem
    sty laser_t
    lda boss_laser_centre,x
    sec
    sbc laser_t
    sta boss_laser_edge,x
    ldy b2_missile,x                    ; its missile follows its edge (the DLI)
    beq :+
    sta b2_edge-1,y
:
    rts

.segment "BOSS_E_CODE"
; ---------------------------------------------------------------------------
; fix/boss-polish (owner answers of 2026-10-12, b3): the hit flash.
; A damaging hit that leaves the module alive asks for its flash; a kill keeps
; the spark (the destruction's look is unchanged). The flash takes the frame's
; one module draw (plan §5.15.6 item 2): the queue first, then a due OFF, then
; an asked ON - so a frame draws at most one module, as before, except when
; the queue or the chain must draw the flashing module itself (the guards: OFF
; first). ON and OFF are the same toggle.
; ---------------------------------------------------------------------------

; UPDATE's draw slot, on a frame with no kill and no exposure check.
boss_mflash_frame:
    lda boss_mflash_timer
    beq @idle
    dec boss_mflash_timer
    beq boss_mflash_toggle              ; its frames are over: toggled back
@queue:
    jmp boss_queue_draw
@idle:
    ldx boss_queue_head
    cpx boss_queue_tail
    bne @queue
    ldx boss_mflash_req
    bmi @done
    lda #$FF
    sta boss_mflash_req
    lda _boss_hp,x                      ; none for a module destroyed since
    beq @done
    stx boss_mflash_m
    lda #BOSS_MFLASH_FRAMES
    sta boss_mflash_timer
    bne boss_mflash_toggle
@done:
    rts

; boss_queue_draw, X = the head: when the head's module is the flashing one,
; its flash ends first. Keeps A and X.
boss_mflash_guard_q:
    pha
    lda boss_queue_module,x
    jsr boss_mflash_guard_m
    ldx boss_queue_head
    pla
    rts

; A = a module about to be drawn: when it is the flashing one, its flash ends
; first. Keeps A.
boss_mflash_guard_m:
    ldy boss_mflash_timer
    beq @keep
    cmp boss_mflash_m
    bne @keep
    pha
    jsr boss_mflash_off
    pla
@keep:
    rts

; boss_draw_module's flash mode, Y = the cell's column: A = the cell's code
; with bit 7 toggled; a blank cell stays as it is. Keeps Y.
boss_mflash_cell:
    lda (dst_ptr),y
    tax
    and #$7F
    beq @keep
    txa
    eor #$80
    rts
@keep:
    txa
    rts

boss_mflash_off:
    lda #$00
    sta boss_mflash_timer
boss_mflash_toggle:
    lda #BOSS_MODE_MFLASH
    sta boss_mode
    lda boss_mflash_m
    jmp boss_draw_module
; X = a laser in its warning: this frame's colour for its missile (F1).
laser_warn_colour:
    ; Owner decision of 2026-10-07 (variant (a), flicker): white and the beam's
    ; $46 by 2-frame groups.
    lda boss_laser_timer,x
    and #$02
    beq :+
    lda #$0E
    bne laser_colour
:
    lda #B2_COLOUR
; A = a colour -> X's missile's, published by the band DLI. Keeps X.
laser_colour:
    ldy b2_missile,x
    beq :+
    sta b2_colour-1,y
:
    rts
.segment "BOSS_D_CODE"

; Once, from boss_prepare (slot C; slot D is read before the install runs).
; A = a nozzle code, X = its store's operand offset from boss_nozzle_dst_l:
; the operand becomes the code's glyph in the region's charset. In slot D
; since fix/smoke-2026-10-07 P1, so that slot C stays 13 sectors with the
; band's shot drawing in slot E (the boss entry's sector count unchanged).
boss_nozzle_operand:
    and #$7F
    pha
    asl
    asl
    asl
    sta boss_nozzle_dst_l,x
    pla
    lsr
    lsr
    lsr
    lsr
    lsr
    clc
    adc #>BOSS_CHARSET
    sta boss_nozzle_dst_l+1,x
    rts

; From the kill path (boss_module_scored): the destroyed module's laser, if it
; has one, goes off on the kill frame; and (S4b.5, owner decision F3) the kill
; counts for the capsule rule as an enemy kill does. Touches A, X, Y.
laser_killed:
    jsr boss_capsule_kill
    lda _boss_score_module
    ldx #(LASERS - 1)
:
    cmp boss_laser_module,x
    beq laser_off
    dex
    bpl :-
    rts

; X = a laser: off now - no HPOS from the next DLI, its heat cell back, the
; engine bed back if it was warning. Keeps X.
laser_off:
.ifdef BOSS_TWIN
    jsr laser_twin_off                  ; slot E: the other twin's turn next
.endif
    jsr b2_free
    lda boss_laser_state,x
    cmp #LASER_WARN
    bne :+
    jsr laser_cool
:
    lda #$00
    sta boss_laser_state,x
    sta boss_laser_edge,x
    sta boss_laser_hpos,x
    sta boss_laser_ready,x
    ldy DIFFICULTY_SETTING              ; S4b.1 (D3): the reload from now
    lda LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_RELOAD,y
    sta boss_laser_reload_lo,x
    lda LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_RELOAD + 3,y
    sta boss_laser_reload_hi,x
    rts

laser_all_off:
    ldx #(LASERS - 1)
:
    jsr laser_off
    dex
    bpl :-
    lda #$00
    sta boss_laser_sizem
    rts

; X = a laser leaving its warning: the heat record on its cell gives the cell
; back now, and channel 3 goes back to the engine bed. Keeps X.
laser_cool:
    stx laser_x
    ldy #(BOSS_RING_RECORDS - 1)
@record:
    lda boss_ring_timer,y
    beq @next
    lda boss_ring_lo,y
    cmp boss_laser_cell_lo,x
    bne @next
    lda boss_ring_hi,y
    cmp boss_laser_cell_hi,x
    bne @next
    lda #$00
    sta boss_ring_timer,y
    tya
    tax
    jsr boss_ring_restore
    ldx laser_x
@next:
    dey
    bpl @record
    lda sound_enabled
    beq @done
    lda #BOSS_BED_AUDF
    sta AUDF3
    lda #BOSS_BED_AUDC
    sta AUDC3
@done:
    rts

; Every beam on screen this frame (the HPOS the DLI published) against the
; player's ship - once a firing, the damage boss_def gives the difficulty
; (Q5) - and against the player's shots, which it absorbs (Q6). The caller
; has checked the player is ALIVE.
laser_collide:
    ldx #(LASERS - 1)
@laser:
    lda boss_laser_state,x
    cmp #LASER_BEAM
    bne @next
    lda boss_laser_hpos,x
    beq @next
    lda boss_laser_fired,x
    bne @shots
    lda boss_laser_hpos,x
    sec
    sbc player_x
    cmp #LASER_PLAYER_WIDTH
    bcc @hit
    cmp #(256 - (LASER_BEAM_CLOCKS - 1))
    bcc @shots
@hit:
    inc boss_laser_fired,x
    stx laser_x
    ldy DIFFICULTY_SETTING
    lda LEVEL_PAYLOAD_BOSS_DEF + BOSS_DEF_LASER_DAMAGE,y
    jsr boss_laser_damage
    ldx laser_x
@shots:
    ldy #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
@shot:
    lda FIGHTER_PROJECTILE_ACTIVE,y
    beq @none
    lda FIGHTER_PROJECTILE_X,y
    sec
    sbc boss_laser_hpos,x
    cmp #LASER_BEAM_CLOCKS
    bcs @none
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,y
@none:
    dey
    bpl @shot
@next:
    dex
    bpl @laser
    rts

; The laser's damage call: one address the trace watches as the laser's damage
; source (apply_player_damage has none; plan §0.3 item 4). A = hull units.
; AUD-04 (owner decision 2026-10-06): at most BOSS_SHOT_ADMIT player shots
; meet the band a frame - the work of a kill (its rebuild) or a stage change
; is bounded so. A later shot that would meet stays where it is - its next
; move undone (+ the projectile speed), the update moves it back - and is
; tested again next frame against the boss as it then stands: damage counted
; once, when it meets; a beam covering it meanwhile absorbs it (Q6). Keeps X.
; Out as boss_shot_meet: C=1 meets (A = the column map's value, Y = the
; column), C=0 flies on.
BOSS_SHOT_ADMIT = 2
boss_shot_admit:
    jsr boss_shot_meet
    bcc @rts
    dec boss_shots_admit_left
    bmi @keep
@rts:
    rts
@keep:
    inc boss_shots_admit_left
    lda FIGHTER_PROJECTILE_Y,x
    clc
    adc #PLAYER_FIGHTER_PROJECTILE_SPEED
    sta FIGHTER_PROJECTILE_Y,x
    clc
    rts

boss_laser_damage:
    jmp apply_player_damage

; The boss sector is over for the lasers: 32 lines of the plane a frame, then
; COLPM1 / COLPM2 and M1 / M2 as gameplay has them, once.
laser_erase_step:
    ldy boss_laser_erase
    ldx #LASER_ERASE_LINES
    lda #$00
:
    sta LASER_MISSILES,y
    iny
    dex
    bne :-
    sty boss_laser_erase
    cpy #$00
    bne :+
    jsr b2_restore
    inc boss_laser_done
:
    rts

; QA1: the boss's shots above the band's edge are drawn in the band, in a
; blank cell (decision O keeps the recess under a weapon blank), as the
; player's are (decision M); last frame's cells get the blank back while they
; still show a boss shot. Inside the band a shot rides the band's drift (its
; HPOS follows the band position's change), so it falls down its own gun's
; recess and leaves the band's edge in that column: falling straight down the
; screen while the band slid under it, a shot from a gun beside a standing
; plate passed behind the plate and came out at its foot (MEASURED, gun-3 and
; plate-f) - the look QA1 removes.
laser_hostile_shots:
    ldx #(INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT - 1)
@restore:
    lda boss_hostile_hi,x
    beq @restored
    sta dst_ptr+1
    lda boss_hostile_lo,x
    sta dst_ptr
    ldy #$00
    lda (dst_ptr),y
    sec
    sbc boss_hostile_code
    cmp #BOSS_HOSTILE_SHOT_CODES
    bcs :+
    tya
    sta (dst_ptr),y
:
    lda #$00
    sta boss_hostile_hi,x
@restored:
    dex
    bpl @restore
    lda boss_shown_pos                  ; the band's move since last frame
    sec
    sbc boss_hostile_pos
    sta laser_d
    lda boss_shown_pos
    sta boss_hostile_pos
    ldx #(INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT - 1)
@shot:
    lda FIGHTER_PROJECTILE_ACTIVE + INTERCEPTOR_PROJECTILE_SLOT_BASE,x
    beq @next
    lda FIGHTER_PROJECTILE_Y + INTERCEPTOR_PROJECTILE_SLOT_BASE,x
@hostile_bottom:
    cmp #BAND_BOTTOM_Y                  ; the shown band's edge (the install):
    bcs @next                           ; under it a shot is the ring's
    lda FIGHTER_PROJECTILE_X + INTERCEPTOR_PROJECTILE_SLOT_BASE,x
    sec                                 ; rides the band: HPOS = 32 + 4c - p
    sbc laser_d
    sta FIGHTER_PROJECTILE_X + INTERCEPTOR_PROJECTILE_SLOT_BASE,x
    lda FIGHTER_PROJECTILE_Y + INTERCEPTOR_PROJECTILE_SLOT_BASE,x
    sec
    sbc #BAND_TOP_Y
    bcc @next
    lsr
    lsr
    lsr
    sta laser_t                         ; the band row
    lda FIGHTER_PROJECTILE_X + INTERCEPTOR_PROJECTILE_SLOT_BASE,x
    sec
    sbc #BAND_ORIGIN_HPOS
    clc
    adc boss_shown_pos
    sta laser_b                         ; the band colour clock
    lsr
    lsr
    sta boss_column
    stx laser_x
    ldx laser_t
    jsr boss_cell_at
    ldx laser_x
    ldy #$00
    lda (dst_ptr),y
    bne @next                           ; behind anything drawn
    lda laser_b
    lsr
    and #$01                            ; the right phase for the cell's odd half
    clc
    adc boss_hostile_code
    sta (dst_ptr),y
    lda dst_ptr
    sta boss_hostile_lo,x
    lda dst_ptr+1
    sta boss_hostile_hi,x
@next:
    dex
    bpl @shot
    rts
boss_hostile_bottom_operand = @hostile_bottom + 1

; feat/boss-r1-twin-lasers (owner smoke of 2026-10-13), once, from the
; install: X = the band's last row holding a cell (row 0 when none does), A
; = the line under it, the shown band's edge. Region 1's one-row belt leaves
; rows 5-7 blank; drawn in the band they showed a shot in the band's charset
; and colours (grey), so the list ends the band under its last row.
boss_band_measure:
    ldx #(BOSS_BAND_ROWS - 1)
@row:
    lda boss_band_lo,x
    sta dst_ptr
    lda boss_band_hi,x
    sta dst_ptr+1
    ldy #(BOSS_BAND_COLUMNS - 1)
@cell:
    lda (dst_ptr),y
    bne @found
    dey
    bpl @cell
    dex
    bne @row
@found:
    txa
    asl
    asl
    asl
    adc #(BAND_TOP_Y + 8)               ; C=0: X <= 7
    rts

; The band DLI's phase 0 (A only): each laser's HPOS for the frame starting -
; its edge less the band position this frame shows, off screen outside the
; window - and SIZEM; the hit test reads boss_laser_hpos.

.macro LASER_PUBLISH index
    .local off, on
    lda boss_laser_edge+index
    beq off
    sec
    sbc boss_shown_pos
    bcc off
    cmp #(GAMEPLAY_LEFT_HPOS - BAND_ORIGIN_HPOS)
    bcc off
    cmp #(GAMEPLAY_LEFT_HPOS + GAMEPLAY_SCREEN_COLUMNS * 4 - BAND_ORIGIN_HPOS - LASER_BEAM_CLOCKS)
    bcs off
    adc #BAND_ORIGIN_HPOS               ; C=0
    bne on
off:
    lda #$00
on:
    sta boss_laser_hpos+index
.endmacro

; M1 + index: its HPOS from its laser's edge, as LASER_PUBLISH computes it (A only).
.macro B2_PUBLISH index
    .local off, on
    lda b2_edge+index
    beq off
    sec
    sbc boss_shown_pos
    bcc off
    cmp #(GAMEPLAY_LEFT_HPOS - BAND_ORIGIN_HPOS)
    bcc off
    cmp #(GAMEPLAY_LEFT_HPOS + GAMEPLAY_SCREEN_COLUMNS * 4 - BAND_ORIGIN_HPOS - LASER_BEAM_CLOCKS)
    bcs off
    adc #BAND_ORIGIN_HPOS               ; C=0
    bne on
off:
    lda #$00
on:
    sta HPOSM1+index
.endmacro
laser_publish:
    LASER_PUBLISH 0
    LASER_PUBLISH 1
    LASER_PUBLISH 2
    LASER_PUBLISH 3
    B2_PUBLISH 0
    B2_PUBLISH 1
    lda b2_colour                       ; F1: the lines' own colours
    sta COLPM1
    lda b2_colour+1
    sta COLPM2
    lda boss_laser_sizem
    sta SIZEM
.ifdef BOSS_GRAVITY
    jmp boss_m0_publish                 ; S5-4 Phase A-2: and the gravity column (slot E)
.else
    rts
.endif
.ifdef BOSS_GRAVITY
.segment "BOSS_E_CODE"
; S5-4 Phase A-2 (the owner's smoke of 2026-10-14): region 4's gravity column,
; missile M0 (COLPM0, the ship's white - no laser's register), at the HPOS the
; well set this frame (0: off screen); from laser_publish, A only. The byte is
; data in slot E, read from the disk at every entry (0 in every other region).
boss_m0_publish:
    lda boss_m0_hpos
    sta HPOSM0
    rts
boss_m0_hpos:   .byte 0
.endif

.segment "BOSS_D_CODE"

; A module fell (from slot A's boss_after_stage, S5-1: moved from slot A).
; The module's score, packed BCD (light_add_score's path), then the kill stat
; and the HUD through the reader's kill vector, and the kill sound (channel
; 2). (The harness counts kills at this label, as it does at the score
; routines.)
boss_module_scored:
    jsr boss_record_of
    sed
    clc
    lda score_bcd_lo
    adc BOSS_T_MODULES + BOSS_M_SCORE,y
    sta score_bcd_lo
    lda score_bcd_hi
    adc #$00
    sta score_bcd_hi
    cld
    jsr SECTOR_READER_STATS_KILL
    jsr play_hit_sound
    jsr laser_killed                    ; S4b: a destroyed emitter's laser off now
    ; Gone (decision L): the module disappears (queued), and its columns
    ; rebuilt now - a shot there meets the module behind it, or the hull.
    lda _boss_score_module
    ldx #BOSS_MODE_GONE
    ldy #$00
    sty boss_frame_heavy                ; any nonzero: Y is 0, so...
    inc boss_frame_heavy                ; ... 1
    jsr boss_enqueue
    ldx _boss_score_module
    jmp boss_rebuild_module

.segment "BOSS_D_BSS"
boss_laser_slots:   .res 1      ; the emitter slots the tier enables
boss_laser_module:  .res LASERS ; each laser's module, LASER_NONE
boss_laser_state:   .res LASERS
boss_laser_timer:   .res LASERS
boss_laser_centre:  .res LASERS ; the emitter's centre colour clock in the band
boss_laser_edge:    .res LASERS ; the next frame's left edge in the band (0: off)
boss_laser_hpos:    .res LASERS ; the HPOS the DLI published this frame (0: off)
boss_laser_fired:   .res LASERS ; nonzero once this firing touched the player
boss_laser_cell_lo: .res LASERS ; the emitter's bottom-centre cell
boss_laser_cell_hi: .res LASERS
boss_laser_sizem:   .res 1
boss_laser_erase:   .res 1      ; the plane's next line to erase on leaving
boss_laser_done:    .res 1      ; the boss sector is over for the lasers
boss_fire_y:        .res 1      ; boss_fire: the firing gun's muzzle line
laser_m:            .res 1
laser_i:            .res 1
laser_t:            .res 1
laser_b:            .res 1
laser_x:            .res 1
laser_d:            .res 1
laser_n:            .res 1
laser_rr:           .res 1      ; S4b.1: the waiting order's cursor
boss_laser_ready:   .res LASERS ; S4b.1: reloaded, waiting for a place (D3); bit 7: a first shot (S4b.4)
boss_laser_shielded: .res LASERS ; S4b.4: covered at the install, its first shot still to come
boss_laser_phase:   .res LASERS ; S4b.1: the heat's frame in 4, from the warning's start
b2_missile:         .res LASERS ; B2: its missile, 1 / 2, 0 none
b2_one:             .res LASERS ; its missile's SIZEM pairs
b2_three:           .res LASERS
b2_owner:           .res 2      ; each missile's laser, $FF free
b2_edge:            .res 2      ; its laser's edge, for the DLI
b2_colour:          .res 2      ; F1: M1's / M2's colour, for the DLI
boss_laser_reload_lo: .res LASERS
boss_laser_reload_hi: .res LASERS
boss_shots_admit_left: .res 1   ; AUD-04: meetings left this frame

; fix/smoke-2026-10-07 P1: the boss shots' band cells in slot E's RAM (set by
; laser_prepare at the install, like every slot-D variable), so that slot D
; has the room for boss_nozzle_operand.
.segment "BOSS_E_BSS"
.ifdef BOSS_TWIN
laser_twin:         .res 1      ; nonzero: lasers 0 and 1 are slot 1's twin cannons
.endif
boss_hostile_lo:    .res INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT ; each boss shot's band cell, last frame
boss_hostile_hi:    .res INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT
boss_hostile_code:  .res 1
boss_hostile_pos:   .res 1      ; the band position last frame (the shots ride its drift)
boss_mflash_timer:  .res 1      ; the flash's frames left; 0 = none (the install)
boss_mflash_m:      .res 1      ; the flashing module
boss_mflash_req:    .res 1      ; the module a hit asked to flash; $FF none (the install)


; ===========================================================================
; The once-only install (Q-S1), at $7810, run in place before the pause
; backup or the summary's staging can reuse that RAM.
; ===========================================================================
.segment "BOSS_INSTALL"

boss_install:
    ldx #$FF                            ; nothing below the main loop returns
    txs
    ; The WARNING screen goes dark now: the display list is switched below,
    ; and ANTIC must start the boss's list at its top on a frame edge, or the
    ; DLI phases run out of step with the lines (as start_gameplay does it).
    lda #$00
    sta DMACTL
    ; 1. (feat/boss-art: the divider's copy is step 7's, after boss_prepare
    ;    has read the row palette its bytes carried in the charset run.)
    ; 2. The boss's capital vector table.
    ldx #(CAPITAL_VECTOR_COUNT * 3 - 1)
@vector:
    lda boss_vector_image,x
    sta CAPITAL_VECTOR_TABLE,x
    dex
    bpl @vector
    ; 3. The world stops (Q1): both scroll rates 0, every difficulty.
    lda #$00
    ldx #5
@rates:
    sta world_scroll_rates,x
    dex
    bpl @rates
    ; 4. A pause resumes into the boss DLI; the player stays below the band.
    lda #<boss_dli
    sta resume_gameplay_dli_lo_operand
    sta VDSLST
    lda #>boss_dli
    sta resume_gameplay_dli_hi_operand
    sta VDSLST+1
    lda #BOSS_PLAYER_Y_MIN
    sta read_input_y_min_operand
    cmp player_y
    bcc @player_below
    sta player_y
@player_below:
    ; 5. The WARNING screen cleared the HUD and the divider: the HUD's text,
    ;    score and status, a fresh divider row; the player redrawn (the
    ;    reader cleared PMG), the capsule cleared as a capital entry clears it.
    ldx #$00
@hud:
    lda hud_ascii,x
    beq @hud_done
    sec
    sbc #$20
    sta SCREEN,x
    inx
    bne @hud
@hud_done:
    jsr update_score_display
    jsr update_hud_status
    ; S5-1 (owner decision Q8): the booster's ten cells as they were before the
    ; WARNING screen (an active booster's label and energy, else the plain
    ; HUD's), backed up by the window's entry half.
    ldx #(BOSS_HUD_BOOSTER_CELLS - 1)
@booster:
    lda boss_hud_booster,x
    sta BOSS_HUD_BOOSTER_SCREEN,x
    dex
    bpl @booster
    lda #$00
    jsr set_gameplay_row_ptr
    jsr generate_starfield_row
    jsr weapon_pickup_clear_sector
    jsr draw_player
    ; 6. The band's display list over list A, which both list pointers name
    ;    from now on (the world never rotates in a boss sector): the band
    ;    down to its last row holding a cell, then the ring (feat/boss-r1-
    ;    twin-lasers: a shot under the band is drawn in the ring's charset
    ;    and colours); that row and the shown edge patched into the code
    ;    that reads them.
    jsr boss_band_measure
    stx boss_band_last_operand
    sta boss_hostile_bottom_operand
    sta boss_late_bottom_operand
    sta boss_capsule_y_operand
    ldx #$00
@header:
    lda boss_dl_header,x
    sta PLAYFIELD_DLIST_A,x
    inx
    cpx #6
    bne @header
    ldy #$00
@band:
    lda #$54                            ; ANTIC 4, HSCROL, LMS
    cpy boss_band_last_operand          ; C=1 from the last shown row on
    bne :+
    lda #$D4                            ; + the band's DLI
:
    sta PLAYFIELD_DLIST_A,x
    lda boss_band_lo,y
    sta PLAYFIELD_DLIST_A+1,x
    lda boss_band_hi,y
    sta PLAYFIELD_DLIST_A+2,x
    inx
    inx
    inx
    iny
    bcc @band                           ; Y = the ring's first shown row
@ring:
    lda #$44                            ; ANTIC 4, LMS
    cpy #(RING_ROWS - 1)
    bne :+
    lda #$C4                            ; + the HUD's DLI
:
    sta PLAYFIELD_DLIST_A,x
    lda PLAYFIELD_ROW_LO,y
    sta PLAYFIELD_DLIST_A+1,x
    lda PLAYFIELD_ROW_HI,y
    sta PLAYFIELD_DLIST_A+2,x
    inx
    inx
    inx
    iny
    cpy #RING_ROWS
    bne @ring
    lda #$41
    sta PLAYFIELD_DLIST_A,x
    lda #<PLAYFIELD_DLIST_A
    sta PLAYFIELD_DLIST_A+1,x
    sta PLAYFIELD_ACTIVE_DLIST_LO
    sta PLAYFIELD_NEXT_DLIST_LO
    lda #>PLAYFIELD_DLIST_A
    sta PLAYFIELD_DLIST_A+2,x
    lda #$00
    sta PLAYFIELD_PREBUILD_PENDING
    ; 7. The controller FIRST - hit points, the tier, the exposure - then
    ;    what reads them: the capped plates and the column map, whose alive
    ;    test needs the hit points (§5.13.5, the install order).
    jsr laser_tier                      ; S4b: the slots the tier enables, before
    jsr _boss_c_init                    ; the init reads them
    jsr boss_pal_prepare                ; feat/boss-art: the row palette, then boss_prepare
    ;    The divider row is a starfield row drawn under the band's CHBASE:
    ;    the gameplay charset's codes 0-6 into the region's charset (the
    ;    display is off until step 10; nothing before reads these codes).
    ldx #(BOSS_DIVIDER_CODES * 8 - 1)
@divider:
    lda CHARSET,x
    sta BOSS_CHARSET,x
    dex
    bpl @divider
    jsr laser_prepare                   ; the lasers' missiles M1 / M2
    lda #$00                            ; fix/boss-polish: no flash, none asked
    sta boss_mflash_timer
    lda #$FF
    sta boss_mflash_req
    ; 8. The band at its start position, still. fix/r4-immobile: a region
    ; whose motion.framesPerColourClock is 0 never drifts - boss_dir 0, so
    ; boss_motion adds nothing (the converter keeps its start inside
    ; 1..travel-1, where boss_motion never turns); the win's shake stays.
    lda #$01
    sta boss_step_timer
    lda BOSS_T_FRAMES_PER_STEP
    beq :+
    lda #$01
:
    sta boss_dir
    lda #$00
    sta boss_shake_timer
    lda BOSS_T_START
    sta boss_pos
    sta boss_dli_pos
    lda #$FF
    sta boss_shown_lms
    jsr boss_apply_pos
    ; 9. (feat/boss-escort-flow) The level's escort is not armed here any
    ;    more: the Director publishes it at the region's count of weapon
    ;    kills and admits one at a time from then on (src/c/director.c
    ;    director_c_boss_weapon_down / director_c_boss_escort_frame).
    ; 10. The engine bed back, the display up on a frame edge with the HUD's
    ;     state, and the PAL-frame handshake re-armed (§5.11.3): the loop
    ;     waits for this frame's first DLI like the first frame of a game.
    lda sound_enabled
    beq :+
    lda #BOSS_BED_AUDF
    sta AUDF3
    lda #BOSS_BED_AUDC
    sta AUDC3
:
    lda #<PLAYFIELD_DLIST_A
    sta DLISTL
    lda #>PLAYFIELD_DLIST_A
    sta DLISTH
    lda #>HUD_CHARSET
    sta CHBASE
    lda #HUD_COLPF1
    sta COLPF1
    lda #HUD_COLPF2
    sta COLPF2
    lda #GAMEPLAY_COLPF3
    sta COLPF3
    lda #$00
    sta COLBK
    sta gameplay_dli_phase
    sta HITCLR
    lda #STATE_GAMEPLAY
    sta game_state
    jsr wait_frame_start
    lda PHYSICAL_PAL_FRAME_ID
    sta GAMEPLAY_PAL_FRAME_CONSUMED
    lda #$80
    sta NMIEN
    lda #$03
    sta GRACTL
    lda #$3E
    sta DMACTL
    jmp main_loop

boss_dl_header:
    .byte $C2, <SCREEN, >SCREEN
    .byte $44, <GAMEPLAY_DIVIDER_SCREEN, >GAMEPLAY_DIVIDER_SCREEN

; ---------------------------------------------------------------------------
; feat/interceptor-armour (owner answer of 2026-10-12, placement C): the boss
; entry's once-per-entry tail. The resident half (src/hybrid/light-kernel.s
; boss_enter_read) reads the region's theme run, copies the theme over the
; level's track and jumps here: scripts/build.mjs copies this segment into
; every region's theme run at BOSS_ENTRY_COLD, so it landed with the theme
; and the disk guard checked it with that run. It was resident in the Light
; kernel's record, which the hit flash needed.
; feat/boss-banners (owner decisions AL 2 and AY, docs/plans/boss-banners.md):
; the theme starts, then the first sectors of the region's banner run - named
; by the spec the build wrote behind this code, the theme run's last 5 bytes:
; its first sector, the count of its screen's sectors (BANNER_SCREEN_SECTORS),
; their expected fold - land in slot C's area (the run they start reads slot C
; later) and are checked against that fold as a directory run is (the theme
; run's check left the fold at zero). The banner's screen comes up from there
; and reads the run's other sectors itself (the owner's smoke of 2026-10-18).
; ---------------------------------------------------------------------------
BOSS_ENTRY_MUSIC_START = $A608      ; the level image's player: start the track
BOSS_ENTRY_CODE_RUN    = 1          ; the overlay directory's boss code entry

.segment "BOSS_ENTRY_COLD"
boss_entry_cold:
    jsr BOSS_ENTRY_MUSIC_START
    ; The banner's screen's registers that hold with the display off (the
    ; screen sets the rest): the frontend charset's glyphs, HSCROL for the
    ; odd-count lines, the mode F lines' background black.
    lda #BANNER_CHBASE
    sta CHBASE
    lda #BANNER_HSCROL
    sta HSCROL
    lda #$00
    sta COLPF2
    lda BOSS_BANNER_SPEC+0
    sta sr_sector_lo
    lda BOSS_BANNER_SPEC+1
    sta sr_sector_hi
    lda BOSS_BANNER_SPEC+2
    sta sr_sectors_left
    lda #<BANNER_RUN
    sta sr_dst
    lda #>BANNER_RUN
    sta sr_dst+1
    jsr sector_reader_read_sectors
    bcs @failed
    lda BOSS_BANNER_SPEC+3
    ldy BOSS_BANNER_SPEC+4
    jsr guard_compare
    bcs @failed                 ; A = GUARD_SR_BAD_IMAGE, the reader's SR_BAD_IMAGE
    jmp boss_banner
@failed:
    jmp sector_reader_failure_screen
boss_entry_cold_end:
.assert boss_entry_cold = BOSS_ENTRY_COLD, lderror, "the entry's cold tail must be where the theme run puts it"
.assert boss_entry_cold_end - boss_entry_cold <= BOSS_ENTRY_COLD_BYTES, error, "the entry's cold tail outgrew its place in the theme run"
.assert BOSS_ENTRY_COLD + BOSS_ENTRY_COLD_BYTES = BOSS_BANNER_SPEC, error, "the banner run's spec follows the cold tail"

; ===========================================================================
; feat/boss-banners: the banner's set-up, first in the region's banner run at
; BANNER_RUN (slot C's area), once per entry, in two stages (the owner's smoke
; of 2026-10-18: no WARNING text screen first; the screen black until the
; banner's own comes up, and that as early as it can).
;   The screen (BOSS_BANNER and the region's head behind it, the run's first
;   sectors, BANNER_SCREEN_SECTORS, which the cold tail reads and checks): the
;   frontend screen cleared, the display list - the picture's 64 mode F lines
;   (each with its LMS, 26 B apart: BANNER_PICTURE_HIGH for lines 0-48,
;   BANNER_PICTURE_LOW for 49-63), blank until the picture lands - WARNING,
;   the name, INCOMING and the empty bar, shown on a frame edge: white on
;   black, the narrow playfield, no DLI, no PMG. Then the run's other sectors
;   under it, checked against the fold the head carries.
;   The rest (BOSS_BANNER_LATE): the part that reads the boss's data to its
;   home behind the display list (BANNER_KEEP: slot C's read will overwrite
;   this code), the bar's state, and the picture, unpacked and mirrored into
;   its lines on the screen; then the reads.
; The region's head (BOSS_BANNER_HEAD, BANNER_HEAD_*) and its packed picture
; (boss_banner_data, behind the linked code) are the build's, per region
; (scripts/boss-banner.mjs). The cycles are measured in
; tests/boss-banners.test.mjs.
; ===========================================================================
.import __BOSS_BANNER_KEEP_LOAD__, __BOSS_BANNER_KEEP_RUN__, __BOSS_BANNER_KEEP_SIZE__
BANNER_KEEP_HALF = (__BOSS_BANNER_KEEP_SIZE__ + 1) / 2

BANNER_DL_BLANKS = 5                                    ; 40 blank lines
BANNER_DL_LINES  = BANNER_DL + BANNER_DL_BLANKS
BANNER_DL_TAIL   = BANNER_DL_LINES + BANNER_LINES * 3

.segment "BOSS_BANNER"
boss_banner:
    ; 1. The frontend screen cleared, $4000-$43FF, as the WARNING screen's
    ;    render cleared it (the head's blank cleared the PMG area, the
    ;    picture's lines 0-48): lines 49-63, the text and the bar rows blank.
    ;    The display is off since the head.
    jsr clear_screen
    ; 2. The display list: 40 blank lines, the picture's 64 lines, the tail
    ;    (the text, the bar, the jump), the name's line for its length.
    lda #$70
    ldx #(BANNER_DL_BLANKS - 1)
@blank:
    sta BANNER_DL,x
    dex
    bpl @blank
    ldx #(banner_dl_tail_end - banner_dl_tail - 1)
@tail:
    lda banner_dl_tail,x
    sta BANNER_DL_TAIL,x
    dex
    bpl @tail
    lda boss_banner_head + BANNER_HEAD_NAME_MODE
    sta BANNER_DL_TAIL + (banner_dl_name - banner_dl_tail)
    ldx #$00
    lda #<BANNER_PICTURE_HIGH
    ldy #>BANNER_PICTURE_HIGH
@line:
    sta BANNER_DL_LINES+1,x
    pha
    tya
    sta BANNER_DL_LINES+2,x
    lda #$4F                            ; ANTIC F, LMS
    sta BANNER_DL_LINES,x
    pla
    clc
    adc #BANNER_LINE_STRIDE
    bcc :+
    iny
:
    cpx #((BANNER_PICTURE_HIGH_LINES - 1) * 3)
    bne :+
    lda #<BANNER_PICTURE_LOW            ; line 48 ends at $3FFF, the 4 KB edge
    ldy #>BANNER_PICTURE_LOW
:
    inx
    inx
    inx
    cpx #(BANNER_LINES * 3)
    bne @line
    ; 3. WARNING, the name, INCOMING; the bar's 20 empty cells.
    lda #<(boss_banner_head + BANNER_HEAD_RECORDS)
    sta frontend_data_ptr
    lda #>(boss_banner_head + BANNER_HEAD_RECORDS)
    sta frontend_data_ptr+1
    jsr render_frontend_records
    lda #BANNER_BAR_DASH
    ldx #(BANNER_PICTURE_BYTES - 1)
@dash:
    sta BANNER_BAR_B + BANNER_MARGIN,x
    dex
    bpl @dash
    ; 4. Shown on a frame edge, white on black (COLBK black since the head;
    ;    CHBASE, HSCROL and COLPF2 the cold tail's).
    lda #BANNER_WHITE
    sta COLPF0
    sta COLPF1
banner_show:
    jsr wait_frame_start
    lda #<BANNER_DL
    sta DLISTL
    lda #>BANNER_DL
    sta DLISTH
    lda #BANNER_DMACTL
    sta DMACTL
    ; 5. The run's other sectors under it (the reader's sector and destination
    ;    go on from the cold tail's call), checked against the head's fold as
    ;    the cold tail checked the screen's.
    lda boss_banner_head + BANNER_HEAD_LATE_SECTORS
    sta sr_sectors_left
    jsr sector_reader_read_sectors
    bcs @failed
    lda boss_banner_head + BANNER_HEAD_LATE_FOLD
    ldy boss_banner_head + BANNER_HEAD_LATE_FOLD + 1
    jsr guard_compare
    bcs @failed                 ; A = GUARD_SR_BAD_IMAGE, the reader's SR_BAD_IMAGE
    jmp banner_late
@failed:
    jmp sector_reader_failure_screen

; The list after the picture: 10 blank lines, WARNING (ANTIC 7, HSCROL: 7
; glyphs), 4 blank, the name (ANTIC 6; the set-up puts the HSCROL bit in for
; an odd count), 3 blank, INCOMING, 2 blank, the VOID LANCE's line (ANTIC 2,
; M6 journal §BI 1: in INCOMING's 12 blank lines to the bar, so nothing
; moves), 2 blank, the bar's 8 mode F lines (the dash glyph's line 3 is row
; B), the jump.
banner_dl_tail:
    .byte $70, $10
    .byte $57, <BANNER_WARNING_ROW, >BANNER_WARNING_ROW
    .byte $30
banner_dl_name:
    .byte $46, <BANNER_NAME_ROW, >BANNER_NAME_ROW
    .byte $20
    .byte $46, <BANNER_INCOMING_ROW, >BANNER_INCOMING_ROW
    .byte $10
    .byte $42, <BANNER_LANCE_ROW, >BANNER_LANCE_ROW
    .byte $10
    .repeat 3
    .byte $4F, <BANNER_BAR_A, >BANNER_BAR_A
    .endrepeat
    .byte $4F, <BANNER_BAR_B, >BANNER_BAR_B
    .repeat 4
    .byte $4F, <BANNER_BAR_A, >BANNER_BAR_A
    .endrepeat
    .byte $41, <BANNER_DL, >BANNER_DL
banner_dl_tail_end:
.assert banner_dl_tail_end - banner_dl_tail <= 128, error, "the list's tail is copied by an 8-bit DEX loop"
.assert BANNER_DL_TAIL + (banner_dl_tail_end - banner_dl_tail) <= BANNER_KEEP, error, "the banner's list runs into its reads"
.assert (BANNER_DL & $FC00) = ((BANNER_DL_TAIL + banner_dl_tail_end - banner_dl_tail - 1) & $FC00), error, "the banner's list crosses a 1 KB edge"

; The region's head: the build writes it (scripts/boss-banner.mjs
; BANNER_HEAD_*): the region, the bar's step, the name's line, the run's other
; sectors and their fold, the title's records.
.segment "BOSS_BANNER_HEAD"
boss_banner_head:
    .res BANNER_HEAD_BYTES
boss_banner_head_end:
.assert boss_banner_head_end - boss_banner <= BANNER_SCREEN_SECTORS * 128, lderror, "the banner's screen outgrew the sectors the cold tail reads"

; ---------------------------------------------------------------------------
; The rest of the set-up, under the banner (the display on).
; ---------------------------------------------------------------------------
.segment "BOSS_BANNER_LATE"
banner_late:
    ; 6. The reads' part to BANNER_KEEP, in two halves (an odd size copies
    ;    one byte more: the picture's first, into the reads' variables).
    ldx #<BANNER_KEEP_HALF
@keep:
    lda __BOSS_BANNER_KEEP_LOAD__ - 1,x
    sta __BOSS_BANNER_KEEP_RUN__ - 1,x
    lda __BOSS_BANNER_KEEP_LOAD__ - 1 + BANNER_KEEP_HALF,x
    sta __BOSS_BANNER_KEEP_RUN__ - 1 + BANNER_KEEP_HALF,x
    dex
    bne @keep
    ; 7. The bar's state; the region for slot A's head check.
    lda boss_banner_head + BANNER_HEAD_STEP
    sta banner_step
    lda boss_banner_head + BANNER_HEAD_STEP + 1
    sta banner_step+1
    lda boss_banner_head + BANNER_HEAD_REGION
    sta banner_region
    lda #$00
    sta banner_fraction
    sta banner_target
    sta banner_pixel
    ; 7a. The VOID LANCE's line (M6 journal §BI 1), with its '+' glyph in the
    ;     frontend charset's blank code BANNER_PLUS_CODE (scripts/boss-banner.mjs).
    ldx #(BANNER_LANCE_LENGTH - 1)
@lance:
    lda banner_lance_codes,x
    sta BANNER_LANCE_ROW + BANNER_LANCE_COLUMN,x
    dex
    bpl @lance
    ldx #(BANNER_PLUS_LENGTH - 1)
@plus:
    lda banner_plus_glyph,x
    sta BANNER_FRONTEND_CHARSET + BANNER_PLUS_CODE * 8 + BANNER_PLUS_FIRST_ROW,x
    dex
    bpl @plus
    ; 8. The picture: its stored half unpacked by the resident decoder into
    ;    the buffer, then a line at a time from the line's LMS + 6: the 12
    ;    stored bytes, and bytes 7-0 bit-reversed into 12-19. It shows as it
    ;    lands, top to bottom.
    lda #<boss_banner_data
    sta broadside_read_source+1
    lda #>boss_banner_data
    sta broadside_read_source+2
    lda #<BANNER_BUFFER
    sta broadside_destination+1
    sta @kept_source+1
    sta @mirror_source+1
    lda #>BANNER_BUFFER
    sta broadside_destination+2
    sta @kept_source+2
    sta @mirror_source+2
    jsr broadside_unpack_command
    ldx #$00
@picture:
    stx banner_line
    lda BANNER_DL_LINES+1,x
    clc
    adc #BANNER_MARGIN
    sta @screen+1
    lda BANNER_DL_LINES+2,x
    adc #$00
    sta @screen+2
    ldy #(BANNER_PICTURE_BYTES - 1)
@byte:
    tya
    cmp #BANNER_KEPT
    bcc @kept
    eor #$FF                            ; C=1 from the CMP: A = 19 - Y,
    adc #(BANNER_PICTURE_BYTES - 1)     ; bytes 12..19 from 7..0
    tax
@mirror_source:
    lda $FFFF,x
    sta banner_bits
    ldx #$08
@reverse:
    asl banner_bits
    ror a
    dex
    bne @reverse
    beq @screen                         ; always
@kept:
    tax
@kept_source:
    lda $FFFF,x
@screen:
    sta $FFFF,y
    dey
    bpl @byte
    lda @kept_source+1
    clc
    adc #BANNER_KEPT
    sta @kept_source+1
    sta @mirror_source+1
    bcc :+
    inc @kept_source+2
    inc @mirror_source+2
:
    ldx banner_line
    inx
    inx
    inx
    cpx #(BANNER_LINES * 3)
    bne @picture
    ; 9. Slot A is the boss's from the next read on.
    lda #$01
    sta sr_slot_a_overlaid
    jmp banner_reads

banner_lance_codes:
    .byte BANNER_LANCE_CODES
.assert * - banner_lance_codes = BANNER_LANCE_LENGTH, error, "the lance line's codes"
banner_plus_glyph:
    .byte BANNER_PLUS_GLYPH
.assert * - banner_plus_glyph = BANNER_PLUS_LENGTH, error, "the '+' glyph's rows"
BANNER_FRONTEND_CHARSET = BANNER_CHBASE * $100

; ===========================================================================
; feat/boss-banners: the reads under the banner, at BANNER_KEEP ($7A90, the
; staging RAM behind the display list, which no boss run reaches), copied
; there by the set-up. Every run of today's entry in today's order - the boss
; code (directory entry 1, checked as sector_reader_read_run checks it), then
; slot A's head's eight and (M6) slot G (the install, slots C-E, G, the
; region's band A, band B, charset and block, folded on and checked by boss_head_check against the
; region's sum) - one sector a call, the bar a step after each; then the
; hand-over: the display off, the PMG area and the frontend screen cleared as
; the entry before the banners left them for the install, and the head's check. Slot A's
; head itself is not run. A failed read or check is the reader's failure
; screen, as in the head.
; ===========================================================================
.segment "BOSS_BANNER_KEEP"
banner_reads:
    ldx #BOSS_ENTRY_CODE_RUN
    jsr guard_begin
    lda #<(overlay_directory + BOSS_ENTRY_CODE_RUN * 5)
    ldx #>(overlay_directory + BOSS_ENTRY_CODE_RUN * 5)
    jsr banner_read_run
    jsr guard_check
    bcc :+
    jmp sector_reader_failure_screen    ; A = GUARD_SR_BAD_IMAGE
:
    lda banner_region
    sta boss_head_region
    lda #<(boss_runs + BOSS_RUN_INSTALL)
    ldx #>(boss_runs + BOSS_RUN_INSTALL)
    ldy #BOSS_SHARED_RUNS
    jsr banner_read_four                ; the install, slots C, D, E, G
    ldx banner_region
    lda boss_region_runs,x
    clc
    adc #<boss_runs
    pha
    lda #>boss_runs
    adc #$00
    tax
    pla
    ldy #BOSS_REGION_RUNS
    jsr banner_read_four                ; band A, band B, the charset, the block
banner_hand_over:
    lda #$00
    sta DMACTL
    jsr clear_pmg
    jsr clear_screen
    jmp boss_head_check

; A/X = the first of Y runs in boss_runs' format (M6: the shared runs are
; five with slot G, a region's four).
banner_read_four:
    sta banner_run
    stx banner_run+1
    sty banner_runs_left
@run:
    lda banner_run
    ldx banner_run+1
    jsr banner_read_run
    lda banner_run
    clc
    adc #$05
    sta banner_run
    bcc :+
    inc banner_run+1
:
    dec banner_runs_left
    bne @run
    rts

; A/X = a run's {sector lo, sector hi, count, dst lo, dst hi}; 0 sectors is a
; region this disk does not carry.
banner_read_run:
    sta @spec+1
    stx @spec+2
    ldy #$04
@spec:
    lda $FFFF,y
    sta banner_spec,y
    dey
    bpl @spec
    lda banner_spec+2
    beq banner_wrong_disk
    lda banner_spec
    sta sr_sector_lo
    lda banner_spec+1
    sta sr_sector_hi
    lda banner_spec+3
    sta sr_dst
    lda banner_spec+4
    sta sr_dst+1
@sector:
    lda #$01
    sta sr_sectors_left
    jsr sector_reader_read_sectors
    bcs banner_failed
    jsr banner_bar_step
    dec banner_spec+2
    bne @sector
    rts
banner_wrong_disk:
    lda #SR_BAD_IMAGE
banner_failed:
    jmp sector_reader_failure_screen

; One sector more: the bar's end moves on by the region's step (8.8 pixels;
; the last sector of the boss's data reaches pixel 160), and every pixel up
; to it is set in both bar rows. Between sectors, the drive idle.
banner_bar_step:
    lda banner_fraction
    clc
    adc banner_step
    sta banner_fraction
    lda banner_target
    adc banner_step+1
    cmp #BANNER_BAR_PIXELS
    bcc :+
    lda #BANNER_BAR_PIXELS
:
    sta banner_target
@pixel:
    lda banner_pixel
    cmp banner_target
    bcs @done
    lsr a
    lsr a
    lsr a
    tay
    lda banner_pixel
    and #$07
    tax
    lda banner_bit,x
    pha
    ora BANNER_BAR_A + BANNER_MARGIN,y
    sta BANNER_BAR_A + BANNER_MARGIN,y
    pla
    ora BANNER_BAR_B + BANNER_MARGIN,y
    sta BANNER_BAR_B + BANNER_MARGIN,y
    inc banner_pixel
    bne @pixel                          ; always
@done:
    rts

banner_bit:
    .byte $80, $40, $20, $10, $08, $04, $02, $01

; Its state, behind it (not in the run; the set-up and the reads set it).
.segment "BOSS_BANNER_KEEP_BSS"
banner_spec:      .res 5
banner_run:       .res 2
banner_runs_left: .res 1
banner_step:      .res 2
banner_fraction:  .res 1
banner_target:    .res 1
banner_pixel:     .res 1
banner_region:    .res 1
banner_line:      .res 1
banner_bits:      .res 1
banner_keep_end:
.assert banner_keep_end <= BANNER_KEEP_END, lderror, "the banner's reads run into the arena"
.assert __BOSS_BANNER_KEEP_SIZE__ > 0 && __BOSS_BANNER_KEEP_SIZE__ <= 510, lderror, "the banner's reads are copied in two 8-bit halves"
.assert __BOSS_BANNER_KEEP_RUN__ + 2 * BANNER_KEEP_HALF <= banner_spec + 1, lderror, "the copy's odd byte must land in the reads' state"

; The region's packed picture: the build appends it here, behind the linked
; code, in each region's banner run (scripts/boss-banner.mjs).
.segment "BOSS_BANNER_DATA"
boss_banner_data:
.export boss_banner, boss_banner_head, banner_late, boss_banner_data, banner_reads, banner_bar_step
.export banner_pixel, banner_target, banner_show, banner_hand_over, banner_step, banner_region

; ===========================================================================
; S5-3 (feat/boss-region-3, docs/plans/s5-boss-regions.md §4.4, §6.3; the
; owner's answers of 2026-10-13): the force field - region 3's code, the first
; region code in a region block (slot F, after the look tail's 110 B, at
; BOSS_F_HOOK). The build assembles it when a region carries a field
; (BOSS_FIELD) and appends it to that region's block only; every other
; region's block leaves BOSS_F_HOOK zero (its one sector's padding), and the
; two gated calls (slot D's laser_frame, slot E's boss_shots_late) skip.
;
; The field stops a player's shot without a line of slot A: while a half is
; powered (any of its generators standing) its columns are hull to the column
; map (BOSS_COLUMN_ARMOUR) with their stop line under the field row, so a shot
; there meets the field cell and boss_hit's hull path shows the deflection
; and the hull tick - no damage, not a hit (Q-B7). The modules behind it stay
; exposed: they fire, and the boss's shots, the lasers and the player pass.
; When a half's generators have all fallen, the half collapses one column a
; frame from the generator's side: the cell cleared and its map and stop line
; rebuilt by boss_column_at, as if there never was a field. The look: the
; field glyph (field.png) in every field cell, its two phases swapped every
; FIELD_FRAMES frames (one 8-byte glyph rewrite). No sprite (owner answer 3:
; the generators' glow rings dropped; P1 / P2 stay unused in the boss sector).
; ===========================================================================
BOSS_F_HOOK         = BOSS_SLOT_F + 110        ; BOSS_LOOK_TAIL_MAX_BYTES

.ifdef BOSS_FIELD
.include "boss-field.inc"

FIELD_ROW_CELLS     = BOSS_BAND_B + (FIELD_ROW - BOSS_BAND_A_ROWS) * BOSS_BAND_COLUMNS
FIELD_STOP_Y        = BAND_TOP_Y + (FIELD_ROW + 1) * 8
FIELD_GLYPH         = BOSS_CHARSET + (FIELD_CODE & $7F) * 8
.assert FIELD_ROW >= BOSS_BAND_A_ROWS, error, "the field row is in band B"
.assert FIELD_HALVES = 2, error, "the field code walks two halves"

.segment "BOSS_F_CODE"
field_hooks:
    jmp field_frame                     ; BOSS_F_HOOK: every frame, from laser_frame (slot D)
    jmp field_late                      ; BOSS_F_HOOK + 3: SECTOR_COMPLETION (slot E)

; Every boss frame, from laser_frame, before the player's shots meet the band:
; the first frame's setup, a half whose generators all fell starts to fall,
; the glyph's other phase.
field_frame:
    lda field_state
    bne @run
    inc field_state
    jsr field_init
@run:
    ldx #(FIELD_HALVES - 1)
@half:
    lda field_half,x
    bne @next                           ; collapsing (field_late) or down
    ldy field_gen_a,x                   ; powered while a generator stands
    lda _boss_hp,y
    bne @next
    ldy field_gen_b,x
    bmi @drop
    lda _boss_hp,y
    bne @next
@drop:
    inc field_half,x                    ; 1: collapsing, from the generator's side
@next:
    dex
    bpl @half
    dec field_timer                     ; the shimmer: the glyph's other phase
    bne @rts
    lda #FIELD_FRAMES
    sta field_timer
    lda field_phase
    eor #$08
    sta field_phase
    ora #$07
    tay
    ldx #$07
:
    lda field_glyphs,y
    sta FIELD_GLYPH,x
    dey
    dex
    bpl :-
@rts:
    rts

; SECTOR_COMPLETION, once the band has been shown: a collapsing half's next
; column - its cell cleared, its map and stop line as without the field
; (boss_column_at: the module walk, the costliest step here) - one column a
; frame, never on a kill frame or the exposure check's (the draw queue's rule,
; plan §5.15.7: the stress frame is a kill frame). A cell showing a deflection
; waits a frame (the cell-flash ring would give the field glyph back).
field_late:
    lda boss_frame_heavy
    ora _boss_heavy
    ora _boss_phase
    bne @rts
    ldx #(FIELD_HALVES - 1)
@half:
    lda field_half,x
    lsr
    bcs @step                           ; 1: collapsing (0 powered, 2 down)
    dex
    bpl @half
@rts:
    rts
@step:
    ldy field_cursor,x
    lda FIELD_ROW_CELLS,y
    cmp #FIELD_CODE
    bne @rts
    lda #$00
    sta FIELD_ROW_CELLS,y
    stx field_x
    tya
    tax
    jsr boss_column_at                  ; the column as without the field (keeps X)
    ldx field_x
    lda field_cursor,x
    cmp field_last,x
    beq @down
    clc
    adc field_dir,x
    sta field_cursor,x
    rts
@down:
    inc field_half,x                    ; 2: down
    rts

; Once, on the first boss frame: every field column hull to a shot, its stop
; line under the field row.
field_init:
    ldx #(FIELD_HALVES - 1)
@half:
    ldy field_from,x
@column:
    lda #BOSS_COLUMN_ARMOUR
    sta boss_column_map,y
    lda #FIELD_STOP_Y
    sta boss_stop_y,y
    iny
    tya
    cmp field_end,x
    bne @column
    dex
    bpl @half
    rts

FIELD_TABLES                            ; boss-field.inc: the halves, the phases

; The state - data, not BSS: the block is read from the disk at every entry,
; so every boss fight starts from these values. The trace's slot F write
; clause admits the field code's writes here, and nowhere else.
field_state:    .byte 0
field_half:     .byte 0, 0              ; 0 powered, 1 collapsing, 2 down
field_cursor:   .byte FIELD_H0_START, FIELD_H1_START
field_x:        .byte 0
field_timer:    .byte FIELD_FRAMES
field_phase:    .byte 0                 ; 0 phase A shown, 8 phase B
field_state_end:
.endif

; ===========================================================================
; S5-4 (feat/boss-region-4, docs/plans/s5-boss-regions.md §4.5, §6.4; the
; owner's decisions of 2026-10-13 and 2026-10-14): the gravity well - region
; 4's code in its region block (slot F, after the look tail's 110 B, at
; BOSS_F_HOOK), assembled when a region carries a `gravity` block
; (BOSS_GRAVITY, scripts/boss-assets.mjs) and appended to that region's block
; only. It shares the field's address: only the current region's block is in
; memory (S5-1), so region 3's field and region 4's well never meet.
;
; The axis is an emitter's beam (the core's lens, GRAVITY_AXIS: its centre in
; band colour clocks): the well pulls the ship into that beam's danger, never
; to a refuge (owner answer 4). While a salvo spire stands, in the fight, with
; the player's ship alive (not dying, not in a respawn's invulnerability):
; * the pull: every GRAVITY_FRAMES frames the ship moves one step (2 colour
;   clocks, the input's own step - player_x stays even, so the input's edge
;   tests, which test for equality, still hold) towards the x whose collision
;   box the beam meets (GRAVITY_X_BASE - the band position shown). The target
;   lies in GRAVITY_X_BASE - 63 .. GRAVITY_X_BASE, inside the input's limits
;   (asserted), so a step never leaves the screen; at most 2 clocks every
;   GRAVITY_FRAMES frames against the input's 2 a frame, so the player can
;   always hold or move away;
; * the pulse: every GRAVITY_PULSE_FRAMES frames the hit flash (b3) is asked
;   for the core - the frame's one module draw, bit 7 of the core's cells for
;   its 3 frames - unless a hit's flash is waiting or showing;
; * the gravity column (owner answers 1-2 of 2026-10-14): missile M0 (COLPM0,
;   the ship's white; no laser's register - P1 / P2 stay free for the M6 VOID
;   LANCE reticle) from the first line under the band to the ring's last, 8
;   colour clocks centred on the axis, its HPOS published by the band DLI
;   (slot E's boss_m0_publish); an S-wave of M0's left / both / right halves
;   over 16 lines, one line in eight rewritten a quiet frame (never on a kill
;   or exposure-check frame), the bend moving GRAVITY_WAVE_STEP lines down
;   every 8 frames. In the axis's warning the column flares (shown by 2-frame
;   groups); in its beam the beam is the column (M0 off screen).
; Both spires fallen: the pull, the pulse and the column stop at once.
; No resident byte; of the shared slots only slot D's laser_publish tail jump
; (+2 B) and slot E's boss_m0_publish (+8 B).
; ===========================================================================
.ifdef BOSS_GRAVITY
.include "boss-gravity.inc"

HPOSP0              = $D000
GRAVITY_COLUMN_TOP  = BAND_TOP_Y + GRAVITY_BAND_ROWS * 8
.assert GRAVITY_X_BASE - 63 > PLAYER_X_LIMIT_MIN, error, "the well's target must stay right of the input's left limit"
.assert GRAVITY_X_BASE < PLAYER_X_LIMIT_MAX, error, "the well's target must stay left of the input's right limit"

.segment "BOSS_G_CODE"
gravity_hooks:
    jmp gravity_frame                   ; BOSS_F_HOOK: every frame, from laser_frame (slot D)
    jmp gravity_late                    ; BOSS_F_HOOK + 3: SECTOR_COMPLETION (slot E): the column

gravity_off:
    rts

; Every boss frame, from laser_frame, before the player's shots meet the band.
gravity_frame:
    lda #$00
    sta gravity_on
    sta boss_m0_hpos                    ; the column off unless the pull is on
    lda _boss_phase
    bne gravity_off                     ; the fight only: not the chain or the hold
    lda PLAYER_LIFECYCLE
    bne gravity_off                     ; the ship alive: never dying or invulnerable
    lda _boss_hp + GRAVITY_SPIRE_L
    ora _boss_hp + GRAVITY_SPIRE_R
    beq gravity_off                     ; both spires fallen: off for good
    inc gravity_on
    ; The axis's laser (core-lens): covered by the spires, so untouchable while
    ; the well is on - and still firing, its reload counted here (laser_rearm
    ; counts an exposed emitter's only). Ready at 0: laser_admit starts it as
    ; any other; laser_frame runs its warning and beam (the lens alive).
    ldx #GRAVITY_AXIS_LASER
    lda boss_laser_state,x
    ora boss_laser_ready,x
    bne @armed
    ldy boss_laser_module,x
    lda _boss_hp,y
    beq @armed                          ; the lens destroyed (not while covered)
    lda boss_laser_reload_lo,x
    ora boss_laser_reload_hi,x
    beq @ready
    lda boss_laser_reload_lo,x
    bne :+
    dec boss_laser_reload_hi,x
:
    dec boss_laser_reload_lo,x
    bne @armed
    lda boss_laser_reload_hi,x
    bne @armed
@ready:
    lda #$01
    sta boss_laser_ready,x
@armed:
    lda boss_laser_state + GRAVITY_AXIS_LASER
    cmp #LASER_BEAM
    beq @pulse                          ; the axis firing: its beam is the column
    cmp #LASER_WARN
    bne @column
    lda frame_counter                   ; the axis warning: the column flares
    and #$02
    beq @pulse
@column:
    lda #(GRAVITY_AXIS - 4)             ; quad M0 (8 clocks) centred on the axis
    sec
    sbc boss_shown_pos
    sta boss_m0_hpos
@pulse:
    dec gravity_pulse                   ; the core's pulse
    bne @drift
    lda #GRAVITY_PULSE_FRAMES
    sta gravity_pulse
    lda boss_mflash_req
    bpl @drift                          ; a hit's flash waits: it goes first
    lda boss_mflash_timer
    bne @drift                          ; a flash is showing
    lda #GRAVITY_CORE
    sta boss_mflash_req
@drift:
    dec gravity_timer
    bne gravity_rts
    lda #GRAVITY_FRAMES
    sta gravity_timer
    lda #GRAVITY_X_BASE
    sec
    sbc boss_shown_pos                  ; the x the axis's beam meets as shown now
    sec
    sbc player_x                        ; the way to it (signed: -152 .. +104)
    beq gravity_rts
    bmi @left
    cmp #2
    bcc gravity_rts                     ; one clock off (an odd target): there
    inc player_x
    inc player_x
    bne @moved
@left:
    cmp #$FF
    beq gravity_rts
    dec player_x
    dec player_x
@moved:
    lda player_x
    sta HPOSP0
    inc gravity_steps
    bne gravity_rts
    inc gravity_steps + 1
gravity_rts:
    rts

; SECTOR_COMPLETION, after laser_frame set this frame's SIZEM bits: M0's
; (quad, SIZEM bits 0-1), published by the next band DLI; then, never on a
; kill or exposure-check frame (the draw queue's rule; the stress frame is a
; kill frame), one line in eight of the column rewritten - the column draws
; itself so in its first eight quiet frames - and on every eighth slice the
; wave moves GRAVITY_WAVE_STEP lines down. No frame writes more than 22 lines.
gravity_late:
    lda gravity_on
    beq @rts
    lda boss_laser_sizem
    ora #$03
    sta boss_laser_sizem
    lda boss_frame_heavy
    ora _boss_heavy
    bne @rts
    lda gravity_slice
    clc
    adc #1
    and #$07
    sta gravity_slice
    bne :+
    lda gravity_phase
    clc
    adc #GRAVITY_WAVE_STEP
    sta gravity_phase
:
    lda gravity_slice
    clc
    adc #GRAVITY_COLUMN_TOP             ; the slice's first line
    tay
    clc
    adc gravity_phase                   ; its wave index
    and #$0F
    tax
@line:
    lda LASER_MISSILES,y
    and #$FC
    ora gravity_wave,x
    sta LASER_MISSILES,y
    txa
    eor #$08                            ; eight lines on: half the wave's period
    tax
    tya
    clc
    adc #8
    tay
    cpy #(LASER_LAST_LINE + 1)
    bcc @line
@rts:
    rts

; M0's two bits a line (quad: each four colour clocks): left, both, right -
; an S-bend over sixteen lines.
gravity_wave:   .byte $02, $02, $02, $02, $03, $03, $01, $01, $01, $01, $01, $01, $03, $03, $02, $02

; The state - data, not BSS: the block is read from the disk at every entry,
; so every fight starts from these values. The trace's slot F write clause
; admits the well's writes here, and nowhere else.
gravity_state:
gravity_on:     .byte 0                 ; 1 on a frame the pull is on
gravity_pulse:  .byte GRAVITY_PULSE_FRAMES
gravity_timer:  .byte GRAVITY_FRAMES
gravity_steps:  .word 0                 ; the steps taken (the trace counts them)
gravity_slice:  .byte 0                 ; the column's next slice (one line in eight)
gravity_phase:  .byte 0                 ; the wave's offset
gravity_state_end:
.endif


; ===========================================================================
; S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5; the owner's
; design of 2026-10-14): the Bastion's sliding rails and its hangar - region
; 2's code in its region block (slot F, at BOSS_F_HOOK), assembled when a
; region carries a `rails` block (BOSS_RAIL, scripts/boss-assets.mjs) and
; appended to that region's block only; its tables and state in the block's
; room between the look tail and BOSS_F_HOOK (BOSS_R_DATA). It shares the
; field's and the well's address: only the current region's block is in
; memory (S5-1).
;
; Each side's rail is hull art in three band rows (its girder under the
; track, its guns hanging from it) from the band's edge to its front column,
; carrying a row of guns, each covered by the one in front of it - and,
; behind the front gun, by the core (the converter): only the locked-in front
; gun can be hurt or fire, and it always stands in the rail's front-gun slot.
; When it falls -
; * its socket stays solid: the controller's rebuild of its columns reads the
;   hull stop the converter gives the front-gun slot, under the rail's last
;   row - a shot there deflects;
; * unless the rail is at its last position, the rail slides RAIL_PITCH
;   columns inward: RAIL_DELAY frames after the kill (the kill's spark and
;   gone draw first; rule (B)), one column every RAIL_FRAMES frames, on a
;   quiet frame only - no shot met the band this frame (so no kill either)
;   and it is not the exposure check's (the stress frame is a meeting frame,
;   plan s5-boss-regions §6.5) - one column a frame for both rails. A
;   column step gives the cell-flash ring's cells back (they are about to
;   move), shifts the rail's window - its cells in the three rows, its
;   columns' map entries and stop lines - one column inward, moves every gun
;   of the rail one column with it (the module record's x, its span: hit
;   detection follows the rail exactly) and clanks on channel 3;
; * the slide done, the next gun - now in the front-gun slot - locks in: the
;   core's bit leaves its cover, the exposure check runs on the next tick (it
;   never fires or takes a hit on the move);
; * after RAIL_POSITIONS slides the rail's front covers its cannon and stops
;   for good: a cannon still standing is covered - the rail is its columns'
;   front, so a shot deflects there - and still fires (it stays exposed to
;   the controller: its laser reloads and fires as before), but the defeat no
;   longer waits for it (one weapon less) and the doors' cover no longer
;   names it (the converter: no other cover does). A rail never reaches the
;   hub (the converter).
; * the warning: while a rail rests one slide from covering a standing
;   cannon, the gun whose fall would cover it pulses (its hit flash, b3,
;   every RAIL_PULSE frames).
; The hangar: the doors flash (b3) when the escort's clock (the Director's)
; is RAIL_CUE frames from arming an escort; once they fall no escort is armed
; again (an escort in flight flies on). The moment they unlock - the exposure
; check opens them (every cannon and rail gun destroyed or covered: their
; cover, the converter and rail_lock) - the controller draws their open look
; (amber chevrons over the locked look's bars, the region's data) and they
; flash and sound: the hit's high tone held RAIL_UNLOCK frames (the owner's
; readability rule of 2026-10-15; S5-5 Phase B).
; No resident byte; no byte of slots A-E.
; ===========================================================================
.ifdef BOSS_RAIL
.include "boss-rail.inc"
.import _boss_weapons_left, _boss_expose_pending

RAIL_ROW_A          = BOSS_BAND_A + RAIL_ROW * BOSS_BAND_COLUMNS
RAIL_ROW_B          = RAIL_ROW_A + BOSS_BAND_COLUMNS
RAIL_ROW_C          = RAIL_ROW_B + BOSS_BAND_COLUMNS
; feat/boss-order-scale (decision AX 5, the L): the foot's row - the cannons'
; armour row, under the rail's three. The window's front is the foot's tip:
; its first RAIL_FOOT columns move the foot (this row), the map and the stops
; only, so the rail's three rows - the bumper - stop short of the cannon.
RAIL_ROW_D          = RAIL_ROW_C + BOSS_BAND_COLUMNS
RAIL_DOORS_COVER    = BOSS_T_MODULES + RAIL_DOORS * BOSS_MODULE_BYTES + BOSS_M_COVER_LO
.assert RAIL_ROW + 2 < BOSS_BAND_A_ROWS, error, "the rails' rows are band A's"
.assert RAIL_L_FRONT + 1 >= RAIL_WINDOW, error, "the left rail's window starts inside the band"
.assert RAIL_R_FRONT + RAIL_WINDOW <= BOSS_BAND_COLUMNS, error, "the right rail's window ends inside the band"
.assert (RAIL_PULSE & (RAIL_PULSE - 1)) = 0, error, "the warning's period is a power of two"
.assert RAIL_UNLOCKS < $100, error, "the doors and the cannons are modules 0-7"
.assert (RAIL_UNLOCKS & (1 << RAIL_DOORS)) <> 0, error, "the doors unlock"
.assert RAIL_POSITIONS = 2, error, "the warning's check: one slide from the last (dey)"
.assert RAIL_FOOT_ROW = RAIL_ROW + 3, error, "the foot's row is under the rail's three"
.assert RAIL_FOOT_ROW = RAIL_ARMOUR_ROW, error, "the foot stands in the cannons' armour row"
.assert RAIL_FOOT >= 1 && RAIL_FOOT < RAIL_WINDOW, error, "the foot is inside the window"
; The bays (the owner's look of 2026-10-15 at 110c274): each cannon's module
; is the cannon (rows .. RAIL_LENS_ROW) over its armour (RAIL_ARMOUR_ROW, its
; last row). laser_prepare gave each beam the plane from the armour row's lens
; line and the warning's heat the armour row's cell; the block's frame hook
; moves the heat to the lens and writes the armour row's lines; a bay's
; opening moves its columns' stop to the lens row.
RAIL_ARMOUR_TOP     = BAND_TOP_Y + 8 * RAIL_ARMOUR_ROW
RAIL_LENS_CELLS     = BOSS_BAND_A + RAIL_LENS_ROW * BOSS_BAND_COLUMNS
RAIL_LENS_STOP      = BAND_TOP_Y + 8 * (RAIL_LENS_ROW + 1)
.assert RAIL_ARMOUR_ROW < BOSS_BAND_A_ROWS, error, "the bays are band A's"
.assert >(RAIL_LENS_CELLS + RAIL_LENS_L) = >(RAIL_LENS_CELLS + BOSS_BAND_COLUMNS + RAIL_LENS_L), error, "the left lens and armour cells share a page (the heat's low byte only)"
.assert >(RAIL_LENS_CELLS + RAIL_LENS_R) = >(RAIL_LENS_CELLS + BOSS_BAND_COLUMNS + RAIL_LENS_R), error, "the right lens and armour cells share a page (the heat's low byte only)"
.assert <RAIL_LENS_CELLS + RAIL_LENS_R < $100, error, "the lens cells' low bytes index the stop lines"
rail_x              = laser_x           ; scratch: slot D's, idle once laser_frame is done
rail_t              = laser_t           ; (rail_late runs at SECTOR_COMPLETION) - and the
rail_u              = boss_tmp          ; column map's, idle outside a rebuild
rail_stepped        = laser_n           ; a column stepped this frame

.segment "BOSS_R_CODE"
rail_hooks:
    jmp rail_bays                       ; BOSS_F_HOOK: every frame, from laser_frame (slot D)
    jmp rail_late                       ; BOSS_F_HOOK + 3: SECTOR_COMPLETION (slot E)

; SECTOR_COMPLETION, once the band has been shown (slot E's boss_shots_late),
; after the frame's kills and the controller's tick: the hangar; per side, a
; front gun fallen this frame, a slide's next column, the warning.
rail_late:
    lda _boss_phase
    bne rail_rts                        ; the fight only
    sta rail_stepped
    lda _boss_hp + RAIL_DOORS
    bne @open
    sta RAIL_ESCORT_TIMER               ; the doors fell: no escort armed again
.if RAIL_JAMBED
    lda #BOSS_COLUMN_ARMOUR             ; and the core's left flank armoured -
    sta boss_column_map + RAIL_JAMB     ; the column its own volley leaves open
.else                                   ; (the controller exposes it next frame);
    beq @rails                          ; no unlock is left, the escort's clock 0:
.endif                                  ; on to the rails
@open:
    lda _boss_newly_lo                  ; unlocked this frame - the doors or a
    and #RAIL_UNLOCKS                   ; bay: the tone and the flash (after
    beq @cue                            ; the open look: boss_mflash_frame
    ldy #$FF                            ; drains the queue first), on the
:                                       ; lowest of them
    iny
    lsr
    bcc :-
    ldx #BOSS_TONE_DAMAGE
    jsr boss_tick_sound                 ; (keeps Y)
    lda #RAIL_UNLOCK
    sta boss_tick_timer
    tya
    bpl @flash
@cue:
    lda RAIL_ESCORT_TIMER
    cmp #RAIL_CUE
    bne @rails
    lda #RAIL_DOORS                     ; an escort comes: the doors flash
@flash:
    sta boss_mflash_req
@rails:
    ldx #1
@side:
    stx rail_x
    jsr rail_side                       ; (every way out keeps X = rail_x)
    dex
    bpl @side
rail_rts:
    rts

; X = rail_x = a side: its front gun fallen this frame starts a slide, unless
; the rail is at its last position; a slide's next column; the warning.
rail_side:
    jsr rail_index
    lda rail_k,x
    cmp #RAIL_POSITIONS
    bcs @rts
    lda rail_step,x
    bne @slide                          ; a slide under way (no live front gun)
    lda rail_guns,y
    tay
    lda _boss_hp,y
    bne @live
    inc rail_dead,x                     ; the front gun fell: its bay opens - a
    ldy rail_heat,x                     ; shot in the bay's columns meets the
    lda #RAIL_LENS_STOP                 ; cannon's muzzle row now, not the armour
    sta boss_stop_y - <RAIL_LENS_CELLS - 1,y  ; (the second kill: the cannon or
    sta boss_stop_y - <RAIL_LENS_CELLS,y      ; its socket, the rail closing in)
    lda #RAIL_PITCH
    sta rail_step,x
    lda #RAIL_DELAY
    sta rail_timer,x
@rts:
    rts
@live:
    ldy rail_k,x                        ; one slide from covering a standing
    dey                                 ; cannon: the gun whose fall would
    bne @rts                            ; cover it pulses
    txa                                 ; (its cannon: module side * 2, build.mjs)
    asl
    tay
    lda _boss_hp,y
    beq @rts
    lda frame_counter
    and #(RAIL_PULSE - 1)
    bne @rts
    jsr rail_index
    lda rail_guns,y
    sta boss_mflash_req
    rts
@slide:
    lda rail_timer,x
    beq @due
    dec rail_timer,x
    bne @rts
@due:
    lda boss_shots_admit_left           ; never on a frame a shot met the band
    cmp #BOSS_SHOT_ADMIT                ; (AUD-04's count: none admitted) -
    bne @rts                            ; so never on a kill frame either -
    lda rail_stepped                    ; one column a frame for both rails,
    ora _boss_heavy                     ; never on the exposure check's frame:
    bne @rts                            ; the next frame then
    inc rail_stepped
    jsr rail_column
    lda #RAIL_FRAMES
    sta rail_timer,x
    dec rail_step,x
    bne @rts                            ; the slide done: rail_lock

; X = rail_x = a side, its slide done: the next gun locks in (the core's bit
; leaves its cover; the exposure check on the next tick); at the last
; position a cannon still standing is covered.
rail_lock:
    inc rail_k,x
    jsr rail_index
    lda rail_guns,y
    jsr boss_record_a                   ; Y = its record (keeps X)
.if RAIL_CORE < 8                       ; (the core's bit in one byte)
    lda BOSS_T_MODULES + BOSS_M_COVER_LO,y
    and #<~(1 << RAIL_CORE)
    sta BOSS_T_MODULES + BOSS_M_COVER_LO,y
.else
    lda BOSS_T_MODULES + BOSS_M_COVER_HI,y
    and #<~(1 << (RAIL_CORE - 8))
    sta BOSS_T_MODULES + BOSS_M_COVER_HI,y
.endif
    inc _boss_expose_pending            ; (0: a lock's frame is no kill's nor the check's)
    lda rail_k,x
    cmp #RAIL_POSITIONS
    bne @rts
    jmp rail_cover                      ; the last position: its cannon (BOSS_R_DATA)
@rts:
    rts

; X = rail_x = a side: one column inward - the ring's cells back, the
; window's cells, map entries and stop lines shifted (the destination of one
; column is the source of the one before it), every gun's record x and span
; moved (a side's guns are consecutive modules, the converter), a clank.
rail_column:
    ldy #LASER_HEAT_FRAMES              ; every ring record expires (the longest,
:                                       ; a heat's, in as many frames' timers;
    jsr boss_frame_timers               ; the tick's: the clank's below) - keeps Y
    dey
    bne :-
    ldx rail_x
    lda #RAIL_WINDOW
    sta rail_u
    lda rail_dir,x
    sta rail_t
    ldy rail_front,x                    ; the source: the front first
    clc
    adc rail_front,x
    sta rail_front,x
    tax                                 ; its destination
@copy:
    lda rail_u                          ; the foot's columns (the window's
    cmp #(RAIL_WINDOW - RAIL_FOOT + 1)  ; first): its row, the map and the
    bcs @foot                           ; stops only - the cannon's three rows
    lda RAIL_ROW_A,y                    ; are never written
    sta RAIL_ROW_A,x
    lda RAIL_ROW_B,y
    sta RAIL_ROW_B,x
    lda RAIL_ROW_C,y
    sta RAIL_ROW_C,x
@foot:
    lda RAIL_ROW_D,y
    sta RAIL_ROW_D,x
    lda boss_column_map,y
    sta boss_column_map,x
    lda boss_stop_y,y
    sta boss_stop_y,x
    tya                                 ; the next destination is this source
    tax
    sec
    sbc rail_t
    tay
    dec rail_u
    bne @copy
    ldx rail_x
    lda rail_guns + 2,x                 ; the side's lowest gun module (build.mjs)
    tax
    jsr boss_record_of                  ; and its record
    lda #RAIL_GUNS
    sta rail_u
@gun:
    lda BOSS_T_MODULES + BOSS_M_X,y
    clc
    adc rail_t
    sta BOSS_T_MODULES + BOSS_M_X,y
    sta boss_mx,x
    clc
    adc #RAIL_GUN_WIDTH
    sta boss_mxe,x
    tya                                 ; C = 0 (the span ends inside the band)
    adc #BOSS_MODULE_BYTES
    tay
    inx
    dec rail_u
    bne @gun
    ldx #BOSS_TONE_HULL                 ; the clank
    jsr boss_tick_sound
    ldx rail_x
    rts


rail_code_end:                          ; (the trace's slot F write clause: the code at the hook)
; The tables (boss-rail.inc: rail_guns per side front first, rail_first,
; rail_dir, rail_not_lo(/hi)) and the rest of the state, after the code (the
; room before the hook is full).
RAIL_TABLES
rail_state:
rail_k:         .byte 0, 0              ; slides done (0 .. RAIL_POSITIONS)
rail_front:     .byte RAIL_L_FRONT, RAIL_R_FRONT   ; each rail's front column now
rail_state_end:
rail_heat:      .byte <(RAIL_LENS_CELLS + RAIL_LENS_L), <(RAIL_LENS_CELLS + RAIL_LENS_R)
                                        ; each cannon's lens cell (laser 0 left, 1 right;
                                        ; with the code, the L's bytes)

; The lens cells, the scratch and the frame hook, in the block's room between
; the look tail and BOSS_F_HOOK.
.segment "BOSS_R_DATA"

; The state - data, not BSS: the block is read from the disk at every entry,
; so every fight starts from these values. The trace's slot F write clause
; admits the rails' writes in rail_scratch .. rail_scratch_end and
; rail_state .. rail_state_end, and nowhere else.
rail_scratch:
rail_step:      .byte 0, 0              ; columns left in the slide under way
rail_timer:     .byte 0, 0              ; frames to its next column
rail_dead:      .byte 0, 0              ; guns destroyed (that slid the rail)
rail_scratch_end:

; Code too: the block's room after the look tail is RAM read from the disk
; with the rest (the code at BOSS_F_HOOK is full).
; X = rail_x = a side at its last position (rail_lock): a cannon still
; standing is covered - the defeat no longer waits for it, nor do the doors -
; and drawn as its covered look (feat/boss-order-scale, decision AX 5, the L):
; locked steel above the foot the slide has stood in front of it (the
; converter's look, one for both cannons: RAIL_COVER). Its columns are the foot's
; now (the slide gave them its map entries and stop lines): a shot deflects
; on the foot; its beam starts under it (rail_frame, slot E).
rail_cover:
    txa                                 ; its cannon (module side * 2)
    asl
    tay
    lda _boss_hp,y
    beq @rts                            ; destroyed before the rail reached it
    dec _boss_weapons_left
    lda RAIL_DOORS_COVER
    and rail_not_lo,x
    sta RAIL_DOORS_COVER
.if RAIL_CANNONS_HI
    lda RAIL_DOORS_COVER + 1
    and rail_not_hi,x
    sta RAIL_DOORS_COVER + 1
.endif
    tya                                 ; A = the cannon
    ldy #RAIL_COVER                     ; its covered look (both cannons')
    ldx #BOSS_MODE_COPY
    jsr boss_enqueue
    ldx rail_x
@rts:
    rts

; X = a side (= its cannon's laser) -> A, Z: its laser's state if the rail
; covers its cannon (the last position), else 0 (rail_frame, slot E: a
; covered cannon's warning and beam stay off the armour row - its beam starts
; under the foot; its reload is slot D's own, it is exposed).
rail_veil:
    lda rail_k,x
    and #RAIL_POSITIONS                 ; (0-2: only the last position has bit 1)
    beq @rts
    lda boss_laser_state,x
@rts:
    rts

; X = rail_x = a side -> Y = its front gun's place in rail_guns. Keeps X.
; (Here, in the block's room after the look tail: the L's bytes.)
rail_index:
    lda rail_dead,x
    clc
    adc rail_first,x
    tay
    rts

; BOSS_F_HOOK, every frame before laser_frame's lasers: a cannon in its locked
; bay fires as an open one does (the owner's choice "B - the window"): while
; its laser is off, its reload counts down - slot D's countdown, which waits
; on the controller's exposure for an emitter it counts itself - and its
; shield is dropped, so the bay's opening is no first shot. Lasers 0 and 1
; are the cannons' (laser_prepare: the slot-1 twins in module order, the left
; first; the right one's twin is laser 1 on every tier). An open bay's or a
; destroyed cannon's laser is exposed: slot D's own, as is a death's or the
; defeat's hold (laser_all_off sets the reload again every frame).
; The owner's look of 2026-10-15 at 110c274 - the armour between the cannon
; and the player: the warning heats each cannon's lens (its last row), not
; the armour; the missile plane's armour row (gameplay's PRIOR 0 shows a
; missile over the playfield, ORed or in front) carries every beam but a
; locked bay's and a covered cannon's - those start under the armour or the
; foot, an open cannon's right under its muzzle (laser_prepare gave the beams
; the plane from the armour row's lens line; nothing else of the boss sector
; uses it in the band).
; feat/boss-order-scale (decision AX 5; the owner's option A): in slot E, to
; make the block's room for the L - region 2's only, but slot E is every
; region's (assembled when a region carries rails); it reads the block's
; rail_heat and rail_k, so only region 2's hook calls it.
.segment "BOSS_C_ASM"
rail_frame:                             ; (from rail_bays: laser_b the armour row's bits)
    ldx #1
@bay:
    jsr rail_lens                       ; the lens cell; exposed? (slot D)
    beq @locked
    jsr rail_veil                       ; covered, its laser on: under the foot
    beq @next
@hide:
    lda b2_three,x                      ; its warning or beam (slot D's): not on
    eor #$FF                            ; the armour row - its missile's bit off
    and laser_b
    sta laser_b
    bpl @next                           ; (always)
@locked:
    lda boss_laser_state,x
    bne @hide
    sta boss_laser_shielded,x           ; A = 0
    jsr laser_reload
@next:
    dex
    bpl @bay
    jmp rail_row
.segment "BOSS_R_CODE"
; rail_frame's head in the block (slot E's room): the armour row's bits to
; start from.
rail_bays:
    lda #B2_COLUMN_BITS
    sta laser_b
    jmp rail_frame
; rail_frame's end: the armour row's eight lines of the missile plane - in
; slot C, every region's (it fits slot C's 14 sectors: no entry cost).
.segment "BOSS_D_CODE"
; X = a side: its warning's heat on the cannon's lens cell (its high byte
; laser_prepare's), then laser_exposed (rail_frame's loop head, slot C's room).
rail_lens:
    lda rail_heat,x
    sta boss_laser_cell_lo,x
    jmp laser_exposed
rail_row:
    lda laser_b
    ldx #8
:
    sta LASER_MISSILES + RAIL_ARMOUR_TOP - 1,x
    dex
    bne :-
    rts

.endif

; M6 (docs/plans/m6-void-lance.md): the VOID LANCE, slot G.
.include "lance.s"
