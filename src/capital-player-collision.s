.setcpu "6502"

; Final-raster BROADSIDE bolt versus PlayerFighter collision.
; Entry: X is the BROADSIDE slot; src_ptr is the inclusive swept bolt L/R,
; dst_ptr is the inclusive 16-HPOS player L/R, frontend_data_ptr is the
; inclusive player raster T/B, and BROAD_RASTER_TOP is cached by the physical
; screen-row mapper. Glyphs 126/127 occupy six scanlines from that top.
; Exit: carry set on swept-AABB contact. The caller restores its slot.

BROAD_RASTER_TOP = $4E72
CAPITAL_SHELL_VISIBLE_SCANLINES = 6
src_ptr = $94
dst_ptr = $96
frontend_data_ptr = $98

.segment "COLLISION"
.export capital_player_collision, capital_player_collision_hit, capital_player_collision_miss

capital_player_collision:
    ; Inclusive horizontal intervals: swept 8-HPOS bolt versus 16-HPOS player.
    lda src_ptr+1
    cmp dst_ptr
    bcc capital_player_collision_miss
    lda dst_ptr+1
    cmp src_ptr
    bcc capital_player_collision_miss

    ; Inclusive final-raster Y intervals. The cached top follows the displayed
    ; physical screen row; no logical BROAD_Y coordinate enters this decision.
    lda BROAD_RASTER_TOP,x
    clc
    adc #(CAPITAL_SHELL_VISIBLE_SCANLINES-1)
    cmp frontend_data_ptr
    bcc capital_player_collision_miss
    lda frontend_data_ptr+1
    cmp BROAD_RASTER_TOP,x
    bcc capital_player_collision_miss
capital_player_collision_hit:
    sec
    rts
capital_player_collision_miss:
    clc
    rts

.assert * <= $8EDF, error, "final-raster capital/player collision exceeds reviewed runtime tail"
