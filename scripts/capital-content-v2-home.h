/* Host-only CPU access census. Raw accesses include opcode/operand fetches.
 * No guest writes. Enabled only by CC2_HOME_OUTPUT. */
static FILE *cc2_home;
static unsigned cc2_home_ready;
static void cc2_home_access(unsigned address, unsigned write) {
 const char *file;
 if(!cc2_home_ready){
  cc2_home_ready=1;file=getenv("CC2_HOME_OUTPUT");
  if(file){cc2_home=fopen(file,"w");if(!cc2_home){perror("CC2 home");exit(2);}
   fprintf(cc2_home,"host,pc,address,write,game,sector,boss\n");}
 }
 if(cc2_home && address>=0x1180u && address<=0x18ffu){
  fprintf(cc2_home,"%u,%u,%u,%u,%u,%u,%u\n",(unsigned)Atari800_nframes,dfl2_pc,address,write,
   MEMORY_mem[dfl2_labels[10]],MEMORY_mem[dfl2_labels[21]],dfl2_overlay);
 }
}
static UBYTE cc2_get_direct(unsigned a){cc2_home_access(a,0);return dfl2_get_direct(a);}
static UBYTE cc2_get_byte(unsigned a){cc2_home_access(a,0);return dfl2_get_byte(a);}
static UWORD cc2_get_word(unsigned a){cc2_home_access(a,0);cc2_home_access((a+1)&65535,0);return dfl2_get_word(a);}
static UWORD cc2_get_aligned(unsigned a){cc2_home_access(a,0);cc2_home_access((a+1)&65535,0);return dfl2_get_aligned(a);}
static void cc2_put_direct(unsigned a,UBYTE v){cc2_home_access(a,1);MEMORY_dPutByte(a,v);}
static void cc2_put_byte(unsigned a,UBYTE v){cc2_home_access(a,1);MEMORY_PutByte(a,v);}
#undef MEMORY_dPutByte
#undef MEMORY_PutByte
#define MEMORY_dPutByte(a,v) cc2_put_direct(a,v)
#define MEMORY_PutByte(a,v) cc2_put_byte(a,v)
