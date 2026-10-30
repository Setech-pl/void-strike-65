; Frozen tail entries, shared by the Director, main and the last window link.
LIFE_CAPSULE_BASE = $3A14
LIFE_CAPSULE_SPAWNED = LIFE_CAPSULE_BASE
LIFE_CAPSULE_PICK = LIFE_CAPSULE_BASE+1
LIFE_CAPSULE_COLLECT = LIFE_CAPSULE_BASE+4
LIFE_CAPSULE_ENTER = LIFE_CAPSULE_BASE+7
LIFE_CAPSULE_COLOUR = LIFE_CAPSULE_BASE+10
LIFE_CAPSULE_SHAPES = LIFE_CAPSULE_BASE+13
LIFE_CAPSULE_FORCED = LIFE_CAPSULE_SHAPES+64
; Existing PICKUP_CODE tail, a byte-neutral sector-entry call replacement.
; H14 spends six pickup-tail bytes; this cold continuation follows them.
LIFE_CAPSULE_STAR_CONTINUATION = $8B60
LIFE_CAPSULE_COLOUR_OPERAND = $3AD2
; Checked at both independently linked ends of the boss-only spawn shortcut.
LIFE_CAPSULE_ORDINARY = $3A6E
; L1-02 restores the original ENTITY_CODE address profile, including this JMP.
LIFE_CAPSULE_SELECT_OPERAND = $984F
