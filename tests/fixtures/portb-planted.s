; tests/portb-writes.test.mjs: the analyser's planted writes (never assembled).
; Three are bad and must be flagged; the last is the game's own pattern.
PORTB = $D301
PBCTL = $D303

bank_switch_planted:            ; clears bit 4: CPU access to the 130XE bank
    lda PORTB
    and #$EF
    sta PORTB
    rts

constant_planted:               ; bits 4 and 5 clear: both 130XE access bits
    lda #$C3
    sta PORTB
    rts

self_test_planted:              ; bit 7 clear with the OS ROM on: self-test ROM at $5000
    ldx #$7F
    stx PORTB
    rts

direction_planted:              ; PBCTL bit 2 clear: $D301 then writes the direction register
    lda #$30
    sta PBCTL
    rts

basic_off_good:                 ; the game's disable_basic_rom
    lda PORTB
    ora #$02
    sta PORTB
    rts
