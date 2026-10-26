; DIAGNOSTIC SIZE SKETCH ONLY. Not linked into the game.
; Fragment sizes, NOT a claim of a minimum or of validated integration.
; External addresses are supplied from the current linked labels by budget.mjs.
.setcpu "6502"
.segment "CODE"
.export budget_start, budget_end, cold_end
.export valid_clear, valid_byte, checked_init, start_guard, frontend_exit
.export quit_exit, load_head, death_reload, death_end
budget_start:
valid_clear:
    sta L2_VALID             ; A=0 in existing l2_disarm
valid_byte:
    .byte 0                  ; resident state, cold transported image also resets it
checked_init:
    inc L2_VALID             ; only after checked load, whose head cleared it
start_guard:
    lda L2_VALID
    bne @valid
    lda #4                   ; SR_BAD_IMAGE: failure screen requires a valid status
    jmp sector_reader_failure_screen
@valid:
frontend_exit:
    jsr L2_DISARM            ; after publishing game_state; includes blank
quit_exit:
    jsr L2_DISARM            ; before gameplay teardown
load_head:
    jsr L2_DISARM            ; before the first L2 read, including resident-level hit
cold_end:
; Level end: replace existing JSR sector_reader_blank by JSR L2_DISARM (0 B).
; Boss entry: already calls L2_DISARM (0 B).
; RESET: transported valid byte starts at 0 (0 extra B).
; Lethal tail: replace JMP update_hud_status by JMP death_reload (0 net B).
; Full loss of validity needs checked reload BEFORE next frame's L2 consumers.
; A boss already owns slot D with validity 0: never reload L2 over that image.
death_reload:
    lda L2_VALID
    beq @boss
    jsr update_hud_status
    jsr backup_gameplay_screen
    jsr L2_DISARM
    jsr summary_load_l2       ; existing real checked run + INIT; failure never returns
    ldx #$ff                 ; resume_gameplay abandons the collision call stack
    txs
    jmp resume_gameplay
@boss:
    jmp update_hud_status
death_end:
budget_end:
.assert cold_end-budget_start = 26, error, "cold-fragment price changed"
.assert death_end-death_reload = 26, error, "death-fragment price changed"
.assert budget_end-budget_start = 52, error, "complete sketch price changed"
