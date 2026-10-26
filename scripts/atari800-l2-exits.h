/* DIAGNOSTIC ONLY. Physical input for quit/RESET; explicit terminal-state
 * seeds for GAME OVER/level end. These captures are never release evidence. */
static void dfl2_drive_exit(unsigned pc)
{
    static const char *path;static unsigned initialized,stage,host;
    unsigned now=(unsigned)Atari800_nframes,state,phase,rows,local;
    if(!initialized){initialized=1;path=getenv("DFTRACE_L2_EXIT");}
    if(path==NULL||!dfl2_enabled||!dfl2_active||stage==9u)return;
    state=MEMORY_mem[dfl2_labels[10]];
    phase=MEMORY_mem[dftrace_corridor_phase]|((unsigned)MEMORY_mem[dftrace_corridor_phase_hi]<<8);
    rows=MEMORY_mem[0xac00]|((unsigned)MEMORY_mem[0xac01]<<8);
    local=phase-(960u-rows);
    if(stage==0u && pc==dfl2_labels[7] && state==6u && MEMORY_mem[dfl2_labels[21]]<5u &&
       local>=224u && !(MEMORY_mem[dfl2_labels[22]]&1u)){
        fprintf(dfl2_file,"{\"event\":\"exit_fixture\",\"path\":\"%s\",\"local_row\":%u,\"host\":%u,\"diagnostic_only\":true}\n",path,local,now);
        if(strcmp(path,"quit")==0){stage=1u;host=now;}
        else if(strcmp(path,"reset")==0){voidstrike65_warmstart_request=1;stage=9u;}
        else if(strcmp(path,"game-over")==0){
            dftrace_hold_player_lives=0;
            MEMORY_mem[dfl2_labels[22]+1u]=0;MEMORY_mem[dfl2_labels[22]-0x4bu]=1;MEMORY_mem[dfl2_labels[22]]=1;
            stage=9u;
        }else if(strcmp(path,"level-end")==0){MEMORY_mem[0x80fe]|=1u;MEMORY_mem[dfl2_labels[21]]=6u;stage=9u;}
        else{fprintf(stderr,"Unknown L2 exit fixture %s\n",path);exit(2);}
    }
    if(stage==1u){
        INPUT_key_consol=INPUT_CONSOL_NONE;
        if(state==8u){stage=2u;}else if(now<=host+2u)INPUT_key_consol&=~INPUT_CONSOL_OPTION;
    }
    if(stage==2u && pc==dfl2_labels[12]){
        unsigned selected=MEMORY_mem[dfl2_labels[14]],armed=MEMORY_mem[dfl2_labels[13]];
        unsigned target=state==8u?2u:1u;
        INPUT_key_consol=INPUT_CONSOL_NONE;
        if(!armed)dftrace_set_input(15u,1u);
        else if(selected<target)dftrace_set_input(13u,1u);
        else dftrace_set_input(15u,0u);
    }
    if(stage==2u&&state==1u)stage=9u;
}
