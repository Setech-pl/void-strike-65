/* THROWAWAY fault injector. Only included by this spike's private Atari800.
 * Execute a real NMOS 6502 JMP-to-self; do not advance the host clock.
 * The three overwritten bytes are restored before the original instruction.
 * JMP changes no registers or flags; interrupts/DMA execute normally.
 * Suppress only repeated observations of the injected instruction. */
unsigned fo_media_start = 0xffffffffu, fo_media_end = 0xffffffffu;
static unsigned fo_init, fo_pc, fo_busy, fo_remaining, fo_jumps, fo_events;
static unsigned fo_first_row, fo_host, fo_row, fo_mode, fo_repeat;
static unsigned fo_a,fo_x,fo_y,fo_s;
static UBYTE fo_saved[3];
static uint64_t fo_start, fo_deadline, fo_pad_end;
static FILE *fo_log;
static const char *fo_scene;

/* The native fixture sets hardware input at logical-loop entry. Atari800's
 * INPUT_Frame otherwise replaces it with the host keyboard at scanline 0.
 * A real held joystick does not release when a slow loop crosses that line.
 * Hold ONLY the last scripted hardware input; game state is not patched. */
void fo_hold_input(void)
{
 if(fo_log && dftrace_initialised && MEMORY_mem[dftrace_game_state]==6u)
  dftrace_set_input(dftrace_input_stick,dftrace_input_trigger);
}

static int fo_observe(unsigned pc,unsigned a,unsigned x,unsigned y,unsigned s)
{
 uint64_t now=ANTIC_CPU_CLOCK;
 unsigned host=(unsigned)Atari800_nframes;
 if(!fo_init) {
  const char *out=getenv("VS65_OVERRUN_EVENTS");
  fo_init=1;
  if(!out)return 1;
  fo_scene=getenv("VS65_OVERRUN_SCENE");
  fo_mode=atoi(getenv("VS65_OVERRUN_FORCED"));
  fo_repeat=atoi(getenv("VS65_OVERRUN_REPEAT"));
  fo_log=fopen(out,"w");if(!fo_log){perror("overrun log");exit(2);}
 }
 if(!fo_log)return 1;
 if(fo_media_end!=0xffffffffu && host>=fo_media_end+4u &&
    pc==dftrace_pc_active && !fo_busy) {
  if(dftrace_count && !dftrace_frames[dftrace_count-1u].next_start_clock) {
   dftrace_frames[dftrace_count-1u].next_start_clock=now;
   dftrace_frames[dftrace_count-1u].next_start_host_frame=host;
  }
  dftrace_write();fflush(NULL);exit(0);
 }
 if(fo_busy && pc==fo_pc) {
  ++fo_jumps;
  if(fo_mode && now<fo_deadline)return 0;
  if(fo_pad_end==0u) {fo_pad_end=now;fo_remaining=500u;return 0;}
  if(--fo_remaining)return 0;
  memcpy(&MEMORY_mem[fo_pc],fo_saved,3);
  if(a!=fo_a||x!=fo_x||y!=fo_y||s!=fo_s) {
   fprintf(stderr,"fault injector changed A/X/Y/S\n");exit(2);
  }
  fprintf(fo_log,"{\"event\":\"injection\",\"row\":%u,\"host\":%u,\"pc\":%u,\"start\":%llu,\"deadline\":%llu,\"pad_end\":%llu,\"end\":%llu,\"jmps\":%u,\"cpu_cycles\":%u,\"extra_cpu_cycles\":1500,\"wall_cycles\":%llu,\"restored\":true}\n",
   fo_row,fo_host,fo_pc,(unsigned long long)fo_start,(unsigned long long)fo_deadline,
   (unsigned long long)fo_pad_end,(unsigned long long)now,fo_jumps,fo_jumps*3u,
   (unsigned long long)(now-fo_start));fflush(fo_log);
  fo_busy=0;++fo_events;
  return 1;
 }
 if(fo_busy||!dftrace_active)return 1;
 {
  unsigned target=dftrace_pc_profile[!strcmp(fo_scene,"hud-music")?20:19];
  int fallback=0;
  if(fo_repeat && fo_media_start!=0xffffffffu &&
     host==fo_media_start+25u*(fo_events+1u) &&
     getenv("VS65_OVERRUN_FALLBACK_WAIT")) {
   unsigned wait=(unsigned)strtoul(getenv("VS65_OVERRUN_FALLBACK_WAIT"),NULL,0);
   fallback=pc>=wait && pc<wait+11u && dftrace_current.profile_next>=20u;
  }
  if(pc!=target&&!fallback)return 1;
 }
 if(fo_media_start==0xffffffffu) {
  unsigned state=MEMORY_mem[dftrace_sector_state];
  int boss=dftrace_boss_active();
  int eligible= !strcmp(fo_scene,"boss") ? boss&&MEMORY_mem[dftrace_boss_phase]==0u :
   !strcmp(fo_scene,"capital") ? !boss&&state<7u&&dftrace_current.corridor_phase>=100u :
   !boss&&state==7u&&dftrace_current.live_heavy_formation!=0u;
  if(!eligible)return 1;
  fo_media_start=host+1u;fo_media_end=fo_media_start+575u;
  fo_first_row=dftrace_count;
  fprintf(fo_log,"{\"event\":\"window\",\"host\":%u,\"end_host\":%u,\"first_row\":%u,\"scene\":\"%s\",\"forced\":%u,\"repeat\":%u}\n",
   fo_media_start,fo_media_end,fo_first_row,fo_scene,fo_mode,fo_repeat);fflush(fo_log);
 }
 if(host<fo_media_start+25u||host>fo_media_start+500u)return 1;
 if(!fo_repeat&&fo_events)return 1;
 if(fo_repeat&&host!=fo_media_start+25u*(fo_events+1u))return 1;
 if(fo_mode==2u)return 1; /* matched control, captures only */
 /* The HUD/music single must land on an actual music-row advance. Repeated
  * injections retain the owner's 25-physical-frame cadence (music is /6). */
 if(getenv("VS65_OVERRUN_MUSIC_ROW") &&
    MEMORY_mem[strtoul(getenv("VS65_OVERRUN_MUSIC_ROW"),NULL,0)]!=1u)return 1;
 fo_pc=pc;fo_start=now;fo_host=host;fo_row=dftrace_count;
 fo_a=a;fo_x=x;fo_y=y;fo_s=s;
 memcpy(fo_saved,&MEMORY_mem[pc],3);
 MEMORY_mem[pc]=0x4c;MEMORY_mem[pc+1u]=(UBYTE)pc;MEMORY_mem[pc+2u]=(UBYTE)(pc>>8);
 fo_deadline=0u;
 if(fo_mode) {
  /* OPEN: the end of the $77 publication window. Capital/boss/audio:
   * the next master-DLI token, one physical PAL frame after this start. */
  if(!strcmp(fo_scene,"space")) {
   fo_deadline=dftrace_current.start_clock-
     dftrace_current.start_y*114u-dftrace_current.start_x+240u*114u;
   while(fo_deadline<=dftrace_current.start_clock)fo_deadline+=35568u;
  } else fo_deadline=dftrace_current.start_clock+35568u;
 }
 fo_busy=1;fo_jumps=0u;fo_remaining=500u;
 fo_pad_end=fo_mode?0u:now;
 return 0;
}
