/* M6 stage 2. C owns drop eligibility, the once-per-level latch and life award.
 * Mainline only; no software stack, locals, helpers or interrupt work. */
#include <stdint.h>
#pragma code-name ("DIRECTOR_C_LOW")

extern uint8_t life_spawned;
extern uint8_t life_forced;
extern volatile uint8_t life_lives;
extern volatile uint8_t life_sector;
extern volatile uint8_t life_kind[];
uint8_t life_rng(void);

uint8_t life_c_pick(void)
{
    if (life_spawned || life_lives >= 8u) return 0u;
    if (!life_forced) {
        if (life_kind[life_sector] & 3u) return 0u;
        if (life_rng() & 3u) return 0u;
    }
    life_spawned = 1u;
    return 3u;
}

uint8_t life_c_collect(void)
{
    if (life_lives >= 8u) return 0u;
    ++life_lives;
    return 1u;
}

/* Called once at sector entry, not per frame. Returning the decision keeps
 * force policy in C, even though ASM executes the shared clean replacement. */
uint8_t life_c_enter(void)
{
    if (!(life_kind[life_sector] & 0x40u)) return 0u;
    life_forced = 1u;
    return life_c_pick();
}
