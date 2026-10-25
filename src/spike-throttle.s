; Included in the existing spike window. Policy is C; all clock consumers
; use its one cached numerator, including the early breakup predictor.
spike_throttle_start:
.export _spike_scroll_rate, _spike_normal_rates, _spike_half_rates
.export _spike_capital_state, _spike_player_lifecycle, _spike_player_y
.export _spike_stick, _spike_difficulty
_spike_scroll_rate = spike_scroll_rate
_spike_normal_rates = spike_normal_rates
_spike_half_rates = spike_half_rates
_spike_capital_state = CAPITAL_SECTOR_STATE
_spike_player_lifecycle = PLAYER_LIFECYCLE
_spike_player_y = player_y
_spike_stick = stick_value
_spike_difficulty = DIFFICULTY_SETTING
.assert PLAYER_Y_MAX = 225, error, "C throttle bottom constant changed"
.assert CAPITAL_HULL_STATE_OPEN = 7, error, "C throttle capital gate changed"
.assert PLAYER_DYING = 1, error, "C throttle lifecycle constant changed"
spike_throttle_before_enemy:
    jsr _spike_throttle_tick
    jmp integration_update_enemy
spike_throttle_c_start:
.include "spike-throttle-generated.s"
.segment "SPIKE_NACELLES"
spike_throttle_c_end:
spike_normal_rates: .byte HULL_SCROLL_RATE_EASY,HULL_SCROLL_RATE_MEDIUM,HULL_SCROLL_RATE_HARD
spike_half_rates: .byte HULL_SCROLL_RATE_EASY/2,HULL_SCROLL_RATE_MEDIUM/2,HULL_SCROLL_RATE_HARD/2
; Invalid sentinel makes even a direct capital-entry fixture choose its own
; difficulty immediately; ordinary gameplay first initialises this in OPEN.
spike_scroll_rate: .byte 0
spike_throttle_end:
