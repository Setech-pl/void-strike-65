; ===========================================================================
; The VOID LANCE's execution (M6 stage 1, docs/plans/m6-void-lance.md; owner
; decisions BD 1-6, 2026-10-20). Included by boss.s: the boss link's slot G,
; the lance's own boss run - this and src/c/lance.c's policy - read at every
; boss entry after slot E into the window's unclaimed tail, allocated from
; $BBFF down (scripts/build.mjs fails the build when the window's record
; reaches it). Reached only through the boss vector image's TICK_FLASHES
; entry: the boss sector only, every frame, before read_input and UPDATE.
;
;   the reticle  variant 2 (decision BD 1): one 8 x 8 crosshair on P1 (P2
;                stays free), in the lasers' colour - COLPM1 is never written
;                here, no band palette row changes (decision BD 3) - on one
;                line a fight, right under the band's last shown row
;                (boss_band_measure, drawn once), at the target module's
;                centre, following the band's drift; dark on two frames of
;                four while charging.
;   the gate     while charging and while the beam is up gameplay_fire_gate
;                is held at 0: the ordinary burst waits (decision BD 2 (c)),
;                so no player shot meets the band on a lance frame; the
;                beam's end opens it again (FIRE still held fires at once).
;   the beam     in the ship's own plane (P0, double width: 4 colour clocks at
;                its centre, its colour - decision BD 4), up from the ship's
;                top LANCE_BEAM_STEP lines a frame from the frame after the
;                charge completes; on the frame it reaches the module's
;                bottom line, the kill through boss_hit (the shot's own path:
;                spark, score, kill stat, rebuild, exposure, chain, capsule);
;                held LANCE_HOLD frames, then erased up from the ship's top
;                line as it grew. LANCE_BEAM_STEP bounds a frame's rows: the
;                Bastion's worst frame (a rail step with no player meeting)
;                leaves the lance ~440 cycles.
; ===========================================================================
LANCE_BEAM_STEP = 20
LANCE_HOLD      = 3
LANCE_BEAM_BITS = $18                   ; P0 is double width: 4 colour clocks at the ship's centre
LANCE_ROWS      = 8
LANCE_HPOSP1    = $D001
LANCE_SIZEP1    = $D009
LANCE_TRIG0     = $D010
LANCE_P0        = $3C00                 ; src/main.s: PLAYER0 = PMG_BASE + $0400 (the ship's plane)
LANCE_P1        = $3D00                 ; src/main.s: PLAYER1 = PMG_BASE + $0500

.import _lance_c_aim, _lance_c_arrive, _lance_stock, _lance_trig
.export lance_tick, lance_after, lance_shape, lance_y, lance_beam, lance_head, lance_top

.segment "LANCE_CODE"

; A = lance_beam: 1 growing, 2 .. 1 + LANCE_HOLD held, then erased (2 +
; LANCE_HOLD its first frame). Both the growth and the erasure move
; LANCE_BEAM_STEP lines up a frame, from the ship's top line to the module's
; bottom one: the beam reaches up, then leaves the ship and closes on the
; module.
lance_beam_frame:
    ldx #$00                            ; X: the byte the step writes (0 erasing)
    stx gameplay_fire_gate              ; no player shot while the beam is up
    cmp #$01
    bne @after
    ldx #LANCE_BEAM_BITS
    bne @step                           ; always
@after:
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
    jsr _lance_c_arrive                 ; its HP at 1 (boss_hit_module / cell: the fire frame's)
    jsr boss_hit
@more:
    inc lance_beam
@rts:
    rts
@off:
    stx lance_beam                      ; X = 0: the beam is down
    inx
    inx
    stx gameplay_fire_gate              ; 2: the ordinary fire again (FIRE held: at once)
    rts

lance_tick:
    lda lance_beam
    bne lance_beam_frame
    lda _lance_stock
    beq @rts                            ; none in stock: no reticle, the ordinary fire
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
    sta _boss_hit_cell
    tay
    ldx boss_column_map,y
@aim:
    stx _boss_hit_module                ; the shot's own mailboxes (boss_hit's inputs): only
                                        ; UPDATE's shot loop writes them otherwise, and no shot
                                        ; flies from the fire to the kill (the fire gate)
    lda LANCE_TRIG0
    sta _lance_trig
    jsr _lance_c_aim                    ; A: bit 0 shown, bit 1 the ordinary fire waits, bit 2 FIRE
    tay
    and #$02
    eor #$02
    sta gameplay_fire_gate              ; 2 (open) or 0 (waits; read_input re-arms it on release)
    tya
    lsr
    bcs @show
    lsr
    lsr
    bcc @dark                           ; NONE, BLINK
    ; FIRE: the beam from the next frame (the fire frame draws none of it).
    ldx _boss_hit_module
    lda boss_mbottom_y,x
    sta lance_top
    lda player_y
    sta lance_head
    inc lance_beam                      ; 1: growing
@dark:
    lda #$00
    sta LANCE_HPOSP1
@rts:
    rts
@show:
    lda lance_y
    bne @placed
    lda boss_capsule_y_operand          ; the line under the band's last shown row (the install's boss_band_measure)
    sta lance_y
    tay
    ldx #$00
    stx LANCE_SIZEP1
:
    lda lance_shape,x
    sta LANCE_P1,y
    iny
    inx
    cpx #LANCE_ROWS
    bne :-
@placed:
    ldx _boss_hit_module                ; its centre: (mx + mxe) * 2 clocks, less 4
    lda boss_mx,x
    clc
    adc boss_mxe,x
    asl                                 ; mx + mxe < 128: C=0
    adc #(BAND_ORIGIN_HPOS - 4)
    sec
    sbc boss_shown_pos
    sta LANCE_HPOSP1
    rts

;
; HULL_CONTACT (after UPDATE, before SECTOR_COMPLETION): the lance's kill
; (this frame's tick, before UPDATE, which resets AUD-04's count) counts as one
; of the frame's band meetings, so what waits for a frame without one - the
; Bastion's rail step (rail_late) - waits as on a shot's kill frame. The arrival
; frame is the only one whose UPDATE sees lance_beam = 2.
lance_after:
    lda lance_beam
    cmp #$02
    bne :+
    dec boss_shots_admit_left
:
    rts

lance_shape:    .byte $18, $18, $00, $C3, $C3, $00, $18, $18

.segment "LANCE_BSS"
lance_beam:     .res 1                  ; 0 none, 1 growing, 2 .. 1 + LANCE_HOLD held, then erased
lance_head:     .res 1                  ; the beam's top line
lance_top:      .res 1                  ; the module's bottom line
lance_y:        .res 1                  ; the reticle's first line, 0 not drawn yet
