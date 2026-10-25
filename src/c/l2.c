/* §BW high-level phase decisions. No stack, runtime helpers or hardware writes. */
#define BYTE(a) (*(volatile unsigned char*)(a))
#define HULL ((volatile unsigned char*)0xAC00u)
#define PHASE_LO BYTE(0x008Cu)
/* CORRIDOR_PHASE_LO is exported by main as corridor_phase; checked by build. */
#define PHASE_HI BYTE(0x85EFu)
#define STATE BYTE(0x4EA5u)
#pragma bss-name ("L2")
unsigned char l2_module;
unsigned char l2_i,l2_count,l2_at,l2_until,l2_tag;
#define EXT ((volatile unsigned char*)0xAD00u)
#define SPANS ((volatile unsigned char*)0xAD1Cu)
#define LOOKUP ((volatile unsigned char*)0xAD80u)
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
    for(l2_i=0u;l2_i<120u;++l2_i) LOOKUP[l2_i]=0u;
    l2_i=(unsigned char)(BYTE(0x80F6u)<<1);
    l2_count=((volatile unsigned char*)0xAD09u)[l2_i];
    l2_i=((volatile unsigned char*)0xAD08u)[l2_i];
    while(l2_count!=0u) {
        l2_at=SPANS[l2_i];
        l2_until=((volatile unsigned char*)0xAD1Du)[l2_i];
        l2_tag=((volatile unsigned char*)0xAD1Eu)[l2_i];
        while(l2_at<l2_until) { ++l2_tag; LOOKUP[l2_at]=l2_tag; ++l2_at; }
        l2_i+=6u; --l2_count;
    }
}
