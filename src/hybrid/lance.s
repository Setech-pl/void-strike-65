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
;   the meter    src/c/lance.c's lance_c_fill, every boss frame with no beam
;                up (decision BG 1; through the beam's frames the tick's own
;                inc): a lance is ready when it is full - one, no stacking -
;                and the shot empties it.
;   readiness    the indicator (decision BG 4; C, the owner's choice of
;                journal §BI 3) is on while a lance is ready, the ship alive
;                (PLAYER_LIFECYCLE 0) and the fight on (boss_phase 0), off
;                otherwise - lance_ready ($FF / 0) holds what it shows, and
;                only a change acts: the ship's colour, COLPM0
;                LANCE_READY_COLOUR while on, the hull's white back when off
;                (START GAME's boss restore puts the white back should a game
;                leave while it is on). Written on the change and again on
;                every ready frame with no beam up: the resident booster code
;                writes the white at a pickup or a release and a Shield pulses
;                COLPM0 ($84 / $0E) - the Shield's pulse shows while it lasts,
;                the green comes back the frame after. While the charge builds
;                that frame's colour is lance_ramp's (journal §BI 2): the
;                green's luminance from the steel's (4) up to near-white ($CE)
;                over the charge, back to the green the frame it is released
;                or fires. On every change to on, the readiness cue on channel 3
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
;                (the indicator on, the meter not advanced, no kill). Either
;                way the fire frame sounds the discharge on channel 3 (journal
;                §BI 2: noise, held while the beam is up and given back to the
;                engine bed by the beam's last frame - not through
;                boss_tick_timer: a running timer costs every
;                boss_frame_timers call, and a rail's slide makes four on a
;                frame, MEASURED +40 cycles on the Bastion's fire frame; the
;                beam is bounded, so the channel is always released (M5-03).
;                The kill's tick on the beam's arrival, a hit's or a laser's
;                warning take the channel before that and keep the rule they
;                have).
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
LANCE_SHOT_AUDF = $10                   ; the discharge (journal §BI 2): poly17 noise, volume 10 -
LANCE_SHOT_AUDC = $8A                   ; no other boss sound is noise (the tick's and the cue's
                                        ; tones, the hull's poly4 clank)
; LANCE_CHARGE_SPEED_DIVISOR: scripts/lance-layout.mjs, beside the charge's
; length (-D from scripts/build.mjs). A power of two: the slow frames are the
; charge's frames not a multiple of it.
.assert LANCE_CHARGE_SPEED_DIVISOR > 0 && (LANCE_CHARGE_SPEED_DIVISOR & (LANCE_CHARGE_SPEED_DIVISOR - 1)) = 0, error, "LANCE_CHARGE_SPEED_DIVISOR: a power of two"
.assert <LANCE_STICK0 = 0, error, "the slow frame's operand swap keeps A = 0 for PORTA's low byte"

.import _lance_c_fill, _lance_c_aim, _lance_c_arrive, _lance_trig, _lance_charge, _lance_meter_lo, _lance_meter_hi, _boss_phase
.export lance_tick, lance_shape, lance_y, lance_beam, lance_head, lance_top, _lance_module, lance_cell, lance_ready
.export gauge_level, gauge_rows

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
    ldx #BOSS_BED_AUDF                  ; the discharge's channel back to the engine bed
    ldy #BOSS_BED_AUDC
    jmp lance_sound

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
    jmp gauge_filling                   ; the meter filling: the gauges only (M6 stage 1b)
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
    sty gauge_ramp                      ; the gauge's charge step (M6 stage 1b)
    lda lance_ramp,y
    sta LANCE_COLPM0
    ; The charge's slow frames (decision BF 2): the ship at 1 / divisor of its
    ; speed, every direction - read_input reads no direction held - until the
    ; charge is released or the lance fires (lance_charge 0: PORTA again).
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
    beq @dark_gauge                     ; the blink's dark frame
    ; The discharge (journal §BI 2; C and X kept).
    lda sound_enabled
    beq @quiet
    lda #LANCE_SHOT_AUDF
    sta AUDF3
    lda #LANCE_SHOT_AUDC                ; until the beam's last frame (no timer: see the header)
    sta AUDC3
@quiet:
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
    sta lance_ready
    jsr lance_indicate
@dark:
    stx LANCE_HPOSP1                    ; X = 0
@rts:
    rts
@dark_gauge:
    stx LANCE_HPOSP1                    ; X = 0
    jmp gauge_ready
@show:
    ; The mark (journal §BH 2): the crosshair over a target, the hollow mark
    ; over none - a change rewrites the four rows they differ in.
    lsr                                 ; C: a target
    lda #$00
    sbc #$00                            ; 0 the crosshair, $FF the hollow mark
    cmp lance_hollow
    beq @mark
    ldy #GAUGE_SKIP                     ; the mark's swap: no gauge write on its frame
    sty gauge_ramp
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
    jmp gauge_ready
@hollow:
    lda player_x                        ; the ship's centre (x + 8), less 4
    clc
    adc #$04
    sta LANCE_HPOSP1
    jmp gauge_ready

; lance_ready changed: the indicator; on its way on, the reticle's rows and
; the cue.
lance_indicate:
    and #(LANCE_READY_COLOUR ^ LANCE_HULL_COLOUR)  ; A = lance_ready: $FF on, 0 off
    eor #LANCE_HULL_COLOUR
    sta LANCE_COLPM0
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
    inx                                 ; X = $FF on the way on (the tick's): 0
    stx LANCE_SIZEP1
:
    lda lance_shape,x
    sta LANCE_P1,y
    iny
    inx
    cpx #LANCE_ROWS
    bne :-
@cue:
    ldx #LANCE_CUE_AUDF
    ldy #LANCE_CUE_AUDC
    jsr lance_sound
    lda #LANCE_CUE_FRAMES               ; boss_frame_timers gives the bed back after it
    sta boss_tick_timer                 ; (and with the sound off writes nothing)
@rts:
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
; The charge's ramp (journal §BI 2), by (lance_charge + 7) / 8: 0 not
; charging - the ready green; then the green's luminance from the steel's
; (4, frames 1-16) to near-white ($CE, frames 65-74), quickening at the end.
lance_ramp:     .byte LANCE_READY_COLOUR, $C4, $C4, $C6, $C6, $C8, $C8, $CA, $CC, $CE, $CE
.assert (LANCE_CHARGE_FRAMES - 1 + 7) / 8 < 11, error, "lance_ramp: an entry for every charge frame"

; ===========================================================================
; The gauges (M6 stage 1b, journal §BK; docs/plans/m6-gauges.md §3): P2, the
; boss sector only (P1 / P2 are the Heavy class's in space sectors - the owner's
; answer, §BK 4), in the lasers' colour (COLPM2 is laser M2's, never written
; here - §BK 5). Bottom-left, from the bottom up: the lance icon, the meter's
; four dots (25 / 50 / 75 / 100 %), the booster icon, the booster's four dots
; (the HUD's lit BOOST cells, which the resident HUD code writes). The fight's
; first frame (a filling frame: the meter is empty at the entry) draws both
; whole - icons, eight sockets - and sets HPOSP2 (GAUGE_HPOS: the variant's,
; scripts/build.mjs --gauge) and SIZEP2 once. Afterwards a frame writes at most
; ONE dot (two bytes) toward the level a gauge should show, and nothing when
; both show it: the lance gauge first, then the booster's. Where it runs: the
; meter's filling frames, and the ready frames but the fire frame, the
; readiness change, the mark's swap and the beam's - the Bastion's headroom; a
; step a skipped frame owed is taken on the next one that runs.
;   the lance gauge  filling: the meter's quarters reached (gauge_quarter_*,
;                    from scripts/lance-layout.mjs's meter frames, 4 = full);
;                    ready: 4, and the charge empties it from the top by the
;                    ramp's own index, (charge + 7) / 8 - 4 to frame 16, none
;                    from 65 (gauge_charge_lit); a release refills it.
;   the booster's    the HUD's lit cells are a prefix (activation fills all four,
;                    the drain empties them from the top, the last one blinks):
;                    the next cell lit is one more, the top drawn one blank one
;                    less.
; gauge_level holds what a gauge shows as its dots' first row index: the lance
; 0 + lit, the booster 4 + lit (0 until the first frame drew the gauges).
; ===========================================================================
GAUGE_P2        = $3E00                 ; src/main.s: PLAYER2 = PMG_BASE + $0600
GAUGE_HPOSP2    = $D002
GAUGE_SIZEP2    = $D00A
GAUGE_LIT       = $3C
GAUGE_SOCKET    = $24
GAUGE_ICON_ROWS = 6
GAUGE_LANCE_ICON_Y = 232                ; above the HUD's line (240-247)
GAUGE_BOOST_ICON_Y = 209
GAUGE_SKIP      = 11                    ; gauge_ramp: the mark's swap took the frame
GAUGE_HUD_CELLS = SCREEN + HUD_BOOSTER_SEGMENTS_OFFSET
.assert GAUGE_HPOS = 48 || GAUGE_HPOS = 40, error, "GAUGE_HPOS: variant A (48) or B (40), scripts/build.mjs --gauge"

; Filling frames: the first draws the gauges; then the meter's quarters.
gauge_filling:
    lda gauge_level + 1
    beq gauge_install
    lda _boss_difficulty                ; its four thresholds
    asl
    asl
    tax
    ldy #$00
@quarter:
    lda _lance_meter_lo
    cmp gauge_quarter_lo,x
    lda _lance_meter_hi
    sbc gauge_quarter_hi,x
    bcc @level
    inx
    iny
    cpy #4
    bne @quarter
@level:
    tya
    jmp gauge_lance

; Ready frames (the aim's, but the fire frame and the swap's): the charge's step.
gauge_ready:
    ldy gauge_ramp
    lda gauge_charge_lit,y
    bmi gauge_rts                       ; the mark's swap took this frame
; A = the lance gauge's dots: a step toward them, else the booster's.
gauge_lance:
    ldx #0
    cmp gauge_level
    bne gauge_step
    ldy gauge_level + 1                 ; 4 + the booster's lit dots
    cpy #8
    beq @top                            ; all four: only fewer
    lda GAUGE_HUD_CELLS - 4,y           ; the next cell lit: one more
    bne @more
@top:
    cpy #4
    beq gauge_rts                       ; none drawn, none lit
    lda GAUGE_HUD_CELLS - 5,y           ; the top drawn cell blank: one less
    bne gauge_rts
    dey
    dey
@more:
    iny
    tya
    inx                                 ; X = 1: the booster
; X = the gauge (0 the lance, 1 the booster), A = the row index it should show:
; ONE dot toward it.
gauge_step:
    cmp gauge_level,x
    beq gauge_rts
    bcs @up
    dec gauge_level,x                   ; fewer: the top lit dot back to its socket
    ldy gauge_level,x
    lda #GAUGE_SOCKET
    bne @dot
@up:
    ldy gauge_level,x                   ; more: the next dot lit
    inc gauge_level,x
    lda #GAUGE_LIT
@dot:
    ldx gauge_rows,y
    sta GAUGE_P2,x
    sta GAUGE_P2 + 1,x
gauge_rts:
    rts

; The fight's first frame: the position and width once, both icons and the
; eight sockets (P2 is clear: the entry's hand-over cleared PMG).
gauge_install:
    lda #GAUGE_HPOS
    sta GAUGE_HPOSP2
    ldx #(GAUGE_ICON_ROWS - 1)
@icon:
    lda gauge_lance_icon,x
    sta GAUGE_P2 + GAUGE_LANCE_ICON_Y,x
    lda gauge_boost_icon,x
    sta GAUGE_P2 + GAUGE_BOOST_ICON_Y,x
    dex
    bpl @icon
    ldx #7
@socket:
    ldy gauge_rows,x
    lda #GAUGE_SOCKET
    sta GAUGE_P2,y
    sta GAUGE_P2 + 1,y
    dex
    bpl @socket
    inx                                 ; X = 0
    stx GAUGE_SIZEP2
    lda #4                              ; the booster's: 4 + none lit (and drawn)
    sta gauge_level + 1
    rts

; The dots' first rows: the lance's (0-3, 25 % at the bottom) and the booster's
; (4-7), two lines a dot, three apart.
gauge_rows:     .byte 228, 225, 222, 219, 205, 202, 199, 196
gauge_lance_icon: .byte $18, $3C, $18, $18, $18, $24
gauge_boost_icon: .byte $18, $24, $42, $18, $24, $42
; The lance gauge's dots while charging, by the ramp's index (charge + 7) / 8;
; GAUGE_SKIP's entry is the swap's (no gauge work).
gauge_charge_lit: .byte 4, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, $80
.assert (LANCE_CHARGE_FRAMES - 1 + 7) / 8 < GAUGE_SKIP, error, "gauge_charge_lit: an entry for every charge frame"
; The meter's quarters per difficulty (EASY, MEDIUM, HARD): the k-th dot at
; ceil(k * frames / 4); the 4th is the full meter - a lance ready.
gauge_quarter_lo:
    .repeat 4, K
        .byte <(((K + 1) * LANCE_METER_EASY + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte <(((K + 1) * LANCE_METER_FRAMES + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte <(((K + 1) * LANCE_METER_HARD + 3) / 4)
    .endrepeat
gauge_quarter_hi:
    .repeat 4, K
        .byte >(((K + 1) * LANCE_METER_EASY + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte >(((K + 1) * LANCE_METER_FRAMES + 3) / 4)
    .endrepeat
    .repeat 4, K
        .byte >(((K + 1) * LANCE_METER_HARD + 3) / 4)
    .endrepeat

.segment "LANCE_BSS"
lance_beam:     .res 1                  ; 0 none, 1 growing, 2 .. 1 + LANCE_HOLD held, then erased
lance_head:     .res 1                  ; the beam's top line
lance_top:      .res 1                  ; the module's bottom line
lance_y:        .res 1                  ; the reticle's first line, 0 not drawn yet
_lance_module:  .res 1                  ; the target's module and band column; the beam's once fired
lance_cell:     .res 1
lance_ready:    .res 1                  ; what the indicator shows: $FF a lance ready, 0 not
lance_hollow:   .res 1                  ; the mark drawn: 0 the crosshair (lance_indicate's), $FF the hollow one
gauge_level:    .res 2                  ; the gauges' shown dots: the lance 0 + lit, the booster 4 + lit (0: not drawn)
gauge_ramp:     .res 1                  ; this ready frame's ramp index, GAUGE_SKIP on the mark's swap
