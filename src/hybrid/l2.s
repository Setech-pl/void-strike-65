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
    jmp l2_enter
    jmp l2_commit_row
_l2_rate = L2_SCROLL_RATE
    .byte 0 ; retired slot retains every following hot address
.export _l2_rate
.assert _l2_rate = L2_SCROLL_RATE, lderror, "L2 cached rate ABI moved"
l2_init:
    jmp l2_rearm
    jmp l2_space
l2_brake_before_enemy:
    jsr l2_content_brake
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
    cpx #CAPITAL_HULL_SECTOR_MODULE_COUNT
    bcc :+
    lda #0
    rts
:
    lda L2_LOOKUP,x
    bne :+
    rts
:
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
    and #3
    tay
    lda l2_recipe_offsets,y
    clc
    adc l2_index
    tax
    stx l2_recipe
    lda l2_tag
    and #8
    beq @allied
    lda #(CAPITAL_HULL_ENEMY_SURFACE_BASE | $80)
    bne @palette
@allied:
    lda #CAPITAL_HULL_GLYPH_BASE
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
    jsr l2_place_interval
    cmp l2_left
    beq @none
    bcc @none
    lda #1
    rts
@none:
    lda #0
    rts

    .res 7,0                       ; state gate moved resident; retain hot addresses
l2_contact:
    lda player_x
    cmp #168
    bcs @base
    clc
    adc #(PLAYER_VISIBLE_WIDTH_HPOS-1)
    cmp #88
    bcc @base
    jsr l2_island_contact
@base:
    lda player_x
    cmp #(CORRIDOR_LEFT_HPOS+4)
    bcc @edge
    adc #(PLAYER_COLLISION_WIDTH-2)
    cmp #(CORRIDOR_RIGHT_HPOS-4)
    bcs @edge
    sec
    rts
@edge:
    clc
    rts

l2_island_contact:
    lda #0
    sta l2_sprite_row
@scanline:
    lda player_y
    clc
    adc l2_sprite_row
    sec
    sbc #BROADSIDE_SCREEN_TOP
    pha
    and #7
    sta l2_glyph_row
    pla
    lsr
    lsr
    lsr
    jsr visible_hull_sector_row
    bcs @next_row
    tya
    jsr l2_interval
    beq @next_row
    lda player_x
    cmp l2_right
    bcs @next_row
    clc
    adc #(PLAYER_VISIBLE_WIDTH_HPOS-1)
    cmp l2_left
    bcc @next_row
    ldx l2_sprite_row
    lda player_shape,x
    sta l2_sprite_bits
    lda player_x
    sta l2_pixel_x
@pixel:
    lda l2_sprite_bits
    bpl @next_bit
    jsr l2_solid_pixel
    bne @hit
    inc l2_pixel_x
    jsr l2_solid_pixel
    bne @hit
    dec l2_pixel_x
@next_bit:
    inc l2_pixel_x
    inc l2_pixel_x
    asl l2_sprite_bits
    bne @pixel
@next_row:
    inc l2_sprite_row
    lda l2_sprite_row
    cmp #(PLAYER_COLLISION_LAST_ROW+1)
    bcc @scanline
    rts
@hit:
    ; Same nearest-side/tie-left displacement, using the drawn width.
    lda player_x
    clc
    adc #PLAYER_VISIBLE_WIDTH_HPOS
    sec
    sbc l2_left
    sta l2_work
    lda l2_right
    sec
    sbc player_x
    cmp l2_work
    bcc @right
    lda l2_left
    sec
    sbc #PLAYER_VISIBLE_WIDTH_HPOS
    jmp @push
@right:
    lda l2_right
@push:
    sta player_x
    sta $D000
    ldx #0
    jmp apply_broadside_player_damage


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
    cpy l2_motif_column
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
l2_end_column: .byte 0
l2_fill: .byte 0
.include "l2-c.inc"
; Checked load + INIT is the only re-arm point after a phase overwrite.
l2_rearm:
    jmp l2_content_load                   ; load guard cleared it before the checked run
l2_space:
    ldx DIFFICULTY_SETTING
    lda _l2_normal_rates,x
    sta _l2_rate
    lda #<integration_update_enemy
    sta profile_after_player+1
    lda #>integration_update_enemy
    bne l2_store_hook_hi            ; always nonzero; share the cold store/return
.assert >integration_update_enemy <> 0, error, "L2 SPACE tail requires a nonzero resident page"
l2_enter:
    jsr _l2_c_enter                 ; C decides/initializes the capital geometry
    lda #<L2_BRAKE
    sta profile_after_player+1
    lda #>L2_BRAKE
l2_store_hook_hi:
    sta profile_after_player+2
    rts
; Placed after the C/cold tail to reuse the earlier page-alignment slack.
; No extra call or indexed-table page penalty.
; Exact ANTIC 4 pair at one HPOS, from the same immutable recipe and
; charset used by the row publisher. No screen/backing or shared state writes.
l2_solid_pixel:
    lda l2_pixel_x
    cmp l2_left
    bcc @empty
    cmp l2_right
    bcs @empty
    and #$FC
    ldx l2_recipe
    cmp l2_left
    beq @left
    clc
    adc #4
    cmp l2_right
    beq @right
    sbc #4                      ; carry clear when below the right edge
    cmp l2_motif_pixel          ; previous SBC produced column origin - 1
    beq @motif
    lda l2_recipes+3,x
    jmp @glyph
@motif:
    lda l2_recipes+4,x
    jmp @glyph
@left:
    lda l2_recipes+2,x
    jmp @glyph
@right:
    lda l2_recipes+5,x
@glyph:
    clc
    adc l2_palette
    and #127
    pha
    lsr
    lsr
    lsr
    lsr
    lsr
    clc
    adc #>CHARSET
    sta @read+2
    pla
    asl
    asl
    asl
    ora l2_glyph_row
    sta @read+1
    lda l2_pixel_x
    and #3
    tax
@read:
    lda CHARSET
    and l2_pixel_masks,x
    rts
@empty:
    lda #0
    rts
l2_pixel_masks: .byte $C0,$30,$0C,$03
l2_sprite_row: .byte 0
l2_glyph_row: .byte 0
l2_sprite_bits: .byte 0
l2_pixel_x: .byte 0

l2_place_interval:
    lda l2_tag
    lsr
    lsr
    lsr
    lsr
    lsr
    lsr
    tay
    lda L2_LOOKUP-124,y          ; authored offsets at extension bytes 4..7
    sta l2_shift
    clc
    adc #127
    sta l2_motif_pixel
    lda l2_shift
    clc
    adc #80
    lsr
    lsr
    sta l2_motif_column
    lda l2_left
    clc
    adc l2_shift
    sta l2_left
    lda l2_right
    clc
    adc l2_shift
    sta l2_right
    rts

l2_shift: .byte 0
l2_motif_pixel: .byte 0
l2_motif_column: .byte 0

; Appended hooks preserve the established pre-warning page alignment.
l2_content_brake:
    lda L2_VALID
    beq :+
    lda game_state
    cmp #6
    bne :+
    jsr $1180
:
    jmp _l2_brake_tick
l2_content_load:
    ldx #12
    jsr $A006
    bcc :+
    jmp $A21E
:
    inc L2_VALID
    jmp l2_space
; Only called by the checked reader for content after L2 passed its checksum.
l2_content_fold:
    lda #<CONTENT_EXPECTED_FOLD
    ldy #>CONTENT_EXPECTED_FOLD
    jmp CONTENT_GUARD_COMPARE
l2_end:
.export l2_content_fold
.export l2_start,l2_end,l2_interval,l2_draw_row,l2_contact,l2_island_contact,l2_commit_row,l2_recipes
.export l2_space,l2_enter,l2_rearm
.assert l2_start = L2_INIT, lderror, "L2 ABI moved"
.assert l2_end <= $2000-256, lderror, "L2 spends post-1.0 reserve"
