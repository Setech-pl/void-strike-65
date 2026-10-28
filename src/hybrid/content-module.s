.setcpu "6502"
.segment "CONTENT"
; No-op platform entry. The L2 caller checks the shared checked-load validity.
content_tick:
    rts
content_end:
.export content_tick, content_end
.assert content_tick = $1180, lderror, "Content entry moved"
.assert content_end <= $1900, lderror, "Content home overflow"
