; ===========================================================================
; The VOID LANCE's execution (M6, docs/plans/m6-void-lance.md; owner
; decisions BD 1-6, 2026-10-20; the owner's smokes of 2026-10-20, journal
; §BE-§BH: the lance never changes the ordinary fire, the charge is FIRE +
; stick UP whatever is under the ship, the lance charges with time and the
; player is told it is ready). Included by boss.s: the boss link's lance run - this and
; src/c/lance.c's policy - read at every boss entry after slot E into the
; window's unclaimed tail, allocated from $BBFF down (scripts/build.mjs fails
; the build when the window's record reaches it). Reached only through the
; boss vector image's TICK_FLASHES entry: the boss sector only, every frame,
; before read_input and UPDATE.
;
;   the meter    src/c/lance.c's lance_c_fill, every boss frame with no beam
;                up (decision BG 1; through the beam's frames the tick's own
;                inc): a lance is ready when it is full - one, no stacking -
;                and the shot empties it.
;   readiness    the indicator (decision BG 4) is on while a lance is ready,
;                the ship alive (PLAYER_LIFECYCLE 0) and the fight on
;                (boss_phase 0), off otherwise - lance_ready ($FF / 0) holds
;                what it shows, and only a change acts: the build's variant
;                (--lance-indicator) -
;                  C  the ship's colour: COLPM0 LANCE_READY_COLOUR while on,
;                     the hull's white back when off (START GAME's boss
;                     restore puts the white back should a game leave while
;                     it is on). Written on the change and again on every
;                     ready frame with no beam up: the resident booster code
;                     writes the white at a pickup or a release and a Shield
;                     pulses COLPM0 ($84 / $0E) - the Shield's pulse shows
;                     while it lasts, the green comes back the frame after;
;                  T  the torpedo: five rows in P0 over the ship's nose
;                     (and the row above them cleared), redrawn every
;                     frame it is on (the ship moves), cleared when it goes
;                     off - but on the shot the beam grows over its rows;
;                and on every change to on, the readiness cue on channel 3
;                (pure tone LANCE_CUE_AUDF / AUDC, LANCE_CUE_FRAMES frames),
;                given back to the engine bed by boss_frame_timers through
;                boss_tick_timer as the rail unlock's tone is; a hit's tick and
;                a laser's warning write channel 3 after it and win.
;   the reticle  variant 2 (decision BD 1): one 8 x 8 mark on P1 (P2 stays
;                free), in the lasers' colour - COLPM1 is never written here,
;                no band palette row changes (decision BD 3) - on one line a
;                fight, right under the band's last shown row (the install's
;                boss_band_measure, drawn once); only while a lance is ready
;                (decision BG 2: from the meter full until the shot) and then
;                always (journal §BH 2): over a target the crosshair at the
;                module's centre, following the band's drift; over none the
;                hollow mark (half its pixels) at the ship's column. A change
;                of mark rewrites the four rows they differ in (lance_hollow
;                holds which is drawn). Dark on two frames of four while
;                charging.
;   the target   the column map's front module under the ship's centre with
;                its exposed bit (slot D's laser_exposed, the test boss_c_hit
;                applies): what a player shot there would hurt (src/c/lance.c
;                refuses the core, the defeat and the chain). It decides the
;                mark and, on the fire frame, the shot - never the charge.
;   the gesture  FIRE held with the stick held up (decision BF), level-
;                triggered: the raw TRIG0 and PORTA every frame, whatever is
;                under the ship (§BH 1; the ship's limits clamp its move, not
;                the stick, and never cancel it). The ordinary
;                fire is never touched: gameplay_fire_gate is read_input's
;                alone, and the ship moves as the stick says - at
;                1 / LANCE_CHARGE_SPEED_DIVISOR of its speed while the charge
;                builds (decision BF 2): on the charge's slow frames read_input
;                reads its stick from an $FF operand of the tick's (no direction) instead
;                of PORTA, so it moves on one frame in the divisor and its
;                edge tests see the input they always see. The operand goes
;                back on the next aim frame, and at START GAME with the other
;                boss patches (build/boss-restore.inc) should a game leave
;                between the two (a pause's quit).
;   the beam     in the ship's own plane (P0, double width: 4 colour clocks at
;                its centre, its colour - decision BD 4), up from the ship's
;                top LANCE_BEAM_STEP lines a frame from the frame after the
;                charge completes; on the frame it reaches the module's
;                bottom line, the kill through boss_hit (the shot's own path:
;                spark, score, kill stat, rebuild, exposure, chain, capsule),
;                in this tick, before UPDATE - so rule (B) holds as on a
;                shot's kill frame - and as the frame's only meeting: the tick
;                patches laser_frame's admit operand to 0, and a player shot
;                that would meet the boss on that frame waits one frame, as
;                AUD-04 holds any (MEASURED: a kill and a shot's kill on one
;                frame put Citadel L5 at 8,711, over 8,500); held LANCE_HOLD
;                frames, then erased up from the ship's top line as it grew.
;                The shots fly meanwhile, so the target is kept in the lance's
;                own bytes (the shot's mailboxes are UPDATE's; the tick writes
;                them on the kill frame only), and a module a shot destroyed
;                on the beam's way is not hit again: that lance is spent.
;                With no target on the fire frame (journal §BH 3) the beam
;                flies up through the mark to the band's foot (lance_y - 1,
;                above the ship's top limit everywhere) and does nothing there;
;                the lance is kept - lance_ready stays $FF through the beam
;                (the indicator on, the meter not advanced, no kill).
; ===========================================================================
LANCE_BEAM_STEP = 20
LANCE_HOLD      = 3
LANCE_BEAM_BITS = $18                   ; P0 is double width: 4 colour clocks at the ship's centre
LANCE_ROWS      = 8
LANCE_HPOSP1    = $D001
LANCE_SIZEP1    = $D009
LANCE_TRIG0     = $D010
LANCE_STICK0    = $D300                 ; PORTA: bit 0 up, active low
LANCE_STICK_UP  = $01
LANCE_P0        = $3C00                 ; src/main.s: PLAYER0 = PMG_BASE + $0400 (the ship's plane)
LANCE_P1        = $3D00                 ; src/main.s: PLAYER1 = PMG_BASE + $0500
LANCE_COLPM0    = $D012
LANCE_HULL_COLOUR = $0E                 ; src/main.s PLAYER_NORMAL_HULL_COLOR
; Decision BG 4 (C): green, hue $C - two PAL hue steps (48 degrees) from the
; nearest colour of the boss sector (hue $A, the player's shots; hue $E, the
; Citadel's and the Bastion's bands) and four from the ally steel's hue $8.
LANCE_READY_COLOUR = $CA
LANCE_CUE_AUDF  = $0C                   ; above every laser warning's pitch ($18 + timer)
LANCE_CUE_AUDC  = $A8                   ; pure tone, volume 8
LANCE_CUE_FRAMES = 16
; LANCE_CHARGE_SPEED_DIVISOR: scripts/lance-layout.mjs, beside the charge's
; length (-D from scripts/build.mjs). A power of two: the slow frames are the
; charge's frames not a multiple of it.
.assert LANCE_CHARGE_SPEED_DIVISOR > 0 && (LANCE_CHARGE_SPEED_DIVISOR & (LANCE_CHARGE_SPEED_DIVISOR - 1)) = 0, error, "LANCE_CHARGE_SPEED_DIVISOR: a power of two"
.assert <LANCE_STICK0 = 0, error, "the slow frame's operand swap keeps A = 0 for PORTA's low byte"

.import _lance_c_fill, _lance_c_aim, _lance_c_arrive, _lance_trig, _lance_charge, _lance_meter_lo, _boss_phase
.export lance_tick, lance_shape, lance_y, lance_beam, lance_head, lance_top, _lance_module, lance_cell, lance_ready

.segment "LANCE_CODE"

lance_tick:
    lda lance_beam
    beq lance_meter
    ; The beam's frames: the meter fills on (the shot emptied it, src/c/lance.c;
    ; it cannot fill again in a beam's frames: no full test), the indicator off
    ; since the fire frame - but a shot with no target kept its lance (still
    ; ready: the meter stays full).
    ldx lance_ready
    bne lance_beam_frame
    inc _lance_meter_lo                 ; 1 .. the beam's frames: never 0
    ; (falls into the beam's frame)

; A = lance_beam: 1 growing, 2 .. 1 + LANCE_HOLD held, then erased (2 +
; LANCE_HOLD its first frame). Both the growth and the erasure move
; LANCE_BEAM_STEP lines up a frame, from the ship's top line to the module's
; bottom one: the beam reaches up, then leaves the ship and closes on the
; module.
lance_beam_frame:
    ldx #BOSS_SHOT_ADMIT
    stx laser_admit_operand             ; AUD-04's two meetings (the kill's frame below: none)
    ldx #LANCE_BEAM_BITS                ; X: the byte the step writes (0 erasing)
    cmp #$01
    beq @step                           ; growing
    ldx #$00
    cmp #(2 + LANCE_HOLD)
    bcc @more                           ; held
    bne @step                           ; erasing
    lda player_y                        ; the erasure's first frame: up from the ship's top line
    sta lance_head                      ; (the rows under it are the ship's)
    inc lance_beam
@step:
    lda lance_head                      ; up LANCE_BEAM_STEP lines, never past the module
    sec
    sbc #LANCE_BEAM_STEP
    bcc @top
    cmp lance_top
    bcs @rows
@top:
    lda lance_top
@rows:
    ldy lance_head                      ; from the old head down to the new one
    sta lance_head
    cmp lance_top
    php                                 ; Z: it reached the module
    txa
:
    dey
    sta LANCE_P0,y
    cpy lance_head
    bne :-
    plp
    bne @rts
    txa
    beq @off                            ; erased up to the module: the beam is down
    lda lance_ready
    bne @more                           ; no target (the lance kept): the band's foot, nothing there
    ; It reached the module: the kill, through the shot's own path.
    lda lance_cell                      ; the shot's mailboxes, boss_hit's inputs
    sta _boss_hit_cell
    lda _lance_module
    sta _boss_hit_module
    jsr _lance_c_arrive                 ; A: its HP, now 1; 0: it fell on the beam's way; X = 0
    tay
    beq @more
    stx laser_admit_operand             ; the kill is the frame's only meeting: the shots wait a frame
    jsr boss_hit
@more:
    inc lance_beam
@rts:
    rts
@off:
    stx lance_beam                      ; X = 0: the beam is down
    rts

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
@rts:
    rts                                 ; the meter filling: nothing more
@change:
    sta lance_ready
    jsr lance_indicate
    lda lance_ready
    bne @rts                            ; on: the indicator's frame only - the aim from the next
    ; Off (the ship dying, the fight over), once: no mark, no charge, the
    ; stick PORTA's (a slow frame's operand put back).
    sta _lance_charge                   ; A = 0
    sta LANCE_HPOSP1
.ifdef LANCE_SLOW_FORWARD
    lda #BOSS_PLAYER_Y_MIN              ; the comparison build's floor operand
    sta read_input_y_min_operand
.else
    sta read_input_stick_operand        ; PORTA's low byte
    ldy #>LANCE_STICK0
    sty read_input_stick_operand + 1
.endif
    rts

; A lance ready: the target, the mark, the gesture (journal §BH: whatever is
; under the ship).
lance_aim:
.ifdef LANCE_INDICATOR_T
    jsr lance_torpedo                   ; the ship moves: the torpedo with it
.endif
.ifdef LANCE_INDICATOR_C
    lda #LANCE_READY_COLOUR             ; again every ready frame: a booster's pickup or release
    sta LANCE_COLPM0                    ; writes the hull's white (src/main.s), a Shield pulses it
.endif
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
:                                       ; its $FF: read_input's stick on a slow frame (no direction)
    ldx #$FF                            ; covered: no target
@aim:
    stx _lance_module                   ; the target (src/c/lance.c); the beam's once fired (no
                                        ; aim while the beam is up)
    lda LANCE_STICK0                    ; the gesture: FIRE and the stick up, both held (0)
    and #LANCE_STICK_UP
    ora LANCE_TRIG0
    sta _lance_trig
    jsr _lance_c_aim                    ; A: bit 0 lit, bit 1 a target, bit 2 FIRE; X = 0 (cc65's high byte)
    ; The charge's slow frames (decision BF 2): the ship at 1 / divisor of its
    ; speed, every direction - read_input reads no direction held - until the
    ; charge is released or the lance fires (lance_charge 0: PORTA again).
    pha
    lda _lance_charge
    and #(LANCE_CHARGE_SPEED_DIVISOR - 1)
.ifdef LANCE_SLOW_FORWARD
    ; The owner's comparison build (--lance-slow=forward): only the advance
    ; is slowed - the boss floor's operand at the ship's line on a slow frame.
    beq @floor
    lda player_y
    bne @slow                           ; player_y > 0
@floor:
    lda #BOSS_PLAYER_Y_MIN
@slow:
    sta read_input_y_min_operand
.else
    beq @full                           ; A = 0: PORTA's low byte
    lda #<(:- + 1)                      ; the covered target's $FF above
    ldy #>(:- + 1)
    bne @stick                          ; always
@full:
    ldy #>LANCE_STICK0
@stick:
    sta read_input_stick_operand
    sty read_input_stick_operand + 1
.endif
    pla
    lsr                                 ; C: lit
    bcs @show
    lsr                                 ; C: a target; A: FIRE
    beq @dark                           ; the blink's dark frame
    ; FIRE: the beam from the next frame (the fire frame draws none of it) -
    ; up to the target's bottom line, or with none to the band's foot, the line
    ; over the mark (the lance kept): above the ship's top limit in every region
    ; (the Spine's mark line is that limit, 88), so the beam is never empty.
    ldy lance_y
    dey
    tya
    bcc @top
    ldy _lance_module
    lda boss_mbottom_y,y
@top:
    sta lance_top
    lda player_y
    sta lance_head
    inc lance_beam                      ; 1: growing (C kept)
    bcc @dark                           ; no target: still ready, the indicator on
    lda #$00                            ; the lance spent: the indicator off on the fire frame
    sta lance_ready                     ; (T: the beam covers the torpedo's rows from the next)
    jsr lance_indicate
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
    ldx _lance_module                   ; its centre: (mx + mxe) * 2 clocks, less 4
    lda boss_mx,x
    clc
    adc boss_mxe,x
    asl                                 ; mx + mxe < 128: C=0
    adc #(BAND_ORIGIN_HPOS - 4)
    sec
    sbc boss_shown_pos
    sta LANCE_HPOSP1
    rts
@hollow:
    lda player_x                        ; the ship's centre (x + 8), less 4
    clc
    adc #$04
    sta LANCE_HPOSP1
    rts

; lance_ready changed: the build's indicator; on its way on, the reticle's
; rows and the cue.
lance_indicate:
.ifdef LANCE_INDICATOR_C
    tay                                 ; $FF on, 0 off
    lda #LANCE_HULL_COLOUR
    iny
    bne @white
    lda #LANCE_READY_COLOUR
@white:
    sta LANCE_COLPM0
.endif
.ifdef LANCE_INDICATOR_T
    lda lance_beam
    bne :+                              ; off on the beam's first frame: the beam covers its rows
    jsr lance_torpedo                   ; on: drawn; off: cleared
:
.endif
    lda lance_ready
    beq @rts
    ; On: the reticle's rows (HPOS 0 until the aim places it), drawn once a
    ; fight at the line under the band's last shown row (the install's
    ; boss_band_measure).
    lda lance_y
    bne @cue
    lda boss_capsule_y_operand
    sta lance_y
    tay
    inx                                 ; X = $FF on the way on (the tick's, or the torpedo's loop): 0
    stx LANCE_SIZEP1
:
    lda lance_shape,x
    sta LANCE_P1,y
    iny
    inx
    cpx #LANCE_ROWS
    bne :-
@cue:
    lda sound_enabled
    beq @rts
    lda #LANCE_CUE_AUDF
    sta AUDF3
    lda #LANCE_CUE_AUDC
    sta AUDC3
    lda #LANCE_CUE_FRAMES               ; boss_frame_timers gives the bed back after it
    sta boss_tick_timer
@rts:
    rts

.ifdef LANCE_INDICATOR_T
; The torpedo over the ship's nose, masked by lance_ready: drawn while on,
; cleared when off (and its tip's row above, which a move down leaves).
lance_torpedo:
    ldy player_y                        ; the nose's top line
    lda #$6C                            ; the fins, over the nose
    and lance_ready
    sta LANCE_P0 - 1,y
    lda #$38                            ; the body
    and lance_ready
    sta LANCE_P0 - 2,y
    sta LANCE_P0 - 3,y
    sta LANCE_P0 - 4,y
    lda #$10                            ; the tip
    and lance_ready
    sta LANCE_P0 - 5,y
    lda #$00                            ; the row above (a move down leaves it)
    sta LANCE_P0 - 6,y
    rts
.endif

lance_shape:    .byte $18, $18, $00, $C3, $C3, $00, $18, $18

.segment "LANCE_BSS"
lance_beam:     .res 1                  ; 0 none, 1 growing, 2 .. 1 + LANCE_HOLD held, then erased
lance_head:     .res 1                  ; the beam's top line
lance_top:      .res 1                  ; the module's bottom line
lance_y:        .res 1                  ; the reticle's first line, 0 not drawn yet
_lance_module:  .res 1                  ; the target's module and band column; the beam's once fired
lance_cell:     .res 1
lance_ready:    .res 1                  ; what the indicator shows: $FF a lance ready, 0 not
lance_hollow:   .res 1                  ; the mark drawn: 0 the crosshair (lance_indicate's), $FF the hollow one
