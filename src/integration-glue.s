.setcpu "6502"
.include "capital-hulls.inc"
PLAYER_LIFECYCLE = $4EAA
ENTITY_SPAWN_TIMER_LO = $8003
PLAYER_DYING = 1
PLAYER_GAME_OVER = 3
ACTIVE_GAMEPLAY_FRAME_LO = $4FF8
ACTIVE_GAMEPLAY_FRAME_HI = $4FF9
DIRECTOR_WORLD_ROW_TICK = $9D9B
DIRECTOR_REQUEST = $9EA7
DIRECTOR_RELEASE = $9F23
DIRECTOR_HAZARD_DEBRIS = 1
ENTITY_REPEAT_SPAWN_DELAY = 64
entity_spawn_debris = $98FF
entity_despawn_debris = $9A13
free_broadside_slot = $76C1
HULL_DRAW_ROW_LO = $85F0
HULL_DRAW_ROW_HI = $85F1
BROAD_WORK_COUNT = $4E63
BROAD_STATE = $4E40
BROAD_OWNER = $4E43
BROAD_X = $4E49
BROAD_PREV_Y = $4E52
BROAD_PREV_H = $4E55
BROAD_COLLISION = $4E58
BROAD_WORK_SLOT = $4E62
BROAD_WORK_VALUE = $4E64
BROAD_ROW_LO = $4E69
BROAD_ROW_HI = $4E6C
BROAD_FLYING = 2
row_counter = $8F
loader_repeat_value = $93
src_ptr = $94
dst_ptr = $96
CH_SPACE = 0
CAPITAL_SHELL_LEFT_GLYPH = 126
CORRIDOR_ALLIED_COLUMNS = 8
CORRIDOR_ENEMY_FIRST = 32
.segment "GLUE"
.export integration_director_world_row, integration_debris_spawn, integration_debris_release
.export integration_active_gameplay_tick
.export integration_apply_allied_prow, integration_apply_enemy_prow
.export capital_shell_glyph_source
.export render_capital_shell_overlay, capital_shell_draw_begin
.export capital_shell_backing_captured, capital_shell_draw_end
integration_director_world_row:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @frozen
    cmp #PLAYER_GAME_OVER
    beq @frozen
    jmp DIRECTOR_WORLD_ROW_TICK
@frozen:
    rts
integration_debris_spawn:
    ldx #DIRECTOR_HAZARD_DEBRIS
    jsr DIRECTOR_REQUEST
    bcs @spawn
    lda #ENTITY_REPEAT_SPAWN_DELAY
    sta ENTITY_SPAWN_TIMER_LO
    rts
@spawn:
    jmp entity_spawn_debris
integration_debris_release:
    ldx #DIRECTOR_HAZARD_DEBRIS
    jsr DIRECTOR_RELEASE
    jmp entity_despawn_debris

integration_apply_allied_prow:
    jmp apply_allied_prow_profile
integration_apply_enemy_prow:
    jmp apply_enemy_prow_profile

apply_allied_prow_profile:
    ldx #$00
    beq apply_prow_profile
apply_enemy_prow_profile:
    ldx #$01

apply_prow_profile:
    lda HULL_DRAW_ROW_HI
    cmp #>CAPITAL_HULL_SECTION_FORWARD_END
    bcc @done
    bne :+
    lda HULL_DRAW_ROW_LO
    cmp #<CAPITAL_HULL_SECTION_FORWARD_END
    bcc @done
:
    lda HULL_DRAW_ROW_HI
    cmp #>CAPITAL_HULL_SECTION_PROW_END
    bcc :+
    bne @done
    lda HULL_DRAW_ROW_LO
    cmp #<CAPITAL_HULL_SECTION_PROW_END
    bcs @done
:
    lda HULL_DRAW_ROW_LO
    sec
    sbc #<CAPITAL_HULL_SECTION_FORWARD_END
    tay
    lda (src_ptr),y
    sta loader_repeat_value
    lda #$FF
    sta row_counter
    ldy prow_first_columns,x
@cell:
    lsr loader_repeat_value
    bcc @clear
    cpx #$00
    beq @set_edge
    lda row_counter
    bpl :+
@set_edge:
    sty row_counter
:
    lda (dst_ptr),y
    bne @next
    lda prow_fill_codes,x
    sta (dst_ptr),y
    bne @next
@clear:
    lda #CH_SPACE
    sta (dst_ptr),y
@next:
    iny
    tya
    cmp prow_end_columns,x
    bne @cell
    ldy row_counter
    lda prow_edge_codes,x
    sta (dst_ptr),y
@done:
    rts

prow_first_columns:
    .byte $00,CORRIDOR_ENEMY_FIRST
prow_end_columns:
    .byte CORRIDOR_ALLIED_COLUMNS,40
prow_fill_codes:
    .byte CAPITAL_HULL_ALLIED_PROW_FILL_CODE,CAPITAL_HULL_ENEMY_PROW_FILL_CODE
prow_edge_codes:
    .byte CAPITAL_HULL_ALLIED_PROW_EDGE_CODE,CAPITAL_HULL_ENEMY_PROW_EDGE_CODE

; The former projectile/projectile collision routine occupied this fixed ABI
; window. Opposite-owner shells now pass through one another, so the same bytes
; hold the left-half source and bounded renderer for one continuous 8x6 bolt.
; BROADSIDE init derives the right half into the otherwise-free glyph 127.
integration_capital_shell_overlap:
capital_shell_glyph_source:
    .byte $00,$3E,$3E,$7F,$7F,$3E,$3E,$00

render_capital_shell_overlay:
capital_shell_draw_begin:
    lda BROAD_ROW_LO,x
    sta dst_ptr
    lda BROAD_ROW_HI,x
    sta dst_ptr+1
    lda BROAD_X,x
    sec
    sbc #48
    lsr
    lsr
    tay
    tya
    clc
    adc #$01
    sta BROAD_PREV_H,x          ; nonzero prior-column token
    lda (dst_ptr),y
    sta BROAD_PREV_Y,x          ; first backing byte
    iny
    lda (dst_ptr),y
    sta BROAD_COLLISION,x       ; second backing byte
capital_shell_backing_captured:
    dey
    lda BROAD_OWNER,x
    beq @allied
    lda #(CAPITAL_SHELL_LEFT_GLYPH|CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE)
    bne @draw
@allied:
    lda #CAPITAL_SHELL_LEFT_GLYPH
@draw:
    sta (dst_ptr),y
    iny
    clc
    adc #$01
    sta (dst_ptr),y
capital_shell_draw_end:
    rts
    .res 3,$00

integration_broadside_release:
    txa
    tay
    ldx #$02
    jsr DIRECTOR_RELEASE
    tya
    tax
    jmp free_broadside_slot

; The main loop calls this only below the pause/frontend gate. Odd player
; lifecycles are DYING/GAME OVER and freeze the active-gameplay schedule.
integration_active_gameplay_tick:
    lda PLAYER_LIFECYCLE
    lsr
    bcs @frozen
    inc ACTIVE_GAMEPLAY_FRAME_LO
    bne @frozen
    inc ACTIVE_GAMEPLAY_FRAME_HI
@frozen:
    rts

.assert integration_apply_allied_prow = $4F25, error, "allied prow glue ABI moved"
.assert integration_apply_enemy_prow = $4F28, error, "enemy prow glue ABI moved"
.assert capital_shell_glyph_source = $4F97, error, "capital shell glyph source ABI moved"
.assert render_capital_shell_overlay = $4F9F, error, "capital shell renderer glue ABI moved"
.assert integration_broadside_release = $4FDC, error, "broadside release glue ABI moved"
.assert integration_active_gameplay_tick = $4FE8, error, "active gameplay clock glue ABI moved"
.assert * <= $5000, error, "integration glue exceeds reviewed $4EFE-$4FFF residency"
