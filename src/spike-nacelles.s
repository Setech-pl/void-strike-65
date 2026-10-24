; Throwaway §BU.2 proof. Entire segment is inside the L1-free 1155 bytes.
; Build-time immutable extent policy; production C entry selection is L2 work.
.segment "SPIKE_NACELLES"
spike_nacelles_start:

; Capital-only geometric clamp before the normal entity update and
; publication. The shared admission/spawn paths are untouched. Debris is
; the fixed two-cell slot zero; no policy or RNG state is changed.
spike_safe_corridor:
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_COMPLETE
    bcs @player
    lda ENTITY_ACTIVE_MASK
    and #1
    beq @player
    lda ENTITY_X
    cmp #96
    bcs :+
    lda #96
:
    cmp #153
    bcc :+
    lda #152
:
    sta ENTITY_X
@player:
    lda player_x
    cmp #$5C
    bcc @edge
    adc #(PLAYER_COLLISION_WIDTH-2)
    cmp #$A4
    bcs @edge
    sec
    rts
@edge:
    clc
    rts

; X:A is the actual side's finite sector row. Return A=0,1,2 added
; columns beyond the nine-cell map. EASY caps at one (10 cells/side).
spike_extent:
    cpx #2
    bcs @zero
    sta spike_row
    txa
    lsr
    lda spike_row
    ror
    lsr
    lsr
    tay
    cpy #60
    bcs @zero
    lda spike_pattern_data,y
    ldx spike_side
    beq :+
    lsr
    lsr
:
    and #3
    beq @done
    ldx DIFFICULTY_SETTING
    bne @done
    lda #1
@done:
    rts
@zero:
    lda #0
    rts

spike_allied_boundary:
    lda allied_collision_boundaries,y
    sta spike_boundary
    lda #0
    sta spike_side
    lda HULL_DRAW_ROW_LO
    ldx HULL_DRAW_ROW_HI
    jsr spike_extent
    beq @base
    asl
    asl
    clc
    adc #84                     ; 48 + 9*4
    rts
@base:
    lda spike_boundary
    rts

spike_enemy_boundary:
    lda enemy_collision_boundaries,y
    sta spike_boundary
    lda #1
    sta spike_side
    lda HULL_DRAW_ROW_LO
    sec
    sbc #8
    sta spike_row
    lda HULL_DRAW_ROW_HI
    sbc #0
    tax
    lda spike_row
    jsr spike_extent
    beq @base
    asl
    asl
    sta spike_row
    lda #172                    ; 48 + 31*4
    sec
    sbc spike_row
    rts
@base:
    lda spike_boundary
    rts

spike_draw_hull_row:
    jsr spike_base_draw_hull_row
    ; Separately reserved four strip cells per source-row modulo 32. Both
    ; clear and publication are explicit even on zero-extent entry/exit rows.
    lda corridor_phase
    and #31
    asl
    tax
    stx spike_strip_index
    lda #CH_SPACE
    sta spike_left_strips,x
    sta spike_left_strips+1,x
    sta spike_right_strips,x
    sta spike_right_strips+1,x
    ldy #9
    sta (dst_ptr),y
    iny
    sta (dst_ptr),y
    ldy #29
    sta (dst_ptr),y
    iny
    sta (dst_ptr),y
    lda #0
    sta spike_side
    lda corridor_phase
    ldx CORRIDOR_PHASE_HI
    jsr spike_extent
    beq @enemy
    sta spike_width
    ldx spike_strip_index
    lda #CAPITAL_HULL_ALLIED_PROW_FILL_CODE
    sta spike_left_strips,x
    ldy spike_width
    cpy #2
    bne :+
    sta spike_left_strips+1,x
:
    ldy #10
    ldx spike_width
    cpx #2
    beq :+
    dey
:
@left:
    sta (dst_ptr),y
    dey
    cpy #4                     ; fill through column 5: no internal holes
    bne @left
@enemy:
    lda #1
    sta spike_side
    lda corridor_phase
    sec
    sbc #8
    sta spike_row
    lda CORRIDOR_PHASE_HI
    sbc #0
    tax
    lda spike_row
    jsr spike_extent
    beq @done
    sta spike_width
    lda #CAPITAL_HULL_ENEMY_PROW_FILL_CODE
    ldx spike_strip_index
    sta spike_right_strips,x
    ldy spike_width
    cpy #2
    bne :+
    sta spike_right_strips+1,x
:
    ldy #29
    ldx spike_width
    cpx #2
    beq :+
    iny
:
@right:
    sta (dst_ptr),y
    iny
    cpy #35
    bne @right
@done:
    rts

; Same cache key: coordinate/phase/physical row plus immutable difficulty
; already uniquely bind this immutable build-time pattern. Copy added cells.
spike_commit_strips:
    lda PREPARED_HULL_ROW+8
    sta GAMEPLAY_DIVIDER_SCREEN+8
    lda PREPARED_HULL_ROW+9
    sta GAMEPLAY_DIVIDER_SCREEN+9
    lda PREPARED_HULL_ROW+10
    sta GAMEPLAY_DIVIDER_SCREEN+10
    lda PREPARED_HULL_ROW+29
    sta GAMEPLAY_DIVIDER_SCREEN+29
    lda PREPARED_HULL_ROW+30
    sta GAMEPLAY_DIVIDER_SCREEN+30
    rts
spike_base_draw_hull_row:
    lda corridor_phase
    sta HULL_DRAW_ROW_LO
    ldx CORRIDOR_PHASE_HI
    stx HULL_DRAW_ROW_HI
    jsr resolve_allied_sector_row
    bcs @blank_allied
    jsr set_allied_hull_source
    ldy #$00
@allied_hull:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    cpy #CAPITAL_HULL_MAP_COLUMNS
    bne @allied_hull
    lda #<allied_prow_occupancy_masks
    sta src_ptr
    lda #>allied_prow_occupancy_masks
    sta src_ptr+1
    jsr integration_apply_allied_prow
    lda BROAD_WORK_VALUE
    cmp #CAPITAL_HULL_ALLIED_ENGINE_MODULE
    bne @enemy
    ldy BROAD_WORK_COUNT
    lda allied_engine_overlay_masks,y
    sta loader_repeat_value
    ldy #$00
@allied_engine:
    lsr loader_repeat_value
    bcc :+
    lda #CAPITAL_HULL_ALLIED_ENGINE_CODE
    sta (dst_ptr),y
:
    iny
    cpy #CORRIDOR_ALLIED_COLUMNS
    bne @allied_engine
    jmp @enemy
@blank_allied:
    lda #CH_SPACE
    ldy #(CORRIDOR_ALLIED_COLUMNS-1)
@clear_allied:
    sta (dst_ptr),y
    dey
    bpl @clear_allied

@enemy:
    lda corridor_phase
    sec
    sbc #CAPITAL_HULL_SIDE_PHASE_ROWS
    sta HULL_DRAW_ROW_LO
    lda CORRIDOR_PHASE_HI
    sbc #$00
    tax
    stx HULL_DRAW_ROW_HI
    bcc @blank_enemy
    lda HULL_DRAW_ROW_LO
    jsr resolve_enemy_sector_row
    bcs @blank_enemy
    jsr set_enemy_hull_source
    sec
    lda src_ptr
    sbc #31                       ; Y=31 addresses enemy runtime column zero
    sta src_ptr
    lda src_ptr+1
    sbc #$00
    sta src_ptr+1
    ldy #31
@enemy_hull:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    cpy #40
    bne @enemy_hull
    lda #<enemy_prow_occupancy_masks
    sta src_ptr
    lda #>enemy_prow_occupancy_masks
    sta src_ptr+1
    jsr integration_apply_enemy_prow
    lda BROAD_WORK_VALUE
    cmp #CAPITAL_HULL_ENEMY_ENGINE_MODULE
    bne @done
    ldy BROAD_WORK_COUNT
    lda enemy_engine_overlay_masks,y
    sta loader_repeat_value
    ldy #CORRIDOR_ENEMY_FIRST
@enemy_engine:
    lsr loader_repeat_value
    bcc :+
    lda #CAPITAL_HULL_ENEMY_ENGINE_CODE
    sta (dst_ptr),y
:
    iny
    cpy #40
    bne @enemy_engine
    rts
@blank_enemy:
    lda #CH_SPACE
    ldy #39
@clear_enemy:
    sta (dst_ptr),y
    dey
    cpy #(CORRIDOR_ENEMY_FIRST-1)
    bne @clear_enemy
@done:
    rts
spike_nacelles_code_end:
.include "spike-nacelles-data.inc"
spike_nacelles_data_end:
spike_row: .byte 0
spike_side: .byte 0
spike_boundary: .byte 0
spike_width: .byte 0
spike_strip_index: .byte 0
spike_left_strips: .res 64, 0
spike_right_strips: .res 64, 0
spike_nacelles_end:
.assert spike_nacelles_end <= $B8FB, lderror, "Nacelle spike exceeds L1-free window"
