; Light-class ASM kernel: two ring cells, their backing, the glyph install,
; and the hot PairShot/contact tests. C owns lifecycle, HP, formation motion,
; fire policy and the archetype record; this file only executes and publishes.
;
; ITS OWN LINK (plan-light-multiplicity.md §3.1 [C1], owner decision
; 2026-09-21). It used to be `.include`d into main.s. It now links on its own
; with cfg/light-kernel.cfg, built by buildResidentModule the way
; src/hybrid/sector-reader.s is, and lands in owner decision X's code window
; directly above the Director link's C half. It reaches main.s through the
; generated build/light-kernel-abi.inc, and main.s reaches IT through the
; frozen five-entry vector table below - the same shape as the reader's
; $A000 vectors. No main-link symbol binds to this file.
;
; Two links share the 1,536-B window and the boundary between them is NOT a
; chosen constant: HYBRID_ASM_WINDOW_BASE in build/director-abi.inc is
; wherever the Director link's C half ended in this very build, so neither
; half can be sized wrong by an estimate.
;
; Late publication (owner smoke 2026-09-15: the frame-start erase left the
; Light blank while ANTIC scanned the upper playfield, so it flickered). The
; Light is now erased and republished only inside the post-playfield PairShot
; window (after wait_frame_at_line $77), between the PairShot erase and render:
;   debris (window, below) < effects (mid-frame) < Light < PairShots < near
; Since 2026-09-16 the debris is published in this window too, between the
; Light erase and the Light render (entity_debris_publish), so the Light
; captures the debris glyph exactly. Effects still render mid-frame while the
; previous Light image is visible; light_cell_resolve gives them the Light's
; lower backing, and the late Light erase leaves a cell alone once such a
; lower layer has overwritten it.

.setcpu "6502"

.include "fighter-weapons.inc"
.include "entity-effects.inc"
.include "capital-hulls.inc"
.include "starfield.inc"
.include "director-abi.inc"
.include "light-kernel-abi.inc"

.import __LIGHT_KERNEL_RUN__, __LIGHT_KERNEL_RAM_LAST__
; The two halves cannot overlap and the ASM half cannot reach the sector
; reader's BSS. Both are link errors, not runtime surprises.
.assert __LIGHT_KERNEL_RUN__ = HYBRID_ASM_WINDOW_BASE, lderror, "the Light kernel must start where the Director link's window half ends"
.assert __LIGHT_KERNEL_RUN__ >= $B600, lderror, "the Light kernel must start inside the code window"
.assert __LIGHT_KERNEL_RAM_LAST__ <= HYBRID_C_WINDOW_LIMIT, lderror, "the Light kernel reaches the sector reader BSS at $BC00"

LIGHT_WIDTH_HPOS = 8
LIGHT_HEIGHT_SCANLINES = 8
LIGHT_CELL_COUNT = 2
; Four SoA slots (the declared format) and three appearance pairs, so the
; resolver's fast-path filter spans codes $F8..$FD. Both are contracts shared
; with src/c/lifecycle.c; tests/source-contracts.test.mjs cross-checks them.
LIGHT_SLOT_COUNT = 4
LIGHT_APPEARANCE_PAIRS = 3
LIGHT_CODE_COUNT = LIGHT_APPEARANCE_PAIRS*LIGHT_CELL_COUNT
; The tick's exclusive return byte; src/c/lifecycle.c holds the same value.
LIGHT_RETURN_INSTALL = $40
LIGHT_GLYPH_BYTES = LIGHT_HEIGHT_SCANLINES*LIGHT_CELL_COUNT
; ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_INTERCEPTOR) in src/c/enemy-archetype.h;
; tests/source-contracts.test.mjs cross-checks the two.
LIGHT_OFFSET_INTERCEPTOR = 24
LIGHT_GLYPH = WEAPON_PICKUP_GLYPH_BASE          ; 120/121: retired pickup bank
LIGHT_SCREEN_CODE = LIGHT_GLYPH|CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE
LIGHT_PROJECTILE_OWNER = FIGHTER_PROJECTILE_INTERCEPTOR|$04
LIGHT_SCORE_BCD = ENEMY_ARCHETYPE_TABLE+10      ; indexed by LIGHT_ARCHETYPE_OFFSET
; The bottom ring row is recycled (overwritten by the divider copy) by
; rotate_playfield_rows while the late-published Light is still visible; the
; footprint therefore never enters it, so the late erase never writes into a
; recycled row.
LIGHT_RENDER_BOTTOM = ENTITY_GAMEPLAY_BOTTOM-8
; Light multiplicity (plan §2.1): the per-slot state is a structure of arrays
; and the backing is one CELL-MAJOR array, so LIGHT_BACKING0/1 name the two
; cells of the slot ASM has selected. The generated include gives the base;
; cell 1 is the byte after it, exactly as the two scalars were adjacent.
LIGHT_BACKING1 = LIGHT_BACKING0+1

.assert LIGHT_GLYPH = 120, error, "Light glyphs must reuse the retired pickup bank"
.assert (LIGHT_SCREEN_CODE & (LIGHT_CELL_COUNT-1)) = 0, error, "an appearance pair must start on an even code"
.assert LIGHT_SCREEN_CODE+LIGHT_CODE_COUNT <= $100, error, "the Light code range must fit the screen-code space"
.assert (LIGHT_PROJECTILE_OWNER & FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK) = 0, error, "Light shots are attributed to leader slot P1"
.assert FIGHTER_PROJECTILE_WEAPON_CLASS_SHIFT = 3 && LIGHT_PROJECTILE_OWNER < 8, error, "Light emit shifts weapon_class above the owner bits"

; Residency: the whole kernel is one contiguous LIGHT_KERNEL segment in the
; code window, resident for the whole game, no runtime I/O. What stays behind
; in the main link is what was never Light-only: entity_debris_publish and its
; two debris helpers (LIGHT_CODE), the 32-byte Wingman + Interceptor art
; tables (ENTITY_CODE tail) and light_add_score (BROADSIDE pad).

.segment "LIGHT_KERNEL"

; Frozen entry vector table: main.s binds to these five addresses by constant
; and to nothing else in this file. Order is a contract - build.mjs derives
; LIGHT_KERNEL_* from it by index - so entries are only ever APPENDED.
light_kernel_vectors:
    jmp light_publish
    jmp light_update
    jmp light_shot
    jmp light_backing
    jmp light_cell_resolve_sanitized
.assert * - light_kernel_vectors = 5*3, error, "the Light kernel vector table must be five 3-byte entries"

; Replaces the PairShot erase operand in the fighter publication window.
; Step 3: erase every published slot, then render every live one. Erase order
; among slots does not matter (plan §2.2): if slot B rendered over slot A's
; cell, B's backing IS A's lower backing, because the render capture asks the
; address resolver; erasing B first restores it and A's erase then skips,
; erasing A first skips and B's erase restores it. Two live slots never both
; believe they own one cell.
light_publish:
    jsr erase_fighter_projectile_overlays
    lda #(LIGHT_SLOT_COUNT-1)
    sta LIGHT_SLOT
@erase_slot:
    ldx LIGHT_SLOT
    lda LIGHT_SCREEN_HI,x       ; hi = 0: this slot published nothing
    beq @erase_next
    sta dst_ptr+1
    lda LIGHT_SCREEN_LO,x
    sta dst_ptr
    lda LIGHT_CODE,x            ; the slot's own pair, not a constant
    sta LIGHT_SLOT_SAVE
    txa
    asl                         ; cell-major backing: slot * LIGHT_CELL_COUNT
    tax
    inx                         ; the high cell first, as the cell loop counts down
    ldy #(LIGHT_CELL_COUNT-1)
@erase_cell:
    tya
    ora LIGHT_SLOT_SAVE         ; a pair starts on an even code, so ora adds
    cmp (dst_ptr),y             ; a lower layer that overwrote it owns it now
    bne :+
    lda LIGHT_BACKING0,x
    sta (dst_ptr),y
:
    dex
    dey
    bpl @erase_cell
    ldx LIGHT_SLOT
    lda #$00
    sta LIGHT_SCREEN_HI,x
@erase_next:
    dec LIGHT_SLOT
    bpl @erase_slot

    jsr entity_debris_publish    ; debris below every Light, same window
    lda #(LIGHT_SLOT_COUNT-1)
    sta LIGHT_SLOT
@render_slot:
    ldy LIGHT_SLOT
    lda LIGHT_STATE,y
    beq @render_next
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @render_next
    cmp #LIGHT_RENDER_BOTTOM
    bcs @render_next
    sbc #(ENTITY_GAMEPLAY_TOP-1) ; C=0
    lsr
    lsr
    lsr
    tax                          ; X = ring row
    ldy LIGHT_SLOT
    lda LIGHT_X,y
    sec
    sbc #GAMEPLAY_LEFT_HPOS
    lsr
    lsr
    clc
    adc PLAYFIELD_ROW_LO,x
    sta dst_ptr
    sta LIGHT_SCREEN_LO,y
    lda PLAYFIELD_ROW_HI,x
    adc #$00
    sta dst_ptr+1
    ; The slot's own screen_hi stays 0 until the cells are captured: the
    ; resolver below keys on screen_hi, so publishing it first would make this
    ; slot claim the very cell it is capturing and hand back its stale backing.
    sta LIGHT_SCRATCH
    lda LIGHT_CODE,y
    sta LIGHT_SLOT_SAVE          ; incremented per cell
    tya
    asl
    tax                          ; X = slot * LIGHT_CELL_COUNT
    txa
    clc
    adc #LIGHT_CELL_COUNT
    sta LIGHT_CELL_END
@cell:
    ldy #$00
    lda (dst_ptr),y
    ; PairShots are already erased; save the true lower backing below any
    ; visible debris/effect cell, below ANOTHER LIGHT'S cell, and never a
    ; transient near-star point.
    jsr resolve_effect_backing_below_player_pairshot
    jsr resolve_effect_backing_below_interactive_debris
    jsr resolve_effect_backing_below_transient_effect
    jsr light_cell_resolve
    sta LIGHT_BACKING0,x
    lda LIGHT_SLOT_SAVE
    sta (dst_ptr),y
    inc LIGHT_SLOT_SAVE
    inc dst_ptr
    bne :+
    inc dst_ptr+1
:
    inx
    cpx LIGHT_CELL_END
    bne @cell
    ldy LIGHT_SLOT
    lda LIGHT_SCRATCH
    sta LIGHT_SCREEN_HI,y
@render_next:
    dec LIGHT_SLOT
    bpl @render_slot
    rts

; C=0 on return; A is the character-aligned top scanline of the slot in
; LIGHT_SLOT. Uses Y, never X: light_shot and the emit path hold the
; projectile slot in X across this call.
light_top:
    ldy LIGHT_SLOT
    lda LIGHT_Y,y
    and #$F8
    clc
    rts

; After entity/effect simulation, once per SLOT: C decides motion and fire,
; ASM performs the PairShot emission, the glyph install and the contact test.
; An empty slot costs two instructions.
;
; The tick's return byte is EXCLUSIVE - one action per tick (plan §2.2):
;   0        nothing
;   1-3      fire, the record's weapon_class
;   $40      install this slot's appearance (admission frame only)
; $80, the deferred breakup spawn, arrives with the token at step 4.
light_update:
    jsr entity_effects_update
    jsr ENEMY_LIGHT_WAVE         ; PROVISIONAL wave stepper, once per frame
    lda #(LIGHT_SLOT_COUNT-1)
    sta LIGHT_SLOT
@slot:
    ldx LIGHT_SLOT
    lda LIGHT_STATE,x
    bne :+
    jmp @next                    ; an empty slot: two instructions and a jump
:
    jsr ENEMY_LIGHT_TICK
    tay
    beq @alive
    cpy #LIGHT_RETURN_INSTALL
    bne :+
    jmp @install
:
    ldx #INTERCEPTOR_PROJECTILE_SLOT_BASE
@find:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @emit
    inx
    cpx #(INTERCEPTOR_PROJECTILE_SLOT_BASE+INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT)
    bne @find
    beq @alive                   ; a full shared pool drops this slot's shot
@emit:
    tya                          ; C returned the record's weapon_class (1-9)
    asl
    asl
    asl
    ora #LIGHT_PROJECTILE_OWNER
    sta FIGHTER_PROJECTILE_ACTIVE,x
    lda #INTERCEPTOR_PROJECTILE_LIFETIME
    sta FIGHTER_PROJECTILE_LIFETIME,x
    ldy LIGHT_SLOT               ; C keeps X four-aligned: centre, even HPOS
    lda LIGHT_X,y
    ora #((LIGHT_WIDTH_HPOS/2-INTERCEPTOR_PROJECTILE_WIDTH_HPOS/2) & $FE)
    sta FIGHTER_PROJECTILE_X,x
    jsr light_top                ; uses Y; X stays the projectile slot
    adc #LIGHT_HEIGHT_SCANLINES
    sta FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
@alive:
    ldx LIGHT_SLOT
    lda LIGHT_STATE,x
    beq @next                    ; the tick may have retired it
@contact:
    lda PLAYER_LIFECYCLE
    lsr                          ; DYING/GAME OVER are odd: no contact
    bcs @next
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @next
    sta LIGHT_SCRATCH
    lda player_y
    sbc LIGHT_SCRATCH            ; C=1
    cmp #LIGHT_HEIGHT_SCANLINES
    bcc @vertical
    cmp #(256-PLAYER_COLLISION_LAST_ROW)
    bcc @next
@vertical:
    ldy LIGHT_SLOT
    lda player_x
    sec
    sbc LIGHT_X,y
    cmp #LIGHT_WIDTH_HPOS
    bcc @touch
    cmp #(256-(PLAYER_VISIBLE_WIDTH_HPOS-1))
    bcc @next
@touch:
    ; Raider contact contract: full player damage through the shared gate and
    ; one damage unit to the enemy regardless of the player outcome.
    lda #PLAYER_HEALTH_UNITS
    jsr apply_player_damage
    jsr ENEMY_LIGHT_HIT
    tay
    beq @next
    jsr light_destroyed
@next:
    dec LIGHT_SLOT
    bpl :+
    rts
:
    jmp @slot

; The 16-byte bitmap copy, hoisted out of every frame (plan §2.2). It used to
; run on every frame of a Light's life because nothing tracked what the glyph
; pair held - copy_charset rebuilds glyphs 120-125 from the frontend source at
; each new game, so the kernel simply rewrote them constantly. C now owns that
; bookkeeping (light_appearance_installed) and asks for the copy once, on the
; admission frame.
;
; C names the record AND the pair: the destination follows the slot's own
; screen code, so pair 1 (122/123) and pair 2 (124/125) need no second path.
; Code 120+2k carries bitmap bytes CHARSET+(120+2k)*8, i.e. 16k past pair 0.
@install:
    ldx LIGHT_SLOT
    ldy #(LIGHT_GLYPH_BYTES-1)
    lda LIGHT_ARCHETYPE_OFFSET,x
    cmp #LIGHT_OFFSET_INTERCEPTOR
    bne :+
    ldy #(LIGHT_GLYPH_BYTES*2-1)
:
    lda LIGHT_CODE,x
    sec
    sbc #LIGHT_SCREEN_CODE       ; = 2k
    asl
    asl
    asl                          ; = 16k, the pair's offset past pair 0
    sta LIGHT_CELL_END
    clc
    adc #(LIGHT_GLYPH_BYTES-1)
    tax                          ; X = the pair's last byte
    ; One BELOW the pair's first byte, so the test is bne and not bcs: at
    ; pair 0 the index wraps to $FF, which is >= 0 and would never terminate.
    dec LIGHT_CELL_END
@glyph:
    lda light_glyph,y
    sta CHARSET+LIGHT_GLYPH*8,x
    dey
    dex
    cpx LIGHT_CELL_END
    bne @glyph
    jmp @alive

; Player PairShot scan, X = projectile slot. Carry clear consumes the slot as
; the debris path does; otherwise defer to the existing debris/Raider target.
; A shot hits at most one Light: the first slot that owns the cell wins.
light_shot:
    stx LIGHT_SLOT_SAVE          ; the caller's projectile slot
    lda #(LIGHT_SLOT_COUNT-1)
    sta LIGHT_SLOT
@slot:
    ldx LIGHT_SLOT
    lda LIGHT_STATE,x
    beq @next
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @next
    sta LIGHT_SCRATCH
    ldx LIGHT_SLOT_SAVE
    lda FIGHTER_PROJECTILE_Y,x
    sbc LIGHT_SCRATCH            ; C=1
    cmp #LIGHT_HEIGHT_SCANLINES
    bcc @vertical
    cmp #(256-(PLAYER_FIGHTER_PROJECTILE_SPEED+PLAYER_FIGHTER_PROJECTILE_HEIGHT-1))
    bcc @next
@vertical:
    ldy LIGHT_SLOT
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc LIGHT_X,y
    cmp #LIGHT_WIDTH_HPOS
    bcs @next
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    jsr ENEMY_LIGHT_HIT
    tay
    beq :+
    jsr light_destroyed
:
    ldx LIGHT_SLOT_SAVE
    clc
    rts
@next:
    dec LIGHT_SLOT
    bpl @slot
    ldx LIGHT_SLOT_SAVE          ; no slot owns the cell: the old target path
    jmp entity_player_fighter_projectile_target

; Lethal hit: breakup feedback, score and sound, for the slot in LIGHT_SLOT.
; Already-emitted Light shots are independent of the Light and of the leader:
; they keep their lifecycle.
light_destroyed:
    jsr clear_transient_effects
    jsr light_top
    tay
    ldx LIGHT_SLOT
    lda LIGHT_X,x
    jsr spawn_breakup_effects_at
    ldx LIGHT_SLOT
    lda LIGHT_ARCHETYPE_OFFSET,x ; C names the selected Light record
    tax
    jsr light_add_score          ; BROADSIDE pad; C-owned record value
    jsr update_score_display
    jmp play_hit_sound

; Effects: the existing debris resolver, then the Light resolver below.
light_backing:
    jsr resolve_effect_backing_below_interactive_debris
    jmp light_cell_resolve

; Debris capture: near-star sanitising (as before), then the Light resolver.
light_cell_resolve_sanitized:
    cmp #STAR_NEAR_POINT
    bne light_cell_resolve
    lda #CH_SPACE
    rts

; A = captured cell byte, dst_ptr = the cell's own address. Returns that cell's
; lower backing so the lower layer's later erase cannot resurrect a Light
; glyph; returns A unchanged when no slot owns the cell. X and Y are preserved
; (debris captures its second cell with Y = 1).
;
; KEYED BY SCREEN ADDRESS, not by glyph code (plan §2.2). The code used to name
; the cell index directly, which was only sound while there was one Light and
; its two codes belonged to nobody else. With several slots the two facts that
; held it up are both gone: slot count and code count are independent, and two
; slots may carry the SAME code. So the code range is now only a fast-path
; filter - a cell outside $F8..$FD leaves in the same few cycles as before,
; which is the common case for every captured cell - and a cell inside it is
; resolved by asking which slot's published address owns it.
;
; The range covers all three appearance pairs (120/121, 122/123, 124/125)
; although only pair 0 is written before step 3. Codes 122-125 are the retired
; pickup bank and no runtime path puts them on screen, so widening the filter
; now changes nothing and cannot be forgotten later.
light_cell_resolve:
    cmp #LIGHT_SCREEN_CODE
    bcc @keep
    cmp #(LIGHT_SCREEN_CODE+LIGHT_CODE_COUNT)
    bcs @keep
    ; It is a Light code. The caller's X goes to the one scratch byte the
    ; kernel owns; its Y and the captured byte go on the stack, so the 16-byte
    ; shared area stays whole for the token and wave state.
    stx LIGHT_RESOLVE_SAVE
    pha
    tya
    pha
    ldx #(LIGHT_SLOT_COUNT-1)
@slot:
    lda LIGHT_SCREEN_HI,x       ; hi = 0 means the slot is not on screen
    beq @next
    lda dst_ptr
    sec
    sbc LIGHT_SCREEN_LO,x
    tay
    lda dst_ptr+1
    sbc LIGHT_SCREEN_HI,x
    bne @next
    cpy #LIGHT_CELL_COUNT
    bcc @owned
@next:
    dex
    bpl @slot
    pla
    tay
    pla                         ; no slot owns it: the capture stands
    ldx LIGHT_RESOLVE_SAVE
    rts
@owned:
    ; X = slot, Y = cell. The backing is cell-major, so the byte wanted is
    ; light_backing[slot*LIGHT_CELL_COUNT + cell]; the cell is 0 or 1, so the
    ; add is one conditional increment and needs no further scratch.
    txa
    asl                         ; C = 0: the slot index is at most 3
    tax
    tya
    beq :+
    inx
:
    lda LIGHT_BACKING0,x
    tax                         ; park the backing while the stack unwinds
    pla
    tay
    pla                         ; discard the captured byte
    txa
    ldx LIGHT_RESOLVE_SAVE
@keep:
    rts

light_kernel_end:
