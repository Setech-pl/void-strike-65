; Disk-only bootstrap, loaded over the dead region block AFTER combat.
.setcpu "6502"
.include "boss-imports.inc"
.include "boss-death-imports.inc"
.segment "DEATH_BOOT"
.export death_boot, death_load_begin, death_load_end
death_boot:
    ldx #$FF
    txs
    ; The safe A-only strobe DLI retains the fight image. Clean the hull while
    ; its old backing/flash helpers are still present. The queue was drained
    ; before this bootstrap replaced its source look tail in slot F.
    lda boss_mflash_timer
    beq :+
    jsr boss_mflash_off
:
    ldx #9
    lda #0
:   sta FIGHTER_PROJECTILE_ACTIVE,x
    dex
    bpl :-
    jsr laser_hostile_shots
    ldx #7
@ring:
    lda boss_ring_timer,x
    beq :+
    jsr boss_ring_restore
:   dex
    bpl @ring
    ; Clear only released PMG planes. P0 (the player's ship) is untouched.
    ldx #0
    txa
:   sta $3B00,x
    sta $3D00,x
    sta $3E00,x
    sta $3F00,x
    inx
    bne :-
    sta $D004
    sta $D005
    sta $D006
    sta $D007
    sta $D001
    sta $D002
    sta $D003
    ; Old slot-E execution is over. Only now reuse it for death parameters.
    lda boss_head_region
    sta $4D00
    lda boss_shown_pos
    sta $4D01
    lda boss_band_last_operand
    clc
    adc #1
    sta $4D02
    ldx _boss_n
    lda boss_mx,x
    clc
    adc boss_mxe,x
    lsr
    sta $4D03
death_load_begin:
    jsr guard_reset
    lda #<DEATH_CODE_SECTOR
    sta sr_sector_lo
    lda #>DEATH_CODE_SECTOR
    sta sr_sector_hi
    lda #DEATH_CODE_SECTORS
    sta sr_sectors_left
    lda #0
    sta sr_dst
    lda #$10
    sta sr_dst+1
    jsr sector_reader_read_sectors
    bcs death_load_failed
    lda #<DEATH_CODE_FOLD
    ldy #>DEATH_CODE_FOLD
    jsr guard_compare
    bcs death_load_failed
death_load_end:
    jmp $1000
death_load_failed:
    jmp sector_reader_failure_screen
