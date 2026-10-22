/* Disk-only post-fight policy. The ASM loop publishes these decisions. */
#include <stdint.h>
#pragma code-name ("DEATH_CODE")
#pragma bss-name ("DEATH_STATE")
extern volatile uint8_t death_light_state[];
uint8_t death_frame;
uint8_t death_shift;
uint8_t death_up;
uint8_t death_fx;
uint8_t death_flash;
uint8_t death_done;
uint8_t death_shake;
uint8_t death_blast_phase;
static uint8_t crown_timer;
void death_init(void)
{
    death_light_state[0] = 0u;
    death_light_state[1] = 0u;
    death_light_state[2] = 0u;
    death_light_state[3] = 0u;
    death_frame = 0u;
    death_shift = 0u;
    death_up = 0u;
    death_done = 0u;
    death_fx = 0u;
    death_flash = 1u;
    death_shake = 0u;
    death_blast_phase = 0u;
    crown_timer = 3u;
}
void death_tick(void)
{
    ++death_frame;
    death_shift = 0u;
    death_fx = 0u;
    death_flash = 0u;
    death_shake = 0u;
    death_blast_phase = (death_frame >> 2) & 1u;
    if (death_frame < 18u && (death_frame & 1u) != 0u) death_shake = 2u;
    if (death_frame < 2u || death_frame == 11u) death_flash = 1u;
    if (death_frame >= 12u && death_frame < 52u) {
        death_shift = 1u;
        if (death_frame < 40u) death_fx = 1u;
        if (death_up < 4u) {
            --crown_timer;
            if (crown_timer == 0u) {
                ++death_up;
                crown_timer = 3u;
            }
        }
    }
    if (death_frame == 74u) death_done = 1u;
}
