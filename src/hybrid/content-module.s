; Checked home shares the Director link for scalar C references. Only this
; header/data/code are emitted to the separate level-start content image.
.segment "CONTENT_HEADER"
content_tick: rts
.import __CONTENT_HEADER_SIZE__, __CONTENT_CODE_SIZE__, __CONTENT_DATA_SIZE__
content_end = $1180 + __CONTENT_HEADER_SIZE__ + __CONTENT_CODE_SIZE__ + __CONTENT_DATA_SIZE__
.export content_tick, content_end
.assert content_tick = $1180, lderror, "Content entry moved"
.assert content_end <= $1900, lderror, "Content home overflow"
.import _cc2_enter, _cc2_advance, _cc2_request, _cc2_world_row_tick, _cc2_heavy_tick
.segment "DIRECTOR_C_CODE"
; These resident guards replace policy bodies moved out of this segment.
; No content byte is read on an invalid entry. Preserve original fallback for
; the shared Bomber entry; other retired policy entries return without work.
cc2_valid:
    lda $86B3
    beq @no
    lda $9A
    cmp #6
    bne @no
    sec
    rts
@no: clc
    rts
.macro cc2_void name, target
name:
    jsr cc2_valid
    bcc :+
    jmp target
:   rts
.endmacro
cc2_void _asm_cc2_enter, _cc2_enter
cc2_void _asm_cc2_advance, _cc2_advance
cc2_void _director_c_world_row_tick, _cc2_world_row_tick
_asm_cc2_request:
    jsr cc2_valid
    bcc :+
    jmp _cc2_request
:   lda #0
    ldx #0
    rts
_enemy_c_heavy_tick:
    jsr cc2_valid
    bcc :+
    jmp _cc2_heavy_tick
:   jmp _enemy_c_heavy_tick_original
.export _asm_cc2_enter, _asm_cc2_advance, _asm_cc2_request
.export _director_c_world_row_tick, _enemy_c_heavy_tick
