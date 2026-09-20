; Hybrid Encounter Director v1. NMOS 6502 only.
.setcpu "6502"

DIFFICULTY_SETTING = $4E70
FRAME_COUNTER = $86
CAPITAL_SECTOR_STATE = $4EA5
CAPITAL_HULL_STATE_ENGINES = 0
CAPITAL_HULL_STATE_DRAIN = 5
CAPITAL_HULL_STATE_OPEN = 7
HAZARD_DEBRIS = 1
PHASE_COUNT = 8
EVENT_COUNT = 6

STATE_ROW_LO       = $80F4
STATE_ROW_HI       = $80F5
STATE_PHASE        = $80F6
STATE_EVENT_INDEX  = $80F7
STATE_INTENSITY    = $80F8
STATE_REACTION     = $80F9
STATE_RECOVERY     = $80FA
STATE_RNG          = $80FB
STATE_PENDING      = $80FC
STATE_DEFER_LEFT   = $80FD
STATE_FLAGS        = $80FE
STATE_ADMISSION_FRAME = $80FF

FLAG_COMPLETE = $01
EVENT_DEFER = $20
EVENT_VARIANT = $40
EVENT_OPCODE_MASK = $1F
EVENT_BOSS_HANDOFF = 5

.export director_init, director_world_row_tick, director_request, director_release
.export director_rng_advance, director_level1_end
.export director_code_end, director_common_end, director_level1_data_end

.segment "DIRECTOR_CODE"

; A = externally selected level seed. New Game calls this once; Game Over does not.
director_init:
    pha
    ldx #11
    lda #$00
@clear:
    sta STATE_ROW_LO,x
    dex
    bpl @clear
    pla
    sta STATE_RNG
    lda #$FF
    sta STATE_PENDING
    ldx FRAME_COUNTER
    dex
    stx STATE_ADMISSION_FRAME
    ldx #$00
    jsr hook_apply_phase_policy
    rts

director_world_row_tick:
    inc STATE_ROW_LO
    bne :+
    inc STATE_ROW_HI
:
    lda STATE_REACTION
    beq :+
    dec STATE_REACTION
:
    lda STATE_RECOVERY
    beq :+
    dec STATE_RECOVERY
:
    jsr director_check_phase
    lda STATE_PENDING
    cmp #$FF
    beq @next_event
    tax
    jsr director_try_event
    bcs @done
    dec STATE_DEFER_LEFT
    bne @done
    inc STATE_EVENT_INDEX
    lda #$FF
    sta STATE_PENDING
    jmp hook_event_skipped
@next_event:
    ldx STATE_EVENT_INDEX
    cpx #EVENT_COUNT
    bcs @done
    lda STATE_ROW_HI
    cmp level1_event_row_hi,x
    bcc @done
    bne @due
    lda STATE_ROW_LO
    cmp level1_event_row_lo,x
    bcc @done
@due:
    jsr director_try_event
    bcs @done
    lda level1_event_opcode,x
    and #EVENT_DEFER
    beq @skip
    txa
    sta STATE_PENDING
    lda #8
    sta STATE_DEFER_LEFT
    jmp hook_event_deferred
@skip:
    inc STATE_EVENT_INDEX
    jmp hook_event_skipped
@done:
    rts

director_check_phase:
    ldx STATE_PHASE
    cpx #(PHASE_COUNT-1)
    bcs @done
    lda STATE_ROW_HI
    cmp level1_phase_end_hi,x
    bcc @done
    bne @advance
    lda STATE_ROW_LO
    cmp level1_phase_end_lo,x
    bcc @done
@advance:
    inc STATE_PHASE
    ldx STATE_PHASE
    ldy DIFFICULTY_SETTING
    lda level1_phase_reaction_easy,x
    cpy #$00
    beq :+
    lda level1_phase_reaction_medium,x
    cpy #$01
    beq :+
    lda level1_phase_reaction_hard,x
:
    sta STATE_REACTION
    lda level1_phase_recovery_easy,x
    cpy #$00
    beq :+
    lda level1_phase_recovery_medium,x
    cpy #$01
    beq :+
    lda level1_phase_recovery_hard,x
:
    sta STATE_RECOVERY
    txa
@done:
    rts

director_try_event:
    lda level1_event_opcode,x
    pha
    and #EVENT_OPCODE_MASK
    tay
    lda level1_event_arg0,x
    jsr hook_dispatch_event
    bcc @failed
    pla
    and #EVENT_VARIANT
    beq :+
    jsr director_rng_advance
:
    inc STATE_EVENT_INDEX
    lda #$FF
    sta STATE_PENDING
    lda FRAME_COUNTER
    sta STATE_ADMISSION_FRAME
    cpy #EVENT_BOSS_HANDOFF
    bne :+
    lda STATE_FLAGS
    ora #FLAG_COMPLETE
    sta STATE_FLAGS
:
    sec
    rts
@failed:
    pla
    and #EVENT_OPCODE_MASK
    cmp #EVENT_BOSS_HANDOFF
    bne @ordinary_failure
    inc STATE_EVENT_INDEX
    lda #$FF
    sta STATE_PENDING
    lda STATE_FLAGS
    ora #FLAG_COMPLETE
    sta STATE_FLAGS
    sec
    rts
@ordinary_failure:
    clc
    rts

director_request:
    lda STATE_FLAGS
    lsr
    bcs @deny
    lda STATE_ADMISSION_FRAME
    cmp FRAME_COUNTER
    beq @deny
    lda FRAME_COUNTER
    sta STATE_ADMISSION_FRAME
    lda STATE_RECOVERY
    ora STATE_REACTION
    bne @deny
    lda hazard_bits,x
    ldy STATE_PHASE
    and level1_phase_hazards,y
    bne @phase_allowed
    ; The provisional frame-600 capital section lies wholly inside phase one,
    ; whose ordinary-space mask intentionally excludes debris. Admit only the
    ; existing debris request while a hull is actively traversing; OPEN,
    ; DRAIN and COMPLETE retain the authored phase mask. Every later Director
    ; gate (frame, reaction, recovery, budget, allocator and RNG) stays shared.
    cpx #HAZARD_DEBRIS
    bne @deny
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bcs @deny
    ; Match the capital-local 3/4/5 intensity ceilings already used by
    ; BROADSIDE. This keeps one cost-1 debris legal beside capital pressure
    ; without changing any ordinary-space phase budget.
    ldy #3
@phase_allowed:
    lda hazard_costs,x
    clc
    adc STATE_INTENSITY
    pha
    lda DIFFICULTY_SETTING
    beq @easy
    cmp #$01
    beq @medium
    lda level1_phase_budget_hard,y
    bne @budget
@medium:
    lda level1_phase_budget_medium,y
    bne @budget
@easy:
    lda level1_phase_budget_easy,y
@budget:
    sta director_scratch
    pla
    cmp director_scratch
    beq @capacity
    bcs @deny
@capacity:
    jsr hook_can_allocate
    bcc @deny
    sta STATE_INTENSITY
    ldy STATE_PHASE
    lda DIFFICULTY_SETTING
    beq @reaction_easy
    cmp #$01
    beq @reaction_medium
    lda level1_phase_reaction_hard,y
    bne @set_reaction
@reaction_medium:
    lda level1_phase_reaction_medium,y
    bne @set_reaction
@reaction_easy:
    lda level1_phase_reaction_easy,y
@set_reaction:
    sta STATE_REACTION
    jsr director_rng_advance
    sec
    rts
@deny:
    clc
    rts

director_release:
    lda STATE_INTENSITY
    sec
    sbc hazard_costs,x
    bcs :+
    lda #$00
:
    sta STATE_INTENSITY
    rts

; Private full-period 8-bit LCG (5*x+1).
director_rng_advance:
    lda STATE_RNG
    asl
    asl
    sec
    adc STATE_RNG
    sta STATE_RNG
    rts

director_scratch:
    .byte $00
hook_apply_phase_policy:
    lda level1_phase_capital_state,x
    sta CAPITAL_SECTOR_STATE
    rts
hook_dispatch_event:
    ; Opcodes 1..4 are registered; opcode 5 is the unregistered boss fallback.
    ; (Y xor 5) is zero only for opcode 5 and at least one for 1..4, so CMP
    ; returns the exact carry contract without a branch.
    tya
    eor #$05
    cmp #$01
    rts
hook_can_allocate:
    pha
    lda $4EAA
    lsr
    pla
    bcc @allow
@deny:
    clc
    rts
@allow:
    sec
    rts
hook_event_deferred:
hook_event_skipped:
    rts
director_code_end:

.segment "DIRECTOR_COMMON"
hazard_bits:  .byte $01,$02,$04,$08
hazard_costs: .byte 1,1,2,0
director_common_end:

.segment "LEVEL1_DATA"
level1_phase_end_lo: .byte <128,<576,<1056,<1664,<1856,<2752,<2944,<3712
level1_phase_end_hi: .byte >128,>576,>1056,>1664,>1856,>2752,>2944,>3712
; Hunter is the only implemented ordinary roster member. Preserve every
; authored debris/BROADSIDE/pickup bit, but keep one legal ordinary fallback in
; phases 2, 4 and 6 until their Striker/Weaver/Gunship successors exist. Phase
; zero retains its established phase-one borrowing rule because its budget is
; intentionally zero.
level1_phase_hazards: .byte $00,$09,$0B,$0F,$09,$0F,$09,$0F
level1_phase_budget_easy:   .byte 0,1,2,3,1,2,1,2
level1_phase_budget_medium: .byte 0,2,3,4,1,3,1,3
level1_phase_budget_hard:   .byte 0,2,3,5,2,4,2,4
level1_phase_reaction_easy:   .byte 64,48,40,32,64,32,64,28
level1_phase_reaction_medium: .byte 56,42,34,28,56,28,56,24
level1_phase_reaction_hard:   .byte 48,36,28,24,48,24,48,20
level1_phase_recovery_easy:   .byte 128,48,40,48,128,48,128,64
level1_phase_recovery_medium: .byte 112,42,34,42,112,42,112,56
level1_phase_recovery_hard:   .byte 96,36,28,36,96,36,96,48
; The sole capital encounter is admitted by the provisional gameplay-frame
; gate. Phase transitions must not create a second late copy or interrupt the
; already-running finite hull lifecycle.
level1_phase_capital_state:
    .byte CAPITAL_HULL_STATE_OPEN,CAPITAL_HULL_STATE_OPEN
    .byte CAPITAL_HULL_STATE_OPEN,CAPITAL_HULL_STATE_OPEN
    .byte CAPITAL_HULL_STATE_OPEN,CAPITAL_HULL_STATE_OPEN
    .byte CAPITAL_HULL_STATE_OPEN,CAPITAL_HULL_STATE_OPEN
level1_phase_pickups:  .byte $00,$01,$01,$03,$07,$03,$07,$03
level1_phase_variants: .byte $00,$03,$0F,$1F,$00,$1F,$00,$3F

level1_event_row_lo: .byte <128,<1056,<1856,<2944,<3584,<3712
level1_event_row_hi: .byte >128,>1056,>1856,>2944,>3584,>3712
level1_event_opcode: .byte $41,$42,$43,$44,$64,$25
level1_event_arg0:   .byte 1,3,5,7,8,0
level1_event_arg1:   .byte 0,0,1,0,1,0
director_level1_end = 3712
director_level1_data_end:

.segment "DIRECTOR_STATE"
director_state:
    .res 12

.assert director_level1_data_end <= $A000, error, "director exceeds $9D75-$9FFF"
.assert director_state = $80F4, error, "director state moved"
