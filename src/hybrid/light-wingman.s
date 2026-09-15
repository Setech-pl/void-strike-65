; Light Wingman ASM kernel: two ring cells, their backing, the glyph install,
; and the hot PairShot/contact tests. C owns lifecycle, HP, formation motion,
; fire policy and the archetype record; this file only executes and publishes.
; main.s reaches these entries solely through operand-only hook redirections,
; so no existing entry point or segment boundary moves.
;
; Layering (reverse order on erase):
;   render: debris -> effects -> Light -> PairShots (late publication)
;   erase:  Light -> effects -> debris, before any other layer writes
; A PairShot saving a Light cell inherits the Light's lower backing, and the
; Light saving an OLD PairShot cell inherits that shot's underlay, so neither
; erase can resurrect the other's glyph.

LIGHT_WIDTH_HPOS = 8
LIGHT_HEIGHT_SCANLINES = 8
LIGHT_GLYPH = WEAPON_PICKUP_GLYPH_BASE          ; 120/121: retired pickup bank
LIGHT_SCREEN_CODE = LIGHT_GLYPH|CAPITAL_PROJECTILE_HOSTILE_ATTRIBUTE
LIGHT_PROJECTILE_OWNER = FIGHTER_PROJECTILE_INTERCEPTOR|$04
LIGHT_SCORE_BCD = ENEMY_ARCHETYPE_TABLE+12+10   ; C-owned Light record field

.assert LIGHT_GLYPH = 120, error, "Light glyphs must reuse the retired pickup bank"
.assert (LIGHT_PROJECTILE_OWNER & FIGHTER_PROJECTILE_INTERCEPTOR_EMITTER_MASK) = 0, error, "Light shots are attributed to leader slot P1"

; Residency (all resident for the whole game, no runtime I/O):
;   LIGHT_CODE     tail of the hybrid extension composite, carried in the
;                  existing late-compressed extension stream
;   LIGHT_RESIDENT head of the pickup/collision stream at $8776
;   STARFIELD      free tail of the relocated starfield runtime (backing hook)
;   BROADSIDE      light_add_score in the retired 17-byte entry pad (main.s)

.segment "LIGHT_CODE"

; Frame start, before debris/effects erase.
light_erase:
    lda LIGHT_SCREEN_HI
    beq @done
    sta dst_ptr+1
    lda LIGHT_SCREEN_LO
    sta dst_ptr
    ldy #$01
    lda LIGHT_BACKING1
    sta (dst_ptr),y
    dey
    lda LIGHT_BACKING0
    sta (dst_ptr),y
    sty LIGHT_SCREEN_HI
@done:
    jmp entity_effects_erase_with_white_starfield

; After debris/effects render and before the late PairShot publication.
light_render:
    jsr entity_effects_render
    lda LIGHT_STATE
    beq @done
    jsr light_top
    cmp #ENTITY_GAMEPLAY_TOP
    bcc @done
    cmp #ENTITY_GAMEPLAY_BOTTOM
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
    ; An OLD PairShot glyph still occupies the cell until late publication:
    ; save that shot's underlay (and never a transient near-star point).
    jsr resolve_effect_backing_below_player_pairshot
    sta LIGHT_BACKING0,x
    txa
    ora #LIGHT_SCREEN_CODE
    sta (dst_ptr),y
    inc dst_ptr
    bne :+
    inc dst_ptr+1
:
    inx
    cpx #$02
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

; PairShot backing capture: a shot entering a currently rendered Light cell
; must save the Light's lower backing, never the Light glyph. An unrendered
; Light has SCREEN_HI=0, which can never match a ring page, so it needs no
; separate test.
light_backing:
    jsr resolve_effect_backing_below_interactive_debris
    sta LIGHT_SCRATCH
    lda dst_ptr
    sec
    sbc LIGHT_SCREEN_LO
    tay
    lda dst_ptr+1
    sbc LIGHT_SCREEN_HI
    bne @restore
    cpy #$02
    bcs @restore
    lda LIGHT_BACKING0,y
    ldy #$00
    rts
@restore:
    lda LIGHT_SCRATCH
    ldy #$00
    rts

light_starfield_end:
.assert light_starfield_end <= hud_booster_backing, error, "Light starfield tail overlaps BOOST HUD backing"
