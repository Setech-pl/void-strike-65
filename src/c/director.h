#ifndef VOID_STRIKE_65_DIRECTOR_H
#define VOID_STRIKE_65_DIRECTOR_H

#include <stdint.h>

void director_c_init(void);
void director_c_world_row_tick(void);
uint8_t director_c_request(void);
void director_c_release(void);
uint8_t director_c_rng_advance(void);
/* Roadmap 4.6 step 2: arm the WaveDef the cursor names. It keeps the ABI name
 * director_try_event, which the native trace uses as its Director-event PC. */
uint8_t director_c_try_event(void);
/* min(the sector's requested Light cap, the runtime's ceiling for its kind and
 * subtype). The Light class calls it on its own admission path, so the answer
 * is computed in exactly one place (plan §5). */
uint8_t director_c_light_ceiling(void);

/* The armed wave's Heavy half, consumed by enemy_c_spawn_raiders. */
extern volatile uint8_t heavy_escort_offset;
extern volatile uint8_t heavy_wave_flags;

#endif
