; ===========================================================================
; The VOID LANCE's execution (M6, docs/plans/m6-void-lance.md; owner
; decisions BD 1-6, 2026-10-20; the owner's smokes of 2026-10-20, journal
; §BE-§BI: the lance never changes the ordinary fire, the charge is FIRE +
; stick UP whatever is under the ship, the lance charges with time, the
; player is told it is ready, the charge and the shot are seen and heard).
; Included by boss.s: the boss link's lance run - this and
; src/c/lance.c's policy - read at every boss entry after slot E into the
; window's unclaimed tail, allocated from $BBFF down (scripts/build.mjs fails
; the build when the window's record reaches it). Reached only through the
; boss vector image's TICK_FLASHES entry: the boss sector only, every frame,
; before read_input and UPDATE.
;
;   the meter    src/c/lance.c's lance_c_fill, every boss frame with no
;                torpedo (decision BG 1; through the explosion's frames
;                torpedo_blast's own inc): a lance is ready when it is full -
;                one, no stacking - and only a kill empties it (journal §BL 5).
;                Its HUD cells (journal §BL 3): page 4's lance_hud_meter on
;                the filling frames - the glyphs on the fight's first frame,
;                the four cells by the meter's quarters, written only when the
;                count changes; a ready lance's four stay full.
;   readiness    the indicator (decision BG 4; C, the owner's choice of
;                journal §BI 3) is on while a lance is ready, the ship alive
;                (PLAYER_LIFECYCLE 0) and the fight on (boss_phase 0), off
;                otherwise - lance_ready ($FF / 0) holds what it shows, and
;                only a change acts: the ship's colour, COLPM0
;                LANCE_READY_COLOUR while on, the hull's white back when off
;                (START GAME's boss restore puts the white back should a game
;                leave while it is on). Written on the change and again on
;                every ready frame with no torpedo: the resident booster code
;                writes the white at a pickup or a release and a Shield pulses
;                COLPM0 - the green comes back the frame after. While the
;                charge builds that frame's colour is lance_ramp's (journal
;                §BI 2). On every change to on, the readiness cue on channel 3,
;                given back to the engine bed by boss_frame_timers.
;   the reticle  one 8 x 8 mark on P1 in the lasers' colour (decision BD 1;
;                COLPM1 is never written here), on one line a fight, right
;                under the band's last shown row, drawn at every readiness
;                (P1 single width; P2 too, the torpedo's): over a target the
;                crosshair at the module's centre, following the band's
;                drift; over none the hollow mark at the ship's column. A
;                change of mark rewrites the four rows they differ in. Dark on
;                two frames of four while charging.
;   the target   the column map's front module under the ship's centre with
;                its exposed bit (slot D's laser_exposed): what a player shot
;                there would hurt (src/c/lance.c refuses the core, the defeat
;                and the chain). It decides the mark and, on the fire frame,
;                the torpedo's lock - never the charge.
;   the gesture  FIRE held with the stick held up (decision BF), level-
;                triggered, whatever is under the ship (§BH 1). The ordinary
;                fire is never touched. The axis rule (journal §BL 4): on the
;                charge's slow frames read_input reads its stick from the
;                lance's own byte, PORTA with UP released - the advance at
;                1 / LANCE_CHARGE_UP_DIVISOR, the horizontal at full speed; the
;                operand goes back to PORTA on the next full frame, and at
;                START GAME with the other boss patches (build/boss-restore.inc).
;   the torpedo  (journal §BL 5, the owner's answer of 2026-10-21) from the
;                frame after the charge completes: the hull in P1, the exhaust
;                in P2 right below it, both in the lasers' colour, both homing
;                (HPOSP1 / HPOSP2 written only in flight) on the module locked
;                on the fire frame - its current centre as the band drifts -
;                or, with none locked, at the ship's column; TORPEDO_STEP
;                lines a frame up from above the ship. The reticle's rows stay
;                (at the torpedo's HPOS, the lock's point) until the hull flies
;                through them or the kill clears them. On the frame it reaches
;                its line - the locked module's bottom line, or the band's foot
;                - its rows are cleared and, the module standing, the kill goes
;                through boss_hit (the shot's own path) in this tick, before
;                UPDATE, as the frame's only meeting (laser_frame's admit
;                operand patched to 0; a shot that would meet the boss waits a
;                frame, as AUD-04 holds any); the lance is spent, the meter
;                emptied, the explosion (page 4, P2) follows for
;                TORPEDO_BLAST_FRAMES frames at the impact, then P2 is
;                released. With no target, or the locked module destroyed on
;                the way, nothing is hit: the lance is kept and the reticle's
;                rows come back. The fire frame sounds the discharge on
;                channel 3 (journal §BI 2), held until the torpedo's end (not
;                through boss_tick_timer: a running timer costs every
;                boss_frame_timers call); a kill's tick takes the channel.
;   page 4       slot H, the lance's second run ($0400-$04FF): the HUD meter,
;                the reticle's rows, the explosion and the shapes.
; ===========================================================================
LANCE_ROWS      = 8
LANCE_HPOSP1    = $D001
LANCE_HPOSP2    = $D002
LANCE_SIZEP1    = $D009
LANCE_SIZEP2    = $D00A
LANCE_TRIG0     = $D010
LANCE_STICK0    = $D300                 ; PORTA: bit 0 up, active low
LANCE_STICK_UP  = $01
LANCE_P1        = $3D00                 ; src/main.s: PLAYER1 = PMG_BASE + $0500
LANCE_P2        = $3E00                 ; src/main.s: PLAYER2 = PMG_BASE + $0600
LANCE_COLPM0    = $D012
LANCE_HULL_COLOUR = $0E                 ; src/main.s PLAYER_NORMAL_HULL_COLOR
; Decision BG 4 (C): green, hue $C - two PAL hue steps (48 degrees) from the
; nearest colour of the boss sector (hue $A, the player's shots; hue $E, the
; Citadel's and the Bastion's bands) and four from the ally steel's hue $8.
LANCE_READY_COLOUR = $CA
LANCE_CUE_AUDF  = $0C                   ; above every laser warning's pitch ($18 + timer)
LANCE_CUE_AUDC  = $A8                   ; pure tone, volume 8
LANCE_CUE_FRAMES = 16
LANCE_SHOT_AUDF = $10                   ; the discharge (journal §BI 2): poly17 noise, volume 10 -
LANCE_SHOT_AUDC = $8A                   ; no other boss sound is noise (the tick's and the cue's
                                        ; tones, the hull's poly4 clank)
; LANCE_CHARGE_UP_DIVISOR (journal §BL 4, the axis rule): scripts/lance-layout.mjs,
; beside the charge's length (-D from scripts/build.mjs). A power of two: the
; slow frames are the charge's frames not a multiple of it; on them the advance
; (UP) is released, the horizontal is the stick's.
.assert LANCE_CHARGE_UP_DIVISOR > 0 && (LANCE_CHARGE_UP_DIVISOR & (LANCE_CHARGE_UP_DIVISOR - 1)) = 0, error, "LANCE_CHARGE_UP_DIVISOR: a power of two"
.assert <LANCE_STICK0 = 0, error, "the moving frame's operand keeps A = 0 for PORTA's low byte"

; ---------------------------------------------------------------------------
; The torpedo's looks (journal §BL 7, the owner's choice pending): the flight
; (TORPEDO_FLIGHT a / b - scripts/build.mjs --torpedo) and the explosion
; (TORPEDO_BLAST a / b). The hull is P1's, the exhaust P2's right below it,
; the explosion P2's; all in the lasers' colour (COLPM1 / COLPM2, never
; written here).
; ---------------------------------------------------------------------------
; The exhaust's frames are windows into one table, TORPEDO_EXHAUST_SHIFT rows
; apart (a: its frames side by side; b: a strip the flame runs down). The
; flight (the owner's smoke of e76ddee): one line a frame in both looks - a
; typical shot (the ship low, a module of the band's lower half, ~110-150
; lines) takes 2.2-3 s, the torpedo seen all the way.
.if TORPEDO_FLIGHT = 1
TORPEDO_STEP    = 1                     ; a: a short hull, a 3-frame exhaust
TORPEDO_HULL    = 5
TORPEDO_EXHAUST = 4
TORPEDO_EXHAUST_FRAMES = 3
TORPEDO_EXHAUST_SHIFT = TORPEDO_EXHAUST
.else
TORPEDO_STEP    = 1                     ; b: a longer hull, a 4-frame exhaust, a longer tail
TORPEDO_HULL    = 6                     ; (6 + 5 rows: the Bastion's flight frame within its 20-cycle
TORPEDO_EXHAUST = 5                     ; headroom - 8 + 7 rows MEASURED 8,496 on the Citadel L5)
TORPEDO_EXHAUST_FRAMES = 4
TORPEDO_EXHAUST_SHIFT = 2
.endif
TORPEDO_ROWS    = TORPEDO_HULL + TORPEDO_EXHAUST
TORPEDO_BLAST_ROWS = 8
TORPEDO_BLAST_FRAMES = 5
TORPEDO_BLAST_INTO = 2                  ; the explosion's rows inside the module, the rest under it (the impact)
; A step up leaves min(step, height) rows of the last frame's hull (P1) and
; exhaust (P2) under the new ones: only those are cleared.
; From line head + max(height, step).
.if TORPEDO_STEP > TORPEDO_HULL
TORPEDO_P1_LEFT = TORPEDO_HULL
TORPEDO_P1_FROM = TORPEDO_STEP
.else
TORPEDO_P1_LEFT = TORPEDO_STEP
TORPEDO_P1_FROM = TORPEDO_HULL
.endif
.if TORPEDO_STEP > TORPEDO_EXHAUST
TORPEDO_P2_LEFT = TORPEDO_EXHAUST
TORPEDO_P2_FROM = TORPEDO_HULL + TORPEDO_STEP
.else
TORPEDO_P2_LEFT = TORPEDO_STEP
TORPEDO_P2_FROM = TORPEDO_HULL + TORPEDO_EXHAUST
.endif

; The VOID LANCE's HUD meter (journal §BL 3): cells HUD_LANCE_METER_OFFSET +
; 0-3, two HUD codes the run writes at the fight's first frame.
; The ordinary fire after the launch (journal §BL, the owner's decision of
; 2026-10-21): off for LANCE_FIRE_HOLD_FRAMES frames (1 s), then on again while
; the torpedo still flies.
LANCE_FIRE_HOLD_FRAMES = 50
LANCE_METER_FULL   = 59
LANCE_METER_HOLLOW = 60
LANCE_HUD_CHARSET  = $5000              ; src/main.s HUD_CHARSET
LANCE_METER_SCREEN = SCREEN + HUD_LANCE_METER_OFFSET

.import _lance_c_fill, _lance_c_aim, _lance_c_arrive, _lance_trig, _lance_charge, _lance_meter_lo, _lance_meter_hi, _boss_phase
.export lance_tick, lance_shape, lance_y, lance_beam, lance_head, lance_top, _lance_module, lance_cell, lance_ready
.export lance_meter_shown, lance_stick, LANCE_METER_HOLLOW, LANCE_METER_FULL

; The lance's state (the owner's smoke of e76ddee: in the zero page's
; unclaimed tail, $B6 on - MEASURED written only by the OS's RAM clear at boot
; - so every access is a byte shorter); boss_install clears it at every entry,
; so a fight starts with no torpedo, no reticle and the meter's HUD cells not
; drawn. (src/c/lance.c's own - the meter, the charge - stays in LANCE_BSS,
; read as zeros with the run.)
.segment "LANCE_ZP": zeropage
lance_zp:
lance_beam:     .res 1                  ; 0 none, 1 the torpedo in flight, 2 its explosion
lance_head:     .res 1                  ; the torpedo's top line
lance_top:      .res 1                  ; its line: the module's bottom one, or the band's foot
lance_y:        .res 1                  ; the reticle's first line, 0 not drawn yet
_lance_module:  .res 1                  ; the target's module and band column; the torpedo's locked one
lance_cell:     .res 1
lance_ready:    .res 1                  ; what the indicator shows: $FF a lance ready, 0 not
lance_hollow:   .res 1                  ; the mark drawn: 0 the crosshair (lance_reticle's), $FF the hollow one
lance_stick:    .res 1                  ; a slow frame's stick: PORTA with UP released (the axis rule)
lance_meter_shown: .res 1               ; 1 + the HUD meter's full cells; 0 the glyphs not written yet, $FF the cells
torpedo_x:      .res 1                  ; its HPOS (a miss: the ship's column at the fire)
torpedo_count:  .res 1                  ; the explosion's frames left; the exhaust's row count; the meter's quarters
lance_fire_hold: .res 1                 ; the ordinary fire's frames off after the launch (journal §BL)
lance_zp_end:

.segment "LANCE_CODE"

lance_tick:
    ; The ordinary fire's hold after a launch: read_input's gate shut on every
    ; held frame (it opens on a FIRE release only), and open on the hold's
    ; last frame - a held FIRE fires again from there.
    ldx lance_fire_hold
    beq @fire
    dex
    stx lance_fire_hold
    ldy #$00
    txa
    bne :+
    iny
:   sty gameplay_fire_gate
@fire:
    lda lance_beam
    beq lance_meter
    jmp lance_torpedo

lance_meter:
    ; The meter, and what the indicator shows: ready, the ship alive, the fight on.
    jsr _lance_c_fill                   ; A: 1 ready, 0 not yet; X = 0
    beq @shown
    lda PLAYER_LIFECYCLE
    ora _boss_phase
    bne @not
    dex                                 ; $FF: on
@not:
    txa
@shown:
    cmp lance_ready
    bne @change
    tay                                 ; A = lance_ready
    bne lance_aim                       ; ready: the aim
    jmp lance_hud_meter                 ; the meter filling: its HUD cells only
@rts:
    rts
@change:
    sta lance_ready
    jsr lance_indicate
    lda lance_ready
    bne @rts                            ; on: the indicator's frame only - the aim from the next
    ; Off (the ship dying, the fight over), once: no mark, no charge, the
    ; stick PORTA's (a slow frame's operand put back).
    sta _lance_charge                   ; A = 0
    sta LANCE_HPOSP1
    sta read_input_stick_operand        ; PORTA's low byte
    ldy #>LANCE_STICK0
    sty read_input_stick_operand + 1
    rts

; A lance ready: the target, the mark, the gesture (journal §BH: whatever is
; under the ship).
lance_aim:
    ; The band column under the ship's centre (player_x + 8), as
    ; boss_shot_meet finds a shot's: (x - BAND_ORIGIN_HPOS + p) / 4.
    lda player_x
    clc
    adc boss_shown_pos                  ; x + p < 256: C=0
    adc #<(8 - BAND_ORIGIN_HPOS)
    lsr
    lsr
    sta lance_cell
    tay
    lda boss_column_map,y               ; the front module (armour, open, a field: >= BOSS_MAX_MODULES)
    tax
    tay
    jsr laser_exposed_module            ; A: its exposed bit, X kept (past the table for the
    bne @aim                            ; others: src/c/lance.c refuses them)
    ldx #$FF                            ; covered: no target
@aim:
    stx _lance_module                   ; the target (src/c/lance.c); the torpedo's once fired
    lda LANCE_STICK0                    ; the gesture: FIRE and the stick up, both held (0)
    and #LANCE_STICK_UP
    ora LANCE_TRIG0
    sta _lance_trig
    jsr _lance_c_aim                    ; A: bit 0 lit, bit 1 a target, bit 2 FIRE; X = 0 (cc65's high byte)
    pha
    ; The ship's colour, again every ready frame (a booster's pickup or
    ; release writes the hull's white, src/main.s; a Shield pulses it): the
    ; ready green, or the charge's ramp (journal §BI 2) - lance_ramp by
    ; (lance_charge + 7) / 8, so the first charge frame already shows it and
    ; a release or the fire frame (lance_charge 0) is the green again.
    lda _lance_charge
    clc
    adc #$07
    lsr
    lsr
    lsr
    tay
    lda lance_ramp,y
    sta LANCE_COLPM0
    ; The axis rule (journal §BL 4): on the charge's slow frames read_input
    ; reads PORTA with UP released - the advance at 1 / divisor, the
    ; horizontal at full speed - until the charge is released or the lance
    ; fires (lance_charge 0: PORTA again).
    lda _lance_charge
    and #(LANCE_CHARGE_UP_DIVISOR - 1)
    beq @full                           ; A = 0: PORTA's low byte
    lda LANCE_STICK0
    ora #LANCE_STICK_UP
    sta lance_stick
    lda #<lance_stick
    ldy #>lance_stick                   ; 0: the zero page
    beq @stick                          ; always
.assert >lance_stick = 0, error, "lance_stick: the zero page's (the branch above)"
@full:
    ldy #>LANCE_STICK0
@stick:
    sta read_input_stick_operand
    sty read_input_stick_operand + 1
    pla
    lsr                                 ; C: lit
    bcs @show
    lsr                                 ; C: a target; A: FIRE
    beq @dark                           ; the blink's dark frame
    ; The discharge (journal §BI 2), until the torpedo's end (no timer: see
    ; the header); C kept.
    ldx #LANCE_SHOT_AUDF
    ldy #LANCE_SHOT_AUDC
    jsr lance_sound
    ; FIRE: the torpedo from the next frame (the fire frame draws none of it),
    ; locked on the target's module - the one under the reticle, up to its
    ; bottom line - or with none at the ship's column up to the band's foot,
    ; the line over the mark. The lance is spent only by a kill (journal
    ; §BL 5). The reticle is off for the whole flight (the owner's smoke of
    ; e76ddee): its rows cleared here - the six either mark draws (rows 2 and
    ; 5 are empty in both) - and the ordinary fire held (lance_fire_hold).
    ldy lance_y
    dey
    tya
    bcc @miss
    ldy _lance_module
    lda boss_mbottom_y,y
    bcs @top                            ; always
@miss:
    ldy #$FF
    sty _lance_module                   ; nothing locked (the core, a cover: refused)
    ldy player_x                        ; the ship's centre (x + 8), less 4
    iny
    iny
    iny
    iny
    sty torpedo_x
@top:
    sta lance_top
    lda player_y                        ; the torpedo's rows above the ship's
    sec
    sbc #TORPEDO_ROWS
    sta lance_head
    lda #LANCE_FIRE_HOLD_FRAMES
    sta lance_fire_hold
    ldy lance_y
    lda #$00
    sta LANCE_P1,y
    sta LANCE_P1 + 1,y
    sta LANCE_P1 + 3,y
    sta LANCE_P1 + 4,y
    sta LANCE_P1 + 6,y
    sta LANCE_P1 + 7,y
    tax                                 ; X = 0 (the discharge's X)
    inc lance_beam                      ; 1: the torpedo
@dark:
    stx LANCE_HPOSP1                    ; X = 0
@rts:
    rts
@show:
    ; The mark (journal §BH 2): the crosshair over a target, the hollow mark
    ; over none - a change rewrites the four rows they differ in.
    lsr                                 ; C: a target
    lda #$00
    sbc #$00                            ; 0 the crosshair, $FF the hollow mark
    cmp lance_hollow
    beq @mark
    sta lance_hollow
    ldy lance_y
    tax
    and #$18                            ; rows 0 and 7: $18 / $00
    eor #$18
    sta LANCE_P1,y
    sta LANCE_P1 + 7,y
    txa
    and #$81                            ; rows 3 and 4: $C3 / $42
    eor #$C3
    sta LANCE_P1 + 3,y
    sta LANCE_P1 + 4,y
    txa
@mark:
    tay
    bne @hollow
    ldx _lance_module
    jsr lance_centre
    sta LANCE_HPOSP1
    rts
@hollow:
    lda player_x                        ; the ship's centre (x + 8), less 4
    clc
    adc #$04
    sta LANCE_HPOSP1
    rts

; The torpedo's frames. A = lance_beam: 1 the torpedo in flight (the lance
; still ready: only a kill spends it), 2 its explosion (the meter filling on
; from the kill: torpedo_blast).
lance_torpedo:
    lsr                                 ; C: the flight (1), clear: the explosion (2)
    bcs torpedo_flight
    jmp torpedo_blast                   ; slot H
torpedo_flight:
    ; TORPEDO_STEP lines up; arrived when it reaches its line (that frame
    ; places nothing: its rows are cleared).
    lda lance_head
    sec
    sbc #TORPEDO_STEP
    bcc torpedo_arrive
    cmp lance_top
    bcc torpedo_arrive
    beq torpedo_arrive
    sta lance_head
    sta @hull + 1
    ; Homing: the locked module's current centre (the band drifts), as the
    ; reticle's - destroyed on the way too (the ordinary fire is back a
    ; second after the launch): the torpedo flies on to its line and hits
    ; nothing (journal §BL 5, §BH: the lance kept). (Retargeting the lock to
    ; the column's next module did not fit the lance run: the owner's
    ; fallback, plan m6-gauges §9.)
    ldx _lance_module
    cpx #BOSS_MAX_MODULES
    bcs @placed                         ; a miss: the ship's column, kept since the fire frame
    jsr lance_centre
    sta torpedo_x
@placed:
    lda torpedo_x
    sta LANCE_HPOSP1
    sta LANCE_HPOSP2
    ; The hull's rows (P1) - each loop's line patched into its store, the
    ; rows indexed by X - then the last frame's hull rows under them.
    ldx #(TORPEDO_HULL - 1)
:   lda torpedo_hull,x
@hull:
    sta LANCE_P1,x
    dex
    bpl :-
    lda lance_head
    clc
    adc #TORPEDO_P1_FROM
    ldx #(TORPEDO_P1_LEFT - 1)
    jsr torpedo_clear_p1
    ; The exhaust's next window (P2) under the hull - the window kept in its
    ; load's patched low byte - then the last frame's exhaust rows under it.
    lda @window + 1
    clc
    adc #TORPEDO_EXHAUST_SHIFT
    cmp #<(torpedo_exhaust + TORPEDO_EXHAUST_SHIFT * TORPEDO_EXHAUST_FRAMES)
    bcc :+
    lda #<torpedo_exhaust
:   sta @window + 1
    lda lance_head
    clc
    adc #TORPEDO_HULL
    sta @exhaust + 1
    ldx #(TORPEDO_EXHAUST - 1)
@window:
    lda torpedo_exhaust,x
@exhaust:
    sta LANCE_P2,x
    dex
    bpl @window
    lda lance_head
    clc
    adc #TORPEDO_P2_FROM
    ldx #(TORPEDO_P2_LEFT - 1)
    ; (falls into torpedo_clear_p2)

; A = a line, X = a row count less one: P2's (P1's) rows from the line
; cleared, the line patched into the store. A = 0 after; X = 0 (P2), $FF (P1).
torpedo_clear_p2:
    sta @row + 1
    lda #$00
@row:
    sta LANCE_P2,x
    dex
    bpl @row
    inx
    rts
torpedo_clear_p1:
    sta @row + 1
    lda #$00
@row:
    sta LANCE_P1,x
    dex
    bpl @row
    rts

; The torpedo reached its line: its rows cleared (the hull's, the
; exhaust's); the kill when its locked module stands (the frame's only
; meeting), the explosion from the next frame; else nothing hit, the lance
; kept, the reticle's rows back (its HPOS: the aim's, from the next frame).
torpedo_arrive:
    lda lance_head
    ldx #(TORPEDO_HULL - 1)
    jsr torpedo_clear_p1
    lda lance_head
    clc
    adc #TORPEDO_HULL
    ldx #(TORPEDO_EXHAUST - 1)
    jsr torpedo_clear_p2                ; X = 0
    ldy _lance_module
    cpy #BOSS_MAX_MODULES
    bcs @missed
    lda lance_cell                      ; the shot's mailboxes, boss_hit's inputs
    sta _boss_hit_cell
    sty _boss_hit_module
    jsr _lance_c_arrive                 ; A: 1 the kill (its HP 1, the meter emptied); X = 0
    tay
    beq @missed
    stx laser_admit_operand             ; the kill is the frame's only meeting: the shots wait a frame
    stx lance_ready                     ; the lance spent: the reticle's rows cleared
    lda lance_y
    ldx #(LANCE_ROWS - 1)
    jsr torpedo_clear_p1                ; A = 0
    jsr lance_indicate
    lda #TORPEDO_BLAST_FRAMES + 1
    sta torpedo_count
    inc lance_beam                      ; 2: the explosion, from the next frame
    jmp boss_hit
@missed:
    stx lance_beam                      ; X = 0: no torpedo
    jsr lance_reticle                   ; still ready: the reticle's rows (slot H)
    ldx #BOSS_BED_AUDF                  ; the discharge's channel back to the engine bed
    ldy #BOSS_BED_AUDC
    jmp lance_sound

; lance_ready changed: the indicator; on its way on, the reticle's rows and
; the cue.
lance_indicate:
    and #(LANCE_READY_COLOUR ^ LANCE_HULL_COLOUR)  ; A = lance_ready: $FF on, 0 off
    eor #LANCE_HULL_COLOUR
    sta LANCE_COLPM0
    lda lance_ready
    beq @rts
    ; On: the reticle's rows (HPOS 0 until the aim places it) at the line
    ; under the band's last shown row (the install's boss_band_measure) -
    ; at every readiness: the torpedo's flight took P1.
    lda lance_y
    bne @draw
    lda boss_capsule_y_operand
    sta lance_y
@draw:
    lda #$00
    sta LANCE_SIZEP1                    ; the reticle's and the torpedo's planes single width
    sta LANCE_SIZEP2                    ; (gameplay's players are double, src/main.s)
    jsr lance_reticle
    ldx #LANCE_CUE_AUDF
    ldy #LANCE_CUE_AUDC
    jsr lance_sound
    lda #LANCE_CUE_FRAMES               ; boss_frame_timers gives the bed back after it
    sta boss_tick_timer                 ; (and with the sound off writes nothing)
@rts:
    rts

; X = a module -> A = its centre's HPOS as the band shows it now:
; (mx + mxe) * 2 clocks, less 4 (the 8-clock mark's half).
lance_centre:
    lda boss_mx,x
    clc
    adc boss_mxe,x
    asl                                 ; mx + mxe < 128: C=0
    adc #(BAND_ORIGIN_HPOS - 4)
    sec
    sbc boss_shown_pos
    rts

; X = a band row, boss_column a column -> dst_ptr = that cell. Keeps X.
; (Slot A's - boss_hit, the heat, the flash - here since the owner's smoke of
; e76ddee: slot A's bytes went to boss_dli's HUD phase; the lance run is
; resident through the boss sector.)
boss_cell_at:
    lda boss_band_lo,x
    ora boss_column                     ; each row is 64 B on a 64-B boundary
    sta dst_ptr
    lda boss_band_hi,x
    sta dst_ptr+1
    rts

; X = AUDF3, Y = AUDC3, written when the sound is on.
lance_sound:
    lda sound_enabled
    beq :+
    stx AUDF3
    sty AUDC3
:
    rts

lance_shape:    .byte $18, $18, $00, $C3, $C3, $00, $18, $18
; (The hollow mark is the crosshair with rows 0 and 7 cleared and 3, 4 at
; $42: rows 2 and 5 are empty in both - the fire frame clears the other six.)
; The charge's ramp (journal §BI 2), by (lance_charge + 7) / 8: 0 not
; charging - the ready green; then the green's luminance from the steel's
; (4, frames 1-16) to near-white ($CE, frames 65-74), quickening at the end.
lance_ramp:     .byte LANCE_READY_COLOUR, $C4, $C4, $C6, $C6, $C8, $C8, $CA, $CC, $CE, $CE
.assert (LANCE_CHARGE_FRAMES - 1 + 7) / 8 < 11, error, "lance_ramp: an entry for every charge frame"
; ---------------------------------------------------------------------------
; Slot H (journal §BL, the owner's answer of 2026-10-21): the lance's second
; run, page 4 ($0400-$04FF, the OS's cassette buffer - no path of the game
; uses it), read from disk at every boss entry after slot G and folded into
; the head's check with it: the HUD meter, the explosion and the torpedo's
; shapes - the lance run (slot G) holds six sectors.
; ---------------------------------------------------------------------------
.segment "LANCE_PAGE"

; The meter's HUD cells (journal §BL 3; filling frames only - a ready lance's
; four stay full): the fight's first frame writes the two glyphs into the HUD
; charset; a frame whose meter shows another quarter count (lance_quarter_*:
; the k-th at ceil(k * frames / 4), the 4th the full meter) writes the four
; cells - the second frame's too; nothing otherwise.
lance_hud_meter:
    lda lance_meter_shown
    bne @quarters
    ldx #15
:   lda lance_meter_glyphs,x
    sta LANCE_HUD_CHARSET + LANCE_METER_FULL * 8,x
    dex
    bpl :-
    stx lance_meter_shown               ; $FF: the cells from the next frame
    rts
@quarters:
    lda _boss_difficulty
    asl
    asl
    tax
    ldy #$01
@quarter:
    lda _lance_meter_lo
    cmp lance_quarter_lo,x
    lda _lance_meter_hi
    sbc lance_quarter_hi,x
    bcc @level
    inx
    iny
    cpy #5
    bne @quarter
@level:
    tya                                 ; 1 + the quarters reached ($FF: not drawn yet)
    cmp lance_meter_shown
    beq @rts
    sta lance_meter_shown
    dey
    sty torpedo_count                   ; the quarters (no torpedo while the meter fills)
    ldx #3
@cell:
    cpx torpedo_count                   ; C: at or past the quarters - hollow
    lda #LANCE_METER_FULL
    adc #$00
    sta LANCE_METER_SCREEN,x
    dex
    bpl @cell
@rts:
    rts

; The reticle's 8 rows at lance_y: the crosshair (the aim rewrites four of
; them for the hollow mark).
lance_reticle:
    lda lance_y
    sta @row + 1
    ldx #(LANCE_ROWS - 1)
:   lda lance_shape,x
@row:
    sta LANCE_P1,x
    dex
    bpl :-
    inx
    stx lance_hollow
    rts

; The meter's glyphs (codes 59 full, 60 hollow; the first row blank, as every
; HUD glyph's since journal §BL 1).
lance_meter_glyphs:
    .byte $00, $18, $3C, $7E, $7E, $3C, $18, $00
    .byte $00, $18, $24, $42, $42, $24, $18, $00
.assert LANCE_METER_HOLLOW = LANCE_METER_FULL + 1, error, "the meter's glyphs are one pair"
; The explosion: TORPEDO_BLAST_FRAMES frames at the impact - its first
; TORPEDO_BLAST_INTO rows the module's last lines (lance_top), the rest under
; it, where the band's playfield does not cover P2 - from the frame after the
; kill; then its rows cleared and P2 released (HPOSP2 0).
torpedo_blast:
    inc _lance_meter_lo                 ; the meter fills on from the kill (1 .. the explosion's frames: no full test)
    ldx #BOSS_SHOT_ADMIT                ; AUD-04's two meetings again (the kill's frame had none)
    stx laser_admit_operand
    lda lance_top
    sec
    sbc #(TORPEDO_BLAST_INTO - 1)
    tay                                 ; the explosion's first row
    dec torpedo_count
    beq @end
    lda torpedo_count                   ; TORPEDO_BLAST_FRAMES .. 1 (the table: the last frame first)
    asl
    asl
    asl
    tax
:   lda torpedo_blast_shapes - TORPEDO_BLAST_ROWS,x
    sta LANCE_P2,y
    iny
    inx
    txa
    and #(TORPEDO_BLAST_ROWS - 1)
    bne :-
    rts
@end:
    lda #$00
    sta lance_beam                      ; done
    sta LANCE_HPOSP2
    tya
    ldx #(TORPEDO_BLAST_ROWS - 1)
    jmp torpedo_clear_p2
.assert TORPEDO_BLAST_ROWS = 8, error, "the explosion's row loop ends on a multiple of 8"

; The meter's quarters per difficulty (EASY, MEDIUM, HARD): the k-th at
; ceil(k * frames / 4); the 4th is the full meter - a lance ready.
lance_quarter_lo:
    .repeat 4, K
        .byte <(((K + 1) * LANCE_METER_EASY + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte <(((K + 1) * LANCE_METER_FRAMES + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte <(((K + 1) * LANCE_METER_HARD + 3) / 4)
    .endrepeat
lance_quarter_hi:
    .repeat 4, K
        .byte >(((K + 1) * LANCE_METER_EASY + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte >(((K + 1) * LANCE_METER_FRAMES + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte >(((K + 1) * LANCE_METER_HARD + 3) / 4)
    .endrepeat

; The torpedo's shapes (the looks above).
.if TORPEDO_FLIGHT = 1
torpedo_hull:    .byte $18, $3C, $3C, $3C, $7E
torpedo_exhaust: .byte $3C, $18, $18, $00
                 .byte $18, $3C, $08, $10
                 .byte $3C, $24, $18, $08
.else
torpedo_hull:    .byte $18, $3C, $3C, $3C, $7E, $66
torpedo_exhaust: .byte $3C, $18, $3C, $18, $18, $08, $10, $08, $00, $10, $00   ; the strip
.endif
.assert * - torpedo_exhaust = TORPEDO_EXHAUST + TORPEDO_EXHAUST_SHIFT * (TORPEDO_EXHAUST_FRAMES - 1), error, "the exhaust's windows"
.assert >(* - 1) = >torpedo_exhaust && <torpedo_exhaust + TORPEDO_EXHAUST_SHIFT * TORPEDO_EXHAUST_FRAMES <= $FF, error, "the exhaust's windows: one page (the patched low byte)"
.if TORPEDO_BLAST = 1
torpedo_blast_shapes:                   ; a: an expanding ring (the last frame first)
    .byte $42, $81, $00, $00, $00, $00, $81, $42
    .byte $3C, $42, $81, $81, $81, $81, $42, $3C
    .byte $00, $3C, $42, $42, $42, $42, $3C, $00
    .byte $00, $00, $18, $24, $24, $18, $00, $00
    .byte $00, $00, $00, $18, $18, $00, $00, $00
.else
torpedo_blast_shapes:                   ; b: a burst of sparks (the last frame first)
    .byte $00, $81, $00, $00, $00, $00, $81, $00
    .byte $81, $00, $24, $00, $00, $24, $00, $81
    .byte $82, $44, $00, $28, $00, $44, $82, $00
    .byte $00, $44, $28, $10, $28, $44, $00, $00
    .byte $00, $00, $10, $38, $10, $00, $00, $00
.endif
.assert * - torpedo_blast_shapes = TORPEDO_BLAST_FRAMES * TORPEDO_BLAST_ROWS, error, "the explosion's frames"

