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

; ---------------------------------------------------------------------------
; Hardware. The game defines none of these: it has never written IRQEN, SKCTL,
; SEROUT or PBCTL, so the equates live here rather than costing MAIN anything.
; ---------------------------------------------------------------------------
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
MAX_LEVEL_SECTORS = 44          ; the level buffer is 5,632 B
WIRE_ATTEMPTS     = 3
DEVICE_PROBES     = 2

LEVEL_BUFFER         = $A600
LEVEL_MAGIC_0        = 'V'
LEVEL_MAGIC_1        = 'S'
LEVEL_FORMAT_VERSION = 1
LEVEL_MAX_ID         = 16

; Placeholder until the build generates the directory (plan §7, step 3).
LEVEL1_BASE_SECTOR   = 320

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
sr_frame:           .res 5      ; the five-byte command frame

.segment "SECTOR_READER"

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

; One animation step per completed sector (owner decision O). The loader-mode
; display fills this in; plan §6, step 4.
sector_reader_animate:
        rts

; ---------------------------------------------------------------------------
; Level directory, 16 x 3 B. The build regenerates this table in step 3 so the
; sector numbers follow the fixed level base; until then level 1 alone is
; described, and every other entry has a zero count that lookup rejects.
; ---------------------------------------------------------------------------
sector_reader_directory:
        .byte <LEVEL1_BASE_SECTOR, >LEVEL1_BASE_SECTOR, 2
        .res (LEVEL_MAX_ID - 1) * 3, $00
sector_reader_directory_end:

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
