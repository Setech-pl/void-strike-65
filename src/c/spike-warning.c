/* Separately selectable cheap fairness comparison. A 35-frame charge in the
 * bottom 24 scanlines; the existing warning visibility expiry stays intact. */
extern volatile unsigned char spike_player_y;
extern volatile unsigned char spike_warning_timer[3];
extern volatile unsigned char spike_warning_slot;
#pragma code-name ("SPIKE_NACELLES")
void spike_warning_set_timer(void)
{
    if (spike_player_y >= 201u)
        spike_warning_timer[spike_warning_slot] = 35u;
    else
        spike_warning_timer[spike_warning_slot] = 25u;
}
