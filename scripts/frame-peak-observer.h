/* Diagnostic host-only attribution. No guest writes. Included after trace header.
 * Exclusive PC costs: opcode execution uses Atari800's own CPU-position delta;
 * wall stalls/interrupt-entry time are charged to the preceding instruction.
 * Reused from the capital-content attribution observer. Keep every >31000
 * frame and successive capital peaks. The standard trace remains the timer. */
static FILE *fp_states;
static unsigned char fp_mask[65536];
static int fp_initialized;
static void fp_state(unsigned row) {
 unsigned i;
 uint64_t hash = UINT64_C(14695981039346656037);
 if(!fp_initialized) {
  FILE *mask;
  fp_initialized=1;
  if(!getenv("VS65_FRAME_STATES")) return;
  mask=fopen(getenv("VS65_FRAME_STATE_MASK"),"rb");
  if(!mask || fread(fp_mask,1,65536,mask)!=65536) {fprintf(stderr,"frame state mask missing\n");exit(2);}
  fclose(mask);
  fp_states=fopen(getenv("VS65_FRAME_STATES"),"w");
  if(!fp_states) {perror("frame states");exit(2);}
  fprintf(fp_states,"frame,fnv1a64\n");
 }
 if(!fp_states) return;
 for(i=0;i<65536;++i) if(fp_mask[i]) {hash^=MEMORY_mem[i];hash*=UINT64_C(1099511628211);}
 fprintf(fp_states,"%u,%016llx\n",row,(unsigned long long)hash);
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
