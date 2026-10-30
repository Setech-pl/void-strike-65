/* One completed ANTIC raster and clock-synchronous POKEY audio per physical
 * frame. No screenshot at logical-loop hooks: that would hide a missed frame.
 * -nosound prevents any host audio callback from consuming this buffer. */
#include "colours.h"
#include "pokeysnd.h"
extern unsigned fo_media_start,fo_media_end;
extern void fo_hold_input(void);
static FILE *fo_rgb,*fo_pcm,*fo_frames;
static unsigned fo_media_init;
static void fo_media_frame(void)
{
 unsigned host=(unsigned)Atari800_nframes,x,y;
 int samples;
 UBYTE rgb[384*240*3];
 if(!getenv("VS65_OVERRUN_EVENTS"))return;
 if(!fo_media_init) {
  fo_media_init=1;
  POKEYSND_Init(POKEYSND_FREQ_17_EXACT,44100,1,POKEYSND_BIT16);
 }
 samples=POKEYSND_UpdateProcessBuffer();
 if(host%500u==0u) {fprintf(stderr,"spike host %u pc %04x state %u nmi %u row %u\n",host,CPU_regPC,MEMORY_mem[0x9a],ANTIC_NMIEN,MEMORY_mem[0x4ff8]);fflush(stderr);}
 if(host<fo_media_start||host>=fo_media_end)return;
 if(!fo_rgb) {
  fo_rgb=fopen(getenv("VS65_OVERRUN_RGB"),"wb");
  fo_pcm=fopen(getenv("VS65_OVERRUN_PCM"),"wb");
  fo_frames=fopen(getenv("VS65_OVERRUN_FRAMES"),"w");
  if(!fo_rgb||!fo_pcm||!fo_frames){perror("overrun media");exit(2);}
  fprintf(fo_frames,"host,samples,dlist,chbase,colpf0,colpf1,colpf2,colpf3,colbk\n");
 }
 for(y=0;y<240u;++y)for(x=0;x<384u;++x) {
  unsigned c=((UBYTE *)Screen_atari)[y*Screen_WIDTH+x],o=(y*384u+x)*3u;
  rgb[o]=Colours_GetR(c);rgb[o+1u]=Colours_GetG(c);rgb[o+2u]=Colours_GetB(c);
 }
 if(fwrite(rgb,1,sizeof(rgb),fo_rgb)!=sizeof(rgb)||
    fwrite(POKEYSND_process_buffer,2,samples,fo_pcm)!=(size_t)samples){perror("media write");exit(2);}
 fprintf(fo_frames,"%u,%d,%u,%u,%u,%u,%u,%u,%u\n",host,samples,ANTIC_dlist,
  ANTIC_CHBASE,GTIA_COLPF0,GTIA_COLPF1,GTIA_COLPF2,GTIA_COLPF3,GTIA_COLBK);
 if(host+1u==fo_media_end){fflush(NULL);fclose(fo_rgb);fclose(fo_pcm);fclose(fo_frames);}
}
