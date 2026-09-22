; ============================================================================
; Void Strike 65 — gameplay music player, in the per-level image (music v2 §1.4)
; ============================================================================
;
; ITS OWN LINK (docs/plan-music-v2.md §1.4 placement G1, owner answer Q-P1
; ACCEPTED 2026-09-22). The player used to live in STARFIELD, inside main.s.
; It now links on its own with cfg/gameplay-music.cfg, built by
; buildResidentModule the way src/hybrid/sector-reader.s and
; src/hybrid/light-kernel.s are, and its bytes are spliced into the per-level
; image right behind the reader's eight-byte header, so they land at $A608
; when the level is loaded — as an XEX block on the XEX, over SIO at START
; GAME on the ATR.
;
; THIS COMMIT IS A PURE MOVE. The score, the encoding, the tick and the POKEY
; write stream are the v1 player's, byte for byte; only the address changed.
; The v2 player (plan §1.1) replaces the body of this file in the next
; session, which is why the placement is landed on its own first: it is the
; only hardware-adjacent half of the change.
;
; It reaches main.s through the generated build/gameplay-music-main-abi.inc,
; and main.s reaches IT through the frozen three-entry vector table below —
; the same shape as the reader's $A000 entry and the Light kernel's vectors.
; No main-link symbol binds to this file.
;
; The one piece deliberately left behind in main.s is the four-byte
; self-modified read tail `game_music_read_token_tail` in ENTITY_CODE. The
; level buffer is compared byte for byte against build/level-1.bin at the
; boot smoke's gameplay snapshot (frame 3300, well after start_gameplay), so
; nothing inside this block may modify itself. Keeping the tail where it
; already is costs 0 B and keeps the block strictly read-only at runtime.

.setcpu "6502"

.include "gameplay-music.inc"
.include "gameplay-music-abi.inc"
.include "gameplay-music-main-abi.inc"

; POKEY. Only channels 1 and 2 are ever written here; 3 and 4 belong to the
; engine bed and the capital-hull explosion (asset `reservedSfxChannels`).
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

; Gameplay has a specialized two-channel renderer so its row-boundary path is
; bounded below the remaining PAL worst-frame budget. Each packed score byte
; holds a channel-1 event in its high nibble and channel-2 event in its low
; nibble. HOLD is zero, REST is one, and notes 2-15 reuse the leading entries
; of game_music_frequency_table, the frozen v1 divider table inside this
; block. AUDCTL is never touched here.

game_music_player_start:
music_start_gameplay:
    lda GAME_MUSIC_ENABLED
    beq @done
    lda sound_enabled
    beq @done
    lda #GAME_MUSIC_CHANNEL_MASK
    sta MUSIC_CHANNEL_MASK
    lda #$01
    sta MUSIC_ACTIVE
    sta MUSIC_ROW_TIMER
    jsr game_music_load_pattern
@done:
    rts

; Called only when MUSIC_ACTIVE is nonzero. The transport advances through
; player death, but idle music voices are muted until respawn. Active shot/hit
; timers suppress every music write to their channel, preserving the complete
; existing SFX envelope. The cached note is restored after the timer expires.
music_tick_gameplay:
    .assert GAME_MUSIC_EVENTS_PER_TICK_LIMIT = 1, error, "gameplay music tick must remain one fixed-width event"
    dec MUSIC_ROW_TIMER
    bne @restore
    lda #GAME_MUSIC_FRAMES_PER_ROW
    sta MUSIC_ROW_TIMER
    ldy MUSIC_PATTERN_ROW
    jsr game_music_read_token
    sta MUSIC_TOKEN

    and #$0F
    beq @channel_1
    cmp #GAME_MUSIC_TOKEN_REST
    beq @rest_2
    sec
    sbc #GAME_MUSIC_TOKEN_NOTE_BASE
    tay
    lda game_music_frequency_table,y
    sta GAME_MUSIC_CH2_FREQUENCY
    lda #GAME_MUSIC_CH2_AUDC
    sta GAME_MUSIC_CH2_CONTROL
    bne @channel_1
@rest_2:
    lda #$00
    sta GAME_MUSIC_CH2_CONTROL

@channel_1:
    lda MUSIC_TOKEN
    lsr
    lsr
    lsr
    lsr
    beq @advance
    cmp #GAME_MUSIC_TOKEN_REST
    beq @rest_1
    sec
    sbc #GAME_MUSIC_TOKEN_NOTE_BASE
    tay
    lda game_music_frequency_table,y
    sta GAME_MUSIC_CH1_FREQUENCY
    lda #GAME_MUSIC_CH1_AUDC
    sta GAME_MUSIC_CH1_CONTROL
    bne @advance
@rest_1:
    lda #$00
    sta GAME_MUSIC_CH1_CONTROL

@advance:
    inc MUSIC_PATTERN_ROW
    lda MUSIC_PATTERN_ROW
    cmp #GAME_MUSIC_PATTERN_ROWS
    bcc @restore
    lda #$00
    sta MUSIC_PATTERN_ROW
    inc MUSIC_SEQUENCE_INDEX
    lda MUSIC_SEQUENCE_INDEX
    cmp #GAME_MUSIC_SEQUENCE_LENGTH
    bcc :+
    lda #$00
    sta MUSIC_SEQUENCE_INDEX
:
    jsr game_music_load_pattern

@restore:
music_restore_gameplay_channels:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @mute
    lda fire_timer
    bne :+
    lda GAME_MUSIC_CH1_FREQUENCY
    sta AUDF1
    lda GAME_MUSIC_CH1_CONTROL
    sta AUDC1
:
    lda hit_timer
    bne @done
    lda GAME_MUSIC_CH2_FREQUENCY
    sta AUDF2
    lda GAME_MUSIC_CH2_CONTROL
    sta AUDC2
@done:
    rts

@mute:
    lda fire_timer
    bne :+
    lda #$00
    sta AUDC1
:
    lda hit_timer
    bne @done
    lda #$00
    sta AUDC2
    rts

; The self-modified read tail stays in main.s ENTITY_CODE: this block is
; read-only once the level image has landed (see the header note).
game_music_read_token = game_music_read_token_tail
game_music_pattern_read = game_music_read_token_tail

game_music_load_pattern:
    ldx MUSIC_SEQUENCE_INDEX
    lda game_music_sequence,x
    tax
    lda game_music_pattern_lo,x
    sta game_music_pattern_read+1
    lda game_music_pattern_hi,x
    sta game_music_pattern_read+2
    rts

game_music_player_end:

EMIT_GAMEPLAY_MUSIC_DATA
