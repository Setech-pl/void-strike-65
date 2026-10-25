; Cold transition only, in the old C-phase body's pinned padding.
; The display/interrupt publication is stopped before changing any hook.
; No interrupt, audio or shared-spawn path calls L2. Capital admission has
; already consumed BOSS_DUE in fighter state; boss install replaces its vectors.
.export l2_disarm, l2_cached_rate
l2_disarm:
    jsr $A03D                       ; sector_reader_blank, cross-link checked
    lda #<$3114                     ; integration_update_enemy
    sta $5EF0                       ; profile_after_player + 1 (JSR operand)
    lda #>$3114
    sta $5EF1
    lda #0
    sta $86B4                       ; resident cached scroll numerator
    rts
.assert l2_disarm = $8656, lderror, "L2 disarm pin moved"
    .res 97-(*-l2_pin_start),0
l2_cached_rate: .byte 0
.assert l2_cached_rate = $86B4, lderror, "L2 resident rate pin moved"
