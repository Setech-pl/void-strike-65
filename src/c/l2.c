/* §BW high-level phase decisions. No stack, runtime helpers or hardware writes. */
#include "l2-abi.h"
#define BYTE(a) (*(volatile unsigned char*)(a))
#define HULL ((volatile unsigned char*)L2_GEOMETRY)
#define PHASE_LO BYTE(L2_PHASE_LO)
/* Addresses and format constants come from linked labels / compiler layout. */
#define PHASE_HI BYTE(L2_PHASE_HI)
#define STATE BYTE(L2_STATE)
#pragma bss-name ("L2")
unsigned char l2_module;
unsigned char l2_i,l2_count,l2_at,l2_until,l2_tag;
#define EXT ((volatile unsigned char*)L2_EXTENSION)
#define SPANS ((volatile unsigned char*)L2_SPANS)
#define LOOKUP ((volatile unsigned char*)L2_LOOKUP)
#pragma code-name ("L2")
void l2_c_phase(void)
{
    if(PHASE_HI>(L2_ROWS>>8)) { STATE=L2_DRAIN; return; }
    l2_module=(unsigned char)(PHASE_HI<<5);
    l2_module |= PHASE_LO>>3;
    if(l2_module<HULL[L2_PHASE_START+0u]) STATE=0u;
    else if(l2_module<HULL[L2_PHASE_START+1u]) STATE=1u;
    else if(l2_module<HULL[L2_PHASE_START+2u]) STATE=2u;
    else if(l2_module<HULL[L2_PHASE_START+3u]) STATE=3u;
    else if(l2_module<(L2_MODULES+1u)) STATE=4u;
    else STATE=L2_DRAIN;
}
void l2_c_enter(void)
{
    PHASE_LO=(unsigned char)((L2_ROWS&255u)-HULL[L2_HULL_ROWS]);
    PHASE_HI=(unsigned char)((L2_ROWS>>8)-HULL[L2_HULL_ROWS+1u]);
    if(HULL[L2_HULL_ROWS]>(L2_ROWS&255u)) --PHASE_HI;
    for(l2_i=0u;l2_i<L2_MODULES;++l2_i) LOOKUP[l2_i]=0u;
    l2_i=(unsigned char)(BYTE(L2_SECTOR_INDEX)<<1);
    l2_count=((volatile unsigned char*)(L2_DESCRIPTORS+1u))[l2_i];
    l2_i=((volatile unsigned char*)L2_DESCRIPTORS)[l2_i];
    while(l2_count!=0u) {
        l2_at=SPANS[l2_i];
        l2_until=((volatile unsigned char*)(L2_SPANS+1u))[l2_i];
        l2_tag=((volatile unsigned char*)(L2_SPANS+2u))[l2_i];
        while(l2_at<l2_until) { ++l2_tag; LOOKUP[l2_at]=l2_tag; ++l2_at; }
        l2_i+=L2_RECORD_BYTES; --l2_count;
    }
}

#pragma rodata-name ("L2")
const unsigned char l2_normal_rates[3]=L2_NORMAL_RATES;
const unsigned char l2_half_rates[3]=L2_HALF_RATES;
extern unsigned char l2_rate;
#define DIFFICULTY BYTE(L2_DIFFICULTY)
void l2_brake_tick(void)
{
    if(STATE>=L2_OPEN || BYTE(L2_LIFECYCLE)==L2_DYING) {
        l2_rate=l2_normal_rates[DIFFICULTY];
        return;
    }
    if(l2_rate<l2_half_rates[DIFFICULTY] || l2_rate>l2_normal_rates[DIFFICULTY])
        l2_rate=l2_normal_rates[DIFFICULTY];
    if(BYTE(L2_PLAYER_Y)==L2_BOTTOM && (BYTE(L2_STICK)&2u)==0u) {
        if(l2_rate>l2_half_rates[DIFFICULTY]) --l2_rate;
    } else if(l2_rate<l2_normal_rates[DIFFICULTY]) ++l2_rate;
}
void l2_warning_set_timer(void)
{
    if(BYTE(L2_PLAYER_Y)>=201u)
        ((volatile unsigned char*)L2_TIMERS)[BYTE(L2_WORK_SLOT)]=35u;
    else
        ((volatile unsigned char*)L2_TIMERS)[BYTE(L2_WORK_SLOT)]=25u;
}
