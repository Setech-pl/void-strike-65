; ============================================================================
; Void Strike 65 — resident direct-SIO sector reader (roadmap 4.3)
; ============================================================================
;
; Owner decision W: the between-levels reader is DIRECT SIO. It calls no OS
; routine and takes no vector. `sei` is already set for the life of the
; runtime and NMIEN is 0 while this runs, so the whole reader is polled.
;
; Implemented from the Altirra Hardware Reference Manual 2026-01-02 edition,
; chapter 9 (SIO bus) and section 5.6 (POKEY serial port). No third-party SIO
; source was transcribed. The protocol facts this file depends on, each with
; its citation, are recorded in docs/diagnostics/sio-protocol-facts.md; the
; register contract is plan-4.3-sector-reader.md §1.1 as corrected by [C1],
; [C2] and [C3] there, which were measured, not assumed — see
; docs/diagnostics/sio-register-probe-2026-09-20.json.
;
; Read-only, one device (D1:), standard speed, whole sectors into a
; page-aligned buffer. Runs only at a level boundary with gameplay torn down.

; Main-link entry points, generated after main.s links (plan 4 [C5]).
.include "main-abi.inc"

; ---------------------------------------------------------------------------
; Hardware. The game defines none of these: it has never written IRQEN, SKCTL,
; SEROUT or PBCTL, so the equates live here rather than costing MAIN anything.
; ---------------------------------------------------------------------------
TRIG0           = $D010
COLPF1          = $D017
COLPF2          = $D018
COLBK           = $D01A
GRACTL          = $D01D
DMACTL          = $D400
DLISTL          = $D402
DLISTH          = $D403
CHBASE          = $D409
NMIEN           = $D40E

SCREEN           = $4000
FRONTEND_CHARSET = $4800
CH_FRONT_SPACE   = 0
CH_FRONT_DASH    = 37

; Loader-mode screen rows (ANTIC 2, 40 columns).
LOADER_TITLE_ROW  = SCREEN + 2 * 40 + 13
LOADER_STATUS_ROW = SCREEN + 5 * 40 + 12    ; centres the 16-char failure line
LOADER_ENGAGING_ROW = SCREEN + 5 * 40 + 9   ; same row, centred for 21 chars
LOADER_TEXT_ROW   = SCREEN + 8 * 40 + 1
LOADER_ANIM_ROW   = SCREEN + 12 * 40
LOADER_PROMPT_ROW = SCREEN + 20 * 40 + 15

AI_LINE_BYTES  = 38
AI_LINE_COUNT  = 8
PBCTL           = $D303         ; PIA port B control; CB2 is the command line
AUDF3           = $D204
AUDC3           = $D205
AUDF4           = $D206
AUDC4           = $D207
AUDCTL          = $D208
SKRES           = $D20A         ; write: clears SKSTAT bits 5-7
SEROUT          = $D20D         ; write
SERIN           = $D20D         ; read
IRQEN           = $D20E         ; write
IRQST           = $D20E         ; read; an asserted bit reads 0
SKCTL           = $D20F         ; write
SKSTAT          = $D20F         ; read
WSYNC           = $D40A
VCOUNT          = $D40B

; ---------------------------------------------------------------------------
; Protocol constants (HRM ch.9 pp.217-219)
; ---------------------------------------------------------------------------
SIO_DEVICE_D1   = $31           ; disk drives are $31-$3F; D1: is $31
SIO_CMD_READ    = $52           ; 'R'
SIO_ACK         = $41           ; 'A'
SIO_NAK         = $4E           ; 'N'
SIO_COMPLETE    = $43           ; 'C'
SIO_ERROR       = $45           ; 'E'

; SKCTL clock modes. [C1] The plan specified a single $13 for both directions.
; $13 is mode %001, whose OUTPUT clock is the external clock — a line nothing
; on a standard SIO bus drives — so a command frame written to SEROUT in that
; mode never reaches the wire. HRM §5.6 Table 10 gives the modes and Figure 9
; captures both values by name. Measured: with $13 a mounted ATR answers
; silence, byte-identical to having no disk at all.
SKCTL_TRANSMIT  = $23           ; mode %010 + keyboard scan/debounce
SKCTL_RECEIVE   = $33           ; mode %011, asynchronous receive
SKCTL_RESET     = $00           ; full serial reset (HRM §5.6 p.117)
SKCTL_REST      = $13           ; what the reader leaves behind

IRQ_SERIN       = $20           ; bit 5, latched: a byte is in SERIN
IRQ_SEROUT_RDY  = $10           ; bit 4, latched: SEROUT free for the next byte
IRQ_XMTDONE     = $08           ; bit 3, NOT latched: shift register idle

; [C2] Bit 7 is the serial framing error and bit 5 the serial overrun; both
; read 0 when the error is present. Bit 6 is the KEYBOARD overrun — the plan's
; $C0 mask watched the keyboard, not the wire. HRM §5.6 n.21 footnotes this
; exact confusion.
SKSTAT_OK_MASK  = $A0

PBCTL_COMMAND   = $34           ; CB2 low  — command line asserted
PBCTL_IDLE      = $3C           ; CB2 high — command line released

; ---------------------------------------------------------------------------
; Status codes returned in A
; ---------------------------------------------------------------------------
SR_OK             = 0
SR_NO_DEVICE      = 1           ; no ACK, twice: absent, off or busy drive
SR_WIRE_EXHAUSTED = 2           ; three failed attempts on one sector
SR_DEVICE_ERROR   = 3           ; $45 at the C/E position; no retry
SR_BAD_IMAGE      = 4           ; clean read, wrong header

; ---------------------------------------------------------------------------
; Budgets, in PAL frames. VCOUNT edges are the only clock (plan §2): 20 ms
; resolution, independent of DMA, IRQ and audio. A budget of N guarantees at
; least (N-1) x 20 ms and at most N x 20 ms.
; ---------------------------------------------------------------------------
BUDGET_TX         = 2           ; each transmit step
BUDGET_ACK        = 3           ; >= 40 ms against a 16 ms device deadline
BUDGET_COMPLETE   = 200         ; 4.0 s: a 1050 retries internally for 2-3 s
BUDGET_DATA       = 2           ; each received data byte
BUDGET_SETTLE     = 2           ; after a failed attempt

SECTOR_BYTES      = 128
MAX_LEVEL_SECTORS = 32          ; the level buffer is 4,096 B (owner decision X)
WIRE_ATTEMPTS     = 3
DEVICE_PROBES     = 2

LEVEL_BUFFER         = $A600
LEVEL_MAGIC_0        = 'V'
LEVEL_MAGIC_1        = 'S'
LEVEL_FORMAT_VERSION = 1
LEVEL_MAX_ID         = 16

; ---------------------------------------------------------------------------
; State
; ---------------------------------------------------------------------------
.segment "READER_ZP": zeropage
sr_dst:             .res 2      ; destination pointer, (zp),y into the buffer

.segment "READER_BSS"
sr_requested_id:    .res 1
sr_attempts:        .res 1      ; wire attempts left on this sector
sr_probes:          .res 1      ; no-device probes left for the whole load
sr_frames_left:     .res 1
sr_vcount_last:     .res 1
sr_mask:            .res 1
sr_sector_lo:       .res 1
sr_sector_hi:       .res 1
sr_sectors_left:    .res 1
sr_sector_total:    .res 1
sr_status:          .res 1
sr_checksum:        .res 1
sr_rx_byte:         .res 1
sr_rx_status:       .res 1
sr_scratch:         .res 1
sr_anim:            .res 1      ; animation phase / small multiply scratch
sr_frame:           .res 5      ; the five-byte command frame

.segment "SECTOR_READER"

; ===========================================================================
; Fixed entry vectors at $A000. main.s reaches the reader through these
; addresses alone, so the two links need no generated include in that
; direction and the START GAME hook stays an operand-only change: the
; `jmp start_gameplay` at main.s:1544 becomes `jmp SECTOR_READER_ENTRY`,
; three bytes either way. The order is frozen; append, never reorder.
; ===========================================================================
sector_reader_vectors:
        jmp sector_reader_start_gameplay        ; $A000 — the START GAME hook
        jmp sector_reader_load                  ; $A003 — A = level id (4.9)
        jmp sector_reader_drain_ready           ; $A006 — reserved for 4.9

.assert sector_reader_vectors = $A000, error, "the sector reader vectors must sit at $A000"

; ===========================================================================
; The START GAME boundary (plan 5). Entered from the frontend, so the state
; being torn down is the menu's. Nothing here needs to survive: start_gameplay
; rebuilds display lists, charset base, PMG, palette, DLI vector and NMIEN
; from scratch, which is why the reader can own POKEY outright and why the
; loader-mode display can be DLI-free.
; ===========================================================================
sector_reader_start_gameplay:
        lda #$00
        sta DMACTL                      ; display off while the state changes
        sta GRACTL
        jsr clear_pmg_graphics_latches  ; also stores NMIEN = 0
        jsr pause_silence_audio         ; AUDCTL = 0: POKEY is the reader's now
        jsr clear_pmg

        jsr sector_reader_show_loader

        lda #$01                        ; level 1; 4.9 supplies the real id
        jsr sector_reader_load
        bcc @loaded
        jmp sector_reader_failure_screen
@loaded:
        jmp start_gameplay

; ===========================================================================
; The loader-mode display (owner decision O, plan 6).
;
; No new display path: frontend_text_display_list is the ANTIC 2 screen the
; confirmation and pause screens already use, FRONTEND_CHARSET survives
; gameplay, and the text goes through render_frontend_data. NMIEN stays 0, so
; there is no DLI to service while the receive loop holds the CPU; ANTIC needs
; no CPU once the list and screen are set, and the only interaction with the
; wire is DMA cycle stealing, already inside the plan 1.6 margin.
; ===========================================================================
sector_reader_show_loader:
        jsr sector_reader_pick_line
        lda #<loader_records
        sta frontend_data_ptr
        lda #>loader_records
        sta frontend_data_ptr+1
        jmp sector_reader_publish_screen

; Shared by the loader and failure screens: render, then bring the display up
; on a frame boundary.
sector_reader_publish_screen:
        lda #>FRONTEND_CHARSET
        sta CHBASE
        lda #<frontend_text_display_list
        sta DLISTL
        lda #>frontend_text_display_list
        sta DLISTH
        lda #$0E                        ; ANTIC 2 neutral-white foreground
        sta COLPF1
        lda #$00                        ; black hue/background
        sta COLPF2
        sta COLBK
        sta NMIEN                       ; DLI-free: nothing to service
        jsr render_frontend_data        ; clears the screen, then draws
        jsr wait_frame_start
        lda #$22                        ; normal playfield DMA, no PMG
        sta DMACTL
        rts

; Copy one AI line into the record list's reserved slot. v1 ships eight
; PLACEHOLDER lines; the owner writes the real ones later. The choice is the
; Director RNG if it has been seeded, otherwise VCOUNT, masked to the pool.
sector_reader_pick_line:
        lda VCOUNT
        and #(AI_LINE_COUNT - 1)
        ; index x 38 = x32 + x4 + x2
        sta sr_scratch
        asl
        sta sr_anim                     ; x2 (scratch, reused below)
        asl                             ; x4
        clc
        adc sr_anim                     ; x6
        sta sr_anim
        lda sr_scratch
        asl
        asl
        asl
        asl
        asl                             ; x32
        clc
        adc sr_anim                     ; x38
        tay
        ldx #$00
@copy:
        lda ai_line_pool,y
        sta loader_ai_slot,x
        iny
        inx
        cpx #AI_LINE_BYTES
        bne @copy
        rts

; ===========================================================================
; The failure screen (plan 3 and 6).
;
; Built before the animation on purpose: a reader that exhausts its retries
; and leaves the player on a frozen loader screen is worse than one that never
; existed. This is the way out, so it is the part that does not get trimmed.
; A is the status code on entry; it never returns.
; ===========================================================================
sector_reader_failure_screen:
        sta sr_status
        jsr sector_reader_quiesce        ; the wire is done with either way

        ; Replace the AI line with the two-word reason for this status.
        lda sr_status
        cmp #SR_BAD_IMAGE + 1
        bcc :+
        lda #SR_WIRE_EXHAUSTED           ; an unknown code reads as a wire fault
:
        sec
        sbc #$01                         ; status 1..4 -> reason 0..3
        ; index x 10
        asl
        sta sr_anim
        asl
        asl
        clc
        adc sr_anim
        tay
        ldx #$00
@reason:
        lda failure_reasons,y
        sta failure_reason_slot,x
        iny
        inx
        cpx #10
        bne @reason

        lda #<failure_records
        sta frontend_data_ptr
        lda #>failure_records
        sta frontend_data_ptr+1
        jsr sector_reader_publish_screen

        jsr sector_reader_wait_for_fire
        jmp quit_gameplay_to_menu

; Wait for a clean press: release first, so the FIRE that started the game
; cannot dismiss the screen it just produced.
sector_reader_wait_for_fire:
@release:
        jsr wait_frame_start
        lda TRIG0
        beq @release
@press:
        jsr wait_frame_start
        lda TRIG0
        bne @press
        rts

; One animation step per completed sector: a sweeping dotted row, eight
; phases, drawn from glyphs the frontend charset already has. This is decision
; O's "one frame per sector, not a progress bar" - it hesitates visibly when
; the drive does, which is the diagnostic. It runs between sectors, where the
; drive is idle and no byte is in flight.
sector_reader_animate:
        inc sr_anim
        ldx #$00
@cell:
        txa
        clc
        adc sr_anim
        and #$07
        beq @mark
        lda #CH_FRONT_SPACE
        bne @store
@mark:
        lda #CH_FRONT_DASH
@store:
        sta LOADER_ANIM_ROW,x
        inx
        cpx #40
        bne @cell
        rts

; Reserved for roadmap 4.9: the level-to-level boundary predicate. The drain
; clause itself is sector_c_drain_clear in the arena (step 5); this vector
; exists so 4.9 can reach it at a fixed address without relinking.
sector_reader_drain_ready:
        rts

; ===========================================================================
; sector_reader_load(A = level id, 1..LEVEL_MAX_ID)
;
;   C=0, A=SR_OK        the buffer holds the requested image
;   C=1, A=status       nothing usable in the buffer
;
; The reader owns POKEY from entry until it returns and leaves AUDCTL = 0,
; IRQEN = 0, SKCTL = $13, PBCTL = $3C behind it. Audio must already be silent.
; ===========================================================================
.export sector_reader_load
sector_reader_load:
        sta sr_requested_id

        ; Medium-agnostic resident skip (owner decision 1): if the buffer
        ; already holds this image — the XEX carries level 1 as an XEX-only
        ; block — no command frame is ever sent.
        jsr sector_reader_resident_hit
        bcs @not_resident
        jmp sector_reader_report_ok
@not_resident:
        jsr sector_reader_lookup
        bcc @have_directory
        jmp sector_reader_report_bad_image
@have_directory:

        lda #<LEVEL_BUFFER
        sta sr_dst
        lda #>LEVEL_BUFFER
        sta sr_dst+1
        lda sr_sector_total
        sta sr_sectors_left
        lda #DEVICE_PROBES
        sta sr_probes

@sector:
        lda #WIRE_ATTEMPTS
        sta sr_attempts
@attempt:
        jsr sector_reader_read_sector
        bcc @sector_done

        cmp #SR_DEVICE_ERROR
        beq @fail                       ; no retry: owner decision 3
        cmp #SR_NO_DEVICE
        beq @silence

        ; Wire class: the link lost a byte and a retry usually succeeds.
        jsr sector_reader_settle
        dec sr_attempts
        bne @attempt
        lda #SR_WIRE_EXHAUSTED
        jmp @fail

        ; A drive that never answers is its own class with its own budget: a
        ; probe does not consume one of the sector's wire attempts.
@silence:
        jsr sector_reader_settle
        dec sr_probes
        bne @attempt
        lda #SR_NO_DEVICE
@fail:
        sta sr_status
        jsr sector_reader_quiesce
        lda sr_status
        sec
        rts

@sector_done:
        clc
        lda sr_dst
        adc #SECTOR_BYTES
        sta sr_dst
        bcc :+
        inc sr_dst+1
:
        inc sr_sector_lo
        bne :+
        inc sr_sector_hi
:
        jsr sector_reader_animate
        dec sr_sectors_left
        bne @sector

        jsr sector_reader_quiesce
        jmp sector_reader_validate

sector_reader_report_ok:
        lda #SR_OK
        sta sr_status
        clc
        rts

sector_reader_report_bad_image:
        lda #SR_BAD_IMAGE
        sta sr_status
        sec
        rts

; ===========================================================================
; One sector into (sr_dst).
;   C=0                 128 bytes landed and the frame checksum matched
;   C=1, A=status       SR_NO_DEVICE / SR_DEVICE_ERROR / SR_WIRE_EXHAUSTED
;                       (the last as a wire-class marker; the caller counts)
; ===========================================================================
sector_reader_read_sector:
        jsr sector_reader_pokey_setup
        jsr sector_reader_send_command
        bcs sector_reader_rs_wire
        jsr sector_reader_begin_receive

        ; --- command acknowledgement (HRM ch.9 step 2) ---
        lda #BUDGET_ACK
        jsr sector_reader_receive_byte
        bcs sector_reader_rs_ack_failed
        cmp #SIO_ACK
        bne sector_reader_rs_wire                       ; NAK, or anything that is not an ACK
        ; --- command result (HRM ch.9 step 5) ---
        lda #BUDGET_COMPLETE
        jsr sector_reader_receive_byte
        bcs sector_reader_rs_wire
        cmp #SIO_COMPLETE
        beq sector_reader_rs_data
        cmp #SIO_ERROR
        beq sector_reader_rs_device
        bne sector_reader_rs_wire

sector_reader_rs_ack_failed:
        ; A=0 silence, A=1 framing or overrun. Only silence is "no device":
        ; a garbled ACK means the drive is there and the link is bad.
        cmp #$00
        beq sector_reader_rs_no_device
        bne sector_reader_rs_wire

        ; --- data frame (HRM ch.9 step 6) ---
        ;
        ; The protocol specifies a minimum gap before the result byte but none
        ; between the result byte and the first data byte, and the emulator
        ; sends them back to back. sector_reader_receive_byte re-arms the
        ; input latch before it returns, so the receiver is armed ahead of the
        ; wire and never decides anything between two bytes.
sector_reader_rs_data:
        lda #$00
        sta sr_checksum
        ldy #$00
sector_reader_rx_loop:
        lda #BUDGET_DATA
        jsr sector_reader_receive_byte
        bcs sector_reader_rs_wire
        sta (sr_dst),y
        clc
        adc sr_checksum
        adc #$00                        ; carry wrap-around (HRM ch.9 p.217)
        sta sr_checksum
        iny
        cpy #SECTOR_BYTES
        bne sector_reader_rx_loop
sector_reader_rx_loop_end:

        lda #BUDGET_DATA
        jsr sector_reader_receive_byte
        bcs sector_reader_rs_wire
        cmp sr_checksum
        bne sector_reader_rs_wire
        clc
        rts

sector_reader_rs_wire:
        lda #SR_WIRE_EXHAUSTED
        sec
        rts
sector_reader_rs_device:
        lda #SR_DEVICE_ERROR
        sec
        rts
sector_reader_rs_no_device:
        lda #SR_NO_DEVICE
        sec
        rts

; ===========================================================================
; Send the five-byte command frame. C=1 if a transmit step timed out.
; The command line is released on both paths.
; ===========================================================================
sector_reader_send_command:
        jsr sector_reader_build_frame

        lda #SKCTL_TRANSMIT             ; [C1] $23, not $13
        sta SKCTL
        lda #PBCTL_COMMAND
        sta PBCTL

        ; [C3] HRM ch.9 step 1, first delay: 750-1600 us for the peripheral to
        ; notice the command line before the first byte. The plan omitted this
        ; window entirely. WSYNC rather than counted cycles because ANTIC DMA
        ; stretches a counted loop by up to ~35% under a live display; 16 PAL
        ; lines ~ 1028 us sits inside the window with margin at both ends.
        ldx #16
@pre:
        sta WSYNC
        dex
        bne @pre

        ldy #$00
sector_reader_tx_loop:
        ; Bits 5 and 4 are latched: drop the out-ready latch, then re-arm it,
        ; so the wait below observes THIS byte and not the previous one.
        lda #IRQ_SERIN
        sta IRQEN
        lda #IRQ_SERIN|IRQ_SEROUT_RDY
        sta IRQEN
        lda sr_frame,y
        sta SEROUT                      ; the first write primes; it does not wait
        ldx #IRQ_SEROUT_RDY
        lda #BUDGET_TX
        jsr sector_reader_wait_serial
        bcs sector_reader_tx_failed
        iny
        cpy #$05
        bne sector_reader_tx_loop
sector_reader_tx_loop_end:

        ; HRM §5.6 warning: wait for output READY before output COMPLETE, or a
        ; momentarily idle shift register reports complete after SEROUT has
        ; already been reloaded.
        ldx #IRQ_XMTDONE
        lda #BUDGET_TX
        jsr sector_reader_wait_serial
        bcs sector_reader_tx_failed

        ; HRM ch.9 step 1, second delay: 650-950 us before the line is raised.
        ; 12 stores = 11-12 full PAL lines = 707-771 us.
        ldx #12
@post:
        sta WSYNC
        dex
        bne @post

        lda #PBCTL_IDLE
        sta PBCTL
        clc
        rts
sector_reader_tx_failed:
        lda #PBCTL_IDLE
        sta PBCTL
        sec
        rts

; ===========================================================================
; Receive one byte.  A = frame budget on entry.
;   C=0, A = the byte
;   C=1, A = 0 timeout (silence) | 1 framing or overrun
; ===========================================================================
sector_reader_receive_byte:
        ldx #IRQ_SERIN
        jsr sector_reader_wait_serial
        bcs @timeout

        lda SKSTAT
        sta sr_rx_status
        lda SERIN
        sta sr_rx_byte

        ; Resetting the IRQST bit-5 latch IS the acknowledgement of the byte,
        ; and an overrun is not detected at all while the interrupt is
        ; unarmed (HRM §5.6 "Overrun errors"). Do it before deciding anything.
        lda #$00
        sta IRQEN
        lda #IRQ_SERIN
        sta IRQEN
        sta SKRES                       ; the overrun bit is sticky until this

        lda sr_rx_status
        and #SKSTAT_OK_MASK             ; [C2] $A0: bit 7 framing, bit 5 overrun
        cmp #SKSTAT_OK_MASK
        bne @bad
        lda sr_rx_byte
        clc
        rts
@bad:
        lda #$01
        sec
        rts
@timeout:
        lda #$00
        sec
        rts

; ===========================================================================
; wait_serial — the one timing primitive.
;   X = IRQST mask, A = frame budget.  C=0 when the bit goes low, C=1 on
;   timeout.  Y is preserved; the receive and transmit loops rely on that.
;
; VCOUNT decreases exactly once per PAL frame, at the wrap past line 312, so
; "new < last" is a frame edge whatever the display is doing. This is the
; project's only timing primitive and the whole PAL gate already rests on it.
; ===========================================================================
sector_reader_wait_serial:
        stx sr_mask
        sta sr_frames_left
        lda VCOUNT
        sta sr_vcount_last
@poll:
        lda IRQST
        and sr_mask
        beq @asserted
        lda VCOUNT
        cmp sr_vcount_last
        sta sr_vcount_last              ; STA does not disturb the compare
        bcs @poll                       ; rose or held: still the same frame
        dec sr_frames_left              ; it wrapped: one frame gone
        bne @poll
        sec
        rts
@asserted:
        clc
        rts

; ===========================================================================
; Support
; ===========================================================================

; POKEY for 19040-baud SIO, receiver armed before the command goes out.
sector_reader_pokey_setup:
        lda #SKCTL_RESET
        sta SKCTL
        lda #$28                        ; ch3 at 1.79 MHz, ch3+ch4 linked
        sta AUDCTL
        lda #$28                        ; divisor $0028 (HRM §5.6 p.115)
        sta AUDF3
        lda #$00
        sta AUDF4
        lda #$A0                        ; pure tone, volume 0: silent clock
        sta AUDC3
        sta AUDC4
        lda #$00
        sta IRQEN
        lda #IRQ_SERIN|IRQ_SEROUT_RDY
        sta IRQEN
        rts

; Turn the port around after the command line is released.
sector_reader_begin_receive:
        lda #SKCTL_RECEIVE              ; [C1] $33
        sta SKCTL
        lda #$00
        sta IRQEN
        lda #IRQ_SERIN
        sta IRQEN
        sta SKRES
        rts

; A full serial reset plus two frames of quiet. A late ACK arrives here, where
; SKCTL = $00 discards it, and the next attempt's command-line assertion tells
; the drive to abandon whatever it was sending.
sector_reader_settle:
        lda #SKCTL_RESET
        sta SKCTL
        lda #$00
        sta IRQEN
        lda #BUDGET_SETTLE
        sta sr_frames_left
        lda VCOUNT
        sta sr_vcount_last
@wait:
        lda VCOUNT
        cmp sr_vcount_last
        sta sr_vcount_last
        bcs @wait
        dec sr_frames_left
        bne @wait
        rts

; Hand POKEY and the PIA back in a known state. start_gameplay re-establishes
; everything else from scratch, so nothing here needs to survive.
sector_reader_quiesce:
        lda #$00
        sta IRQEN
        sta AUDCTL
        lda #SKCTL_REST
        sta SKCTL
        lda #PBCTL_IDLE
        sta PBCTL
        rts

; The five-byte frame and its carry wrap-around checksum (HRM ch.9 p.217).
sector_reader_build_frame:
        lda #SIO_DEVICE_D1
        sta sr_frame
        lda #SIO_CMD_READ
        sta sr_frame+1
        lda sr_sector_lo
        sta sr_frame+2
        lda sr_sector_hi
        sta sr_frame+3
        lda #$00
        clc
        ldy #$00
@sum:
        adc sr_frame,y
        adc #$00                        ; fold the carry back in
        iny
        cpy #$04
        bne @sum
        sta sr_frame+4
        rts

; Directory lookup: sr_requested_id -> sr_sector_lo/hi, sr_sector_total.
; C=1 for an id out of range or a level the build never placed.
sector_reader_lookup:
        lda sr_requested_id
        beq @bad
        cmp #LEVEL_MAX_ID+1
        bcs @bad
        sec
        sbc #$01
        sta sr_scratch                  ; index x3
        asl
        clc
        adc sr_scratch
        tay
        lda sector_reader_directory,y
        sta sr_sector_lo
        lda sector_reader_directory+1,y
        sta sr_sector_hi
        lda sector_reader_directory+2,y
        beq @bad                        ; count 0: no such level on this disk
        cmp #MAX_LEVEL_SECTORS+1
        bcs @bad
        sta sr_sector_total
        clc
        rts
@bad:
        sec
        rts

; C=0 when the buffer already holds a well-formed image of the requested
; level. Used both for the resident skip and for post-read validation.
sector_reader_resident_hit:
        lda LEVEL_BUFFER+0
        cmp #LEVEL_MAGIC_0
        bne @miss
        lda LEVEL_BUFFER+1
        cmp #LEVEL_MAGIC_1
        bne @miss
        lda LEVEL_BUFFER+2
        cmp #LEVEL_FORMAT_VERSION
        bne @miss
        lda LEVEL_BUFFER+3
        cmp sr_requested_id
        bne @miss
        clc
        rts
@miss:
        sec
        rts

; After a clean read the header must also agree with the directory, which
; catches a right-shaped image at the wrong place on the disk.
sector_reader_validate:
        jsr sector_reader_resident_hit
        bcs @bad
        lda LEVEL_BUFFER+4
        cmp sr_sector_total
        bne @bad
        lda #SR_OK
        sta sr_status
        clc
        rts
@bad:
        lda #SR_BAD_IMAGE
        sta sr_status
        sec
        rts


; ---------------------------------------------------------------------------
; Loader-mode screen content.
;
; Record lists are {dst_lo, dst_hi, text..., $00} repeated, terminated by $FF,
; exactly as render_frontend_data reads them. Only the frontend's own glyph
; contract is used: A-Z, 0-9, space and a little punctuation.
; ---------------------------------------------------------------------------
loader_records:
        .byte <LOADER_TITLE_ROW, >LOADER_TITLE_ROW
        .byte "VOID STRIKE 65", $00
        .byte <LOADER_ENGAGING_ROW, >LOADER_ENGAGING_ROW
        .byte "ENGAGING ENEMY SECTOR", $00
        .byte <LOADER_TEXT_ROW, >LOADER_TEXT_ROW
loader_ai_slot:
        .res AI_LINE_BYTES, $20         ; filled from the pool at entry
        .byte $00
        .byte $FF

failure_records:
        .byte <LOADER_TITLE_ROW, >LOADER_TITLE_ROW
        .byte "VOID STRIKE 65", $00
        .byte <LOADER_STATUS_ROW, >LOADER_STATUS_ROW
        .byte "DISK READ FAILED", $00
        .byte <LOADER_TEXT_ROW, >LOADER_TEXT_ROW
failure_reason_slot:
        .res 10, $20                    ; filled from failure_reasons
        .byte $00
        .byte <LOADER_PROMPT_ROW, >LOADER_PROMPT_ROW
        .byte "PRESS FIRE", $00
        .byte $FF

; Two words per status, in status order, ten characters each.
failure_reasons:
        .byte "NO DRIVE  "   ; status 1 NO_DEVICE
        .byte "READ ERROR"   ; status 2 WIRE_EXHAUSTED
        .byte "BAD DISK  "   ; status 3 DEVICE_ERROR
        .byte "WRONG DISK"   ; status 4 BAD_IMAGE

; v1 ships eight PLACEHOLDER lines of 38 characters (owner decision O). The
; owner writes the real ones in a later session; the pool's shape is what this
; step fixes. Sixteen lines do not fit - see the note in plan 1.5 [C4].
ai_line_pool:
        .byte "PLACEHOLDER 01 - OWNER WRITES THESE   "   ; line 1
        .byte "PLACEHOLDER 02 - AI CHATTER LINE      "   ; line 2
        .byte "PLACEHOLDER 03 - SECTOR TELEMETRY     "   ; line 3
        .byte "PLACEHOLDER 04 - HULL DIAGNOSTICS     "   ; line 4
        .byte "PLACEHOLDER 05 - NAV LOCK ACQUIRED    "   ; line 5
        .byte "PLACEHOLDER 06 - WEAPON BAY CHECK     "   ; line 6
        .byte "PLACEHOLDER 07 - THREAT BOARD CLEAR   "   ; line 7
        .byte "PLACEHOLDER 08 - STANDBY FOR DROP     "   ; line 8
ai_line_pool_end:

.assert (ai_line_pool_end - ai_line_pool) = AI_LINE_COUNT * AI_LINE_BYTES, error, "the AI text pool is not 8 x 38 B"

; ---------------------------------------------------------------------------
; Level directory, 16 x 3 B, generated by scripts/build.mjs from the runs it
; actually placed on the disk, so the sector numbers cannot drift from the
; image. Defines sector_reader_directory and sector_reader_directory_end.
; ---------------------------------------------------------------------------
.include "level-directory.inc"

; ---------------------------------------------------------------------------
; Plan §1.7. Not load-bearing at 19040 baud — a page-crossing branch costs one
; cycle against a ~900-cycle margin — but enforced at zero cost so the loops'
; cycle counts stay constants the harness can pin.
; ---------------------------------------------------------------------------
.assert >sector_reader_rx_loop = >sector_reader_rx_loop_end, error, "sector reader receive loop crosses a page"
.assert >sector_reader_tx_loop = >sector_reader_tx_loop_end, error, "sector reader transmit loop crosses a page"
.assert (sector_reader_directory_end - sector_reader_directory) = LEVEL_MAX_ID * 3, error, "level directory is not 16 x 3 B"

.export sector_reader_directory
.export sector_reader_wait_serial, sector_reader_receive_byte
.export sector_reader_send_command, sector_reader_read_sector
.export sector_reader_lookup, sector_reader_resident_hit, sector_reader_validate
.export sector_reader_build_frame, sector_reader_settle, sector_reader_quiesce
.export sector_reader_pokey_setup, sector_reader_begin_receive
