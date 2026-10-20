; ===========================================================================
; The VOID LANCE's execution (M6 stage 1, docs/plans/m6-void-lance.md; owner
; decisions BD 1-6, 2026-10-20; the owner's smoke of 2026-10-20: rule BD 2
; (c) withdrawn - the lance never changes the ordinary fire). Included by
; boss.s: the boss link's lance run - this and src/c/lance.c's policy - read
; at every boss entry after slot E into the window's unclaimed tail, allocated
; from $BBFF down (scripts/build.mjs fails the build when the window's record
; reaches it). Reached only through the boss vector image's TICK_FLASHES
; entry: the boss sector only, every frame, before read_input and UPDATE.
;
;   the reticle  variant 2 (decision BD 1): one 8 x 8 crosshair on P1 (P2
;                stays free), in the lasers' colour - COLPM1 is never written
;                here, no band palette row changes (decision BD 3) - on one
;                line a fight, right under the band's last shown row (the
;                install's boss_band_measure, drawn once), at the target
;                module's centre, following the band's drift; dark on two
;                frames of four while charging.
;   the gesture  LANCE_GESTURE (scripts/build.mjs --lance-rule, the owner's
;                comparison): 1 FIRE held with the stick held up, 2 with it
;                held down (variant A); 0 FIRE alone (variant B: holding
;                FIRE keeps shooting). The ordinary fire is never touched:
;                gameplay_fire_gate is read_input's alone, and the ship moves
;                as the stick says.
;   the beam     in the ship's own plane (P0, double width: 4 colour clocks at
;                its centre, its colour - decision BD 4), up from the ship's
;                top LANCE_BEAM_STEP lines a frame from the frame after the
;                charge completes; on the frame it reaches the module's
;                bottom line, the kill through boss_hit (the shot's own path:
;                spark, score, kill stat, rebuild, exposure, chain, capsule),
;                in this tick, before UPDATE - so rule (B) holds as on a
;                shot's kill frame - and inside AUD-04's count: the tick
;                patches laser_frame's operand to LANCE_KILL_ADMIT, the player
;                shots UPDATE admits on that frame (a later one waits a frame,
;                as AUD-04 holds any); held LANCE_HOLD frames, then erased up from the ship's
;                top line as it grew. The shots fly meanwhile, so the target
;                is kept in the lance's own bytes (the shot's mailboxes are
;                UPDATE's; the tick writes them on the kill frame only), and a
;                module a shot destroyed on the beam's way is not hit again:
;                that lance is spent.
; ===========================================================================
LANCE_BEAM_STEP = 20
LANCE_HOLD      = 3
LANCE_BEAM_BITS = $18                   ; P0 is double width: 4 colour clocks at the ship's centre
LANCE_ROWS      = 8
LANCE_HPOSP1    = $D001
LANCE_SIZEP1    = $D009
LANCE_TRIG0     = $D010
LANCE_STICK0    = $D300                 ; PORTA: bit 0 up, bit 1 down, active low
LANCE_P0        = $3C00                 ; src/main.s: PLAYER0 = PMG_BASE + $0400 (the ship's plane)
LANCE_P1        = $3D00                 ; src/main.s: PLAYER1 = PMG_BASE + $0500
.ifndef LANCE_GESTURE
LANCE_GESTURE   = 2
.endif
.assert LANCE_GESTURE <= 2, error, "LANCE_GESTURE: 0 (FIRE), 1 (FIRE + up) or 2 (FIRE + down)"
; The player shots AUD-04 admits on the kill's frame. Variant A: none - the
; kill is the frame's only meeting, so the frame is no heavier than a lance
; kill without shots (MEASURED: a kill and one shot's kill on one frame put
; Citadel L5 at 8,711 and Spine L9 at 8,560, over 8,500); a shot that would
; meet then waits that one frame, as AUD-04 holds any (the fire itself is
; untouched). Variant B, the owner's rule (journal §BE 3): the kill is one
; of the frame's two meetings, so one player shot more meets beside it.
.if LANCE_GESTURE = 0
LANCE_KILL_ADMIT = 1
.else
LANCE_KILL_ADMIT = 0
.endif

.import _lance_c_aim, _lance_c_arrive, _lance_stock, _lance_trig
.export lance_tick, lance_shape, lance_y, lance_beam, lance_head, lance_top, _lance_module, lance_cell

.segment "LANCE_CODE"

; A = lance_beam: 1 growing, 2 .. 1 + LANCE_HOLD held, then erased (2 +
; LANCE_HOLD its first frame). Both the growth and the erasure move
; LANCE_BEAM_STEP lines up a frame, from the ship's top line to the module's
; bottom one: the beam reaches up, then leaves the ship and closes on the
; module.
lance_beam_frame:
    ldx #BOSS_SHOT_ADMIT
    stx laser_admit_operand             ; AUD-04's two meetings (the kill's frame below: one)
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
    jsr _lance_c_arrive                 ; A: its HP, now 1; 0: it fell on the beam's way
    tay
    beq @more
.if LANCE_KILL_ADMIT = 0
    lsr                                 ; A = 0
.endif
    sta laser_admit_operand             ; the shots' meetings on the kill's frame: LANCE_KILL_ADMIT
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
    ldx boss_column_map,y
@aim:
    stx _lance_module                   ; the target (src/c/lance.c); the beam's once fired (no
                                        ; aim while the beam is up)
.if LANCE_GESTURE = 0
    lda LANCE_TRIG0                     ; the gesture: FIRE held (0)
.else
    lda LANCE_STICK0                    ; the gesture: FIRE and the stick's direction, both held (0)
    and #LANCE_GESTURE
    ora LANCE_TRIG0
.endif
    sta _lance_trig
    jsr _lance_c_aim                    ; A: bit 0 shown, bit 2 FIRE; X = 0 (cc65's high byte)
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
