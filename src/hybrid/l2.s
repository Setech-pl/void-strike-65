.setcpu "6502"
.include "l2-abi.inc"
.segment "L2"
l2_start:
    jmp l2_init
    jmp l2_stub
    jmp l2_stub
    jmp l2_stub
    jmp l2_stub
    jmp _l2_c_phase
    jmp _l2_c_enter
l2_init:
l2_stub:
    rts
.include "l2-c.inc"
l2_end:
.assert l2_start = L2_INIT, lderror, "L2 ABI moved"
.assert l2_end <= $2000, lderror, "L2 exceeds slot D phase allocation"
