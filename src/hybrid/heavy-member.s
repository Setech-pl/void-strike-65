; Heavy member ABI veneer (roadmap 4.5c). update_enemy calls this once per live
; P1/P2 member, after it captured that member's old Y and before it publishes
; the member and retires its departing row. C owns the movement and fire
; decisions of a lane-sweep formation; this file only marshals the member's
; slot bytes and emits the weapon_class C returns.
;
; Residency: HEAVY_CODE follows LIGHT_CODE in the hybrid extension composite
; (LIGHTFILE), carried in the existing late-compressed extension stream.

; Five per-slot Heavy arrays, two slots each, contiguous from ENEMY_X: X, Y,
; VELOCITY_X (direction), MOVE_ACCUMULATOR (fire timer), MANEUVER_STATE (turn
; timer). The C member scalars mirror that order.
HEAVY_MEMBER_FIELDS = 5

.assert ENEMY_Y = ENEMY_X+RAIDER_PMG_SLOT_COUNT, error, "Heavy member fields must be contiguous"
.assert ENEMY_VELOCITY_X = ENEMY_X+2*RAIDER_PMG_SLOT_COUNT, error, "Heavy member fields must be contiguous"
.assert ENEMY_MOVE_ACCUMULATOR = ENEMY_X+3*RAIDER_PMG_SLOT_COUNT, error, "Heavy member fields must be contiguous"
.assert ENEMY_MANEUVER_STATE = ENEMY_X+4*RAIDER_PMG_SLOT_COUNT, error, "Heavy member fields must be contiguous"
.assert RAIDER_PMG_SLOT_COUNT = 2, error, "Heavy member marshalling indexes field*2+slot"

.segment "HEAVY_CODE"

; X = ENEMY_TARGET_SLOT = the live member.
heavy_member_update:
    lda ENEMY_PROFILE_MOVEMENT_ID
    bne @policy
    jmp update_enemy_slot_motion ; RAIDER_CROSS_PURSUIT keeps its ASM motion
@policy:
    txa
    ora #((HEAVY_MEMBER_FIELDS-1)*RAIDER_PMG_SLOT_COUNT)
    tay
    ldx #(HEAVY_MEMBER_FIELDS-1)
@load:
    lda ENEMY_X,y
    sta HEAVY_MEMBER_X,x
    dey
    dey
    dex
    bpl @load
    jsr ENEMY_HEAVY_TICK
    pha
    lda ENEMY_TARGET_SLOT
    ora #((HEAVY_MEMBER_FIELDS-1)*RAIDER_PMG_SLOT_COUNT)
    tay
    ldx #(HEAVY_MEMBER_FIELDS-1)
@store:
    lda HEAVY_MEMBER_X,x
    sta ENEMY_X,y
    dey
    dey
    dex
    bpl @store
    pla
    beq @done
    jmp allocate_interceptor_projectile ; A = the weapon_class C returned
@done:
    rts
