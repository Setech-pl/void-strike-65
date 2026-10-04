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
;   UPDATE             boss_update      PairShots against the band, the C tick
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

; boss_draw_module's three ways to fill a module's cells (bits 7 and 6, read
; by BIT): copy a look from the look tail, fill one code, add to each code.
BOSS_MODE_COPY  = $00
BOSS_MODE_FILL  = $40
BOSS_MODE_ADD   = $80

; The head's run table (boss-runs.inc): the install, slot C, then per region
; its band A, band B and charset runs, 5 bytes a run.
BOSS_RUN_INSTALL = 0
BOSS_RUN_SLOT_C  = 5
BOSS_RUN_REGIONS = 10
BOSS_REGION_RUNS = 3

.assert BOSS_BAND_ROWS = 8, error, "the band is 8 rows (owner answer Q2)"
.assert hull_scroll_rates = world_scroll_rates + 3, error, "the two scroll-rate tables are no longer one 6-B run"
.assert (BOSS_CHARSET & $03FF) = 0, error, "an ANTIC 4 charset starts on a 1 KB boundary"

.export boss_head, boss_vector_image, boss_dli, boss_update, boss_motion
.export boss_completion, boss_install, boss_shown_pos, boss_dli_pos, boss_pos
.export boss_rts, boss_runs, boss_draw_module, boss_apply_pos, boss_module_scored
.export boss_column_map, boss_column_at, boss_rebuild_module, boss_prepare
.export boss_ring, boss_mx, boss_mxe, boss_look_operand, boss_shake_timer
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
    lda gameplay_dli_phase
    bne @below_hud
    inc PHYSICAL_PAL_FRAME_ID
    sta WSYNC
    lda #>BOSS_CHARSET
    sta CHBASE
    lda BOSS_T_PALETTE
    sta COLPF0
    lda BOSS_T_PALETTE+1
    sta COLPF1
    lda BOSS_T_PALETTE+2
    sta COLPF2
    lda BOSS_T_PALETTE+3
    sta COLPF3
    inc gameplay_dli_phase
    pla
    rti
@below_hud:
    lsr                                 ; phase 1 -> C=1; phase 2 -> C=0
    bcc @hud
    sta WSYNC
    lda #>CHARSET
    sta CHBASE
    lda #GAMEPLAY_COLPF0
    sta COLPF0
    lda gameplay_dli_allied_colpf1_load+1   ; the level's allied steel
    sta COLPF1
    lda #GAMEPLAY_COLPF2
    sta COLPF2
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
; shot that reached the band's bottom edge meets the column map - per column
; the front intact module, else hull or open sky (§5.13.2 item 3). Open sky
; lets it fly on, hidden behind the band; hull absorbs it (no damage, not a
; hit, Q-B7); a module column goes to the controller, which decides whether
; the module is exposed (damage) or covered (absorbed, Q-B7). Then the
; controller's tick, and the chain's blast when it asks for one.
; ===========================================================================
boss_update:
    ldx #(PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT - 1)
@shot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @next
    lda FIGHTER_PROJECTILE_Y,x
    cmp #BAND_BOTTOM_Y
    bcs @next
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc #BAND_ORIGIN_HPOS
    clc
    adc boss_shown_pos
    lsr
    lsr
    tay
    lda boss_column_map,y
    cmp #BOSS_COLUMN_OPEN
    beq @next
    sta _boss_hit_module
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    lda _boss_hit_module
    cmp #BOSS_COLUMN_ARMOUR
    beq @next
    sty _boss_hit_cell
    stx boss_slot_save
    jsr _boss_c_hit
    cmp #$00                            ; cc65 returns in A; the flags are X's
    beq @absorbed
    jsr boss_after_hit
@absorbed:
    ldx boss_slot_save
@next:
    dex
    bpl @shot
    jsr _boss_c_tick
    lda _boss_blast
    bmi @done
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
@done:
    rts

; A module took damage: the accuracy stat, then what the controller asked
; for - a damage stage (+K to every cell, §5.13.2 item 4), or the kill.
boss_after_hit:
    inc STATS_HITS
    bne :+
    inc STATS_HITS+1
:
    ldx _boss_stage_module
    bmi boss_after_stage
    lda _boss_stage_add
    sta boss_add
    lda #BOSS_MODE_ADD
    sta boss_mode
    txa
    jsr boss_draw_module
boss_after_stage:
    ldx _boss_score_module
    bmi boss_after_done
    ; The module's score, packed BCD (light_add_score's path), then the kill
    ; stat and the HUD through the reader's kill vector, and the kill sound.
    ; (The harness counts kills at this label, as it does at the score routines.)
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
    ; Gone: the kind's bay glyph over the module, and its columns rebuilt -
    ; a shot there now meets the module behind it, or the hull.
    ldx _boss_score_module
    ldy _boss_kind,x
    lda BOSS_T_BAY,y
    sta boss_fill
    lda #BOSS_MODE_FILL
    sta boss_mode
    txa
    jsr boss_draw_module
    ldx _boss_score_module
    jsr boss_rebuild_module
    ; Every module the kill exposed shows its open look (the S3 core's
    ; shutters opening), lowest index first.
    lda _boss_newly_lo
    sta boss_bits_lo
    lda _boss_newly_hi
    sta boss_bits_hi
    ldx #$00
@open:
    lda boss_bits_lo
    ora boss_bits_hi
    beq boss_after_done
    lsr boss_bits_hi
    lda boss_bits_lo
    ror
    sta boss_bits_lo
    bcc @next_open
    lda BOSS_T_OPEN,x
    cmp #BOSS_NO_LOOK
    beq @next_open
    sta boss_look
    lda #BOSS_MODE_COPY
    sta boss_mode
    stx boss_open_x
    txa
    jsr boss_draw_module
    ldx boss_open_x
@next_open:
    inx
    bne @open
boss_after_done:
    rts

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
boss_draw_module:
    tax
    jsr boss_record_of
    lda BOSS_T_MODULES + BOSS_M_ROW,y
    sta boss_row
    lda BOSS_T_MODULES + BOSS_M_HEIGHT,y
    sta boss_rows_left
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
    lda (dst_ptr),y
    clc
    adc boss_add
    jmp @store
@fill:
    lda boss_fill
@store:
    sta (dst_ptr),y
    iny
    cpy boss_width
    bne @cell
    inc boss_row
    dec boss_rows_left
    bne @row
    rts

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

; X = column; keeps X.
boss_column_at:
    ldy #$00
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
    rts
@base:
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
    rts

; X = a destroyed module: its columns again.
boss_rebuild_module:
    lda boss_mxe,x
    sta boss_col_end
    lda boss_mx,x
    tax
:
    jsr boss_column_at
    inx
    cpx boss_col_end
    bne :-
    rts

; Once, from the install, after the controller's init (its hit points are the
; map's alive test, §5.13.5): the look copy's operand, every module's column
; span, a capped emitter's plate (an emitter slot the tier did not enable is
; armour now, decision B), then the whole map.
boss_prepare:
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
    ldx #(BOSS_BAND_COLUMNS - 1)
:
    jsr boss_column_at
    dex
    bpl :-
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
; The scratch page ($1800-$18FF, Q-B5): never read from disk; the install
; sets what must not start undefined.
; ---------------------------------------------------------------------------
.segment "BOSS_SCRATCH"
boss_column_map:    .res BOSS_BAND_COLUMNS  ; per band column: module, ARMOUR or OPEN
boss_ring:          .res 32                 ; S4a-ii's cell-flash ring (8 x 4 B)
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
    jsr _boss_c_init
    jsr boss_prepare
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
    lda #$68
    sta AUDF3
    lda #$22
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
