spike_warning_start:
.if SPIKE_THROTTLE = 0
.export _spike_player_y
_spike_player_y = player_y
.endif
.export _spike_warning_timer, _spike_warning_slot
_spike_warning_timer = BROAD_TIMER
_spike_warning_slot = BROAD_WORK_SLOT
.include "spike-warning-generated.s"
.segment "SPIKE_NACELLES"
spike_warning_end:
.assert spike_warning_end-spike_warning_start <= 24, error, "alternative exceeds owner's 24-B cap"
