/* Throwaway input policy. ASM consumes the chosen numerator with one shared
 * world/hull accumulator clock; C owns the brake and its bounded ramp. */
extern unsigned char spike_scroll_rate;
extern const unsigned char spike_normal_rates[3];
extern const unsigned char spike_half_rates[3];
extern volatile unsigned char spike_capital_state;
extern volatile unsigned char spike_player_lifecycle;
extern volatile unsigned char spike_player_y;
extern volatile unsigned char spike_stick;
extern volatile unsigned char spike_difficulty;

#pragma code-name ("SPIKE_NACELLES")
void spike_throttle_tick(void)
{
    if (spike_capital_state >= 7u || spike_player_lifecycle == 1u) {
        spike_scroll_rate = spike_normal_rates[spike_difficulty];
        return;
    }
    if (spike_scroll_rate < spike_half_rates[spike_difficulty] ||
        spike_scroll_rate > spike_normal_rates[spike_difficulty]) {
        spike_scroll_rate = spike_normal_rates[spike_difficulty];
    }
    if (spike_player_y == 225u && (spike_stick & 2u) == 0u) {
        if (spike_scroll_rate > spike_half_rates[spike_difficulty])
            --spike_scroll_rate;
    } else if (spike_scroll_rate < spike_normal_rates[spike_difficulty]) {
        ++spike_scroll_rate;
    }
}
