; P5: immutable detached hull fragments, one interval per row.
; No renderer copy: execute the original body's displaced first 5 bytes,
; then continue in place. The trampoline is 8 B versus a 191-B body copy.
.segment "SPIKE_NACELLES"
spike_nacelles_start:
spike_safe_corridor = p5_safe_corridor
spike_commit_strips = p5_commit_row
p5_safe_corridor:
    ; One widest-island reject avoids row work in either safe side lane.
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bcs @base
    lda player_x
    cmp #148
    bcs @base
    clc
    adc #7
    cmp #108
    bcc @base
    jsr p5_island_contact
@base:
    lda player_x
    cmp #$54
    bcc @edge
    adc #(PLAYER_COLLISION_WIDTH-2)
    cmp #$AC
    bcs @edge
    sec
    rts
@edge:
    clc
    rts

; X:A = finite source row. A = island half-width in cells (0..5).
p5_half_width:
    cpx #2
    bcs @none
    sta p5_work
    txa
    lsr
    lda p5_work
    ror
    lsr
    lsr
    ldx DIFFICULTY_SETTING
    clc
    adc p5_difficulty_offsets,x
    tay
    lda p5_half_width_tables,y
    rts
@none:
    lda #0
    rts

p5_island_contact:
    lda #0
    sta p5_max_half
    lda player_y
    sec
    sbc #BROADSIDE_SCREEN_TOP
    pha
    and #7
    clc
    adc #PLAYER_COLLISION_LAST_ROW
    lsr
    lsr
    lsr
    clc
    adc #1
    sta p5_rows_left
    pla
    lsr
    lsr
    lsr
    jsr visible_hull_sector_row
    bcs @done
    sty p5_source_lo
    stx p5_source_hi
@row:
    lda p5_source_lo
    ldx p5_source_hi
    jsr p5_half_width
    cmp p5_max_half
    bcc :+
    sta p5_max_half
:
    lda p5_source_lo
    bne :+
    dec p5_source_hi
:
    dec p5_source_lo
    dec p5_rows_left
    bne @row
    lda p5_max_half
    beq @done
    asl
    asl
    sta p5_work
    lda #128
    sec
    sbc p5_work
    sta p5_left
    lda #128
    clc
    adc p5_work
    sta p5_right
    lda player_x
    cmp p5_right
    bcs @done
    clc
    adc #7
    cmp p5_left
    bcc @done
    ; Minimum displacement of the logical envelope; exact ties push left.
    lda player_x
    clc
    adc #4
    cmp #129
    bcs @right
    lda p5_left
    sec
    sbc #PLAYER_COLLISION_WIDTH
    jmp @push
@right:
    lda p5_right
@push:
    sta player_x
    sta HPOSP0
    ldx #0
    jmp apply_broadside_player_damage
@done:
    rts

p5_original_row:
    lda corridor_phase
    sta HULL_DRAW_ROW_LO
    jmp draw_hull_row+5

p5_draw_hull_row:
    jsr p5_original_row
    ; Always publish both the geometry and its blank rows, so recycled cells
    ; cannot retain an island. Stars remain the lowest dynamic layer.
    lda #CH_SPACE
    ldy #9
@clear:
    sta (dst_ptr),y
    iny
    cpy #31
    bne @clear
    lda corridor_phase
    ldx CORRIDOR_PHASE_HI
    jsr p5_half_width
    beq @done
    sta p5_max_half
    lda #20
    sec
    sbc p5_max_half
    tay
    lda #20
    clc
    adc p5_max_half
    sta p5_end_column
    ; Detached allied plate: the hull's own surface glyph and PF1 steel.
    lda #CAPITAL_HULL_ALLIED_PROW_FILL_CODE
@plate:
    sta (dst_ptr),y
    iny
    cpy p5_end_column
    bne @plate
@done:
    rts

p5_commit_row:
    ldy #39
@copy:
    lda PREPARED_HULL_ROW,y
    sta GAMEPLAY_DIVIDER_SCREEN,y
    dey
    bpl @copy
    rts
spike_nacelles_code_end:
p5_difficulty_offsets: .byte 0,64,128
.include "spike-nacelles-data.inc"
spike_nacelles_data_end:
p5_work: .byte 0
p5_max_half: .byte 0
p5_rows_left: .byte 0
p5_source_lo: .byte 0
p5_source_hi: .byte 0
p5_left: .byte 0
p5_right: .byte 0
p5_end_column: .byte 0
.if SPIKE_THROTTLE
.include "spike-throttle.s"
.endif
.if SPIKE_FAIR_WARNING
.include "spike-warning.s"
.endif
spike_nacelles_end:
.assert spike_nacelles_end <= $B8FB, lderror, "P5 exceeds permitted window"
