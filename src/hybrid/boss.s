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
;   SECTOR_COMPLETION  boss_completion  the hand-off to the level summary
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
PRIOR           = $D01B
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
; The ring rows that stay visible under the band: display rows 9-27.
RING_FIRST_VISIBLE = BOSS_BAND_ROWS
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

; The head's run table (boss-runs.inc): the install, slot C, then per region
; its band A, band B and charset runs, 5 bytes a run.
BOSS_RUN_INSTALL = 0
BOSS_RUN_SLOT_C  = 5
BOSS_RUN_SLOT_D  = 10
BOSS_RUN_REGIONS = 15
BOSS_REGION_RUNS = 3

.assert BOSS_BAND_ROWS = 8, error, "the band is 8 rows (owner answer Q2)"
.assert hull_scroll_rates = world_scroll_rates + 3, error, "the two scroll-rate tables are no longer one 6-B run"
.assert (BOSS_CHARSET & $03FF) = 0, error, "an ANTIC 4 charset starts on a 1 KB boundary"

.export boss_head, boss_vector_image, boss_dli, boss_update, boss_motion
.export boss_completion, boss_install, boss_shown_pos, boss_dli_pos, boss_pos
.export boss_rts, boss_runs, boss_draw_module, boss_apply_pos, boss_module_scored
.export boss_column_map, boss_column_at, boss_rebuild_module, boss_prepare
.export boss_mx, boss_mxe, boss_look_operand, boss_shake_timer
.export boss_ring_lo, boss_ring_hi, boss_ring_saved, boss_ring_timer, boss_ring_module, boss_ring_glyph
.export boss_palette, boss_flash_timer, boss_tick_timer, boss_queue_head, boss_queue_tail
.export boss_nozzle_dark, boss_column_from, boss_ring_set
.export boss_stop_y, boss_shot_lo, boss_shot_hi, boss_hull_stop_operand, boss_shot_meet
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
.import _boss_c_init, _boss_c_hit, _boss_c_tick
.import _boss_hit_module, _boss_hit_cell, _boss_stage_module, _boss_stage_add
.import _boss_score_module, _boss_newly_lo, _boss_newly_hi, _boss_kind, _boss_hp
.import _boss_blast, _boss_handoff, _boss_clock_lo, _boss_clock_hi, _boss_phase
.import _boss_fire_module, _boss_fire_offset, _boss_heavy
.import _boss_exposed_lo, _boss_exposed_hi
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
    jmp boss_rts                        ; TICK_FLASHES
    jmp boss_rts                        ; ENGINE
    jmp boss_rts                        ; HULL_CONTACT
    jmp boss_rts                        ; RENDER_FLASHES
    jmp boss_rts                        ; RENDER_EXPLOSIONS
    jmp boss_completion                 ; SECTOR_COMPLETION
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
    ldy #BOSS_RUN_INSTALL
    jsr boss_read_run
    ldy #BOSS_RUN_SLOT_C
    jsr boss_read_run
    ldy #BOSS_RUN_SLOT_D
    jsr boss_read_run
    ldx #$00
    lda LEVEL_ID
    sec
    sbc #$01
@region:
    cmp #$03
    bcc @have_region
    cpx #$03
    beq @have_region
    sbc #$03
    inx
    bne @region
@have_region:
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
    jmp boss_install

; Y = a run's offset in boss_runs: {sector lo, sector hi, count, dst lo, dst hi}.
boss_read_run:
    lda boss_runs+2,y
    beq @missing                        ; a region this disk does not carry
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
    bcs @failed
    rts
@missing:
    lda #SR_BAD_IMAGE
@failed:
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
    lda boss_palette                    ; the region's, or the flash's frame
    sta COLPF0
    lda boss_palette+1
    sta COLPF1
    lda boss_palette+2
    sta COLPF2
    lda boss_palette+3
    sta COLPF3
    jsr laser_publish                   ; S4b: the lasers' HPOS and SIZEM (A only)
    inc gameplay_dli_phase
    pla
    rti
@below_hud:
    lsr                                 ; phase 1 -> C=1; phase 2 -> C=0
    bcc @hud
    sta WSYNC
    ; COLPF3 first (owner decision QA2): in the horizontal blank, so the
    ; lasers' fifth-player beam changes from the band's colour to the ring's
    ; exactly at the band's edge (as the last store it reached line 88).
    lda #GAMEPLAY_COLPF3
    sta COLPF3
    lda #>CHARSET
    sta CHBASE
    lda #GAMEPLAY_COLPF0
    sta COLPF0
    lda gameplay_dli_allied_colpf1_load+1   ; the level's allied steel
    sta COLPF1
    lda #GAMEPLAY_COLPF2
    sta COLPF2
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
    ldx #(BOSS_BAND_ROWS - 1)
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
; shot inside the band flies on, drawn in its cell, until it reaches the cell
; that stops it (decision M, plan §5.16): per column the front intact module's
; bottom row, else the hull's own stop row, else nothing - it leaves the
; band's top and is removed. Only the girders' named cells are see-through
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
    jsr boss_shots_restore
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
    jsr boss_open_looks
    jsr boss_fire
    lda _boss_blast
    bmi @queue
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
    jsr boss_queue_draw
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
    lda _boss_hit_cell
    sta boss_column
    lda _boss_hit_module
    cmp #BOSS_COLUMN_ARMOUR
    bne @module
    ; The hull: the deflection on the column's hull stop cell - a cell of the
    ; hull no module owns (not a girder's), so no module's draw can take it while
    ; the ring holds it (the stray glyph of plan §5.16.1) - the hull tick.
    ldy boss_column
    lda boss_stop_y,y
    sec
    sbc #(BAND_TOP_Y + 8)               ; the stop line - (BAND_TOP_Y + 8) = row * 8
    lsr
    lsr
    lsr
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
    ; The struck cell: the module's bottom row at the shot's column.
    ldx _boss_hit_module
    stx boss_ring_tag
    jsr boss_record_of
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    and #$0F                            ; the height (bits 4-7: cavityRows)
    clc
    adc BOSS_T_MODULES + BOSS_M_ROW,y
    tax
    dex
    jsr boss_cell_at
    lda boss_hit_result
    beq @absorbed
    jsr boss_flash_on
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
    ; The module's score, packed BCD (light_add_score's path), then the kill
    ; stat and the HUD through the reader's kill vector, and the kill sound
    ; (channel 2). (The harness counts kills at this label, as it does at the
    ; score routines.)
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
    lda boss_flash_timer
    beq @tick
    dec boss_flash_timer
    bne @tick
    ldx #3
@palette:
    lda BOSS_T_PALETTE,x
    sta boss_palette,x
    dex
    bpl @palette
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

; A damaging hit: the band's four colours raised by flashLuma for one frame
; (the converter keeps every colour inside its hue). Keeps dst_ptr.
boss_flash_on:
    lda boss_flash_timer
    bne @done                           ; this frame's flash is up already
    lda #$01
    sta boss_flash_timer
    ldx #3
:
    lda BOSS_T_PALETTE,x
    clc
    adc BOSS_T_FLASH_LUMA
    sta boss_palette,x
    dex
    bpl :-
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
;   BOSS_MODE_ADD   boss_add added to every cell's code (a damage stage)
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
    lda (dst_ptr),y
    clc
    adc boss_add
    jmp @store
@gone:
    ; Gone: the cavity on the rows inside the hull, background below.
    lda boss_cavity_left
    beq @store
    lda BOSS_T_CAVITY
    jmp @store
@fill:
    lda boss_fill
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
    sta boss_flash_timer
    sta boss_tick_timer
    sta boss_ring_next
    sta boss_ring_last
    sta boss_nozzle_phase
    sta boss_nozzle_dark
    ldx #3
:
    lda BOSS_T_PALETTE,x
    sta boss_palette,x
    dex
    bpl :-
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
; flies on, drawn in its cell when the cell is blank (behind a girder's stub,
; decision M), or it left the band's top and is removed.
boss_shot_meet:
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc #BAND_ORIGIN_HPOS
    clc
    adc boss_shown_pos
    sta boss_shot_px
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
    bcs @in
    lda #FIGHTER_PROJECTILE_FREE         ; over open sky past the band's top
    sta FIGHTER_PROJECTILE_ACTIVE,x
    clc
    rts
@in:
    sbc #BAND_TOP_Y                     ; C=1
    lsr
    lsr
    lsr
    sty boss_column
    stx boss_shot_x
    tax
    jsr boss_cell_at
    ldx boss_shot_x
    ldy #$00
    lda (dst_ptr),y
    bne @hidden
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
@hidden:
    clc
    rts

; Last frame's in-band shot cells get the blank back, each only while it
; still shows a shot: a module's draw since then owns it.
boss_shots_restore:
    ldx #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
@slot:
    lda boss_shot_hi,x
    beq @next
    sta dst_ptr+1
    lda boss_shot_lo,x
    sta dst_ptr
    ldy #$00
    lda (dst_ptr),y
    sec
    sbc BOSS_T_SHOT_CODE
    cmp #BOSS_SHOT_CODES
    bcs :+
    tya
    sta (dst_ptr),y
:
    lda #$00
    sta boss_shot_hi,x
@next:
    dex
    bpl @slot
    rts

; Once, from boss_prepare: the hull-stop table's address in the look tail.
boss_shots_prepare:
    lda BOSS_T_LOOK_TAIL
    clc
    adc BOSS_T_HULL_STOP
    sta boss_hull_stop_operand
    lda BOSS_T_LOOK_TAIL+1
    adc #$00
    sta boss_hull_stop_operand+1
    rts

; A = a nozzle code, X = its store's operand offset from boss_nozzle_dst_l:
; the operand becomes the code's glyph in the region's charset.
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
boss_palette:       .res 4      ; the band's colours the DLI shows (the flash's frame)
boss_flash_timer:   .res 1
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
; Option A (Q1): each enabled emitter slot k is missile k under PRIOR's
; fifth-player bit, so a beam takes COLPF3 - the band's $32 in the band, the
; ring's $46 below it, switched by the band DLI. The column is written once at
; the install, from the line under the emitter to the ring's last line, and
; erased when the boss sector ends (Q2); a laser is then only its HPOS and its
; SIZEM pair, published by the band DLI's phase 0 from the band position
; that frame shows. Warning (Q3): the emitter's bottom cell heats through the
; cell-flash ring (spark / muzzle every 4 frames), the line pulses 1 / 2 colour
; clocks in 2-frame groups, a rising tone on channel 3 over the engine bed
; (Q4); beam: 4 colour clocks. The beam damages the player at most once a
; firing (Q5, boss_def's damage per difficulty, software compare) and absorbs
; the player's shots in its column (Q6). No laser starts and none shows while
; the player is not ALIVE; a dead emitter's laser goes off at once.
; ===========================================================================
.segment "BOSS_D_CODE"

LASERS              = 4
LASER_OFF           = 0
LASER_WARN          = 1
LASER_BEAM          = 2
LASER_NONE          = $FF
LASER_BEAM_CLOCKS   = 4         ; quad width: one missile bit, four colour clocks
LASER_LAST_LINE     = 239       ; the ring's last line
; src/main.s: MISSILES = PMG_BASE + $0300, PLAYER_LIVES = PLAYER_LIFECYCLE+$01,
; PLAYER_ALIVE = 0, PLAYER_COLLISION_WIDTH = 8 (pinned by tests/boss-lasers.test.mjs).
LASER_MISSILES      = $3B00
.ifdef BOSS_BEAM_ROOT
; S4b.2 probe (owner smoke findings, 2026-10-06): the beam's root - its band
; segment lit on player P1 / P2, free in the boss sector (option A), one a
; laser while at most two run (D3).
HPOSP1              = $D001
HPOSP2              = $D002
SIZEP1              = $D009
SIZEP2              = $D00A
COLPM1              = $D013
COLPM2              = $D014
ROOT_P1             = LASER_MISSILES + $0200    ; PMG_BASE + $500, single line
ROOT_P2             = LASER_MISSILES + $0300
ROOT_COLOUR         = $46       ; the beam's colour below the band (COLPF3 there)
ROOT_BITS           = $80       ; one bit at quad width: the missile's four clocks
ROOT_GLOW           = 6         ; the core's glow at most, lines
; Through the band's first ring line: the band DLI's COLPF3 store lands a line
; late in some frames (MEASURED, S4b.1 and S4b.2 captures: line 88 shows $32),
; so the root covers line 88 too - over the missile, both $46, no seam.
ROOT_LAST_LINE      = BAND_BOTTOM_Y + 1
ROOT_GROW           = 24        ; the beam's root grows from the core, lines a frame
ROOT_CLEAR          = 12        ; a free root's old column clears, lines a frame
.endif
LASER_PLAYER_LIVES  = PLAYER_LIFECYCLE + 1
LASER_PLAYER_ALIVE  = 0
LASER_PLAYER_WIDTH  = 8
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
; its bottom-centre cell - and missile k's bit from the line under it down;
; the rest of the plane empty; PRIOR's fifth-player bit on.
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
    lda laser_bits,x
    sta laser_b
    lda laser_t
    asl
    asl
    asl
    adc #BAND_TOP_Y                     ; C=0: the first line of the beam
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
.ifdef BOSS_BEAM_ROOT
    jsr root_prepare
.endif
    jsr laser_all_off                   ; S4b.1 (D3): every laser off, its reload set
    lda #$10                            ; the fifth player: missiles in COLPF3
    sta PRIOR
    rts

; S4b.1 (owner decision D3, 2026-10-06): an emitter fires on its own cadence,
; not in the controller's pulse rotation (D1: the converter gives it no pulse
; reload, so the controller never arms it). X = an OFF laser: while its
; emitter is alive and exposed, its reload (boss_def, per difficulty) counts
; down; at 0 it is ready and waits for laser_admit. Keeps X.
laser_rearm:
    ldy boss_laser_module,x
    lda _boss_hp,y
    beq @done                           ; destroyed: never ready again
    cpy #8
    bcs @high
    lda _boss_exposed_lo
    and laser_module_bits,y
    jmp @exposed
@high:
    lda _boss_exposed_hi
    and laser_module_bits-8,y
@exposed:
    beq @done                           ; still covered
    lda boss_laser_reload_lo,x
    ora boss_laser_reload_hi,x
    bne @count
    lda #$01
    sta boss_laser_ready,x
@done:
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

; At most LASER_MAX_ON lasers in their warning or beam at once (D3): the ready
; ones start in turn from the rotating cursor, which moves past each one
; started, so no emitter starves.
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
.ifdef BOSS_BEAM_ROOT
    jmp root_take
.else
    rts
.endif

laser_module_bits:
    .byte $01, $02, $04, $08, $10, $20, $40, $80

.ifdef BOSS_BEAM_ROOT
; At the install: the two players' memory clear, nobody's, clean, their
; colour the beam's; each laser's root top: the core cell's last ROOT_GLOW lines.
root_prepare:
    lda #$00
    tay
:
    sta ROOT_P1,y
    sta ROOT_P2,y
    iny
    bne :-
    sta root_edge
    sta root_edge+1
    sta root_dirty
    sta root_dirty+1
    lda #$FF
    sta root_owner
    sta root_owner+1
    lda #ROOT_COLOUR
    sta COLPM1
    sta COLPM2
    ldy #(LASERS - 1)
@laser:
    lda #$00
    sta laser_root,y
    sta root_full,y
    ldx boss_laser_module,y
    cpx #LASER_NONE
    beq @next
    sty root_x
    jsr boss_record_of                  ; Y = the emitter's record
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    and #$0F
    clc
    adc BOSS_T_MODULES + BOSS_M_ROW,y
    asl
    asl
    asl
    adc #(BAND_TOP_Y - ROOT_GLOW)       ; C=0: the beam's first line - the glow
    ldy root_x
    sta root_top,y
@next:
    dey
    bpl @laser
    rts

; Leaving the boss sector: P1 / P2 as gameplay has them (the hull colour the
; Heavy publishes, single width, off screen).
root_restore:
    lda #$00
    sta HPOSP1
    sta HPOSP2
    lda #$01
    sta SIZEP1
    sta SIZEP2
    lda _heavy_hull_colour
    sta COLPM1
    sta COLPM2
    rts

; X = a laser starting its warning: a free player becomes its root; one
; still clearing its old column stays hidden until it is clean. Keeps X.
root_take:
    ldy #$00
@any:
    lda root_owner,y
    bmi @got
    iny
    cpy #$02
    bne @any
    rts
@got:
    txa
    sta root_owner,y
    iny
    tya
    sta laser_root,x                    ; player 1 or 2
    lda #$00
    sta root_full,x
    rts

; Y = a player (0 / 1): dst_ptr at its memory. Keeps X and Y.
root_page:
    lda #<ROOT_P1
    sta dst_ptr
    tya
    clc
    adc #>ROOT_P1
    sta dst_ptr+1
    rts

; Once a frame, from laser_frame: a free player's old column clears,
; ROOT_CLEAR lines a frame (it is off screen: no HPOS while dirty).
root_clean:
    ldy #$01
@player:
    lda root_dirty,y
    beq @next
    sty root_t
    jsr root_page
    lda root_dirty,y
    tay                                 ; the next line to clear
    ldx #ROOT_CLEAR
    lda #$00
:
    sta (dst_ptr),y
    iny
    cpy #ROOT_LAST_LINE
    beq @clean
    dex
    bne :-
    tya
    ldy root_t
    sta root_dirty,y
    jmp @next
@clean:
    ldy root_t
    lda #$00
    sta root_dirty,y
@next:
    dey
    bpl @player
    rts

; X = a running laser, after laser_place: its root follows its edge; in the
; warning the core's glow grows 2 / 4 / 6 lines as it runs out, pulsing
; every 4 frames (2 lines fewer); in the beam the column grows from the core
; to the band's edge, ROOT_GROW lines a frame. Keeps X.
root_draw:
    ldy laser_root,x
    bne :+
    rts
:
    dey
    lda root_dirty,y
    beq :+
    lda #$00                            ; still clearing: hidden
    sta root_edge,y
    rts
:
    lda boss_laser_edge,x
    sta root_edge,y
    jsr root_page
    stx root_x
    lda boss_laser_state,x
    cmp #LASER_BEAM
    bne @warn
    lda root_full,x                     ; lines grown so far
    clc
    adc root_top,x
    cmp #ROOT_LAST_LINE
    bcs @done
    tay
    lda #ROOT_GROW
    sta root_t
@grow:
    lda #ROOT_BITS
    sta (dst_ptr),y
    iny
    cpy #ROOT_LAST_LINE
    beq :+
    dec root_t
    bne @grow
:
    tya
    sec
    sbc root_top,x
    sta root_full,x
@done:
    rts
@warn:
    lda boss_laser_timer,x              ; frames left: > 16 two lines, > 8 four, then six
    ldy #2
    cmp #17
    bcs @lines
    ldy #4
    cmp #9
    bcs @lines
    ldy #ROOT_GLOW
@lines:
    and #$04                            ; the pulse: 2 lines fewer every other 4 frames
    beq :+
    dey
    dey
:
    sty root_t                          ; the lines lit, from the bottom
    lda #ROOT_GLOW
    sec
    sbc root_t
    sta root_t                          ; the first lit line, from the top
    ldy root_top,x
    ldx #$00
@glow:
    lda #$00
    cpx root_t
    bcc :+
    lda #ROOT_BITS
:
    sta (dst_ptr),y
    iny
    inx
    cpx #ROOT_GLOW
    bne @glow
    ldx root_x
    rts

; X = a laser going off: its root off screen now, its player free; the old
; column clears over the next frames (root_clean). Keeps X.
root_free:
    ldy laser_root,x
    bne :+
    rts
:
    dey
    lda #$FF
    sta root_owner,y
    lda #$00
    sta root_edge,y
    sta laser_root,x
    lda root_top,x
    sta root_dirty,y                    ; clear from its top
    rts
.endif

; Every frame, from UPDATE before the player's shots meet the band: the boss's
; shots in the band; then, in the fight, the beams on screen this frame against
; the player and the shots, each laser's timer, warning and next position.
; The defeat or the last life lost ends the boss sector for the lasers: all
; off, the column erased, PRIOR's fifth-player bit off (Q1).
laser_frame:
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
.ifdef BOSS_BEAM_ROOT
    jsr root_clean
.endif
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
.ifdef BOSS_BEAM_ROOT
    jsr root_draw
.endif
@next:
    dex
    bpl @laser
    jmp laser_admit

; X = a laser in its warning: every 4 frames the heat look on its emitter's
; bottom cell (the ring carries it through a stage redraw); the rising tone.
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
    beq @spark
    lda BOSS_T_MUZZLE
    bne @heat
@spark:
    lda BOSS_T_SPARK
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
    lda boss_laser_timer,x
    and #$02
    beq @thin
    lda laser_pair_one,x                ; two clocks: one clock left of centre
    ldy #1
    bne @size
@thin:
    lda #$00
    tay
    beq @size
@beam:
    lda laser_pair_three,x
    ldy #2
@size:
    ora boss_laser_sizem
    sta boss_laser_sizem
    sty laser_t
    lda boss_laser_centre,x
    sec
    sbc laser_t
.ifdef BOSS_BEAM_CENTRE
    sbc #$01                            ; S4b.2 probe: MEASURED 1 colour clock right of the core
.endif
    sta boss_laser_edge,x
    rts

; From the kill path (boss_module_scored): the destroyed module's laser, if it
; has one, goes off on the kill frame. Touches A, X, Y.
laser_killed:
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
.ifdef BOSS_BEAM_ROOT
    jsr root_free
.endif
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
; PRIOR's fifth-player bit off, once.
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
    sta PRIOR
.ifdef BOSS_BEAM_ROOT
    jsr root_restore
.endif
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
    cmp #BAND_BOTTOM_Y
    bcs @next
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

; The band DLI's phase 0 (A only): each laser's HPOS for the frame starting -
; its edge less the band position this frame shows, off screen outside the
; window - and SIZEM; the hit test reads boss_laser_hpos.
.ifdef BOSS_BEAM_ROOT
; The root of player 1 + index: its HPOS from its laser's edge exactly as
; LASER_PUBLISH computes the missile's (A only).
.macro ROOT_PUBLISH index
    .local off, on
    lda root_edge+index
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
    sta HPOSP1+index
.endmacro
.endif

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
    sta HPOSM0+index
    sta boss_laser_hpos+index
.endmacro
laser_publish:
    LASER_PUBLISH 0
    LASER_PUBLISH 1
    LASER_PUBLISH 2
    LASER_PUBLISH 3
    lda boss_laser_sizem
    sta SIZEM
.ifdef BOSS_BEAM_ROOT
    lda boss_laser_done
    bne :+
    ROOT_PUBLISH 0
    ROOT_PUBLISH 1
    lda #$03                            ; quad: one bit, four colour clocks, as the missile
    sta SIZEP1
    sta SIZEP2
:
.endif
    rts

laser_bits:
    .byte $02, $08, $20, $80            ; each missile's left bit
laser_pair_one:
    .byte $01, $04, $10, $40            ; SIZEM: double
laser_pair_three:
    .byte $03, $0C, $30, $C0            ; SIZEM: quad

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
boss_hostile_lo:    .res INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT ; each boss shot's band cell, last frame
boss_hostile_hi:    .res INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT
boss_hostile_code:  .res 1
boss_hostile_pos:   .res 1      ; the band position last frame (the shots ride its drift)
boss_fire_y:        .res 1      ; boss_fire: the firing gun's muzzle line
laser_m:            .res 1
laser_i:            .res 1
laser_t:            .res 1
laser_b:            .res 1
laser_x:            .res 1
laser_d:            .res 1
laser_n:            .res 1
laser_rr:           .res 1      ; S4b.1: the waiting order's cursor
boss_laser_ready:   .res LASERS ; S4b.1: reloaded, waiting for a place (D3)
boss_laser_phase:   .res LASERS ; S4b.1: the heat's frame in 4, from the warning's start
.ifdef BOSS_BEAM_ROOT
laser_root:         .res LASERS ; S4b.2 probe: its root player, 1 / 2, 0 none
root_full:          .res LASERS ; the beam's column written
root_top:           .res LASERS ; the root's first line
root_owner:         .res 2      ; each player's laser, $FF free
root_dirty:         .res 2      ; its old column's next line to clear, 0 clean
root_edge:          .res 2      ; its laser's edge, for the DLI
root_t:             .res 1
root_x:             .res 1
.endif
boss_laser_reload_lo: .res LASERS
boss_laser_reload_hi: .res LASERS
boss_shots_admit_left: .res 1   ; AUD-04: meetings left this frame


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
    ; 1. The divider row is a starfield row drawn under the band's CHBASE:
    ;    the gameplay charset's codes 0-6 into the region's charset.
    ldx #(BOSS_DIVIDER_CODES * 8 - 1)
@divider:
    lda CHARSET,x
    sta BOSS_CHARSET,x
    dex
    bpl @divider
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
    lda #$00
    jsr set_gameplay_row_ptr
    jsr generate_starfield_row
    jsr weapon_pickup_clear_sector
    jsr draw_player
    ; 6. The band's display list over list A, which both list pointers name
    ;    from now on (the world never rotates in a boss sector).
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
    cpy #(BOSS_BAND_ROWS - 1)
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
    cpy #BOSS_BAND_ROWS
    bne @band
    ldy #RING_FIRST_VISIBLE
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
    jsr boss_prepare
    jsr laser_prepare                   ; the lasers' missiles, PRIOR $10
    ; 8. The band at its start position, still.
    lda #$01
    sta boss_dir
    sta boss_step_timer
    lda #$00
    sta boss_shake_timer
    lda BOSS_T_START
    sta boss_pos
    sta boss_dli_pos
    lda #$FF
    sta boss_shown_lms
    jsr boss_apply_pos
    ; 9. A level that authors an escort arms its row-0 wave now that the
    ;    boss is in (decision 5a: one Light at most; the world never moves
    ;    again, so no later row can arm).
    ldx DIRECTOR_STATE_SECTOR
    lda _sector_wave_count,x
    beq @no_escort
    jsr _director_c_try_event
@no_escort:
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
