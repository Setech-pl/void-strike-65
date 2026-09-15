; Light Wingman ASM kernel: two ring cells, their backing, the glyph install,
; and the hot PairShot/contact tests. C owns lifecycle, HP, formation motion,
; fire policy and the archetype record; this file only executes and publishes.
; main.s reaches these entries solely through operand-only hook redirections,
; so no existing entry point or segment boundary moves.
;
; Late publication (owner smoke 2026-09-15: the frame-start erase left the
; Light blank while ANTIC scanned the upper playfield, so it flickered). The
; Light is now erased and republished only inside the post-playfield PairShot
; window (after wait_frame_at_line $77), between the PairShot erase and render:
;   debris/effects (mid-frame) < Light < PairShots < sparse near (CH_SPACE only)
; Debris and effects render while the previous Light image is still visible;
; light_cell_resolve gives them the Light's lower backing, and the late Light
; erase leaves a cell alone once such a lower layer has overwritten it.

LIGHT_WIDTH_HPOS = 8
LIGHT_HEIGHT_SCANLINES = 8
LIGHT_CELL_COUNT = 2
LIGHT_GLYPH = WEAPON_PICKUP_GLYPH_BASE          ; 120/121: retired pickup bank
LIGHT_SCREEN_CODE = LIGHT_GLYPH|CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE
LIGHT_PROJECTILE_OWNER = FIGHTER_PROJECTILE_INTERCEPTOR|$04
LIGHT_SCORE_BCD = ENEMY_ARCHETYPE_TABLE+12+10   ; C-owned Light record field
; The bottom ring row is recycled (overwritten by the divider copy) by
; rotate_playfield_rows while the late-published Light is still visible; the
; footprint therefore never enters it, so the late erase never writes into a
; recycled row.
LIGHT_RENDER_BOTTOM = ENTITY_GAMEPLAY_BOTTOM-8

.assert LIGHT_GLYPH = 120, error, "Light glyphs must reuse the retired pickup bank"
.assert (LIGHT_SCREEN_CODE & (LIGHT_CELL_COUNT-1)) = 0, error, "Light cell index must be the low code bits"
.assert (LIGHT_PROJECTILE_OWNER & FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK) = 0, error, "Light shots are attributed to leader slot P1"

; Residency (all resident for the whole game, no runtime I/O):
;   LIGHT_CODE     tail of the hybrid extension composite, carried in the
;                  existing late-compressed extension stream
;   LIGHT_RESIDENT head of the pickup/collision stream at $8776
;   STARFIELD      free tail of the relocated starfield runtime (resolver)
;   BROADSIDE      light_add_score in the retired 17-byte entry pad (main.s)

.segment "LIGHT_CODE"

; Replaces the PairShot erase operand in the fighter publication window.
light_publish:
    jsr erase_fighter_projectile_overlays
    lda LIGHT_SCREEN_HI
    beq @render
    sta dst_ptr+1
    lda LIGHT_SCREEN_LO
    sta dst_ptr
    ldy #(LIGHT_CELL_COUNT-1)
@erase:
    tya
    ora #LIGHT_SCREEN_CODE
    cmp (dst_ptr),y             ; a lower layer that overwrote it owns it now
    bne :+
    lda LIGHT_BACKING0,y
    sta (dst_ptr),y
:
    dey
    bpl @erase
    iny
    sty LIGHT_SCREEN_HI
@render:
    lda LIGHT_STATE
    beq @done
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @done
    cmp #LIGHT_RENDER_BOTTOM
    bcs @done
    sbc #(ENTITY_GAMEPLAY_TOP-1) ; C=0
    lsr
    lsr
    lsr
    tax
    lda LIGHT_X
    sec
    sbc #GAMEPLAY_LEFT_HPOS
    lsr
    lsr
    clc
    adc PLAYFIELD_ROW_LO,x
    sta dst_ptr
    sta LIGHT_SCREEN_LO
    lda PLAYFIELD_ROW_HI,x
    adc #$00
    sta dst_ptr+1
    sta LIGHT_SCRATCH
    ldx #$00
@cell:
    ldy #$00
    lda (dst_ptr),y
    ; PairShots are already erased; save the true lower backing below any
    ; visible debris/effect cell and never a transient near-star point.
    jsr resolve_effect_backing_below_player_pairshot
    jsr resolve_effect_backing_below_interactive_debris
    jsr resolve_effect_backing_below_transient_effect
    sta LIGHT_BACKING0,x
    txa
    ora #LIGHT_SCREEN_CODE
    sta (dst_ptr),y
    inc dst_ptr
    bne :+
    inc dst_ptr+1
:
    inx
    cpx #LIGHT_CELL_COUNT
    bne @cell
    lda LIGHT_SCRATCH
    sta LIGHT_SCREEN_HI
@done:
    rts

; C=0 on return; A is the character-aligned top scanline.
light_top:
    lda LIGHT_Y
    and #$F8
    clc
    rts

.segment "LIGHT_RESIDENT"

; After entity/effect simulation: C decides motion and fire; ASM performs the
; PairShot emission, the glyph install and the player contact test.
light_update:
    jsr entity_effects_update
    jsr ENEMY_LIGHT_TICK
    tay
    beq @alive
    ldx #INTERCEPTOR_PROJECTILE_SLOT_BASE
@find:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @emit
    inx
    cpx #(INTERCEPTOR_PROJECTILE_SLOT_BASE+INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT)
    bne @find
    beq @alive                   ; a full shared pool drops the single shot
@emit:
    lda #LIGHT_PROJECTILE_OWNER
    sta FIGHTER_PROJECTILE_ACTIVE,x
    lda #INTERCEPTOR_PROJECTILE_LIFETIME
    sta FIGHTER_PROJECTILE_LIFETIME,x
    lda LIGHT_X                  ; C keeps X four-aligned: centre, even HPOS
    ora #((LIGHT_WIDTH_HPOS/2-INTERCEPTOR_PROJECTILE_WIDTH_HPOS/2) & $FE)
    sta FIGHTER_PROJECTILE_X,x
    jsr light_top
    adc #LIGHT_HEIGHT_SCANLINES
    sta FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
@alive:
    lda LIGHT_STATE
    beq @done
    ; Reinstalled every active frame (16 bytes, no latch): copy_charset rebuilds
    ; glyphs 120/121 from the frontend source at each new game.
    ldx #(LIGHT_HEIGHT_SCANLINES*2-1)
@glyph:
    lda light_glyph,x
    sta CHARSET+LIGHT_GLYPH*8,x
    dex
    bpl @glyph
@contact:
    lda PLAYER_LIFECYCLE
    lsr                          ; DYING/GAME OVER are odd: no contact
    bcs @done
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @done
    sta LIGHT_SCRATCH
    lda player_y
    sbc LIGHT_SCRATCH            ; C=1
    cmp #LIGHT_HEIGHT_SCANLINES
    bcc @vertical
    cmp #(256-PLAYER_COLLISION_LAST_ROW)
    bcc @done
@vertical:
    lda player_x
    sec
    sbc LIGHT_X
    cmp #LIGHT_WIDTH_HPOS
    bcc @touch
    cmp #(256-(PLAYER_VISIBLE_WIDTH_HPOS-1))
    bcc @done
@touch:
    ; Raider contact contract: full player damage through the shared gate and
    ; one damage unit to the enemy regardless of the player outcome.
    lda #PLAYER_HEALTH_UNITS
    jsr apply_player_damage
    jsr ENEMY_LIGHT_HIT
    tay
    bne light_destroyed
@done:
    rts

; Player PairShot scan, X = projectile slot. Carry clear consumes the slot as
; the debris path does; otherwise defer to the existing debris/Raider target.
light_shot:
    lda LIGHT_STATE
    beq @target
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @target
    sta LIGHT_SCRATCH
    lda FIGHTER_PROJECTILE_Y,x
    sbc LIGHT_SCRATCH            ; C=1
    cmp #LIGHT_HEIGHT_SCANLINES
    bcc @vertical
    cmp #(256-(PLAYER_FIGHTER_PROJECTILE_SPEED+PLAYER_FIGHTER_PROJECTILE_HEIGHT-1))
    bcc @target
@vertical:
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc LIGHT_X
    cmp #LIGHT_WIDTH_HPOS
    bcs @target
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    stx LIGHT_SLOT_SAVE
    jsr ENEMY_LIGHT_HIT
    tay
    beq :+
    jsr light_destroyed
:
    ldx LIGHT_SLOT_SAVE
    clc
    rts
@target:
    jmp entity_player_fighter_projectile_target

; Lethal hit: breakup feedback, score and sound. Light shots carry the leader
; P1 emitter bit, so they follow the existing emitter-owned cleanup unchanged.
light_destroyed:
    jsr clear_transient_effects
    jsr light_top
    tay
    lda LIGHT_X
    jsr spawn_breakup_effects_at
    jsr light_add_score          ; BROADSIDE pad; C-owned record value
    jsr update_score_display
    jmp play_hit_sound

; Downward swept-wing fighter, ANTIC 4 colour 3 (hostile bank), 2x1 cells.
light_glyph:
    .byte $F0,$FC,$3F,$0F,$0F,$03,$03,$00
    .byte $0F,$3F,$FC,$F0,$F0,$C0,$C0,$00

.segment "STARFIELD"

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

; A = captured cell byte. There is one Light and its codes are used by nothing
; else, so a Light code names the cell index directly: return that cell's lower
; backing so the lower layer's later erase cannot resurrect the Light glyph.
; X and Y are preserved (debris captures its second cell with Y=1).
light_cell_resolve:
    cmp #LIGHT_SCREEN_CODE
    bcc @done
    cmp #(LIGHT_SCREEN_CODE+LIGHT_CELL_COUNT)
    bcs @done
    lsr
    lda LIGHT_BACKING0
    bcc @done
    lda LIGHT_BACKING1
@done:
    rts

light_starfield_end:
.assert light_starfield_end <= hud_booster_backing, error, "Light starfield tail overlaps BOOST HUD backing"
