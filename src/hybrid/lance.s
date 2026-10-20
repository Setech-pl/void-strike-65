; ===========================================================================
; The VOID LANCE's execution (M6 stage 1, docs/plans/m6-void-lance.md; owner
; decisions BD 1-6, 2026-10-20; the owner's smoke of 2026-10-20 and choice,
; journal §BE-§BF: the lance never changes the ordinary fire, the charge is
; FIRE + stick UP). Included by boss.s: the boss link's lance run - this and
; src/c/lance.c's policy - read at every boss entry after slot E into the
; window's unclaimed tail, allocated from $BBFF down (scripts/build.mjs fails
; the build when the window's record reaches it). Reached only through the
; boss vector image's TICK_FLASHES entry: the boss sector only, every frame,
; before read_input and UPDATE.
;
;   the reticle  variant 2 (decision BD 1): one 8 x 8 crosshair on P1 (P2
;                stays free), in the lasers' colour - COLPM1 is never written
;                here, no band palette row changes (decision BD 3) - on one
;                line a fight, right under the band's last shown row (the
;                install's boss_band_measure, drawn once), at the target
;                module's centre, following the band's drift; dark on two
;                frames of four while charging.
;   the target   the column map's front module under the ship's centre with
;                its exposed bit (slot D's laser_exposed, the test boss_c_hit
;                applies): what a player shot there would hurt (src/c/lance.c
;                refuses the core, the defeat and the chain).
;   the gesture  FIRE held with the stick held up (decision BF). The ordinary
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
; LANCE_CHARGE_SPEED_DIVISOR: scripts/lance-layout.mjs, beside the charge's
; length (-D from scripts/build.mjs). A power of two: the slow frames are the
; charge's frames not a multiple of it.
.assert LANCE_CHARGE_SPEED_DIVISOR > 0 && (LANCE_CHARGE_SPEED_DIVISOR & (LANCE_CHARGE_SPEED_DIVISOR - 1)) = 0, error, "LANCE_CHARGE_SPEED_DIVISOR: a power of two"
.assert <LANCE_STICK0 = 0, error, "the slow frame's operand swap keeps A = 0 for PORTA's low byte"

.import _lance_c_aim, _lance_c_arrive, _lance_stock, _lance_trig, _lance_charge
.export lance_tick, lance_shape, lance_y, lance_beam, lance_head, lance_top, _lance_module, lance_cell

.segment "LANCE_CODE"

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

lance_tick:
    lda lance_beam
    bne lance_beam_frame
    lda _lance_stock
    beq @rts                            ; none in stock: no reticle
    ldx #$FF                            ; no module
    lda PLAYER_LIFECYCLE
    bne @aim                            ; dying, respawning: no target
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
    jsr _lance_c_aim                    ; A: bit 0 shown, bit 2 FIRE; X = 0 (cc65's high byte)
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
    lsr
    bcs @show
    lsr
    lsr
    bcc @dark                           ; NONE, BLINK
    ; FIRE: the beam from the next frame (the fire frame draws none of it).
    ldy _lance_module
    lda boss_mbottom_y,y
    sta lance_top
    lda player_y
    sta lance_head
    inc lance_beam                      ; 1: growing
@dark:
    stx LANCE_HPOSP1                    ; X = 0
@rts:
    rts
@show:
    lda lance_y
    bne @placed
    lda boss_capsule_y_operand          ; the line under the band's last shown row (the install's boss_band_measure)
    sta lance_y
    tay
    stx LANCE_SIZEP1                    ; X = 0
:
    lda lance_shape,x
    sta LANCE_P1,y
    iny
    inx
    cpx #LANCE_ROWS
    bne :-
@placed:
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

lance_shape:    .byte $18, $18, $00, $C3, $C3, $00, $18, $18

.segment "LANCE_BSS"
lance_beam:     .res 1                  ; 0 none, 1 growing, 2 .. 1 + LANCE_HOLD held, then erased
lance_head:     .res 1                  ; the beam's top line
lance_top:      .res 1                  ; the module's bottom line
lance_y:        .res 1                  ; the reticle's first line, 0 not drawn yet
_lance_module:  .res 1                  ; the target's module and band column; the beam's once fired
lance_cell:     .res 1
