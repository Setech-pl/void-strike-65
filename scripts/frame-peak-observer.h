/* Diagnostic host-only attribution. No guest writes. Included after trace header.
 * Exclusive PC costs: opcode execution uses Atari800's own CPU-position delta;
 * wall stalls/interrupt-entry time are charged to the preceding instruction.
 * Reused from the capital-content attribution observer. Keep every >31000
 * frame and successive capital peaks. The standard trace remains the timer. */
#include <zlib.h> /* already linked by Atari800; host-only snapshot evidence */
static FILE *fp_states;
static gzFile fp_snapshots;
static unsigned char fp_mask[65536];
static unsigned char fp_logical[65536],fp_bytes[65536];
static unsigned fp_physical,fp_consumed;
static int fp_extended;
static int fp_initialized;
static void fp_close(void) {if(fp_snapshots)gzclose(fp_snapshots);}
static void fp_state(unsigned row) {
 unsigned i;
 uint64_t hash = UINT64_C(14695981039346656037);
 uint64_t logical = UINT64_C(14695981039346656037);
 unsigned bytes=0;
 if(!fp_initialized) {
  FILE *mask;
  fp_initialized=1;
  if(!getenv("VS65_FRAME_STATES")) return;
  mask=fopen(getenv("VS65_FRAME_STATE_MASK"),"rb");
  if(!mask || fread(fp_mask,1,65536,mask)!=65536) {fprintf(stderr,"frame state mask missing\n");exit(2);}
  fp_extended=getenv("VS65_FRAME_PHYSICAL")!=NULL;
  if(fp_extended) {
   if(fread(fp_logical,1,65536,mask)!=65536){fprintf(stderr,"logical mask missing\n");exit(2);}
   fp_physical=(unsigned)strtoul(getenv("VS65_FRAME_PHYSICAL"),NULL,0);
   fp_consumed=(unsigned)strtoul(getenv("VS65_FRAME_CONSUMED"),NULL,0);
  }
  fclose(mask);
  fp_states=fopen(getenv("VS65_FRAME_STATES"),"w");
  if(!fp_states) {perror("frame states");exit(2);}
  fprintf(fp_states,fp_extended?"frame,fnv1a64,logical_fnv1a64,physical,consumed\n":"frame,fnv1a64\n");
  if(getenv("VS65_FRAME_SNAPSHOTS")) {
   fp_snapshots=gzopen(getenv("VS65_FRAME_SNAPSHOTS"),"wb1");
   if(!fp_snapshots){fprintf(stderr,"snapshot output missing\n");exit(2);}
   atexit(fp_close);
  }
 }
 if(!fp_states) return;
 for(i=0;i<65536;++i) if(fp_mask[i]) {
  unsigned value=MEMORY_mem[i];
  hash^=value;hash*=UINT64_C(1099511628211);
  if(fp_logical[i]){logical^=value;logical*=UINT64_C(1099511628211);}
  fp_bytes[bytes++]=(unsigned char)value;
 }
 fprintf(fp_states,"%u,%016llx",row,(unsigned long long)hash);
 if(fp_extended)fprintf(fp_states,",%016llx,%u,%u",(unsigned long long)logical,
   MEMORY_mem[fp_physical],MEMORY_mem[fp_consumed]);
 fputc('\n',fp_states);
 if(fp_snapshots&&gzwrite(fp_snapshots,fp_bytes,bytes)!=(int)bytes){fprintf(stderr,"snapshot write failed\n");exit(2);}
}
static unsigned long cc_cpu[65536], cc_wall[65536];
static unsigned cc_pc, cc_row, cc_best, cc_state;
static int cc_on, cc_xpos, cc_pending;
static uint64_t cc_clock, cc_start;
static FILE *cc_file;
static void cc_before(unsigned pc) {
 uint64_t now = ANTIC_CPU_CLOCK;
 unsigned i, total;
 if (!cc_file && getenv("VS65_FRAME_PROFILE")) cc_file=fopen(getenv("VS65_FRAME_PROFILE"),"w");
 if (!cc_file) return;
 if (cc_pending) { cc_wall[cc_pc]+=(unsigned long)(now-cc_clock); cc_pending=0; }
 if (cc_on && pc==dftrace_pc_end) {
  fp_state(cc_row);
  total=(unsigned)(now-cc_start);
  if(dftrace_frames[dftrace_count-1u].boss_entry) total=0;
  if(total>31000u || (cc_state<7u && total>cc_best)) {
   if(cc_state<7u) cc_best=total;
   fprintf(cc_file,"frame,%u,%u,%u\n",cc_row,cc_state,total);
   for(i=0;i<65536;i++) if(cc_cpu[i]||cc_wall[i]) fprintf(cc_file,"pc,%u,%lu,%lu\n",i,cc_cpu[i],cc_wall[i]);
   fflush(cc_file);
  }
  cc_on=0;
 }
 if(pc==dftrace_pc_active && dftrace_active) {
  memset(cc_cpu,0,sizeof(cc_cpu)); memset(cc_wall,0,sizeof(cc_wall));
  cc_row=dftrace_count; cc_state=dftrace_current.sector_state;cc_start=now;cc_on=1;
 }
 if(cc_on) {cc_pc=pc;cc_clock=now;cc_xpos=ANTIC_xpos;cc_pending=1;}
}
static void cc_after(void) {
 if(cc_on && cc_pending) cc_cpu[cc_pc]+=(unsigned long)(ANTIC_xpos-cc_xpos);
}
