; ============================================================================
; Void Strike 65 — the level-summary screen (M5a-S2)
; ============================================================================
;
; docs/plans/m5-loading-boss.md §4.8, owner decisions 26-28, answers Q13-Q17.
; ITS OWN LINK, run at $0500-$06FF: the boot splash's RAM, free once the
; splash hold ends, read from the disk once per session by the sector reader
; (overlay directory entry 8) and resident from then on. RESET is a cold start,
; so nothing here can outlive the session that read it.
;
; The screen replaces the level loading screen at both transitions:
;   START GAME (Q17): the title, the level's best and an empty panel, while the
;     region's art, the capital restore, the save record and the level image
;     land behind it;
;   the level's end (decision 26): every stat on the first frame - score,
;     kills, accuracy, time, lives lost, bonus - and the S/A/B/C grade
;     (decision 28); then the art, the record read, compared, written and read
;     back (Q16), with the finished level's music still playing.
; Either way the screen stays up SUMMARY_MINIMUM_FRAMES (Q15) and FIRE only
; counts after both that and the reads.
;
; The interface labels are MIT and travel in each region's art run with the
; picture (scripts/level-summary-assets.mjs); this file draws the values.

.setcpu "6502"

.include "level-summary-abi.inc"
.include "level-summary-layout.inc"
.include "summary-main-abi.inc"
.include "summary-reader-abi.inc"
.include "gameplay-music-abi.inc"
.include "level-def.inc"
.include "capital-hulls.inc"

; The SIO protocol bytes the write uses (HRM ch.9 pp.217-219); the reader's
; primitives do the wire work.
SIO_CMD_PUT     = $50           ; 'P': write without the drive's verify; we read back
SIO_ACK         = $41
SIO_COMPLETE    = $43
SKCTL_TRANSMIT  = $23
SKCTL           = $D20F
WSYNC           = $D40A
BUDGET_ACK      = 3
BUDGET_COMPLETE = 200
; HRM ch.9 step 3 (p.218): the computer sends a write's data frame 10-18 ms
; after the device's ACK. 188 PAL lines ~ 12.1 ms.
WRITE_DATA_DELAY_LINES = 188

COLPF0  = $D016
COLPF1  = $D017
COLPF2  = $D018
COLPF3  = $D019
COLBK   = $D01A
TRIG0   = $D010
DMACTL  = $D400
DLISTL  = $D402
DLISTH  = $D403
CHBASE  = $D409
VCOUNT  = $D40B
NMIEN   = $D40E

FRONTEND_CHARSET = $4800
CH_FRONT_SPACE   = 0
CH_FRONT_ZERO    = 1
CH_FRONT_A       = 11
CH_FRONT_DASH    = 37
CH_FRONT_COLON   = 40
LEVEL_BUFFER     = $A600
LEVEL_ID         = LEVEL_BUFFER + 3
PLAYER_LIVES     = PLAYER_LIFECYCLE + 1
SECTOR_BYTES     = 128
SUMMARY_LAST_REGION = 3                     ; regions 0-3: levels 1-3, 4-6, 7-9, 10+
; render_frontend_data is `jsr clear_screen` and then the record loop; the
; loop alone draws without clearing (scripts/build.mjs checks the jsr is there).
render_frontend_records = render_frontend_data + 3

; The grade block of the payload page (scripts/level-compiler.mjs, PAYLOAD
; summary): accuracy tiers in per cent, time limits in seconds (16-bit),
; lives-lost bounds, then the bonus per tier point in packed BCD.
GRADE_ACCURACY_1 = LEVEL_PAYLOAD_SUMMARY + 0
GRADE_ACCURACY_2 = LEVEL_PAYLOAD_SUMMARY + 1
GRADE_TIME_1     = LEVEL_PAYLOAD_SUMMARY + 2
GRADE_TIME_2     = LEVEL_PAYLOAD_SUMMARY + 4
GRADE_LIVES_1    = LEVEL_PAYLOAD_SUMMARY + 6
GRADE_LIVES_2    = LEVEL_PAYLOAD_SUMMARY + 7
GRADE_BONUS      = LEVEL_PAYLOAD_SUMMARY + 8

; The save record (§4.8.4): "VR", version 1, a carry wrap-around checksum of
; bytes 4-127, ten score-table entries (M4 fills them: BCD score, initials),
; then twelve levels of {best grade, best score as three BCD bytes}.
RECORD           = SAVE_RECORD_BUFFER
RECORD_MAGIC_0   = 'V'
RECORD_MAGIC_1   = 'R'
RECORD_VERSION   = 1
RECORD_LEVELS    = 64
RECORD_LAST_LEVEL = 12

VALUE_FIELD      = SUMMARY_VALUE_END - 4      ; a five-cell right-aligned field

.segment "LEVEL_SUMMARY"

summary_vectors:
        jmp summary_start_game                  ; $0500 — A = level id
        jmp summary_level_end                   ; $0503 — the level in the buffer
        jmp summary_animate                     ; $0506 — the reader, per sector

; ---------------------------------------------------------------------------
; START GAME (Q17): the best and an empty panel, the reads behind it.
; ---------------------------------------------------------------------------
summary_start_game:
        sta summary_level
        lda #$00
        sta PLAYER_LIFECYCLE            ; a quit while dying must not mute the music
        ; Owner review (2026-10-03): START GAME keeps the old loader's top line,
        ; the reader's record, which the session's first START GAME already
        ; shows alone on the interim screen at the same scanline. That screen
        ; is still on: clear and redraw only once ANTIC has fetched this frame's
        ; row 0 (scanline 32), so the shared line never blinks - the clear and
        ; the record take ~60 lines, done long before the next frame's row 0;
        ; LOADING follows
        ; the switch, so the interim screen never shows it.
        jsr wait_frame_start            ; returns on scanline ~3
        ldx #40
@past_top_line:
        sta WSYNC                       ; 40 lines: past row 0's fetch at 32
        dex
        bne @past_top_line
        jsr clear_screen
        lda #<sr_engaging_record
        ldx #>sr_engaging_record
        jsr summary_records
        lda #<summary_start_display_list
        ldx #>summary_start_display_list
        jsr summary_publish
        lda #<summary_loading_records
        ldx #>summary_loading_records
        jsr summary_records
        ; A level already in the buffer plays its block from the first frame.
        lda summary_level
        sta sr_requested_id
        jsr sector_reader_resident_hit
        lda #$00
        adc #$00                        ; C: not in the buffer, so it will be read
        sta summary_level_read
        bne :+
        jsr GAMEPLAY_MUSIC_START
:
        jsr summary_art
        bcs summary_failed
        ; M5b-S3 (Q-S4): a game that ended inside the boss sector left its
        ; settings patched; they go back with the capital code, under the
        ; same flag, before the reader's restore clears it.
        lda sr_slot_a_overlaid
        beq :+
        jsr summary_boss_restore
:
        jsr sector_reader_restore_if_overlaid
        bcs summary_failed
        jsr summary_read_record
        jsr summary_draw_best
        ; audit-hardening (AUD-02, owner Q3): a level image the reader reads is
        ; folded from here and checked before its music player runs or the
        ; Director reads it; one already in the buffer was checked when it was.
        jsr guard_reset
        lda summary_level
        jsr sector_reader_load
        bcs summary_failed
        lda summary_level_read
        beq summary_level_loaded
        ldx summary_level
        lda summary_level_sums_lo-1,x
        ldy summary_level_sums_hi-1,x
        jsr guard_compare
        bcs summary_failed
summary_level_loaded:                   ; the level read's end, for the harness
        lda MUSIC_ACTIVE                ; the head has landed: its music starts
        bne summary_wait
        jsr GAMEPLAY_MUSIC_START
        jmp summary_wait
summary_failed:
        jmp sector_reader_failure_screen

; ---------------------------------------------------------------------------
; The level's end (decision 26): the stats on frame 1, the record behind them.
; ---------------------------------------------------------------------------
summary_level_end:
        lda LEVEL_ID
        sta summary_level
        jsr summary_time
        jsr summary_accuracy
        lda #PLAYER_STARTING_LIVES
        sec
        sbc PLAYER_LIVES
        bcs :+
        lda #$00
:
        sta summary_lives_lost
        jsr summary_grade
        sta summary_grade_code
        jsr summary_bonus
        jsr summary_prepare
        jsr summary_draw_stats
        lda #<summary_display_list
        ldx #>summary_display_list
        jsr summary_publish
        jsr summary_art
        bcs summary_failed
        jsr summary_read_record
        jsr summary_update_record
        jsr summary_draw_best
        ; fall through: the minimum, then FIRE

; ---------------------------------------------------------------------------
; Q15: up for at least SUMMARY_MINIMUM_FRAMES, and FIRE only once the reads are
; done - a release first, so the FIRE that started the game or held the gun
; does not dismiss the screen. The music ticks with every frame.
; ---------------------------------------------------------------------------
summary_wait:
        lda SUMMARY_FRAMES
        cmp #SUMMARY_MINIMUM_FRAMES
        bcs @ready
        jsr summary_frame
        jmp summary_wait
@ready:
        ldx #39
        lda #$00
@clear:
        sta SUMMARY_ANIMATION_ROW,x
        dex
        bpl @clear
        lda #<summary_fire_records
        ldx #>summary_fire_records
        jsr summary_records
summary_release_loop:
        jsr summary_frame
summary_fire_release:                   ; the harness drives FIRE at these two polls
        lda TRIG0
        beq summary_release_loop
summary_press_loop:
        jsr summary_frame
summary_fire_press:
        lda TRIG0
        bne summary_press_loop
        rts

summary_frame:
        jsr wait_frame_start
        jmp sector_reader_frame_tick

; ---------------------------------------------------------------------------
; The screen.
; ---------------------------------------------------------------------------
; Clear, then the title and LOADING: the frontend charset, drawn before the
; display is on, so the first frame already has them.
summary_prepare:
        jsr clear_screen
        lda #<summary_title_records
        ldx #>summary_title_records
        jsr summary_records
        lda #SUMMARY_ROW_TITLE
        jsr summary_row
        ldy #22
        lda summary_level
        jmp summary_two_digits

; A/X = the display list. Everything changes on a frame's edge, before
; ANTIC fetches the first line at scanline 8: the interim screen of a
; session's first START GAME leaves DMA on, and a list switched mid-frame
; would show half of each.
summary_publish:
        pha
        jsr wait_frame_start            ; leaves X alone
        pla
        sta DLISTL
        stx DLISTH
        lda #>FRONTEND_CHARSET
        sta CHBASE
        lda #$0A                        ; the text's luminance until the art lands
        sta COLPF1
        lda #$00
        sta COLPF0
        sta COLPF2
        sta COLPF3
        sta COLBK
        sta NMIEN
        sta SUMMARY_FRAMES              ; Q15 counts from this frame
        ; Owner review, item 1: the reader's waits tick on a VCOUNT that fell
        ; below the last one they saw. That value is from an earlier frame; left
        ; there, the next wait would count this frame's edge a second time.
        lda VCOUNT
        sta sr_vcount_last
        lda #$22
        sta DMACTL
        rts

summary_draw_stats:
        lda #SUMMARY_ROW_SCORE
        jsr summary_row
        ldx score_bcd_lo
        lda score_bcd_hi
        jsr summary_bcd_score
        lda #SUMMARY_ROW_KILLS
        jsr summary_row
        lda STATS_KILLS
        ldx STATS_KILLS+1
        ldy #VALUE_FIELD
        jsr summary_print
        lda #SUMMARY_ROW_ACCURACY
        jsr summary_row
        lda summary_percent
        ldx #$00
        ldy #VALUE_FIELD-1
        jsr summary_print
        lda #SUMMARY_PERCENT_CODE
        sta (dst_ptr),y
        lda #SUMMARY_ROW_TIME
        jsr summary_row
        lda summary_minutes
        ldx #$00
        ldy #VALUE_FIELD-3
        jsr summary_print
        lda #CH_FRONT_COLON
        sta (dst_ptr),y
        iny
        lda summary_seconds_part
        jsr summary_two_digits
        lda #SUMMARY_ROW_LIVES
        jsr summary_row
        lda summary_lives_lost
        ldx #$00
        ldy #VALUE_FIELD
        jsr summary_print
        lda #SUMMARY_ROW_BONUS
        jsr summary_row
        ldx summary_bonus_total
        lda summary_bonus_total+1
        jsr summary_bcd_score
        lda #SUMMARY_ROW_GRADE
        jsr summary_row
        ldx summary_grade_code
        lda summary_letters,x
        ldy #SUMMARY_VALUE_END
        sta (dst_ptr),y
        rts

; BEST: the level's best grade and score from the record, or -- for none.
summary_draw_best:
        lda #SUMMARY_ROW_BEST
        jsr summary_row
        jsr summary_record_slot
        bcs @none
        lda RECORD,x
        beq @none
        tay
        lda summary_letters,y
        ldy #VALUE_FIELD-2
        sta (dst_ptr),y
        lda RECORD+2,x
        pha
        lda RECORD+3,x
        tax
        pla
        jmp summary_bcd_score
@none:
        lda #CH_FRONT_DASH
        ldy #SUMMARY_VALUE_END-1
        sta (dst_ptr),y
        iny
        sta (dst_ptr),y
        rts

; A = high, X = low packed BCD: the HUD's fixed leading 0 and four digits.
summary_bcd_score:
        pha
        ldy #VALUE_FIELD
        lda #CH_FRONT_ZERO
        sta (dst_ptr),y
        iny
        pla
        jsr draw_top_score_bcd_byte
        txa
        jmp draw_top_score_bcd_byte

; A = row: dst_ptr = the row's first cell.
summary_row:
        tax
        lda #<SUMMARY_SCREEN
        sta dst_ptr
        lda #>SUMMARY_SCREEN
        sta dst_ptr+1
@row:
        dex
        bmi @done
        lda dst_ptr
        clc
        adc #40
        sta dst_ptr
        bcc @row
        inc dst_ptr+1
        bne @row
@done:
        rts

; A/X = lo/hi: five right-aligned digits from (dst_ptr),Y, leading zeros blank.
; Y is left after the field.
summary_print:
        sta summary_number
        stx summary_number+1
        lda #$00
        sta summary_seen
        ldx #4
@digit:
        lda #$00
        sta summary_digit
@subtract:
        lda summary_number
        sec
        sbc summary_powers_lo,x
        pha
        lda summary_number+1
        sbc summary_powers_hi,x
        bcc @emit
        sta summary_number+1
        pla
        sta summary_number
        inc summary_digit
        bne @subtract
@emit:
        pla
        lda summary_digit
        bne @show
        txa
        beq @show                       ; the units digit always shows
        lda summary_seen
        beq @store                      ; CH_FRONT_SPACE is 0
@show:
        inc summary_seen
        lda summary_digit
        clc
        adc #CH_FRONT_ZERO
@store:
        sta (dst_ptr),y
        iny
        dex
        bpl @digit
        rts

; A = 0-99: two digits, zero-padded, at (dst_ptr),Y.
summary_two_digits:
        ldx #CH_FRONT_ZERO
@tens:
        cmp #10
        bcc @units
        sbc #10
        inx
        bne @tens
@units:
        pha
        txa
        sta (dst_ptr),y
        iny
        pla
        clc
        adc #CH_FRONT_ZERO
        sta (dst_ptr),y
        iny
        rts

; A/X = a frontend record list.
summary_records:
        sta frontend_data_ptr
        stx frontend_data_ptr+1
        jmp render_frontend_records

; ---------------------------------------------------------------------------
; The region's art run: read first (§4.8.1), then copied out of the staging.
; Region = (level - 1) / 3 for the 3-level regions of decision AC, the last
; region keeping levels 10-16. C=1, A=status on a failed read.
; ---------------------------------------------------------------------------
summary_art:
        lda summary_level
        sec
        sbc #1
        ldx #$00
@region:
        cmp #3
        bcc @found
        sbc #3
        inx
        cpx #SUMMARY_LAST_REGION
        bcc @region
@found:
        txa
        sta summary_tmp
        asl
        asl
        asl
        sec
        sbc summary_tmp                 ; region x 7
        clc
        adc overlay_directory + OVERLAY_SUMMARY_ART * 5
        sta sr_sector_lo
        lda overlay_directory + OVERLAY_SUMMARY_ART * 5 + 1
        adc #$00
        sta sr_sector_hi
        jsr guard_reset                 ; audit-hardening: the run, folded
        ldx #SUMMARY_ART_SECTORS
        lda #<SUMMARY_STAGING
        ldy #>SUMMARY_STAGING
        jsr summary_read
        bcs @done
        ; AUD-02: nothing of it is used - the palette, the glyphs, the map, the
        ; label records that name screen cells - unless the run checks.
        ldx summary_tmp                 ; the region
        lda summary_art_sums_lo,x
        ldy summary_art_sums_hi,x
        jsr guard_compare
        bcs @done
        lda SUMMARY_STAGING + SUMMARY_ART_PALETTE
        sta COLPF0
        lda SUMMARY_STAGING + SUMMARY_ART_PALETTE + 1
        sta COLPF1
        lda SUMMARY_STAGING + SUMMARY_ART_PALETTE + 2
        sta COLPF3
        ldx #SUMMARY_ART_GLYPH_BYTES - 1
@glyph:
        lda SUMMARY_STAGING + SUMMARY_ART_GLYPHS,x
        sta FRONTEND_CHARSET + SUMMARY_FIRST_GLYPH * 8,x
        dex
        cpx #$FF
        bne @glyph
        ldx #199
@map:
        lda SUMMARY_STAGING + SUMMARY_ART_MAP,x
        sta SUMMARY_PICTURE,x
        lda SUMMARY_STAGING + SUMMARY_ART_MAP + 200,x
        sta SUMMARY_PICTURE + 200,x
        dex
        cpx #$FF
        bne @map
        lda #<(SUMMARY_STAGING + SUMMARY_ART_LABELS)
        ldx #>(SUMMARY_STAGING + SUMMARY_ART_LABELS)
        jsr summary_records
        lda VCOUNT                      ; any of the four AI lines
        and #$03
        tax
        lda summary_ai_offsets,x
        clc
        adc #<(SUMMARY_STAGING + SUMMARY_ART_AI)
        pha
        lda #>(SUMMARY_STAGING + SUMMARY_ART_AI)
        adc #$00
        tax
        pla
        jsr summary_records
        clc
@done:
        rts

; X sectors from sr_sector_lo/hi to A/Y.
summary_read:
        stx sr_sectors_left
        sta sr_dst
        sty sr_dst+1
        jmp sector_reader_read_sectors

; ---------------------------------------------------------------------------
; The save record (§4.8.4, Q16). A missing, unreadable or corrupt record reads
; as an empty one - never an error, never a hang.
; ---------------------------------------------------------------------------
summary_read_record:
        ldx #OVERLAY_SAVE_RECORD
        jsr sector_reader_read_run      ; one sector to RECORD
        bcs @empty
        lda RECORD
        cmp #RECORD_MAGIC_0
        bne @empty
        lda RECORD+1
        cmp #RECORD_MAGIC_1
        bne @empty
        lda RECORD+2
        cmp #RECORD_VERSION
        bne @empty
        jsr summary_checksum
        cmp RECORD+3
        beq @done
@empty:
        ldx #SECTOR_BYTES - 1
        lda #$00
@clear:
        sta RECORD,x
        dex
        bpl @clear
        lda #RECORD_MAGIC_0
        sta RECORD
        lda #RECORD_MAGIC_1
        sta RECORD+1
        lda #RECORD_VERSION
        sta RECORD+2
@done:
        rts

; The level's best is replaced by a better grade or a higher score (each on its
; own), and only a change is written: then the write, then the read-back.
summary_update_record:
        jsr summary_record_slot
        bcs @done
        lda #$00
        sta summary_changed
        lda summary_grade_code
        cmp RECORD,x
        beq @score
        bcc @score
        sta RECORD,x
        inc summary_changed
@score:
        lda RECORD+1,x                  ; a stored top byte beats four digits
        bne @write
        lda score_bcd_hi
        cmp RECORD+2,x
        bcc @write
        bne @better
        lda score_bcd_lo
        cmp RECORD+3,x
        bcc @write
        beq @write
@better:
        lda score_bcd_hi
        sta RECORD+2,x
        lda score_bcd_lo
        sta RECORD+3,x
        inc summary_changed
@write:
        lda summary_changed
        beq @done
        jsr summary_checksum
        sta RECORD+3
        jsr summary_write_save
        bcs @done                       ; refused: the RAM copy stands, silently
        lda #<SAVE_RECORD_SECTOR
        sta sr_sector_lo
        lda #>SAVE_RECORD_SECTOR
        sta sr_sector_hi
        ldx #1
        lda #<SAVE_VERIFY_BUFFER
        ldy #>SAVE_VERIFY_BUFFER
        jsr summary_read
        bcs @done
        ldx #SECTOR_BYTES - 1
@compare:
        lda RECORD,x
        cmp SAVE_VERIFY_BUFFER,x
        bne @done                       ; a mismatch reports nothing either
        dex
        bpl @compare
        inc summary_verified
@done:
        rts

; ---------------------------------------------------------------------------
; Write the save record (RECORD) to SAVE_RECORD_SECTOR (§4.8.4, Q16).
;
;   C=0     the drive answered COMPLETE; the caller reads the sector back
;   C=1     refused - NAK, ERROR (a write-protected disk), silence, a
;           directory that does not place the record on SAVE_RECORD_SECTOR,
;           or (AUD-01) a disk that is not the game's; nothing is reported,
;           the caller keeps its RAM copy
;
; The sector is a constant, not a parameter: no caller can name another. The
; data frame is the 128 bytes at RECORD and a checksum this routine stores
; after them, one attempt, 'P' (put): the read-back is the verify. HRM ch.9
; steps 2-5 (pp.218-219): data frame 10-18 ms after the command ACK, the device
; ACKs it within 16 ms, then COMPLETE or ERROR after the operation.
;
; audit-hardening (AUD-01, owner decision 1): the disk in D1: now may not be
; the one the record was read from - summary_own_disk, immediately before the
; PUT; a refusal there is a refusal here, exactly as a write-protected disk's.
; ===========================================================================
summary_write_save:
        jsr summary_own_disk
        bcs @refused
        lda #<SAVE_RECORD_SECTOR
        sta sr_sector_lo
        lda #>SAVE_RECORD_SECTOR
        sta sr_sector_hi
        ; The frame's carry wrap-around checksum, after the 128 data bytes.
        ldy #$00
        tya
        clc
@sum:
        adc RECORD,y
        adc #$00
        iny
        bpl @sum
        sta RECORD,y                    ; Y = 128
        jsr sector_reader_pokey_setup
        lda #SIO_CMD_PUT
        jsr sector_reader_send_command
        bcs @failed
        jsr sector_reader_begin_receive
        lda #BUDGET_ACK
        jsr sector_reader_receive_byte
        bcs @failed
        cmp #SIO_ACK
        bne @failed                     ; NAK: refused at the command
        ldx #WRITE_DATA_DELAY_LINES
@delay:
        sta WSYNC
        dex
        bne @delay
        lda #SKCTL_TRANSMIT
        sta SKCTL
        ldy #$00
@data:
        lda RECORD,y
        jsr sector_reader_tx_byte
        bcs @failed
        iny
        cpy #SECTOR_BYTES + 1
        bne @data
        jsr sector_reader_tx_done
        bcs @failed
        jsr sector_reader_begin_receive
        lda #BUDGET_ACK
        jsr sector_reader_receive_byte
        bcs @failed
        cmp #SIO_ACK
        bne @failed
        lda #BUDGET_COMPLETE
        jsr sector_reader_receive_byte
        bcs @failed
        cmp #SIO_COMPLETE
        bne @failed                     ; ERROR: a write-protected disk
        jsr sector_reader_quiesce
        clc
        rts
@failed:
        jsr sector_reader_quiesce
@refused:
        sec
        rts

save_record_entry:
        .byte <SAVE_RECORD_SECTOR, >SAVE_RECORD_SECTOR, 1

; C=0 when the disk in D1: is the game's own and the directory places the
; record where the game's layout has it; C=1 otherwise (AUD-01). The record's
; directory entry must be {SAVE_RECORD_SECTOR, 1}; then the disk's identity
; sector is read through the directory - the run read checks it with the disk
; guard - and its identity block compared with the resident one. A failed
; read is a refusal, as a mismatch is.
summary_own_disk:
        ldx #2
@directory:
        lda overlay_directory + SAVE_RECORD_ENTRY * 5,x
        cmp save_record_entry,x
        bne @not_ours
        dex
        bpl @directory
        ldx #OVERLAY_IDENTITY
        jsr sector_reader_read_run      ; to SAVE_VERIFY_BUFFER
        bcs @not_ours
        ldx #GUARD_IDENTITY_BYTES - 1
@identity:
        lda SAVE_VERIFY_BUFFER,x
        cmp guard_identity,x
        bne @not_ours
        dex
        bpl @identity
        clc
        rts
@not_ours:
        sec
        rts

; X = the level's slot in the record, C=0; C=1 for a level the record has none for.
summary_record_slot:
        lda summary_level
        beq @none
        cmp #RECORD_LAST_LEVEL + 1
        bcs @none
        asl
        asl
        adc #RECORD_LEVELS - 4          ; C=0
        tax
        clc
        rts
@none:
        sec
        rts

; A = the carry wrap-around sum of RECORD+4 .. RECORD+127.
summary_checksum:
        ldy #4
        lda #$00
        clc
@sum:
        adc RECORD,y
        adc #$00
        iny
        bpl @sum
        rts

; ---------------------------------------------------------------------------
; The arithmetic (decision 28).
; ---------------------------------------------------------------------------
; summary_percent = hits * 100 / shots, whole, at most 100; 0 without a shot.
; Bresenham: after k additions of the hits, acc = k*hits - n*shots in
; [0, shots), so n is floor(k * hits / shots); hits <= shots keeps one
; subtraction per step and the sum inside 17 bits.
summary_accuracy:
        lda #$00
        sta summary_percent
        sta summary_number
        sta summary_number+1
        lda STATS_SHOTS
        ora STATS_SHOTS+1
        beq @done
        lda STATS_HITS
        sta summary_hits
        lda STATS_HITS+1
        sta summary_hits+1
        lda STATS_SHOTS
        cmp STATS_HITS
        lda STATS_SHOTS+1
        sbc STATS_HITS+1
        bcs :+                          ; shots >= hits
        lda STATS_SHOTS
        sta summary_hits
        lda STATS_SHOTS+1
        sta summary_hits+1
:
        ldx #100
@step:
        lda summary_number
        clc
        adc summary_hits
        sta summary_number
        lda summary_number+1
        adc summary_hits+1
        sta summary_number+1
        bcs @take                       ; past 16 bits: certainly >= shots
        lda summary_number
        cmp STATS_SHOTS
        lda summary_number+1
        sbc STATS_SHOTS+1
        bcc @next
@take:
        lda summary_number
        sec
        sbc STATS_SHOTS
        sta summary_number
        lda summary_number+1
        sbc STATS_SHOTS+1
        sta summary_number+1
        inc summary_percent
@next:
        dex
        bne @step
@done:
        lda summary_percent
        rts

; M5b-S3 (owner answer Q-S4, plan §5.11.7): every setting the boss install
; patched outside slot A - the world and hull scroll rates, the pause's DLI
; operands, the player's Y floor - back to the shipped image's value, and the
; GTIA/ANTIC registers the boss writes back to zero. The table is generated
; from the linked images (build/boss-restore.inc).
summary_boss_restore:
        ldx #(BOSS_RESTORE_COUNT - 1)
@entry:
        lda boss_restore_lo,x
        sta dst_ptr
        lda boss_restore_hi,x
        sta dst_ptr+1
        lda boss_restore_value,x
        ldy #$00
        sta (dst_ptr),y
        dex
        bpl @entry
        rts

        .include "boss-restore.inc"

; The active gameplay clock: seconds (16-bit), then minutes and seconds.
summary_time:
        lda ACTIVE_GAMEPLAY_FRAME_LO
        sta summary_number
        lda ACTIVE_GAMEPLAY_FRAME_LO+1
        sta summary_number+1
        lda #$00
        sta summary_seconds
        sta summary_seconds+1
        sta summary_minutes
@fifty:
        lda summary_number
        sec
        sbc #50
        tax
        lda summary_number+1
        sbc #$00
        bcc @minutes
        sta summary_number+1
        stx summary_number
        inc summary_seconds
        bne @fifty
        inc summary_seconds+1
        bne @fifty
@minutes:
        lda summary_seconds
        ldx summary_seconds+1
@sixty:
        cpx #$00
        bne :+
        cmp #60
        bcc @done
:
        sec
        sbc #60
        bcs :+
        dex
:
        inc summary_minutes
        jmp @sixty
@done:
        sta summary_seconds_part
        rts

; A = the grade, 1 C .. 4 S; X = the tier sum. Three tiers of 0-2 from the
; level's thresholds: accuracy (higher is better), time and lives lost (lower).
summary_grade:
        ldx #$00
        lda summary_percent
        cmp GRADE_ACCURACY_1
        bcc @time
        inx
        cmp GRADE_ACCURACY_2
        bcc @time
        inx
@time:
        lda GRADE_TIME_1
        cmp summary_seconds
        lda GRADE_TIME_1+1
        sbc summary_seconds+1
        bcc @lives                      ; seconds > limit 1
        inx
        lda GRADE_TIME_2
        cmp summary_seconds
        lda GRADE_TIME_2+1
        sbc summary_seconds+1
        bcc @lives
        inx
@lives:
        lda GRADE_LIVES_1
        cmp summary_lives_lost
        bcc @map
        inx
        lda GRADE_LIVES_2
        cmp summary_lives_lost
        bcc @map
        inx
@map:
        txa                             ; 6 S; 4-5 A; 2-3 B; 0-1 C
        lsr
        clc
        adc #1
        rts

; The bonus: M5b's boss bonus plus the level's bonus per tier point, added to
; the score (packed BCD; M8 sets the values, level data). X = the tier sum.
summary_bonus:
        sed
        lda STATS_BONUS
        sta summary_bonus_total
        lda STATS_BONUS+1
        sta summary_bonus_total+1
@tier:
        dex
        bmi @add
        lda summary_bonus_total
        clc
        adc GRADE_BONUS
        sta summary_bonus_total
        lda summary_bonus_total+1
        adc #$00
        sta summary_bonus_total+1
        jmp @tier
@add:
        lda score_bcd_lo
        clc
        adc summary_bonus_total
        sta score_bcd_lo
        lda score_bcd_hi
        adc summary_bonus_total+1
        sta score_bcd_hi
        bcc @done
        lda #$99                        ; the four digits saturate
        sta score_bcd_lo
        sta score_bcd_hi
@done:
        cld
        rts

; ---------------------------------------------------------------------------
; Data.
; ---------------------------------------------------------------------------
summary_powers_lo:
        .byte <1, <10, <100, <1000, <10000
summary_powers_hi:
        .byte >1, >10, >100, >1000, >10000
summary_letters:
        .byte 0, CH_FRONT_A + 2, CH_FRONT_A + 1, CH_FRONT_A, CH_FRONT_A + 18  ; -, C, B, A, S
summary_ai_offsets:
        .byte 0, SUMMARY_ART_AI_RECORD, 2 * SUMMARY_ART_AI_RECORD, 3 * SUMMARY_ART_AI_RECORD

summary_title_records:
        .byte <(SUMMARY_SCREEN + 16), >(SUMMARY_SCREEN + 16)
        .byte "LEVEL", $00
summary_loading_records:
        .byte <(SUMMARY_PROMPT_ROW + 16), >(SUMMARY_PROMPT_ROW + 16)
        .byte "LOADING", $00
        .byte $FF
summary_fire_records:
        .byte <(SUMMARY_PROMPT_ROW + 15), >(SUMMARY_PROMPT_ROW + 15)
        .byte "PRESS FIRE", $00
        .byte $FF

; 16 blank lines, the title and the AI line, the 10-row ANTIC 4 picture, then
; the stats, the animation row and the prompt: 204 lines, no DLI - the picture
; draws from the frontend charset's codes 72-95, which the menu never uses.
; ---------------------------------------------------------------------------
; One animation step per completed sector (moved from the sector reader by
; the owner review, byte for byte; the reader calls it only once this module
; is resident): decision O's "one frame per sector, not a progress bar" - it
; hesitates visibly when the drive does. It runs between sectors, where the
; drive is idle and no byte is in flight. Clobbers A and X.
; ---------------------------------------------------------------------------
summary_animate:
        inc summary_anim
        ldx #$00
@cell:
        txa
        clc
        adc summary_anim
        ; A dash where (cell + phase) & 7 is 0, a space elsewhere. CH_FRONT_SPACE
        ; is 0, so the old `lda #CH_FRONT_SPACE / bne` never branched and every
        ; cell got the dash (M5b-S3): the compare sets C for 1-7, same bytes.
        and #$07
        cmp #$01
        lda #CH_FRONT_DASH
        bcc @store
        lda #CH_FRONT_SPACE
@store:
        sta SUMMARY_ANIMATION_ROW,x
        inx
        cpx #40
        bne @cell
        rts

summary_display_list:
        .byte $70, $70
        .byte $42, <SUMMARY_SCREEN, >SUMMARY_SCREEN
        .byte $20
        .byte $02
        .byte $30
        .byte $44, <SUMMARY_PICTURE, >SUMMARY_PICTURE
        .repeat SUMMARY_PICTURE_ROWS - 1
        .byte $04
        .endrepeat
        .byte $30
        .byte $42, <(SUMMARY_SCREEN + 2 * 40), >(SUMMARY_SCREEN + 2 * 40)
        .repeat 9
        .byte $02
        .endrepeat
        .byte $41, <summary_display_list, >summary_display_list

; Owner review (2026-10-03): START GAME's list. Its top line sits a row lower,
; at the interim screen's scanline 32 (the frontend text list's row 0); no AI
; line under it, so the picture and the panel keep the level-end scanlines
; (47 and 131); the AI line - row 1's memory, from the art run - shows under
; the panel, after BEST; then the dotted row and the prompt. 211 lines.
summary_start_display_list:
        .byte $70, $70, $70
        .byte $42, <SUMMARY_SCREEN, >SUMMARY_SCREEN
        .byte $20
        .byte $30
        .byte $44, <SUMMARY_PICTURE, >SUMMARY_PICTURE
        .repeat SUMMARY_PICTURE_ROWS - 1
        .byte $04
        .endrepeat
        .byte $30
        .byte $42, <(SUMMARY_SCREEN + 2 * 40), >(SUMMARY_SCREEN + 2 * 40)
        .repeat 7
        .byte $02
        .endrepeat
        .byte $42, <(SUMMARY_SCREEN + 40), >(SUMMARY_SCREEN + 40)
        .byte $42, <SUMMARY_ANIMATION_ROW, >SUMMARY_ANIMATION_ROW
        .byte $02
        .byte $41, <summary_start_display_list, >summary_start_display_list
summary_display_list_end:

; State. The module is RAM; it is read anew each session.
summary_level:          .byte 0
summary_anim:           .byte 0
summary_tmp:            .byte 0
summary_number:         .word 0
summary_hits:           .word 0
summary_digit:          .byte 0
summary_seen:           .byte 0
summary_percent:        .byte 0
summary_seconds:        .word 0
summary_minutes:        .byte 0
summary_seconds_part:   .byte 0
summary_lives_lost:     .byte 0
summary_grade_code:     .byte 0
summary_bonus_total:    .word 0
summary_changed:        .byte 0
summary_verified:       .byte 0
summary_level_read:     .byte 0     ; audit-hardening: START GAME reads the level

; audit-hardening (AUD-02, owner Q3): the expected folds of each region's art
; run and of each level image as the reader reads it (scripts/build.mjs).
.include "summary-sums.inc"

.assert summary_vectors = SUMMARY_MODULE, error, "the summary module must start at $0500"
.assert summary_vectors + 6 = SUMMARY_ANIMATE, error, "the animation vector must sit at $0506"
.assert (summary_display_list & $FC00) = ((summary_display_list_end - 1) & $FC00), error, "the summary display list crosses an ANTIC 1 KiB boundary"
.assert SUMMARY_PICTURE + 400 <= SUMMARY_SCREEN + $400, error, "the picture leaves the frontend screen RAM"
.assert summary_art_sums_hi - summary_art_sums_lo = SUMMARY_LAST_REGION + 1, error, "the art sums are not one per region"
.assert summary_level_sums_hi - summary_level_sums_lo = 16, error, "the level sums are not one per level id (LEVEL_MAX_ID)"

.export summary_vectors, summary_start_game, summary_level_end, summary_display_list
.export summary_start_display_list, summary_display_list_end
.export summary_accuracy, summary_time, summary_grade, summary_bonus, summary_print
.export summary_percent, summary_seconds, summary_minutes, summary_seconds_part
.export summary_lives_lost, summary_grade_code, summary_level, summary_verified
.export summary_read_record, summary_update_record, summary_wait, summary_art
.export summary_fire_release, summary_fire_press, summary_level_loaded
.export summary_boss_restore
