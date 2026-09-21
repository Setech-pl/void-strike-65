; Stable boundary between the existing ca65 runtime and the cc65 Director.
; No cc65 startup or library is linked. All calls are mainline-only.
.setcpu "6502"

CAPITAL_SECTOR_STATE = $4EA5
PLAYER_LIFECYCLE = $4EAA
COLPM1 = $D013
COLPM2 = $D014
ENEMY_ACTIVE = $4ECD
FIGHTER_PROJECTILE_ACTIVE = $5400
CHARSET = $4400
; Generated weapon constants and glyph macros (INTERCEPTOR_PROJECTILE_SLOT_BASE,
; the hostile glyph bank layout and EMIT_HOSTILE_WEAPON_VISUAL_GLYPHS).
.include "fighter-weapons.inc"
.assert INTERCEPTOR_PROJECTILE_SLOT_BASE = 5, error, "hostile PairShot slots must start at slot 5"
; Roadmap 4.5M-M2: the low-C image heads the merged low-C/GLUE/Heavy cold
; record (scripts/build.mjs coldLowGlueRecordAddress; the build checks that
; both agree). It lands above the packed resident staging and is consumed
; before ENTITY_CODE expands over it.
DIRECTOR_LOW_STAGING = $9B40
DIRECTOR_LOW_RUNTIME = $8B88
DIRECTOR_LOW_BYTES = 242

.import _director_c_init
.import _director_c_world_row_tick
.import _director_c_request
.import _director_c_release
.import _director_c_rng_advance
.import _director_c_try_event
.import _director_event_opcode_abi, _director_event_arg0_abi
.import _director_argument_abi
.import _lifecycle_c_init
.import _sector_c_drain_clear
.import _sector_c_update_first_capital
.import _sector_c_update_capital_phase
.import _sector_c_begin_complete
.import _sector_c_complete_scroll_tick
.import _sector_c_force_final_drain
.import _enemy_c_spawn_raiders
.import _enemy_c_retire_member
.import _enemy_c_apply_pending_damage
.import _enemy_c_recycle
.import _enemy_c_light_tick, _enemy_c_light_hit, _enemy_c_light_wave
.import _enemy_c_heavy_tick
.import _heavy_member_x, _heavy_hull_colour, _heavy_archetype_offset
.import _heavy_member_colour
.import _enemy_archetypes
.import _light_state, _light_hp, _light_x, _light_y, _light_fire_timer
.import _light_screen_lo, _light_screen_hi
.import _light_backing, _light_resolve_save, _light_cell_end
.import _light_scratch, _light_slot_save
.import _light_slot, _light_archetype, _light_code, _light_wave_lock
.import _light_slot_limit, _light_screen_slot_limit
.import _enemy_profile_movement_id, _enemy_profile_fire_policy_id
.import _enemy_profile_burst_count, _enemy_profile_burst_interval
.import _enemy_profile_post_burst_frames, _enemy_profile_renderer_class
.import _enemy_profile_weapon_class, _enemy_profile_score_bcd
.import _enemy_profile_director_value

.import _level1_phase_end_lo, _level1_phase_end_hi
.import _level1_phase_hazards
.import _level1_phase_budget_easy, _level1_phase_budget_medium
.import _level1_phase_budget_hard
.import _level1_phase_reaction_easy, _level1_phase_reaction_medium
.import _level1_phase_reaction_hard
.import _level1_phase_recovery_easy, _level1_phase_recovery_medium
.import _level1_phase_recovery_hard
.import _level1_phase_capital_state, _level1_phase_pickups
.import _level1_phase_variants
.import _level1_event_row_lo, _level1_event_row_hi
.import _level1_event_opcode, _level1_event_arg0, _level1_event_arg1

.export director_init, director_world_row_tick, director_request, director_release
.export director_rng_advance, director_try_event, director_level1_end
.export director_code_end, director_common_end, director_level1_data_end
.export level1_phase_end_lo, level1_phase_end_hi, level1_phase_hazards
.export level1_phase_budget_easy, level1_phase_budget_medium
.export level1_phase_budget_hard
.export level1_phase_reaction_easy, level1_phase_reaction_medium
.export level1_phase_reaction_hard
.export level1_phase_recovery_easy, level1_phase_recovery_medium
.export level1_phase_recovery_hard
.export level1_phase_capital_state, level1_phase_pickups, level1_phase_variants
.export level1_event_row_lo, level1_event_row_hi, level1_event_opcode
.export level1_event_arg0, level1_event_arg1
.export _asm_director_can_allocate, _asm_sector_pressure_active
.export _asm_director_dispatch_event
.export director_publish_low
.export lifecycle_init, sector_update_first_capital, sector_update_capital_phase
.export sector_drain_clear
.export sector_begin_complete, sector_complete_scroll_tick, sector_force_final_drain
.export enemy_spawn_raiders, enemy_retire_member, enemy_apply_pending_damage
.export enemy_recycle, enemy_archetype_table
.export enemy_profile_movement_id, enemy_profile_fire_policy_id
.export enemy_profile_burst_count, enemy_profile_burst_interval
.export enemy_profile_post_burst_frames, enemy_profile_renderer_class
.export enemy_profile_weapon_class, enemy_profile_score_bcd
.export enemy_profile_director_value
.export enemy_light_tick, enemy_light_hit, enemy_light_wave
.export enemy_heavy_tick, heavy_member_x, heavy_hull_colour, heavy_archetype_offset
.export heavy_member_colour, build_hostile_weapon_glyphs
.export light_state, light_hp, light_x, light_y, light_fire_timer
.export light_screen_lo, light_screen_hi
.export light_backing0, light_backing1, light_scratch, light_slot_save
.export light_slot, light_slot_limit, light_archetype_offset, light_code
.export light_screen_slot_limit
.export light_resolve_save
.export light_cell_end

.segment "DIRECTOR_ABI"

; Legacy ca65 ABI: seed in A.
director_init:
    sta _director_argument_abi
    jmp _director_c_init

; Legacy ca65 ABI: no arguments.
director_world_row_tick:
    jmp _director_c_world_row_tick

; Legacy ca65 ABI: hazard in X, accepted in carry.
director_request:
    txa
    pha
    sta _director_argument_abi
    jsr _director_c_request
    tay
    pla
    tax
    tya
    cmp #$01
    rts

; Legacy ca65 ABI: hazard in X, with X preserved for existing callers.
director_release:
    txa
    sta _director_argument_abi
    pha
    tya
    pha
    jsr _director_c_release
    pla
    tay
    pla
    tax
    rts

; Legacy ca65 ABI: new RNG value in A.
director_rng_advance:
    txa
    pha
    tya
    pha
    jsr _director_c_rng_advance
    sta _director_argument_abi
    pla
    tay
    pla
    tax
    lda _director_argument_abi
    rts


; No-argument C semantic query. A is nonzero while either the current Heavy
; formation or one of its five already-released PairShots remains active.
_asm_sector_pressure_active:
    lda ENEMY_ACTIVE
    ora FIGHTER_PROJECTILE_ACTIVE+INTERCEPTOR_PROJECTILE_SLOT_BASE
    ora FIGHTER_PROJECTILE_ACTIVE+INTERCEPTOR_PROJECTILE_SLOT_BASE+1
    ora FIGHTER_PROJECTILE_ACTIVE+INTERCEPTOR_PROJECTILE_SLOT_BASE+2
    ora FIGHTER_PROJECTILE_ACTIVE+INTERCEPTOR_PROJECTILE_SLOT_BASE+3
    ora FIGHTER_PROJECTILE_ACTIVE+INTERCEPTOR_PROJECTILE_SLOT_BASE+4
    rts

; No-argument C primitive. C owns the two-byte request mailbox.
; Opcodes 1..4 are registered; opcode 5 is the boss fallback.
_asm_director_dispatch_event:
    ldx _director_event_arg0_abi
    lda _director_event_opcode_abi
    cmp #$05
    beq @denied
    lda #$01
    rts
@denied:
    lda #$00
    rts

; Cold-start publication helper. The resident suffix staging interval from
; $8100 overwrites the low C entry points after their DFMC record loads, so
; startup calls this only after the packed suffix has been consumed and before
; unpack_entity_runtime expands over the merged record.
director_publish_low:
    ldy #$00
@byte:
    lda DIRECTOR_LOW_STAGING,y
    sta DIRECTOR_LOW_RUNTIME,y
    iny
    cpy #DIRECTOR_LOW_BYTES
    bne @byte
    rts

director_code_end:
director_common_end:

director_try_event = _director_c_try_event
director_level1_end = 3712

level1_phase_end_lo = _level1_phase_end_lo
level1_phase_end_hi = _level1_phase_end_hi
level1_phase_hazards = _level1_phase_hazards
level1_phase_budget_easy = _level1_phase_budget_easy
level1_phase_budget_medium = _level1_phase_budget_medium
level1_phase_budget_hard = _level1_phase_budget_hard
level1_phase_reaction_easy = _level1_phase_reaction_easy
level1_phase_reaction_medium = _level1_phase_reaction_medium
level1_phase_reaction_hard = _level1_phase_reaction_hard
level1_phase_recovery_easy = _level1_phase_recovery_easy
level1_phase_recovery_medium = _level1_phase_recovery_medium
level1_phase_recovery_hard = _level1_phase_recovery_hard
level1_phase_capital_state = _level1_phase_capital_state
level1_phase_pickups = _level1_phase_pickups
level1_phase_variants = _level1_phase_variants
level1_event_row_lo = _level1_event_row_lo
level1_event_row_hi = _level1_event_row_hi
level1_event_opcode = _level1_event_opcode
level1_event_arg0 = _level1_event_arg0
level1_event_arg1 = _level1_event_arg1
director_level1_data_end = _level1_event_arg1 + 6

lifecycle_init = _lifecycle_c_init
sector_drain_clear = _sector_c_drain_clear
sector_update_first_capital = _sector_c_update_first_capital
sector_update_capital_phase = _sector_c_update_capital_phase
sector_begin_complete = _sector_c_begin_complete
sector_complete_scroll_tick = _sector_c_complete_scroll_tick
sector_force_final_drain = _sector_c_force_final_drain
enemy_retire_member = _enemy_c_retire_member
enemy_apply_pending_damage = _enemy_c_apply_pending_damage
enemy_archetype_table = _enemy_archetypes
enemy_profile_movement_id = _enemy_profile_movement_id
enemy_profile_fire_policy_id = _enemy_profile_fire_policy_id
enemy_profile_burst_count = _enemy_profile_burst_count
enemy_profile_burst_interval = _enemy_profile_burst_interval
enemy_profile_post_burst_frames = _enemy_profile_post_burst_frames
enemy_profile_renderer_class = _enemy_profile_renderer_class
enemy_profile_weapon_class = _enemy_profile_weapon_class
enemy_profile_score_bcd = _enemy_profile_score_bcd
enemy_profile_director_value = _enemy_profile_director_value
enemy_light_tick = _enemy_c_light_tick
enemy_heavy_tick = _enemy_c_heavy_tick
heavy_member_x = _heavy_member_x
heavy_hull_colour = _heavy_hull_colour
; Per-member GTIA colour C derives each Bomber tick (charge telegraph and hit
; flash); heavy_member_update writes it to COLPM1+slot.
heavy_member_colour = _heavy_member_colour
heavy_archetype_offset = _heavy_archetype_offset
enemy_light_hit = _enemy_c_light_hit
; PROVISIONAL standalone wave stepper, once per frame (plan §2.4).
enemy_light_wave = _enemy_c_light_wave
light_state = _light_state
light_hp = _light_hp
light_x = _light_x
light_y = _light_y
light_fire_timer = _light_fire_timer
light_screen_lo = _light_screen_lo
light_screen_hi = _light_screen_hi
; Light multiplicity (plan-light-multiplicity.md §2.1): the per-slot state is
; a structure of arrays, so each name above is the base of a four-byte array
; and the absolute forms the kernel uses today address slot 0. The backing is
; the exception - ONE cell-major array of LIGHT_SLOT_COUNT*LIGHT_CELL_COUNT
; bytes, because the erase and render loops index it by cell (`,y` with
; y = 0..1). light_backing0/1 therefore name cells 0 and 1 of the slot whose
; base ASM has selected, exactly as the two scalars did.
light_backing0 = _light_backing
light_backing1 = _light_backing+1
; ASM-owned scratch: the resolver's hold for the caller's X.
light_resolve_save = _light_resolve_save
light_cell_end = _light_cell_end
light_scratch = _light_scratch
light_slot_save = _light_slot_save
; The slot C indexes and ASM is ticking. Step 1a writes 0 and nothing else.
light_slot = _light_slot
; How many slots the per-frame loops must walk (owner fix (a), 2026-09-21).
light_slot_limit = _light_slot_limit
; How many slots the kernel has PUBLISHED - screen_hi-derived, maintained by
; light_publish, and the bound light_cell_resolve scans. Not interchangeable
; with light_slot_limit above: that one is state-derived and does not cover a
; slot that retired this frame with its cells still on screen.
light_screen_slot_limit = _light_screen_slot_limit
; Selected Light archetype per slot, as a byte offset into the C archetype
; table, and the slot's left screen code.
light_archetype_offset = _light_archetype
light_code = _light_code

; HYBRID_C_ARENA (roadmap 4.5M-M3): one contiguous reusable runtime arena
; $7BD0-$7F0F (832 B) for cc65 code (#pragma code-name ("HYBRID_C_ARENA")),
; cc65 read-only data (#pragma rodata-name ("HYBRID_C_ARENA_RODATA")) and
; explicitly assigned ca65 helpers (.segment "HYBRID_ASM_ARENA"). It replaces
; the temporary 243-B HYBRID_C_HEAVY window. Its linked image travels as its
; own DFMC record whose final destination is $7BD0: stage 2 (ATR) or the XEX
; loader lands it in place; there is no hold and no publish copy. The anchor
; below stays first and keeps the record non-empty (DFMC rejects a zero-length
; record); roadmap 4.5c places the Heavy formation C and its veneers after it.
; Link-time neighbour guards. The MEMORY areas below are declared larger than
; the first real neighbour above them, so ld65's own overflow check cannot fire
; until foreign memory has already been overwritten:
;   DIRECTOR_ABI_RAM  $8701+$76 = $8777, but PICKUP_CODE_RAM starts at $8776
;                     (1 B phantom);
;   DIRECTOR_C_LOW_RAM $8B88+$F8 = $8C80, but HYBRID_C_EXT_RAM starts at $8C7D
;                     (3 B phantom).
; __*_RAM_LAST__ is the address after the last byte used in the memory area.
.import __DIRECTOR_ABI_RAM_LAST__, __DIRECTOR_C_LOW_RAM_LAST__
.assert __DIRECTOR_ABI_RAM_LAST__ <= $8776, lderror, "DIRECTOR_ABI reaches the PICKUP_CODE window at $8776"
.assert __DIRECTOR_C_LOW_RAM_LAST__ <= $8C7D, lderror, "DIRECTOR_C_LOW reaches the HYBRID_C_EXT window at $8C7D"

.import __HYBRID_C_ARENA_RAM_START__, __HYBRID_C_ARENA_RAM_SIZE__
.import __HYBRID_ASM_ARENA_SIZE__, __HYBRID_C_ARENA_SIZE__
.import __HYBRID_C_ARENA_RODATA_SIZE__
.assert __HYBRID_C_ARENA_RAM_START__ = $7BD0, lderror, "HYBRID_C_ARENA must start at $7BD0"
.assert __HYBRID_C_ARENA_RAM_SIZE__ = 832, lderror, "HYBRID_C_ARENA capacity must be 832 B"
.assert __HYBRID_C_ARENA_RAM_START__+__HYBRID_C_ARENA_RAM_SIZE__ <= $7F10, lderror, "HYBRID_C_ARENA overlaps the A2 display lists at $7F10"
.assert __HYBRID_ASM_ARENA_SIZE__+__HYBRID_C_ARENA_SIZE__+__HYBRID_C_ARENA_RODATA_SIZE__ <= __HYBRID_C_ARENA_RAM_SIZE__, lderror, "HYBRID_C_ARENA contents exceed 832 B"
.assert __HYBRID_ASM_ARENA_SIZE__ >= 1, lderror, "HYBRID_C_ARENA lost its record anchor"

.segment "HYBRID_ASM_ARENA"
; Smallest valid non-empty record anchor: a harmless return, never called.
hybrid_arena_anchor:
    rts

; No-argument C primitive. Current allocator gate is player lifecycle state.
; Light multiplicity step 2: moved here from DIRECTOR_ABI, which had a 0-byte
; free tail against its real neighbour PICKUP_CODE at $8776 and now has 8.
; Nothing reaches it by address - C calls it by name - so only the arena's own
; size changes. Step 3 adds the wave lock here, where there is room for it.
_asm_director_can_allocate:
    ; Plan §2.4: Heavy and swarm never coexist. A live provisional wave refuses
    ; the ASM Heavy retry here, where there is room for the test, rather than
    ; in director_c_request, which has none. The other direction needs no test:
    ; the wave is armed by enemy_c_recycle, after the formation has gone.
    lda _light_wave_lock
    bne @deny
    lda PLAYER_LIFECYCLE
    lsr
    lda #$00
    bcs :+
    lda #$01
:
    rts
@deny:
    lda #$00
    rts

; Heavy formation lifecycle veneers (roadmap 4.5c). C selects the formation
; and its hull colour; ASM writes GTIA. At recycle C restores the Raider
; colour, which P1/P2 lend to the capital broadside missiles M1/M2 (PRIOR 0).
enemy_recycle:
    jsr _enemy_c_recycle
    jmp heavy_publish_hull_colour
enemy_spawn_raiders:
    jsr _enemy_c_spawn_raiders
heavy_publish_hull_colour:
    lda _heavy_hull_colour
    sta COLPM1
    sta COLPM2
    rts

; Hostile PairShot glyph bank (roadmap 4.5d; formerly the head of the fixed
; 70-B BROADSIDE slot). Init-only: init_fighter_projectiles calls it through
; HYBRID_BUILD_HOSTILE_GLYPHS after frontend setup, never in a visible frame.
; Visual v (weapon_class 1..N, then the BOMBER animation phase) occupies glyph
; 89+v at the left horizontal phase and glyph 99+v, shifted right two ANTIC 4
; pixels, at the right phase. The arena is read-only at runtime: this routine
; only reads its table and writes CHARSET.
build_hostile_weapon_glyphs:
    ldx #(HOSTILE_WEAPON_VISUAL_COUNT*8-1)
@row:
    lda hostile_weapon_visual_glyphs,x
    sta CHARSET+INTERCEPTOR_PROJECTILE_GLYPH_BASE*8,x
    lsr
    lsr
    lsr
    lsr
    sta CHARSET+(INTERCEPTOR_PROJECTILE_GLYPH_BASE+INTERCEPTOR_PROJECTILE_GLYPH_STRIDE)*8,x
    dex
    bpl @row
    rts

hostile_weapon_visual_glyphs:
    EMIT_HOSTILE_WEAPON_VISUAL_GLYPHS

; Declared here so that the size symbols and the contract above exist whatever
; the C modules place in the arena.
.segment "HYBRID_C_ARENA"
.segment "HYBRID_C_ARENA_RODATA"

; Owner decision B (2026-09-20) opened the RAM under the BASIC ROM,
; $A000-$BC1F = 7,200 B. Owner decision X (2026-09-21) divides it: the sector
; reader owns $A000-$A5FF, its 32-sector level buffer $A600-$B5FF and its BSS
; $BC00-$BC19, and the Director link owns exactly $B600-$BBFF, 1,536 B, as
; HYBRID_C_WINDOW_RAM. The window's real upper neighbour is therefore the
; reader BSS at $BC00, and that is what the named assert below checks; the six
; bytes at $BC1A remain reserved so nothing can reach the OS screen at $BC20.
; Light multiplicity: the SoA slot state sits between the A2 display lists and
; ENTITY_STATE. Bound it against its real neighbour, not against the memory
; area's own size, which is the guard shape the arena and the window use.
.import __HYBRID_LIGHT_SLOTS_RAM_START__, __HYBRID_LIGHT_SLOTS_RAM_LAST__
.assert __HYBRID_LIGHT_SLOTS_RAM_START__ = $7FC4, lderror, "HYBRID_LIGHT_SLOTS must start at $7FC4, after the A2 display lists"
.assert __HYBRID_LIGHT_SLOTS_RAM_LAST__ <= $8000, lderror, "HYBRID_LIGHT_SLOTS reaches ENTITY_STATE at $8000"

; Fix (a), owner decision 2026-09-21: the published-slot limit. Both Light RAM
; areas were exactly full, so it takes the first byte of the unowned gap that
; starts where HYBRID_HEAVY_STATE ends. Bound it against that real neighbour
; below, and against the 26-byte gap's own end above.
.import __HYBRID_LIGHT_SCREEN_RAM_START__, __HYBRID_LIGHT_SCREEN_RAM_LAST__
.import __HYBRID_HEAVY_STATE_RAM_LAST__
.assert __HYBRID_LIGHT_SCREEN_RAM_START__ >= __HYBRID_HEAVY_STATE_RAM_LAST__, lderror, "HYBRID_LIGHT_SCREEN overlaps HYBRID_HEAVY_STATE"
.assert __HYBRID_LIGHT_SCREEN_RAM_LAST__ <= $8140, lderror, "HYBRID_LIGHT_SCREEN leaves the unowned gap at $8140"

.import __HYBRID_C_WINDOW_RAM_LAST__, __HYBRID_C_WINDOW_GUARD_START__
.assert __HYBRID_C_WINDOW_GUARD_START__ = $BC1A, lderror, "HYBRID_C_WINDOW_GUARD must start at $BC1A"
.assert __HYBRID_C_WINDOW_RAM_LAST__ <= $BC00, lderror, "HYBRID_C_WINDOW reaches the sector reader BSS at $BC00"

; Declared empty so that the size symbols and the guard above exist before any
; content is placed. HYBRID_ASM_WINDOW carries the ca65 half of the Light
; kernel, HYBRID_C_WINDOW and HYBRID_C_WINDOW_RODATA the cc65 half, in the
; shape HYBRID_ASM_ARENA / HYBRID_C_ARENA already use for the arena.
.segment "HYBRID_ASM_WINDOW"
.segment "HYBRID_C_WINDOW"
.segment "HYBRID_C_WINDOW_RODATA"
