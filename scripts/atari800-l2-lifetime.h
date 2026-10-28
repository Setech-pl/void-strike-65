/* Diagnostic-only CPU access observer. No guest code/register/RAM writes. */
static FILE *dfl2_file;
static unsigned cc2_loading,cc2_load_host;
static uint64_t cc2_load_clock;
static unsigned dfl2_enabled, dfl2_active, dfl2_pc, dfl2_prev, dfl2_loaded;
static unsigned dfl2_initializing, dfl2_verified, dfl2_fetches, dfl2_reads, dfl2_fights;
static unsigned dfl2_labels[32], dfl2_overlay, dfl2_exit, dfl2_death, dfl2_prev_sp, dfl2_death_installed;
static unsigned dfl2_return_pc[256],dfl2_return_op[256];
static UBYTE dfl2_bmask[65536],dfl2_boss[65536],dfl2_dmask[65536],dfl2_death_image[65536],dfl2_image[1792];

static void dfl2_init(void)
{
    const char *out=getenv("DFTRACE_L2_LIFETIME"), *source=getenv("DFTRACE_L2_OWNERSHIP");
    FILE *f; UBYTE header[64]; unsigned i;
    if(out==NULL)return;
    if(source==NULL || (f=fopen(source,"rb"))==NULL){fprintf(stderr,"L2 lifetime requires ownership images\n");exit(2);}
    if(fread(header,1,64,f)!=64 || fread(dfl2_bmask,1,65536,f)!=65536 ||
       fread(dfl2_boss,1,65536,f)!=65536 || fread(dfl2_dmask,1,65536,f)!=65536 ||
       fread(dfl2_death_image,1,65536,f)!=65536 || fread(dfl2_image,1,1792,f)!=1792){fprintf(stderr,"L2 ownership file truncated\n");exit(2);}
    fclose(f);for(i=0;i<32;++i)dfl2_labels[i]=header[2*i]|((unsigned)header[2*i+1]<<8);
    dfl2_file=fopen(out,"w");if(dfl2_file==NULL){perror("L2 lifetime");exit(2);}dfl2_enabled=1;
    fprintf(dfl2_file,"{\"event\":\"observer\",\"coverage\":\"all CPU fetches and byte/word data reads; every source address\",\"diagnostic_only\":true,\"guest_code_bytes\":0,\"guest_state_writes\":0}\n");
}
static int dfl2_source(unsigned pc, const UBYTE *mask, const UBYTE *image)
{
    unsigned op=MEMORY_mem[pc];
    if(!mask[pc] || image[pc]!=op)return 0;
    /* The installed row DLI increments precisely these two palette operands.
     * Validate their live address against the linked seven-entry arrays. */
    if(op==0xadu&&(pc==dfl2_labels[24]||pc==dfl2_labels[25])) {
        unsigned target=MEMORY_mem[(pc+1u)&65535u]|((unsigned)MEMORY_mem[(pc+2u)&65535u]<<8);
        unsigned base=dfl2_labels[26]+(pc==dfl2_labels[25]?dfl2_labels[27]:0u);
        return target>=base && target<base+dfl2_labels[27];
    }
    /* Compare the addressing operand as well: coincident opcodes do not
     * make modified resident/capital instructions part of an installed image. */
    switch(op) {
    case 0x20:case 0x4c:case 0x6c:
    case 0x0d:case 0x1d:case 0x19:case 0x2d:case 0x3d:case 0x39:
    case 0x4d:case 0x5d:case 0x59:case 0x6d:case 0x7d:case 0x79:
    case 0x8d:case 0x9d:case 0x99:case 0xad:case 0xbd:case 0xb9:
    case 0xcd:case 0xdd:case 0xd9:case 0xed:case 0xfd:case 0xf9:
    case 0xae:case 0xbe:case 0xac:case 0xbc:case 0x2c:case 0xcc:case 0xec:
    case 0xce:case 0xde:case 0xee:case 0xfe:case 0x0e:case 0x1e:
    case 0x2e:case 0x3e:case 0x4e:case 0x5e:case 0x6e:case 0x7e:case 0x8c:case 0x8e:
        return MEMORY_mem[(pc+1u)&65535u]==image[(pc+1u)&65535u] &&
            MEMORY_mem[(pc+2u)&65535u]==image[(pc+2u)&65535u];
    case 0x01:case 0x11:case 0x21:case 0x31:case 0x41:case 0x51:case 0x61:case 0x71:
    case 0x81:case 0x91:case 0xa1:case 0xb1:case 0xc1:case 0xd1:case 0xe1:case 0xf1:
        return MEMORY_mem[(pc+1u)&65535u]==image[(pc+1u)&65535u];
    }

    return 1;
}
static int dfl2_installed_source(unsigned pc)
{
    return dfl2_overlay && (dfl2_source(pc,dfl2_bmask,dfl2_boss)||dfl2_source(pc,dfl2_dmask,dfl2_death_image));
}
static void dfl2_fail(const char *kind,unsigned address,unsigned source)
{
    fprintf(dfl2_file,"{\"event\":\"stale_access\",\"kind\":\"%s\",\"host\":%u,\"pc\":%u,\"address\":%u,\"previous\":%u,\"valid\":%u}\n",
        kind,(unsigned)Atari800_nframes,source,address,dfl2_prev,MEMORY_mem[0x86b3]);fflush(dfl2_file);exit(2);
}
static void dftrace_l2_access(unsigned address)
{
    if(!dfl2_enabled||!dfl2_active||address<0x1900u||address>=0x2000u)return;
    ++dfl2_reads;
    if(dfl2_labels[8] && MEMORY_mem[0x86b3] && dfl2_verified)return;
    if(dfl2_initializing && dfl2_pc>=0x1900u&&dfl2_pc<0x2000u &&
       MEMORY_mem[dfl2_pc]==dfl2_image[dfl2_pc-0x1900u])return;
    /* The four linked death copy sites are patched from $FFFF,Y. Only the
     * installed death image may use their live bases, and only its wing buffer
     * is a legal target in this interval (right edge may bias base by -64). */
    if(dfl2_overlay&&dfl2_death_installed&&MEMORY_mem[dfl2_pc]==0xb9u){
        unsigned i,base=MEMORY_mem[(dfl2_pc+1u)&65535u]|((unsigned)MEMORY_mem[(dfl2_pc+2u)&65535u]<<8);
        for(i=28u;i<32u;++i)if(dfl2_pc==dfl2_labels[i]&&base>=0x1dc0u&&base<0x2000u&&address>=0x1e00u)return;
    }
    if(dfl2_installed_source(dfl2_pc))return;
    dfl2_fail("read",address,dfl2_pc);
}
static void dftrace_l2_lifetime(unsigned pc,unsigned x,unsigned sp)
{
    static unsigned initialized;
    unsigned i,valid=0,returning=0;
    if(!initialized){initialized=1;dfl2_init();}if(!dfl2_enabled)return;
    dfl2_pc=pc;valid=dfl2_labels[8]?MEMORY_mem[0x86b3]:0;
    if(pc==dfl2_labels[1]){dfl2_active=0;dfl2_verified=0;dfl2_initializing=0;dfl2_loaded=0;dfl2_overlay=0;dfl2_death_installed=0;dfl2_exit=0;memset(dfl2_return_op,0,sizeof(dfl2_return_op));
        fprintf(dfl2_file,"{\"event\":\"cold_or_reset_start\",\"host\":%u}\n",(unsigned)Atari800_nframes);}
    if(pc==dfl2_labels[0]){
        if(dfl2_labels[8] && (valid || MEMORY_mem[0x86b4] || MEMORY_mem[0x5ef0]!=0x14 || MEMORY_mem[0x5ef1]!=0x31))dfl2_fail("reset_state",0x86b3,pc);
        dfl2_active=1;fprintf(dfl2_file,"{\"event\":\"boot_ready_disarmed\",\"host\":%u}\n",(unsigned)Atari800_nframes);}
    if(dfl2_active&&pc==dftrace_pc_boss_enter&&dftrace_pc_boss_enter){dfl2_exit=1;dfl2_overlay=1;dfl2_death_installed=0;
        fprintf(dfl2_file,"{\"event\":\"boss_enter\",\"host\":%u}\n",(unsigned)Atari800_nframes);}
    for(i=2;i<=4;++i)if(dfl2_active&&pc==dfl2_labels[i]){dfl2_exit=i;
        fprintf(dfl2_file,"{\"event\":\"exit\",\"path\":%u,\"host\":%u}\n",i,(unsigned)Atari800_nframes);}
    if(dfl2_active&&(pc==dfl2_labels[5] || pc==0xa006u)){
        if(dfl2_exit>=2u)dfl2_overlay=0;
        if(dfl2_exit&&dfl2_labels[8]&&valid)dfl2_fail("exit_still_valid",0x86b3,pc);
        if(x==11u){dfl2_overlay=0;dfl2_loaded=1;dfl2_verified=0;dfl2_initializing=0;
            fprintf(dfl2_file,"{\"event\":\"l2_reload_begin\",\"host\":%u}\n",(unsigned)Atari800_nframes);}
        if(x==12u) {cc2_loading=1;cc2_load_host=(unsigned)Atari800_nframes;cc2_load_clock=ANTIC_CPU_CLOCK;}
        dfl2_exit=0;
    }
    if(dfl2_labels[8] && pc==0x1900u && dfl2_loaded && !valid){
        if(memcmp(&MEMORY_mem[0x1900],dfl2_image,1792)!=0)dfl2_fail("partial_l2_execution",pc,pc);
        dfl2_initializing=1;dfl2_verified=1;dfl2_loaded=0;
        fprintf(dfl2_file,"{\"event\":\"checked_l2_init\",\"host\":%u}\n",(unsigned)Atari800_nframes);
    }
    if(valid && cc2_loading) {
        fprintf(dfl2_file,"{\"event\":\"content_loaded\",\"host_frames\":%u,\"wall_cycles\":%llu}\n",
            (unsigned)Atari800_nframes-cc2_load_host,(unsigned long long)(ANTIC_CPU_CLOCK-cc2_load_clock));
        cc2_loading=0;
    }
    if(valid)dfl2_initializing=0;
    if(dfl2_overlay&&pc==0x1000u&&memcmp(&MEMORY_mem[0x1000u],&dfl2_death_image[0x1000u],16u)==0)dfl2_death_installed=1;
    /* Prove resident RTS/RTI returns into slot D from the saved stack edge. */
    if(dfl2_active && dfl2_prev>=0x1900u&&dfl2_prev<0x2000u && (pc<0x1900u||pc>=0x2000u)) {
        unsigned pushed=(dfl2_prev_sp-sp)&255u;
        if(pushed==2u&&MEMORY_mem[dfl2_prev]==0x20u){dfl2_return_pc[sp]=(dfl2_prev+3u)&65535u;dfl2_return_op[sp]=0x60u;}
        if(pushed==3u){unsigned target=MEMORY_mem[0x100u+((sp+2u)&255u)]|((unsigned)MEMORY_mem[0x100u+((sp+3u)&255u)]<<8);
            if(target>=0x1900u&&target<0x2000u){dfl2_return_pc[sp]=target;dfl2_return_op[sp]=0x40u;}}
    }
    if(dfl2_return_op[dfl2_prev_sp] && MEMORY_mem[dfl2_prev]==dfl2_return_op[dfl2_prev_sp] && pc==dfl2_return_pc[dfl2_prev_sp]){
        returning=1;dfl2_return_op[dfl2_prev_sp]=0;
    }
    if(dfl2_active && pc>=0x1900u&&pc<0x2000u){
        ++dfl2_fetches;
        if(valid&&dfl2_verified){if(MEMORY_mem[pc]!=dfl2_image[pc-0x1900u])dfl2_fail("foreign_l2_opcode",pc,pc);}
        else if(dfl2_initializing){if(MEMORY_mem[pc]!=dfl2_image[pc-0x1900u])dfl2_fail("foreign_init_opcode",pc,pc);}
        else if(!dfl2_installed_source(pc) || (!dfl2_installed_source(dfl2_prev)&&!returning))dfl2_fail("fetch",pc,dfl2_prev);
    }
    if(dfl2_active&&pc==dfl2_labels[9])fprintf(dfl2_file,"{\"event\":\"game_over\",\"host\":%u}\n",(unsigned)Atari800_nframes);
    if(dfl2_active&&pc==dfl2_labels[6]){
        if(dfl2_labels[8]&&MEMORY_mem[dfl2_labels[21]]<7u&&!valid)dfl2_fail("respawn_invalid",0x86b3,pc);
        fprintf(dfl2_file,"{\"event\":\"respawn\",\"host\":%u,\"valid\":%u}\n",(unsigned)Atari800_nframes,valid);
    }
    if(pc==dfl2_labels[7]){
        if(MEMORY_mem[dfl2_labels[21]]<7u&&MEMORY_mem[dfl2_labels[22]]==1u&&!dfl2_death){
            dfl2_death=1;if(!valid)dfl2_fail("capital_death_invalid",0x86b3,pc);
            fprintf(dfl2_file,"{\"event\":\"capital_death_valid\",\"host\":%u}\n",(unsigned)Atari800_nframes);}
        if(MEMORY_mem[dfl2_labels[22]]!=1u)dfl2_death=0;
        if(!valid&&dfl2_overlay&&dfl2_active){++dfl2_fights;
            if(dfl2_fights==1u&&getenv("DFTRACE_L2_BOSS_FRAMES"))dftrace_limit=dftrace_count+(unsigned)atoi(getenv("DFTRACE_L2_BOSS_FRAMES"));
            if(dfl2_fights<=5u||dfl2_fights%100u==0u)
              fprintf(dfl2_file,"{\"event\":\"fight_frame\",\"host\":%u,\"number\":%u,\"fetches\":%u,\"data_reads\":%u,\"stale_entries\":0,\"rate_reads\":0}\n",(unsigned)Atari800_nframes,dfl2_fights,dfl2_fetches,dfl2_reads);}
    }
    dfl2_prev=pc;dfl2_prev_sp=sp;fflush(dfl2_file);
}
/* Definitions precede CPU-only macro overrides: observer's own reads recurse nowhere. */
static UBYTE dfl2_get_direct(unsigned a){UBYTE v=MEMORY_dGetByte(a);dftrace_l2_access(a);return v;}
static UBYTE dfl2_get_byte(unsigned a){UBYTE v=MEMORY_GetByte(a);dftrace_l2_access(a);return v;}
static UWORD dfl2_get_word(unsigned a){UWORD v=MEMORY_dGetWord(a);dftrace_l2_access(a);dftrace_l2_access((a+1u)&65535u);return v;}
static UWORD dfl2_get_aligned(unsigned a){UWORD v=MEMORY_dGetWordAligned(a);dftrace_l2_access(a);dftrace_l2_access((a+1u)&65535u);return v;}
