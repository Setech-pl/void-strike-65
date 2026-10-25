.setcpu "6502"
.include "l2-abi.inc"
.include "l2-main.inc"
.segment "L2"
l2_start:
    jmp l2_init
    jmp l2_draw_row
    jmp l2_contact
    jmp l2_brake_before_enemy
    jmp _l2_warning_set_timer
    jmp _l2_c_phase
    jmp _l2_c_enter
    jmp l2_commit_row
_l2_rate = L2_SCROLL_RATE
    .byte 0 ; retired slot retains every following hot address
.export _l2_rate
.assert _l2_rate = L2_SCROLL_RATE, lderror, "L2 cached rate ABI moved"
l2_init:
    jmp l2_rearm
    .res 3,$EA
l2_brake_before_enemy:
    jsr _l2_brake_tick
    jmp integration_update_enemy

; One renderer body stays in MAIN/BROADSIDE. Execute displaced instructions.
l2_original_row:
    lda corridor_phase
    sta HULL_DRAW_ROW_LO
    jmp draw_hull_row+5

; Row interval (HPOS half-open) and recipe index, from full X:A coordinate.
; At most one indexed lookup; no scan over fragments. Negative rows reject.
l2_interval:
    cpx #4
    bcc :+
    lda #0
    rts
:
    sta l2_work
    txa
    asl
    asl
    asl
    asl
    asl
    sta l2_index
    lda l2_work
    lsr
    lsr
    lsr
    ora l2_index
    tax
    cpx #120
    bcs @none
    lda $AD80,x
    beq @none
    sec
    sbc #1
    sta l2_tag
    and #7
    tay
    lda l2_part_offsets,y
    sta l2_index
    lda l2_tag
    lsr
    lsr
    lsr
    lsr
    tay
    lda l2_recipe_offsets,y
    clc
    adc l2_index
    tax
    stx l2_recipe
    lda l2_tag
    and #8
    beq @allied
    lda #198
    bne @palette
@allied:
    lda #59
@palette:
    sta l2_palette
    ldy DIFFICULTY_SETTING
    lda l2_recipes,x
    asl
    asl
    clc
    adc #128
    cmp l2_left_caps,y
    bcs :+
    lda l2_left_caps,y
:
    sta l2_left
    lda l2_recipes+1,x
    asl
    asl
    clc
    adc #128
    cmp l2_right_caps,y
    bcc :+
    lda l2_right_caps,y
:
    sta l2_right
    cmp l2_left
    beq @none
    bcc @none
    lda #1
    rts
@none:
    lda #0
    rts

l2_contact:
    lda CAPITAL_SECTOR_STATE
    cmp #5
    bcs @base
    lda player_x
    cmp #148
    bcs @base
    clc
    adc #7
    cmp #108
    bcc @base
    jsr l2_island_contact
@base:
    lda player_x
    cmp #$54
    bcc @edge
    adc #6
    cmp #$AC
    bcs @edge
    sec
    rts
@edge:
    clc
    rts

l2_island_contact:
    lda #255
    sta l2_union_left
    lda #0
    sta l2_union_right
    lda player_y
    sec
    sbc #8
    pha
    and #7
    clc
    adc #14
    lsr
    lsr
    lsr
    clc
    adc #1
    sta l2_rows_left
    pla
    lsr
    lsr
    lsr
    jsr visible_hull_sector_row
    bcs @done
    sty l2_source_lo
    stx l2_source_hi
@row:
    lda l2_source_lo
    ldx l2_source_hi
    jsr l2_interval
    beq @next
    lda l2_left
    cmp l2_union_left
    bcs :+
    sta l2_union_left
:
    lda l2_right
    cmp l2_union_right
    bcc @next
    sta l2_union_right
@next:
    lda l2_source_lo
    bne :+
    dec l2_source_hi
:
    dec l2_source_lo
    dec l2_rows_left
    bne @row
    lda l2_union_right
    beq @done
    lda player_x
    cmp l2_union_right
    bcs @done
    clc
    adc #7
    cmp l2_union_left
    bcc @done
    ; Choose minimum displacement; ties left. Supports asymmetric intervals.
    lda player_x
    clc
    adc #8
    sec
    sbc l2_union_left
    sta l2_work
    lda l2_union_right
    sec
    sbc player_x
    cmp l2_work
    bcc @right
    lda l2_union_left
    sec
    sbc #8
    jmp @push
@right:
    lda l2_union_right
@push:
    sta player_x
    sta $D000
    ldx #0
    jmp apply_broadside_player_damage
@done:
    rts

l2_draw_row:
    jsr l2_original_row
    lda #0
    ldy #9
@clear:
    sta (dst_ptr),y
    iny
    cpy #31
    bne @clear
    lda corridor_phase
    ldx CORRIDOR_PHASE_HI
    jsr l2_interval
    beq @done
    lda l2_left
    sec
    sbc #48
    lsr
    lsr
    tay
    lda l2_right
    sec
    sbc #48
    lsr
    lsr
    sec
    sbc #1
    sta l2_end_column
    ldx l2_recipe
    lda l2_recipes+2,x
    clc
    adc l2_palette
    sta (dst_ptr),y
    iny
    lda l2_recipes+3,x
    clc
    adc l2_palette
    sta l2_fill
@body:
    cpy l2_end_column
    bcs @edge
    lda l2_fill
    cpy #20
    bne :+
    lda l2_recipes+4,x
    clc
    adc l2_palette
:
    sta (dst_ptr),y
    iny
    bne @body
@edge:
    lda l2_recipes+5,x
    clc
    adc l2_palette
    sta (dst_ptr),y
@done:
    rts

l2_commit_row:
    ldy #39
@copy:
    lda PREPARED_HULL_ROW,y
    sta GAMEPLAY_DIVIDER_SCREEN,y
    dey
    bpl @copy
    rts
    .align $100                 ; all indexed geometry/art tables stay within a page
l2_part_offsets: .byte 0,6,12,18,24,30
l2_recipe_offsets: .byte 0,36,72
l2_left_caps: .byte 116,112,108
l2_right_caps: .byte 140,144,148
l2_recipes:
.include "l2-recipes.inc"
l2_work: .byte 0
l2_index: .byte 0
l2_tag: .byte 0
l2_recipe: .byte 0
l2_palette: .byte 0
l2_left: .byte 0
l2_right: .byte 0
l2_union_left: .byte 0
l2_union_right: .byte 0
l2_rows_left: .byte 0
l2_source_lo: .byte 0
l2_source_hi: .byte 0
l2_end_column: .byte 0
l2_fill: .byte 0
.include "l2-c.inc"
; Checked load + INIT is the only re-arm point after a phase overwrite.
l2_rearm:
    inc L2_VALID                   ; load guard cleared it before the checked run
    lda #<L2_BRAKE
    sta profile_after_player+1
    lda #>L2_BRAKE
    sta profile_after_player+2
    lda #0
    sta _l2_rate
    rts
l2_end:
.export l2_start,l2_end,l2_interval,l2_draw_row,l2_contact,l2_island_contact,l2_commit_row,l2_recipes
.assert l2_start = L2_INIT, lderror, "L2 ABI moved"
.assert l2_end <= $2000-256, lderror, "L2 spends post-1.0 reserve"
