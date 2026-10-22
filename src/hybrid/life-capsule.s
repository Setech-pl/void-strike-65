; M6 stage 2: append to the bottom of the window tail; the lance stays at $B900.
.include "life-capsule-layout.inc"
_life_c_pick = LIFE_C_PICK
_life_c_collect = LIFE_C_COLLECT
_life_c_enter = LIFE_C_ENTER
.segment "LIFE_CAPSULE"
life_capsule_start:
_life_spawned: .byte 0
    jmp life_pick
    jmp life_collect
    jmp life_enter
    jmp life_colour
fighter_pickup_pmg_shape:
.include "life-capsule-shapes.inc"
_life_forced: .byte 0

_life_lives = PLAYER_LIFECYCLE+1
_life_sector = $80F6
_life_kind = LEVEL_CORE_SECTOR_KIND_ADDRESS
_life_rng = DIRECTOR_RNG_ADVANCE
.export _life_spawned, _life_forced, _life_lives, _life_sector, _life_kind, _life_rng

; A is zero at the original spawn's type-pick site. Keep the existing rotation
; only for ordinary boosters. A LIFE never consumes its next booster.
life_pick:
    sta _life_forced
    jsr _life_c_pick
    beq @ordinary
    sta ENTITY_TYPE+WEAPON_PICKUP_SLOT
    rts
@ordinary:
    lda ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT
    sta ENTITY_TYPE+WEAPON_PICKUP_SLOT
    inc ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT
    lda ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT
    cmp #WEAPON_PICKUP_TYPE_COUNT
    bcc @done
    lda #WEAPON_PICKUP_TYPE_RAPID
    sta ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT
@done:
    rts

life_enter:
    jsr _life_c_enter
    beq @done
    ; The C decision has set the once-per-level latch. Preserve the ordinary
    ; rotation across the shared spawn, then replace its selected type.
    lda ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT
    pha
    jsr weapon_pickup_release
    lda #124
    jsr weapon_pickup_spawn_capsule_at
    pla
    sta ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT
    lda #WEAPON_PICKUP_TYPE_LIFE
    sta ENTITY_TYPE+WEAPON_PICKUP_SLOT
    jmp integration_pickup_reveal_body
@done:
    rts

life_collect:
    lda ENTITY_TYPE+WEAPON_PICKUP_SLOT
    cmp #WEAPON_PICKUP_TYPE_LIFE
    beq @life
    jsr weapon_pickup_release_active_mask
    jmp weapon_pickup_collect_booster
@life:
    jsr _life_c_collect
    beq :+
    jsr update_hud_status
:
    jsr weapon_pickup_release
    jsr play_hit_sound
    ; The existing effect renderer assumes all four fragments are allocated
    ; together. Reuse that whole pool only when empty; do not make a partial
    ; allocation or erase somebody else's effects.
    lda EFFECT_ACTIVE_MASK
    bne @done
    lda ENTITY_X+WEAPON_PICKUP_SLOT
    ldy ENTITY_Y+WEAPON_PICKUP_SLOT
    jsr spawn_breakup_effects_at
    lda #EFFECT_GROWTH_GLYPH_BASE
    sta EFFECT_RENDER_ID
@done:
    rts

; Replaces the existing immediate COLPM3 publication byte-neutrally. The
; death colour immediate is patched by the existing explosion publisher.
life_colour:
    lda #PICKUP_BOOST_COLOUR
life_colour_operand = *-1
    ldx FIGHTER_EXPLOSION_TIMER+FIGHTER_EXPLOSION_PLAYER_FIGHTER_SLOT
    bne @publish
    ldx ENTITY_TYPE+WEAPON_PICKUP_SLOT
    cpx #WEAPON_PICKUP_TYPE_LIFE
    bne @publish
    lda #$AC
@publish:
    sta $D015
    rts

.assert life_capsule_start = LIFE_CAPSULE_BASE, lderror, "LIFE tail does not start at $B82A"
.assert fighter_pickup_pmg_shape = LIFE_CAPSULE_SHAPES, lderror, "LIFE mask ABI moved"
; scripts/build.mjs checkLanceLayout checks __LIGHT_KERNEL_RAM_LAST__ after
; the final tail has linked, before producing the ATR.
.assert _life_forced = LIFE_CAPSULE_FORCED, lderror, "LIFE forced-state ABI moved"
.assert * <= $B900, lderror, "LIFE tail overlaps VOID LANCE"
.export life_capsule_start, fighter_pickup_pmg_shape

.assert life_colour_operand = LIFE_CAPSULE_COLOUR_OPERAND, lderror, "LIFE colour patch operand moved"
