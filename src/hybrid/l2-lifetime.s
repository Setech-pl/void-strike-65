; Cold transition only, in the old C-phase body's pinned padding.
; The display/interrupt publication is stopped before changing any hook.
; No interrupt, audio or shared-spawn path calls L2. Capital admission has
; already consumed BOSS_DUE in fighter state; boss install replaces its vectors.
.export l2_disarm, l2_cached_rate, l2_valid, l2_load_guard
l2_disarm:
    jsr $A03D                       ; sector_reader_blank, cross-link checked
l2_invalidate:
    lda #<$3114                     ; integration_update_enemy
    sta $5EF0                       ; profile_after_player + 1 (JSR operand)
    lda #>$3114
    sta $5EF1
    lda #0
    sta $86B4                       ; resident cached scroll numerator
    sta $86B3                       ; invalid until the checked run's INIT
    rts
.assert l2_disarm = $8656, lderror, "L2 disarm pin moved"
l2_load_guard:
    cpx #11                         ; OVERLAY_L2, cross-link checked
    bne @read
    jsr l2_invalidate               ; preserves X and the summary display
@read:
    cpx #12                        ; displaced directory bound, cross-link checked
    bcs @bad
    jmp $A124                      ; sector_reader_read_run_inline, checked
@bad:
    jmp $A21E                      ; sector_reader_report_bad_image, checked
.assert l2_load_guard = $866C, lderror, "L2 load guard pin moved"
    .res 96-(*-l2_pin_start),0
l2_valid: .byte 0
.assert l2_valid = $86B3, lderror, "L2 validity pin moved"
l2_cached_rate: .byte 0
.assert l2_cached_rate = $86B4, lderror, "L2 resident rate pin moved"
