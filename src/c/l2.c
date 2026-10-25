/* §BW high-level phase decisions. No stack, runtime helpers or hardware writes. */
#define BYTE(a) (*(volatile unsigned char*)(a))
#define HULL ((volatile unsigned char*)0xAC00u)
#define PHASE_LO BYTE(0x008Cu)
/* CORRIDOR_PHASE_LO is exported by main as corridor_phase; checked by build. */
#define PHASE_HI BYTE(0x85EFu)
#define STATE BYTE(0x4EA5u)
#pragma bss-name ("L2")
unsigned char l2_module;
#pragma code-name ("L2")
void l2_c_phase(void)
{
    if(PHASE_HI>3u) { STATE=5u; return; }
    l2_module=(unsigned char)(PHASE_HI<<5);
    l2_module |= PHASE_LO>>3;
    if(l2_module<HULL[2]) STATE=0u;
    else if(l2_module<HULL[3]) STATE=1u;
    else if(l2_module<HULL[4]) STATE=2u;
    else if(l2_module<HULL[5]) STATE=3u;
    else if(l2_module<121u) STATE=4u;
    else STATE=5u;
}
void l2_c_enter(void)
{
    PHASE_LO=(unsigned char)(0xC0u-HULL[0]);
    PHASE_HI=(unsigned char)(3u-HULL[1]);
    if(HULL[0]>0xC0u) --PHASE_HI;
}
