; H12 hardware executor. The resident validity/phase guard is the only entry.
; C (or the checkpoint-5 review fixture) writes desired stages at $54C4/5.
; No stack parameters, new ZP, per-frame polling, collision or PMG ownership.
heavy_damage_stage = heavy_body_index+2
heavy_damage_retry = heavy_body_index+4
heavy_damage_request = heavy_body_index+6
heavy_damage_buffer = $549E
heavy_damage_member_state = $5470
heavy_damage_target_slot = $5486
heavy_damage_draw = $6385
.export heavy_damage_stage, heavy_damage_retry, heavy_damage_request
.export heavy_damage_member_state, heavy_damage_target_slot, heavy_damage_draw
.export heavy_damage_publish, heavy_damage_stamp, heavy_visual_retry
.import _enemy_c_heavy_visual_claim
heavy_breakup_spawn = $8A9B ; old entry + nonzero trampoline
.export heavy_breakup_spawn

.segment "HYBRID_ASM_HEAVY_WINDOW"
heavy_damage_publish:
    jsr cc2_valid
    bcc heavy_damage_drop
    jmp heavy_damage_stamp
heavy_visual_retry:
    tya
    bpl @damage
    ; Death keeps its old forcing rule. Mark surviving damage deferred too.
    and #3
    sta heavy_damage_retry       ; only a surviving pending request was deferred
    jmp heavy_breakup_spawn
@damage:
    jsr cc2_valid
    bcc heavy_damage_drop
    jsr _enemy_c_heavy_visual_claim
    beq @done
    jmp heavy_damage_stamp
@done: rts
heavy_damage_drop:
    lda _heavy_breakup_pending
    and #$80
    sta _heavy_breakup_pending
    lda #0
    sta heavy_damage_retry
    sta heavy_damage_request
    sta heavy_damage_request+1
    rts

.if HEAVY_DAMAGE_REVIEW
; Compile-time review only: one member stage1, peer stage2 at each admission.
; Whole-body normal campaign has no caller until checkpoint 6.
heavy_damage_review:
    lda heavy_body_flags
    bne :+
    lda heavy_abi_shape
    cmp #2
    bne @done
:   lda #1
    sta heavy_damage_request
    lda #2
    sta heavy_damage_request+1
    jmp heavy_damage_publish
@done: rts
.endif

.segment "CONTENT_CODE"
heavy_damage_stamp:
    lda heavy_damage_request
    ora heavy_damage_request+1
    bne :+
    rts
:   lda heavy_body_flags
    lsr
    bcs @members
    ; Both intact sources share the admission base/index. Copy once, including
    ; padding, so an undamaged peer never acquires its partner's holes.
    lda heavy_body_base_operand
    sta @source+1
    lda heavy_body_base_operand+1
    sta @source+2
    ldx heavy_body_index
    ldy #0
@source:
    lda $FFFF,x
    sta heavy_damage_buffer,y
    sta heavy_damage_buffer+16,y
    inx
    iny
    cpy #16
    bne @source
    lda #<heavy_damage_buffer
    sta heavy_body_base_operand
    lda #>heavy_damage_buffer
    sta heavy_body_base_operand+1
    lda #0
    sta heavy_body_index
    lda #16
    sta heavy_body_index+1
    lda heavy_body_flags
    ora #1
    sta heavy_body_flags
@members:
    ldx #1
@member:
    stx heavy_damage_target_slot
    lda heavy_damage_request,x
    tay
    lda #0
    sta heavy_damage_request,x
    tya
    cmp #3
    bcs @next
    cmp heavy_damage_stage,x
    beq @next
    bcc @next
    ldy heavy_damage_member_state,x
    cpy #1
    bne @next
    ldy heavy_abi_hp,x
    beq @next
    sta heavy_damage_stage,x
    ; 6*(stage-1) + 12*shapeIndex. No table pointer or scratch survives draw.
    sec
    sbc #1
    asl
    sta @twice+1
    asl
    clc
@twice:
    adc #0
    ldy heavy_abi_shape
    cpy #2
    bne :+
    clc
    adc #12
:   tax
    clc
    adc #6
    sta @end+1
@hole:
    ldy heavy_damage_target_slot
    lda heavy_body_index,y
    clc
    adc heavy_damage_holes,x
    tay
    lda heavy_damage_holes+1,x
    eor #$FF
    and heavy_damage_buffer,y
    sta heavy_damage_buffer,y
    inx
    inx
@end:
    cpx #6
    bne @hole
    ldx heavy_damage_target_slot
    lda #$FF                    ; force current-Y publication, even in a hold
    jsr heavy_damage_draw
    ldx heavy_damage_target_slot
@next:
    dex
    bpl @member
@done:
    rts

; C decides that the Bomber is fully outside the horizontal screen. Reuse
; MAIN's complete member erase, then hide its hardware player. Only the
; existing checked-home Heavy tick calls this terminal hardware executor.
heavy_departure_erase = $2D79
.export heavy_departure_erase, _asm_heavy_departure_erase
_asm_heavy_departure_erase:
    jsr heavy_departure_erase
    ldx heavy_damage_target_slot
    lda #0
    sta $D001,x
    rts
