#ifndef VOID_STRIKE_65_DIRECTOR_H
#define VOID_STRIKE_65_DIRECTOR_H

#include <stdint.h>

void director_c_init(void);
void director_c_world_row_tick(void);
uint8_t director_c_request(void);
void director_c_release(void);
uint8_t director_c_rng_advance(void);

#endif
