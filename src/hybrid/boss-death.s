; Variant B hardware executor. All bytes are read after combat into dead
; boss slots C/D; E is now private scratch. No call from the fight loop.
.setcpu "6502"
.include "boss-imports.inc"
.include "boss-death-imports.inc"
.include "gameplay-music-abi.inc"
.import _death_init, _death_tick, _death_frame, _death_shift, _death_up
.import _death_fx, _death_flash, _death_done
.import _death_shake, _death_blast_phase, _death_burst, _death_vanish
.import _death_left_shift, _death_right_shift, _death_crown_shift, _death_crown_dir
.import _death_left_step, _death_right_step
.export _death_random
.export _death_light_state
_death_light_state = DEATH_LIGHT_STATE
.export death_entry, death_frame_begin, death_pre_fence, death_publish_end
.export death_dli, death_dli_top_entry, death_handoff, death_copy, death_front
.export death_layout, death_publish
REGION = $4D00
POSITION = $4D01
ROWS = $4D02
SPLIT = $4D03
death_front = $4D04
DLI_INDEX = $4D05
PAL_OFFSET = $4D06
ROW = $4D07
SLOT = $4D08
SOURCE_ROW = $4D09
PAL0 = $4D0A
PAL2 = $4D0B
BACKDROP = $4D1C
BASE_PAL0 = $4D0C
BASE_PAL2 = $4D0D
SCROLL = $4D0E
COARSE = $4D0F
DEST_LO = $4D10
DEST_HI = $4D11
SRC_LO = $4D12
SRC_HI = $4D13
FRAME_FX = $4D14
EDGE_LEFT = $4D15
EDGE_RIGHT = $4D16
STEP = $4D17
BLAST_SAVE = $4D18
PALETTE1 = $4C00
PALETTE3 = $4C10
NEXT1 = $4C20
NEXT3 = $4C30
NEXT_LIST = $4C40
RNG_SAVE = $4D1D
COPY_END = $4D1E
COPY_FRONT = $4D1F
CROWN_FRONT = $4D60
BLANK_ROW = $4DA0
PRIVATE_LIST = $4CA0
PRIVATE_ENTRY = PRIVATE_LIST+89
VSCROL = $D405
BUFFER = $1E00
VCOUNT = $D40B
WSYNC = $D40A
NMIEN = $D40E
DMACTL = $D400
CHBASE = $D409
HSCROL = $D404
COLPF0 = $D016
COLPF1 = $D017
COLPF2 = $D018
COLPF3 = $D019
VDSLST = $0200

.segment "DEATH_HEAD"
death_entry:
    lda #0
    sta death_front
    sta FRAME_FX
    sta STEP
    sta CROWN_FRONT
    ldx #63
:   sta BLANK_ROW,x
    dex
    bpl :-
    ldx #0
@blank:
    sta BUFFER,x
    sta BUFFER+$100,x
    inx
    bne @blank
    ; Clear spent player/hostile shot codes in the original band. The
    ; source codes are per-region data, not guessed glyph numbers.
    ldx REGION
    lda shot_codes,x
    sta @shot+1
    lda hostile_codes,x
    sta @hostile+1
    lda field_codes,x
    sta @field+1
    ldx #7
@row:
    lda band_lo,x
    sta @read+1
    sta @clear+1
    lda band_hi,x
    sta @read+2
    sta @clear+2
    ldy #63
@cell:
@read:
    lda $FFFF,y
    and #$7F
@field:
    cmp #0
    beq @zero
    sec
@shot:
    sbc #0
    cmp #4
    bcc @zero
    clc
    adc @shot+1
    sec
@hostile:
    sbc #0
    cmp #2
    bcs @next
@zero:
    lda #0
@clear:
    sta $FFFF,y
@next:
    dey
    bpl @cell
    dex
    bpl @row
    ; Region row palettes are 32 bytes each, in campaign order.
    lda REGION
    asl
    asl
    asl
    asl
    asl
    sta PAL_OFFSET
    tax
    lda palettes,x
    sta BASE_PAL0
    lda palettes+2,x
    sta BASE_PAL2
    ; Clamp the split to the current visible window, not a fixed boss half.
    lda POSITION
    lsr
    lsr
    clc
    adc #8
    cmp SPLIT
    bcc :+
    sta SPLIT
:   clc
    adc #32
    cmp SPLIT
    bcs :+
    sta SPLIT
:   lda POSITION
    clc
    adc #15
    and #$F0
    tax
    sec
    sbc POSITION
    sta SCROLL
    txa
    lsr
    lsr
    sta COARSE
    lda ENTITY_RNG_STATE
    sta RNG_SAVE
    jsr _death_init
    jsr erase_fighter_projectile_overlays_with_light
    ldy SPLIT
    dey
    lda $A8C0,y
    sta BLAST_SAVE
    lda $A900,y
    sta BLAST_SAVE+2
    iny
    lda $A8C0,y
    sta BLAST_SAVE+1
    lda $A900,y
    sta BLAST_SAVE+3
    jsr death_blast
    ; The lower ring and bottom HUD keep their existing source addresses.
    ldx #0
    ldy #0
@list:
    lda #$54
    cpy #9
    bcc @boss
    lda #$44
    cpy #27
    bne :+
    lda #$C4
:   sta NEXT_LIST,x
    tya
    sec
    sbc #1
    tay
    lda PLAYFIELD_ROW_LO,y
    sta NEXT_LIST+1,x
    lda PLAYFIELD_ROW_HI,y
    sta NEXT_LIST+2,x
    iny
    jmp @advance
@boss:
    ora #$80
    sta NEXT_LIST,x
@advance:
    inx
    inx
    inx
    iny
    cpy #28
    bne @list
    lda #$42
    sta NEXT_LIST+84
    lda #<SCREEN
    sta NEXT_LIST+85
    lda #>SCREEN
    sta NEXT_LIST+86
    lda #$01
    sta NEXT_LIST+87
    lda #<(PLAYFIELD_DLIST_A-1)
    sta NEXT_LIST+88
    lda #>(PLAYFIELD_DLIST_A-1)
    sta NEXT_LIST+89
    ; Eight scrolling boss slots; header/separator and tail stay outside.
    ldx #3
:   lda NEXT_LIST,x
    ora #$20
    sta NEXT_LIST,x
    inx
    inx
    inx
    cpx #27
    bne :-
    ; Keep the held fight/DLI live until the complete first breakup list is
    ; ready. Switch vectors only after the HUD has reached the fence.
    jsr death_layout
    ldx #$77
    jsr wait_frame_at_line
    lda #0
    sta NMIEN
    jsr death_publish
    ; Re-prime the list at its frame-entry JMP; its cursor may still be
    ; waiting in the previous fight list's tail.
    lda #0
    sta DMACTL
    lda #<PRIVATE_ENTRY
    sta $D402
    lda #>PRIVATE_ENTRY
    sta $D403
    lda #<death_dli_top_entry
    sta VDSLST
    lda #>death_dli_top_entry
    sta VDSLST+1
    lda #$E0
    sta PRIVATE_LIST
    jsr wait_frame_start
    lda #$80
    sta NMIEN
    lda #$3E
    sta DMACTL
    ; Quiet, bounded explosion cue; the serial reader no longer owns POKEY.
    lda #3
    sta $D20F
    lda #0
    sta $D208
    lda sound_enabled
    beq death_loop
    lda #$87
    sta $D205
death_loop:
    ldx #10
    jsr wait_frame_at_line
death_frame_begin:
    jsr _death_tick
    lda _death_done
    beq :+
    ; The last tick has no wing work. Restore the canonical gameplay font
    ; before the normal summary/new-game path; init_state republishes looks.
    jsr death_restore_font
:
    jsr death_blast
    lda _death_shift
    beq :+
    jsr death_copy
    inc STEP
:   lda _death_crown_shift
    beq :+
    jsr death_copy_crown
:   jsr death_layout
death_pre_fence:
    ldx #$77
    jsr wait_frame_at_line
    jsr death_publish
death_publish_end:
    lda _death_done
    beq death_loop
death_handoff:
    lda RNG_SAVE
    sta ENTITY_RNG_STATE
    lda #0
    sta $D205
    lda GAME_MUSIC_ENABLED
    beq :+
    jsr GAMEPLAY_MUSIC_START
:   lda #0
    sta $D204
    jmp sector_reader_level_end

.segment "DEATH_CODE"
_death_random:
    jsr entity_next_rng
    eor ACTIVE_GAMEPLAY_FRAME_LO
    ldx #0
    rts

death_blast:
    lda _death_frame
    cmp #12
    bcc @draw
    beq @restore
    rts
@restore:
    ldy SPLIT
    dey
    lda BLAST_SAVE
    sta $A8C0,y
    lda BLAST_SAVE+2
    sta $A900,y
    iny
    lda BLAST_SAVE+1
    sta $A8C0,y
    lda BLAST_SAVE+3
    sta $A900,y
    rts
@draw:
    lda REGION
    asl
    ora _death_blast_phase
    tax
    lda blasts,x
    ldy SPLIT
    dey
    sta $A8C0,y
    sta $A900,y
    iny
    sta $A8C0,y
    sta $A900,y
    rts

; Undo only the guarded first scanlines, not a full 1-KB font publication.
; Keep live star glyph 1 and its fine-Y phase untouched. Normal START GAME
; republishes the level-specific hull, shots and Light looks as before.
death_restore_font:
    ldx #0
@row:
    lda charset_data+$100,x
    sta CHARSET+$100,x
    cpx #8
    beq :+
    lda charset_data,x
    sta CHARSET,x
:   txa
    clc
    adc #8
    tax
    bne @row
    rts

; Secondary tile bursts are written only below the fence, onto nonempty
; material. They become burning fragments carried by subsequent wing copies.
; Five candidates per side: bounded and never paint an empty sky cell.
death_secondary:
    lda _death_burst
    bne :+
    rts
:
    tax
    lda burst_rows-1,x
    sta ROW
    tax
    lda band_lo,x
    sta DEST_LO
    lda band_hi,x
    sta DEST_HI
    lda #0
    sta EDGE_LEFT
    cpx #2
    bcs :+
    lda CROWN_FRONT
    bne @secondary_buffer
    beq @point
:   lda _death_left_step
    sta EDGE_LEFT
    lda death_front
    beq @point
@secondary_buffer:
    lda buffer_lo,x
    sta DEST_LO
    txa
    lsr
    lsr
    clc
    adc #>BUFFER
    sta DEST_HI
@point:
    lda _death_frame
    lsr
    lsr
    lsr
    and #3
    clc
    adc #4
    sta EDGE_RIGHT
    lda DEST_LO
    sta @read+1
    sta @write+1
    lda DEST_HI
    sta @read+2
    sta @write+2
    lda REGION
    asl
    ora _death_blast_phase
    tax
    lda blasts,x
    sta FRAME_FX
    lda SPLIT
    sec
    sbc EDGE_LEFT
    bcc @right
    sbc EDGE_RIGHT
    bcc @right
    tay
    ldx #5
@left:
    jsr @ember
    bne @right
    dey
    bmi @right
    dex
    bne @left
@right:
    lda SPLIT
    clc
    adc _death_right_step
    adc EDGE_RIGHT
    cmp #64
    bcs @exit
    tay
    ldx #5
@right_loop:
    jsr @ember
    bne @exit
    iny
    cpy #64
    bcs @exit
    dex
    bne @right_loop
@exit:
    rts
@ember:
@read:
    lda $FFFF,y
    beq @empty
    lda FRAME_FX
@write:
    sta $FFFF,y
@empty:
    rts

; Bounded front-to-back copies: wing steps 0/1, crown steps 1..3.
; Crown copies use the reserved no-wing tick; ANTIC reads only the old front.
death_copy:
    lda #2
    sta ROW
    lda ROWS
    sta COPY_END
    lda death_front
    sta COPY_FRONT
    jsr death_copy_rows
    lda death_front
    eor #1
    sta death_front
    rts

death_copy_crown:
    lda #0
    sta ROW
    lda #2
    sta COPY_END
    lda CROWN_FRONT
    sta COPY_FRONT
    jsr death_copy_rows
    lda CROWN_FRONT
    eor #1
    sta CROWN_FRONT
    rts

death_copy_rows:
@row:
    ldx ROW
    lda band_lo,x
    sta SRC_LO
    sta DEST_LO
    lda band_hi,x
    sta SRC_HI
    sta DEST_HI
    txa
    lsr
    lsr
    clc
    adc #>BUFFER
    ldy COPY_FRONT
    beq @dest_buffer
    sta SRC_HI
    lda buffer_lo,x
    sta SRC_LO
    jmp @addresses
@dest_buffer:
    sta DEST_HI
    lda buffer_lo,x
    sta DEST_LO
@addresses:
    lda _death_left_shift
    sta EDGE_LEFT
    lda _death_right_shift
    sta EDGE_RIGHT
    lda SPLIT
    sta FRAME_FX
    lda ROW
    cmp #2
    bcs @wing
    lda #0
    sta EDGE_LEFT
    sta EDGE_RIGHT
    lda _death_crown_dir
    beq @crown_left
    lda _death_crown_shift
    sta EDGE_RIGHT
    lda #0
    beq @split
@crown_left:
    lda _death_crown_shift
    sta EDGE_LEFT
    lda #64
@split:
    sta FRAME_FX
@wing:
    lda FRAME_FX
    sec
    sbc EDGE_LEFT
    sta @left_end+1
    lda FRAME_FX
    clc
    adc EDGE_RIGHT
    sta @gap_end+1
    lda SRC_LO
    clc
    adc EDGE_LEFT
    sta @left_read+1
    lda SRC_HI
    adc #0
    sta @left_read+2
    lda SRC_LO
    sec
    sbc EDGE_RIGHT
    sta @right_read+1
    lda SRC_HI
    sbc #0
    sta @right_read+2
    lda DEST_LO
    sta @left_write+1
    sta @right_write+1
    sta @zero_write+1
    lda DEST_HI
    sta @left_write+2
    sta @right_write+2
    sta @zero_write+2
    ldy #0
    cpy @left_end+1
    beq @gap
@left_read:
    lda $FFFF,y
@left_write:
    sta $FFFF,y
    iny
@left_end:
    cpy #0
    bne @left_read
@gap:
    lda #0
@gap_end:
    cpy #0
    beq @right
@zero_write:
    sta $FFFF,y
    iny
    bne @gap_end
@right:
    cpy #64
    beq @next
@right_read:
    lda $FFFF,y
@right_write:
    sta $FFFF,y
    iny
    cpy #64
    bne @right_read
@next:
    inc ROW
    lda ROW
    cmp COPY_END
    bcs :+
    jmp @row
:   rts

; Build shadow row pointers and shadow palette pairs. The crown's two
; buffered character rows move into the divider and off the visible top;
; lower fragments retain their own source-row colours throughout.
death_layout:
    lda #0
    sta SLOT
    ldx #0
@slot:
    stx ROW
    lda _death_vanish
    bne @blank
    lda SLOT
    clc
    adc _death_up
    sec
    sbc #1
    cmp #2
    bcc @crown
    lda SLOT
    sec
    sbc #1
    cmp #2
    bcc @blank
    cmp ROWS
    bcs @blank
    sta SOURCE_ROW
    tax
    lda death_front
    beq @original
    lda buffer_lo,x
    sta DEST_LO
    txa
    lsr
    lsr
    clc
    adc #>BUFFER
    sta DEST_HI
    jmp @point
@crown:
    sta SOURCE_ROW
    tax
    lda CROWN_FRONT
    beq @original
    lda buffer_lo,x
    sta DEST_LO
    lda #>BUFFER
    sta DEST_HI
    jmp @point
@original:
    lda band_lo,x
    sta DEST_LO
    lda band_hi,x
    sta DEST_HI
    jmp @point
@blank:
    lda #0
    sta SOURCE_ROW
    lda #<BLANK_ROW
    sta DEST_LO
    lda #>BLANK_ROW
    sta DEST_HI
@point:
    ldx ROW
    lda DEST_LO
    clc
    adc COARSE
    sta NEXT_LIST+1,x
    lda DEST_HI
    sta NEXT_LIST+2,x
    lda SOURCE_ROW
    asl
    asl
    clc
    adc PAL_OFFSET
    tax
    ldy SLOT
    lda palettes+1,x
    sta NEXT1,y
    lda palettes+3,x
    sta NEXT3,y
    inc SLOT
    ldx ROW
    inx
    inx
    inx
    cpx #27
    beq :+
    jmp @slot
:
    lda BASE_PAL0
    sta PAL0
    lda BASE_PAL2
    sta PAL2
    lda #0
    sta BACKDROP
    lda _death_flash
    beq @done
    lda #$0E
    sta BACKDROP
    sta PAL0
    sta PAL2
    ldx #8
:   lda #$2C
    sta NEXT1,x
    lda #$28
    sta NEXT3,x
    dex
    bpl :-
@done:
    rts

death_publish:
    lda _death_done
    bne @restore_list
    lda _death_shake
    sta VSCROL
    ldx #29
@head:
    lda NEXT_LIST,x
    sta PRIVATE_LIST+1,x
    dex
    bpl @head
    lda #$60                    ; seven scanlines after the scroll-exit row
    sta PRIVATE_LIST+31
    ldx #59
@tail:
    lda NEXT_LIST+30,x
    sta PRIVATE_LIST+32,x
    dex
    bpl @tail
    lda #<PRIVATE_LIST
    sta PRIVATE_ENTRY+1
    lda #>PRIVATE_LIST
    sta PRIVATE_ENTRY+2
    jmp @palettes
@restore_list:
    lda #0
    sta VSCROL
    ldx #3
@unscroll:
    lda NEXT_LIST,x
    and #$DF
    sta NEXT_LIST,x
    inx
    inx
    inx
    cpx #27
    bne @unscroll
    ldx #89
@list:
    lda NEXT_LIST,x
    sta PLAYFIELD_DLIST_A,x
    dex
    bpl @list
    lda #$E0
    sta PLAYFIELD_DLIST_A-1
    lda #<PLAYFIELD_DLIST_ENTRY
    sta $D402
    lda #>PLAYFIELD_DLIST_ENTRY
    sta $D403
@palettes:
    lda #<death_dli_top_entry
    sta VDSLST
    ldx #8
:   lda NEXT1,x
    sta PALETTE1,x
    lda NEXT3,x
    sta PALETTE3,x
    dex
    bpl :-
    lda #0
    sta DLI_INDEX
    lda #<(PALETTE1+1)
    sta death_pal1+1
    lda #<(PALETTE3+1)
    sta death_pal3+1
    lda SCROLL
    sta HSCROL
    jsr death_sparks
    jsr death_secondary
    lda sound_enabled
    beq :+
    lda _death_frame
    asl
    adc #$30
    sta $D204
    lda _death_burst
    beq @fade
    lda #$86
    sta $D205
    bne :+
@fade:
    lda _death_frame
    and #7
    bne :+
    lda #0
    sta $D205
:   rts

death_sparks:
    ; Erase released planes once during bootstrap, then only these short
    ; spans. No P0 writes and no full-plane clear in the frame loop.
    ldx #23
    lda #0
:   sta $3D20,x
    sta $3E20,x
    dex
    bpl :-
    sta $D001
    sta $D002
    sta $D005
    sta $D006
    lda _death_fx
    beq @done
    lda #0
    sta $D009
    sta $D00A
    sta $D00C
    lda #$2C
    sta $D013
    sta $D014
    lda SPLIT
    asl
    asl
    clc
    adc #32
    sec
    sbc POSITION
    sta EDGE_LEFT
    sta EDGE_RIGHT
    lda _death_left_step
    asl
    asl
    sta FRAME_FX
    lda EDGE_LEFT
    sec
    sbc FRAME_FX
    bcc @right
    cmp #44
    bcc @right
    sta $D001
@right:
    lda _death_right_step
    asl
    asl
    sta FRAME_FX
    lda EDGE_RIGHT
    clc
    adc FRAME_FX
    bcs @shape
    cmp #212
    bcs @shape
    sta $D002
@shape:
    ldx #9
:   txa
    eor _death_frame
    and #$7E
    sta $3D20,x
    sta $3E20,x
    dex
    bpl :-
    ; Two missile sparks, fixed HPOS each frame. Erase previous 48-line
    ; trail range before drawing the new pair.
@done:
    ldx #95
    lda #0
:   sta $3B10,x
    dex
    bpl :-
    lda _death_fx
    beq @exit
    lda _death_left_step
    asl
    asl
    sta FRAME_FX
    lda EDGE_LEFT
    sec
    sbc FRAME_FX
    bcs :+
    lda #0
:   sta $D005
    lda _death_right_step
    asl
    asl
    sta FRAME_FX
    lda EDGE_RIGHT
    clc
    adc FRAME_FX
    bcc :+
    lda #0
:   sta $D006
    lda _death_left_step
    clc
    adc #32
    tay
    lda #$3C
    sta $3B00,y
@exit:
    rts

; Row DLIs change only PF1/PF3, matching the accepted 4/12-cycle landing.
death_dli:
    pha
    cld
    lda DLI_INDEX
    bmi death_dli_hud
    beq death_dli_top
    cmp #9
    beq death_dli_ring
death_pal1 = *
    lda PALETTE1+1
    sta WSYNC
    sta COLPF1
death_pal3 = *
    lda PALETTE3+1
    sta COLPF3
    inc death_pal1+1
    inc death_pal3+1
    inc DLI_INDEX
    pla
    rti
death_dli_top_entry:
    pha
; The direct vector avoids a late WSYNC when the crown enters the divider.
death_dli_top:
    lda PALETTE3
    sta WSYNC
    sta COLPF3
    cld
    lda #$0C
    sta CHBASE
    lda PAL0
    sta COLPF0
    lda PALETTE1
    sta COLPF1
    lda PAL2
    sta COLPF2
    lda BACKDROP
    sta $D01A
    lda #<death_dli
    sta VDSLST
    inc DLI_INDEX
    pla
    rti
death_dli_ring:
    sta WSYNC
    lda #>CHARSET
    sta CHBASE
    lda #GAMEPLAY_COLPF2
    sta COLPF2
    lda #GAMEPLAY_COLPF0
    sta COLPF0
    lda gameplay_dli_allied_colpf1_load+1
    sta COLPF1
    lda #GAMEPLAY_COLPF3
    sta COLPF3
    lda #0
    sta $D01A
    lda #$80
    sta DLI_INDEX
    pla
    rti
death_dli_hud:
    lda #HUD_COLPF2
    sta WSYNC
    sta COLPF2
    jmp gameplay_dli_hud

.assert >death_dli_top_entry = >death_dli, error, "death DLI atomic vectors need one page"

.segment "DEATH_DATA"
burst_rows:
    .byte 0,2,4
band_lo:
    .byte $80,$C0,$00,$40,$80,$C0,$80,$C0
band_hi:
    .byte $A8,$A8,$A9,$A9,$A9,$A9,$AC,$AC
buffer_lo:
    .byte $00,$40,$80,$C0,$00,$40,$80,$C0
.include "boss-death-palettes.inc"
.segment "DEATH_BUFFER"
    .res 512
.assert * = $2000, lderror, "death buffer leaves the existing boss claim"
