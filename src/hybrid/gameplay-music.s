; ============================================================================
; Void Strike 65 — gameplay music player, in the per-level image (music v2)
; ============================================================================
;
; ITS OWN LINK (docs/plan-music-v2.md §1.4 placement G1, owner answer Q-P1
; ACCEPTED 2026-09-22). Built by buildResidentModule the way
; src/hybrid/sector-reader.s and src/hybrid/light-kernel.s are, its bytes
; spliced into the per-level image right behind the reader's eight-byte
; header, so they land at $A608 when the level is loaded — as an XEX block on
; the XEX, over SIO at START GAME on the ATR. main.s reaches it only through
; the frozen three-entry vector table below; no main-link symbol binds here.
;
; SCORE FORMAT v2 (§1.1 "Gameplay patterns"), landed in step 2b. Two voices,
; one instrument each, no arpeggio and no drum — deliberately a different
; encoding from the menu's, because every byte of this tick is fence-relevant:
;
;   * a row token is a NIBBLE — 0 HOLD, 1 REST, 2..15 an index into the
;     channel's own divider map — so a 16-row column is 8 bytes and is reached
;     as `gm_columns + id*8` through a one-byte offset. No pointer table, no
;     pitch table, one column byte read per channel per row;
;   * volume comes from a per-frame envelope whose last entry (bit 7 set)
;     holds until the next token. A zero volume publishes AUDC $00, not
;     base|0 — the same silence, a different byte, and the register stream is
;     the specification;
;   * the envelope cursor advances every frame whether or not the register
;     write is suppressed, which is what lets the lead resume the music in
;     place on the first frame after an SFX ends.
;
; SFX POLICY — owner answer Q-S1 (owner-decisions-2026-09-11.md §AB.2):
; the Player Fighter shot moved to channel 4, shared with the capital-hull
; explosion. So channel 1 (bass) is NEVER preempted, and channel 2 (lead) only
; by the hit SFX. Channel 3 is the engine bed. This file owns channels 1 and 2
; and touches nothing else, ever — not AUDCTL, not channels 3 or 4.
;
; NOTHING HERE MAY MODIFY ITSELF. The boot smoke compares the whole level
; buffer against build/level-1.bin at its gameplay snapshot (frame 3300, well
; after start_gameplay), so a self-modifying block would fail it. The v1
; player needed a four-byte self-modified read tail in ENTITY_CODE for exactly
; this reason; the v2 encoding needs none, and that tail is gone.

.setcpu "6502"

.include "gameplay-music.inc"
.include "gameplay-music-abi.inc"
.include "gameplay-music-main-abi.inc"

; POKEY. Only channels 1 and 2 are ever written here.
AUDF1 = $D200
AUDC1 = $D201
AUDF2 = $D202
AUDC2 = $D203

.import __GAMEPLAY_MUSIC_RUN__, __GAMEPLAY_MUSIC_RAM_LAST__
.assert __GAMEPLAY_MUSIC_RUN__ = GAMEPLAY_MUSIC_BLOCK, lderror, "the gameplay music block must start at the level image's music offset"
.assert __GAMEPLAY_MUSIC_RAM_LAST__ < GAMEPLAY_MUSIC_BLOCK_END, lderror, "the gameplay music block overruns its reservation in the level image"

.segment "GAMEPLAY_MUSIC"

; The frozen entry vector table. main.s calls these three addresses by
; constant (build/gameplay-music-abi.inc), never a label in this file.
gameplay_music_vectors:
    jmp music_start_gameplay              ; GAMEPLAY_MUSIC_START
    jmp music_tick_gameplay               ; GAMEPLAY_MUSIC_TICK
    jmp music_restore_gameplay_channels   ; GAMEPLAY_MUSIC_RESTORE
.assert * - gameplay_music_vectors = 9, error, "the gameplay music vector table is three frozen JMPs"

game_music_player_start:

music_start_gameplay:
    lda GAME_MUSIC_ENABLED
    beq @done
    lda sound_enabled
    beq @done
    lda #GAME_MUSIC_VOICE_RESTING
    sta GAME_MUSIC_AGE           ; both voices start silent, whatever row zero is
    sta GAME_MUSIC_AGE+1
    lda #$01
    sta MUSIC_ACTIVE
    sta MUSIC_ROW_TIMER          ; row zero lands on the next gameplay frame
    jsr gm_load_bar
@done:
    rts

; Called once per gameplay PAL frame, only while MUSIC_ACTIVE is nonzero.
; Five frames in six take the publish-only path.
music_tick_gameplay:
    dec MUSIC_ROW_TIMER
    bne gm_publish
    lda #GAME_MUSIC_FRAMES_PER_ROW
    sta MUSIC_ROW_TIMER
    ldx #$00
    jsr gm_row_channel
    ldx #$01
    jsr gm_row_channel
    inc MUSIC_PATTERN_ROW
    lda MUSIC_PATTERN_ROW
    cmp #GAME_MUSIC_PATTERN_ROWS
    bcc gm_publish
    lda #$00
    sta MUSIC_PATTERN_ROW
    inc MUSIC_SEQUENCE_INDEX
    lda MUSIC_SEQUENCE_INDEX
    cmp #GAME_MUSIC_SEQUENCE_LENGTH
    bcc :+
    lda #$00
    sta MUSIC_SEQUENCE_INDEX
:
    jsr gm_load_bar

; Both voices, every frame. The bass is published unconditionally: owner
; answer Q-S1 moved the shot SFX to channel 4, so nothing preempts channel 1.
gm_publish:
    ldx #$00
    jsr gm_frame
    ldy PLAYER_LIFECYCLE
    cpy #PLAYER_DYING
    bne :+
    lda #$00                     ; dying mutes, but the cursors keep advancing
:
    sta AUDC1
    lda GAME_MUSIC_DIVIDER
    sta AUDF1
    ldx #$01
    jsr gm_frame
    ldy hit_timer
    bne @done                    ; the hit SFX owns channel 2 while it runs
    ldy PLAYER_LIFECYCLE
    cpy #PLAYER_DYING
    bne :+
    lda #$00
:
    sta AUDC2
    lda GAME_MUSIC_DIVIDER+1
    sta AUDF2
@done:
    rts

; X = channel. Reads this row's nibble from the channel's column and applies
; it. Two rows share a byte: the even row is the low nibble, the odd the high.
gm_row_channel:
    lda MUSIC_PATTERN_ROW
    lsr                          ; A = row/2, C set on an odd row
    bcs @odd
    clc
    adc GAME_MUSIC_COLUMN,x
    tay
    lda gm_columns,y
    jmp gm_apply
@odd:
    clc
    adc GAME_MUSIC_COLUMN,x
    tay
    lda gm_columns,y
    lsr
    lsr
    lsr
    lsr

; A carries the row token in its low nibble, X the channel. HOLD keeps the
; voice and its envelope cursor, REST silences and forgets it, 2..15 starts a
; note from the channel's own divider map.
gm_apply:
    and #$0F
    beq @done                    ; GAME_MUSIC_TOKEN_HOLD
    cmp #GAME_MUSIC_TOKEN_REST
    bne @note
    lda #GAME_MUSIC_VOICE_RESTING
    sta GAME_MUSIC_AGE,x
    rts
@note:
    tay
    cpx #$00
    bne @lead
    lda gm_map_ch1-GAME_MUSIC_TOKEN_NOTE_BASE,y
    jmp @store
@lead:
    lda gm_map_ch2-GAME_MUSIC_TOKEN_NOTE_BASE,y
@store:
    sta GAME_MUSIC_DIVIDER,x
    lda #$00
    sta GAME_MUSIC_AGE,x         ; a new token restarts the envelope
@done:
    rts

; X = channel. Returns this frame's AUDC byte in A and advances the envelope
; cursor, which stops on its GAME_MUSIC_MACRO_LAST_ENTRY bit — that is how
; "volume = envelope[min(age, len-1)]" is done without keeping an age.
gm_frame:
    ldy GAME_MUSIC_AGE,x
    bmi @rest                    ; GAME_MUSIC_VOICE_RESTING
    cpx #$00
    bne @lead
    lda gm_env_ch1,y
    jmp @got
@lead:
    lda gm_env_ch2,y
@got:
    tay
    and #GAME_MUSIC_MACRO_LAST_ENTRY
    bne @hold
    inc GAME_MUSIC_AGE,x
@hold:
    tya
    and #$0F
    beq @rest                    ; a zero volume publishes $00, not base|0
    ora gm_audc_base,x
    rts
@rest:
    lda #$00
    rts

gm_load_bar:
    ldx MUSIC_SEQUENCE_INDEX
    lda gm_seq_ch1,x
    sta GAME_MUSIC_COLUMN
    lda gm_seq_ch2,x
    sta GAME_MUSIC_COLUMN+1
    rts

; resume_gameplay_audio calls this after a pause. v1 needed it because that
; player only wrote POKEY on a row boundary, so without a cached pair the
; voices could stay silent for five frames; v2 publishes every frame, so this
; is simply one publication brought forward — the transport does not move, and
; the only effect is that each unpause advances the envelope cursors by the
; one frame the resumed tick would have advanced them anyway.
music_restore_gameplay_channels:
    lda MUSIC_ACTIVE
    beq @done
    jmp gm_publish
@done:
    rts

game_music_player_end:

EMIT_GAMEPLAY_MUSIC_DATA
