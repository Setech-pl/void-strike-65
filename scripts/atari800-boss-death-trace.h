/* Focused observer only. Appended by measure-boss-death.mjs; no guest opcode
 * patching. Uses the existing trace header's clock/input helpers. */
static const int cycles[256]; /* cpu.c defines the documented opcode base costs. */
static void db_picture(unsigned frame)
{
    if (getenv("DFDB_PHOTOS") && strcmp(getenv("DFDB_PHOTOS"),"0")==0) return;
    char name[1024]; int vx1=Screen_visible_x1,vx2=Screen_visible_x2;
    int vy1=Screen_visible_y1,vy2=Screen_visible_y2;
#ifdef SUPPORTS_CHANGE_VIDEOMODE
    unsigned sl=VIDEOMODE_src_offset_left,sw=VIDEOMODE_src_width;
    VIDEOMODE_src_offset_left=0; VIDEOMODE_src_width=Screen_WIDTH;
#endif
    Screen_visible_x1=0; Screen_visible_x2=Screen_WIDTH;
    Screen_visible_y1=0; Screen_visible_y2=Screen_HEIGHT;
    snprintf(name,sizeof(name),"%s-f%u.png",getenv("DFDB_OUTPUT"),frame);
    Screen_SaveScreenshot(name,0);
    Screen_visible_x1=vx1;Screen_visible_x2=vx2;Screen_visible_y1=vy1;Screen_visible_y2=vy2;
#ifdef SUPPORTS_CHANGE_VIDEOMODE
    VIDEOMODE_src_offset_left=sl;VIDEOMODE_src_width=sw;
#endif
}
static void DFTrace_Observe(unsigned pc, unsigned a, unsigned x, unsigned y, unsigned s)
{
    static unsigned v_READ_RING,v_FAST_HUD,v_BOSS_DLI,v_CLOCK,v_DEVICE,v_DIR,v_DLI,v_DLI_POS,v_END,v_ENGINE,v_ENTER,v_FAILURE,v_FENCE,v_FRAME,v_HANDOFF,v_LAST,v_MAIN,v_MENU,v_N,v_NO_DEVICE,v_PHASE,v_POSITION,v_POSSTATE,v_PRESS,v_READ,v_READ_SECTOR,v_RELEASE,v_RESUME,v_BAND_END,v_START,v_STEP_TIMER,v_STROBE,v_SUMMARY,v_WIRE;
    static int init, ready, forced, entered, finished, summary, starts, menu, read_photo;
    static unsigned host, last_host, dli_count, frame_count, read_host, misses, hud_errors, ship_errors, dli_errors;
    static unsigned ship_x, ship_size, ship_colour;
    static unsigned read_sample_host, read_checks, read_errors;
    static unsigned attempts, sio_failures, read_dlis, read_dli_errors, strobe_frames;
    static unsigned char separator[8 * Screen_WIDTH];
    static unsigned dli_return_pc, dli_prev_pc, dli_prev_op, dli_phase_now, dli_cpu, dli_cpu_peak[3];
    static unsigned long long dli_begin_clock, dli_wall_peak, nmi_dispatch_clock, dli_block_begin, dli_block_peak;
    static unsigned char read_bottom[32 * Screen_WIDTH];
    static unsigned pc_main, pc_resume, boss_dli_pc, pc_enter, pc_read, pc_engine;
    static unsigned pc_frame, pc_fence, pc_end, pc_handoff, pc_summary, pc_start;
    static unsigned pc_failure, phase, n, last_module, death_dli_pc, score_clock;
    static unsigned long long entry_clock, read_clock, start_clock, max_pre, max_wall, min_margin;
    static unsigned char ship[256], hud[40];
    static FILE *out, *strips;
    static unsigned rates[3], rate_addr[3], crown_dir_addr, crown_dir_value, shake_addr;
    static int shake_force;
    static unsigned rng_saved, rng_errors, strip_count, strip_host, restore_errors, active_list, top_dli;
    static unsigned wanted_strip;
    unsigned long long clock;
    if (!init) {
        v_READ_RING=dftrace_env_u("DFDB_READ_RING");
        v_FAST_HUD=dftrace_env_u("DFDB_FAST_HUD");
        v_BOSS_DLI=dftrace_env_u("DFDB_BOSS_DLI");
        v_CLOCK=dftrace_env_u("DFDB_CLOCK");
        v_DEVICE=dftrace_env_u("DFDB_DEVICE");
        v_DIR=dftrace_env_u("DFDB_DIR");
        v_DLI=dftrace_env_u("DFDB_DLI");
        v_DLI_POS=dftrace_env_u("DFDB_DLI_POS");
        v_END=dftrace_env_u("DFDB_END");
        v_ENGINE=dftrace_env_u("DFDB_ENGINE");
        v_ENTER=dftrace_env_u("DFDB_ENTER");
        v_FAILURE=dftrace_env_u("DFDB_FAILURE");
        v_FENCE=dftrace_env_u("DFDB_FENCE");
        v_FRAME=dftrace_env_u("DFDB_FRAME");
        v_HANDOFF=dftrace_env_u("DFDB_HANDOFF");
        v_LAST=dftrace_env_u("DFDB_LAST");
        v_MAIN=dftrace_env_u("DFDB_MAIN");
        v_MENU=dftrace_env_u("DFDB_MENU");
        v_N=dftrace_env_u("DFDB_N");
        v_NO_DEVICE=dftrace_env_u("DFDB_NO_DEVICE");
        v_PHASE=dftrace_env_u("DFDB_PHASE");
        v_POSITION=dftrace_env_u("DFDB_POSITION");
        v_POSSTATE=dftrace_env_u("DFDB_POSSTATE");
        v_PRESS=dftrace_env_u("DFDB_PRESS");
        v_READ=dftrace_env_u("DFDB_READ");
        v_READ_SECTOR=dftrace_env_u("DFDB_READ_SECTOR");
        v_RELEASE=dftrace_env_u("DFDB_RELEASE");
        v_RESUME=dftrace_env_u("DFDB_RESUME");
        v_BAND_END=dftrace_env_u("DFDB_BAND_END");
        v_START=dftrace_env_u("DFDB_START");
        v_STEP_TIMER=dftrace_env_u("DFDB_STEP_TIMER");
        v_STROBE=dftrace_env_u("DFDB_STROBE");
        v_SUMMARY=dftrace_env_u("DFDB_SUMMARY");
        v_WIRE=dftrace_env_u("DFDB_WIRE");

        dftrace_game_state=dftrace_env_u("DFTRACE_GAME_STATE");
        dftrace_pc_frontend_poll=dftrace_env_u("DFTRACE_PC_FRONTEND_POLL");
        dftrace_frontend_selection=dftrace_env_u("DFTRACE_FRONTEND_SELECTION");
        dftrace_frontend_input_armed=dftrace_env_u("DFTRACE_FRONTEND_INPUT_ARMED");
        dftrace_difficulty_setting=dftrace_env_u("DFTRACE_DIFFICULTY_SETTING");
        dftrace_difficulty=1; dftrace_frontend_delay=300;
        pc_main=v_MAIN; pc_resume=v_RESUME; boss_dli_pc=v_BOSS_DLI;
        pc_enter=v_ENTER; pc_read=v_READ; pc_engine=v_ENGINE;
        pc_frame=v_FRAME; pc_fence=v_FENCE; pc_end=v_END;
        pc_handoff=v_HANDOFF; pc_summary=v_SUMMARY; pc_start=v_START;
        pc_failure=v_FAILURE; phase=v_PHASE; n=v_N;
        last_module=v_LAST; death_dli_pc=v_DLI; score_clock=v_CLOCK;
        out=fopen(getenv("DFDB_OUTPUT"),"w"); if (!out) exit(2);
        min_margin=999999u;
        top_dli=dftrace_env_u("DFDB_TOP_DLI");
        active_list=dftrace_env_u("DFDB_ACTIVE_LIST");
        rate_addr[0]=dftrace_env_u("DFDB_RATE_L");rate_addr[1]=dftrace_env_u("DFDB_RATE_R");rate_addr[2]=dftrace_env_u("DFDB_RATE_C");
        crown_dir_addr=dftrace_env_u("DFDB_CROWN_DIR_ADDR");crown_dir_value=dftrace_env_u("DFDB_CROWN_DIR");
        shake_addr=dftrace_env_u("DFDB_SHAKE_ADDR");
        shake_force=getenv("DFDB_SHAKE_FORCE")?atoi(getenv("DFDB_SHAKE_FORCE")):-1;
        const char *rr=getenv("DFDB_RATES");
        if(rr && strlen(rr)==3u)for(unsigned i=0;i<3u;i++)rates[i]=(unsigned)(rr[i]-'0');
        if(getenv("DFDB_STRIPS"))strips=fopen(getenv("DFDB_STRIPS"),"wb");
        init=1;
    }
    host=(unsigned)Atari800_nframes;
    clock=dftrace_clock();
    if(dli_begin_clock) {
        dli_cpu+=cycles[dli_prev_op];
        if((dli_prev_op&31u)==16u && pc!=((dli_prev_pc+2u)&65535u)) {
            dli_cpu++;
            if(((dli_prev_pc+2u)&0xFF00u)!=(pc&0xFF00u)) dli_cpu++;
        }
    }
    if (host>3000u) { fprintf(out,"{\"failure\":\"host timeout\",\"pc\":%u}\n",pc); fclose(out); exit(2); }
    if (pc==dftrace_pc_frontend_poll) dftrace_set_frontend_input();
    if (pc==v_RELEASE) dftrace_set_input(15u,1u);
    if (pc==v_PRESS) dftrace_set_input(15u,0u);
    if (pc==pc_enter && !forced) entry_clock=clock;
    if (forced && pc==pc_failure) {
        fprintf(out,"{\"failure\":\"disk failure\",\"status\":%u}\n",a); fclose(out); exit(2);
    }
    if (pc==pc_start) {
        starts++;
        if (summary) {
            if(shake_addr)fprintf(out,"{\"stripFrames\":%u,\"rngErrors\":%u,\"restoredVscrol\":%u,\"restoreErrors\":%u}\n",strip_count,rng_errors,(unsigned)ANTIC_VSCROL,restore_errors);
            fprintf(out,"{\"restartedLevel\":%u,\"summary\":true,\"frames\":%u,\"misses\":%u,\"hudErrors\":%u,\"shipErrors\":%u,\"dliErrors\":%u,\"returnedToMenu\":%u,\"readImageChecks\":%u,\"readImageErrors\":%u,\"readAttempts\":%u,\"sioFailures\":%u,\"readDlis\":%u,\"readDliErrors\":%u,\"strobeFrames\":%u,\"strobeDliWallPeak\":%llu,\"strobeCpuTop\":%u,\"strobeCpuRing\":%u,\"strobeCpuHud\":%u,\"strobeBlockPeak\":%llu}\n",
                MEMORY_mem[0xA603u],frame_count,misses,hud_errors,ship_errors,dli_errors,menu,read_checks,read_errors,attempts,sio_failures,read_dlis,read_dli_errors,strobe_frames,dli_wall_peak,dli_cpu_peak[0],dli_cpu_peak[1],dli_cpu_peak[2],dli_block_peak);
            fclose(out); exit(0);
        }
    }
    if (pc==pc_main && !forced && MEMORY_mem[pc_resume]==(boss_dli_pc&255u) &&
        MEMORY_mem[pc_resume+5u]==(boss_dli_pc>>8)) {
        if (!ready) fprintf(out,"{\"entryFrames\":%.3f}\n",(clock-entry_clock)/35568.0);
        if (++ready==6) {
            unsigned r;
            unsigned char cells[512];
            FILE *f=fopen(getenv("DFDB_FIXTURE"),"rb");
            if (!f || fread(cells,1,512,f)!=512) exit(2); fclose(f);
            for(r=0;r<8;r++) memcpy(&MEMORY_mem[r<6 ? 0xA880u+r*64u : 0xAC80u+(r-6u)*64u],cells+r*64u,64u);
            if (dftrace_env_u("DFDB_POSITION_VALUE")<64u) {
                unsigned p=dftrace_env_u("DFDB_POSITION_VALUE");
                /* Leave shown_pos intact: the real below-band DLI must
                 * publish this requested pose into LMS/HSCROL first. */
                MEMORY_mem[v_POSSTATE]=(UBYTE)p;
                MEMORY_mem[v_DLI_POS]=(UBYTE)p;
                MEMORY_mem[v_DIR]=0;MEMORY_mem[v_STEP_TIMER]=255;
            }
            MEMORY_mem[phase]=2; MEMORY_mem[n]=(UBYTE)last_module;
            MEMORY_mem[score_clock]=100; MEMORY_mem[score_clock+1]=0;
            memcpy(separator,(const UBYTE *)Screen_atari+8u*Screen_WIDTH,sizeof(separator));
            memcpy(ship,&MEMORY_mem[0x3C00],256); memcpy(hud,&MEMORY_mem[0x4000],40);
            ship_x=GTIA_HPOSP0;ship_size=GTIA_SIZEP0;ship_colour=GTIA_COLPM0;
            forced=1;
        }
    }
    if (forced && !entered && pc==pc_read && !read_clock) {
        read_clock=clock;read_host=host;
    }
    if(read_clock && !entered) {
        if(pc==(MEMORY_mem[0xFFFAu]|(MEMORY_mem[0xFFFBu]<<8))) nmi_dispatch_clock=clock;
        if(pc==v_READ_SECTOR) attempts++;
        if(pc==v_WIRE || pc==v_NO_DEVICE || pc==v_DEVICE) sio_failures++;
        if(v_STROBE && ((pc==v_STROBE && MEMORY_mem[0x92u]==0u) || pc==v_READ_RING || pc==v_FAST_HUD)) {
            unsigned phase_now=MEMORY_mem[0x92u];
            unsigned expected=phase_now==0u ? 15u : phase_now==2u ? 239u : v_BAND_END;
            dli_return_pc=MEMORY_mem[0x100u+((s+2u)&255u)] | (MEMORY_mem[0x100u+((s+3u)&255u)]<<8);
            dli_block_begin=nmi_dispatch_clock;
            dli_begin_clock=clock; dli_phase_now=phase_now; dli_cpu=0;
            read_dlis++;
            if(phase_now==0u) strobe_frames++;
            if((unsigned)ANTIC_ypos<expected || (unsigned)ANTIC_ypos>expected+1u) read_dli_errors++;
            if(ANTIC_NMIEN!=0x80u) { read_dli_errors++; fprintf(out,"{\"badNMIEN\":%u}\n",ANTIC_NMIEN); }
        }
    }
    if(dli_begin_clock && pc==dli_return_pc) {
        if(clock-dli_begin_clock>dli_wall_peak) dli_wall_peak=clock-dli_begin_clock;
        if(dli_phase_now<3u && dli_cpu>dli_cpu_peak[dli_phase_now]) dli_cpu_peak[dli_phase_now]=dli_cpu;
        if(dli_block_begin && clock-dli_block_begin+7u>dli_block_peak) dli_block_peak=clock-dli_block_begin+7u;
        dli_begin_clock=0;
    }
    if(dli_begin_clock && pc!=dli_return_pc && ((pc>=0x1000u && pc<0x2000u) || (pc>=0x4C00u && pc<0x4E40u) || (pc>=0x5200u && pc<0x5400u))) read_dli_errors++;
    if (read_clock && !entered && host>=read_host+2u && host!=read_sample_host && ANTIC_ypos>=248) {
        const UBYTE *bottom=(const UBYTE *)Screen_atari+208u*Screen_WIDTH;
        unsigned i, hud_pixels=0, ship_pixels=0;
        read_sample_host=host;
        for(i=24u*Screen_WIDTH;i<32u*Screen_WIDTH;i++) if(bottom[i]) hud_pixels++;
        for(i=0;i<24u*Screen_WIDTH;i++) if(bottom[i]) ship_pixels++;
        unsigned hud_guard=0;
        for(i=32u;i<352u;i++) if(((const UBYTE *)Screen_atari)[232u*Screen_WIDTH+i]) hud_guard++;
        if(!read_checks) memcpy(read_bottom,bottom,sizeof(read_bottom));
        if(hud_guard || !hud_pixels || !ship_pixels || memcmp(read_bottom,bottom,sizeof(read_bottom)) ||
            (v_STROBE && memcmp(separator,(const UBYTE *)Screen_atari+8u*Screen_WIDTH,sizeof(separator))) ||
            memcmp(ship,&MEMORY_mem[0x3C00],256) || memcmp(hud,&MEMORY_mem[0x4000],40) ||
            GTIA_HPOSP0!=ship_x || GTIA_SIZEP0!=ship_size || GTIA_COLPM0!=ship_colour) { read_errors++; if(read_errors<=2u) db_picture(200u+read_errors); for(unsigned yy=0;yy<32u;yy++){ unsigned changed=0; for(unsigned xx=0;xx<Screen_WIDTH;xx++) if(bottom[yy*Screen_WIDTH+xx]!=read_bottom[yy*Screen_WIDTH+xx])changed++; if(changed)fprintf(out,"{\"row\":%u,\"changed\":%u}\n",208u+yy,changed); } fprintf(out,"{\"readPixelsBad\":%u,\"sep\":%u,\"bottom\":%u}\n",host,memcmp(separator,(const UBYTE *)Screen_atari+8u*Screen_WIDTH,sizeof(separator))!=0,memcmp(read_bottom,bottom,sizeof(read_bottom))!=0); }
        read_checks++;
    }
    if (read_clock && !entered && !read_photo && host>=read_host+2u && ANTIC_ypos>=248) {
        db_picture(100); read_photo=1;
    }
    if (forced && !entered && pc==pc_engine) {
        fprintf(out,"{\"readPauseFrames\":%.3f}\n",(clock-read_clock)/35568.0);
        db_picture(0);
        rng_saved=MEMORY_mem[0x8006u];
        entered=1;
    }
    if (finished && pc==v_MENU) menu=1;
    if (entered && (pc==death_dli_pc || pc==top_dli)) {
        unsigned index=MEMORY_mem[0x4D05u];
        unsigned expected=index==128u ? 239u : 15u+index*8u;
        if(shake_addr && index>=2u && index<=9u)expected-=ANTIC_VSCROL;
        dli_count++;
        if ((unsigned)ANTIC_ypos!=expected) dli_errors++;
    }
    if (entered && pc==pc_frame) {
        if (!frame_count) fprintf(out,"{\"pauseHostFrames\":%u,\"pauseClockFrames\":%.3f}\n",host-read_host,(clock-read_clock)/35568.0);
        if (last_host && host-last_host!=1) misses++;
        last_host=host; start_clock=clock;
        if(!frame_count && rates[0]) {
            for(unsigned i=0;i<3u;i++)MEMORY_mem[rate_addr[i]]=(UBYTE)rates[i];
            MEMORY_mem[crown_dir_addr]=(UBYTE)crown_dir_value;
        }
    }
    if (entered && pc==pc_fence) {
        if(shake_addr && shake_force>=0) {
            unsigned f=frame_count+1u;
            MEMORY_mem[shake_addr]=(UBYTE)(shake_force==0?0u:f<80u?3u:f<112u?2u:f<144u?1u:f==156u?3u:0u);
        }
        unsigned long long pre=clock-start_clock;
        unsigned long long margin=ANTIC_ypos<240 ?
            (240u-(unsigned)ANTIC_ypos)*114u-(unsigned)ANTIC_XPOS : 0u;
        if (pre>max_pre) max_pre=pre;
        if (margin<min_margin) min_margin=margin;
        if (margin<500u) misses++;
    }
    if (entered && pc==pc_end) {
        unsigned long long wall=clock-start_clock;
        if (wall>max_wall) max_wall=wall;
        frame_count++;
        wanted_strip=frame_count;
        if (memcmp(ship,&MEMORY_mem[0x3C00],256) || GTIA_HPOSP0!=ship_x ||
            GTIA_SIZEP0!=ship_size || GTIA_COLPM0!=ship_colour) ship_errors++;
        if (memcmp(hud,&MEMORY_mem[0x4000],40)) hud_errors++;
        for(unsigned i=32u;i<352u;i++) if(((const UBYTE *)Screen_atari)[232u*Screen_WIDTH+i]) {hud_errors++;break;}
        if (frame_count==1 || frame_count==12 || frame_count==40 || frame_count==80 || frame_count==120 || frame_count==160) {
            db_picture(frame_count);
        }
    }
    if (entered && pc==pc_handoff && !finished) {
        if(shake_addr) {
            if(ANTIC_VSCROL)restore_errors++;
            for(unsigned i=0;i<84u;i+=3u)if(MEMORY_mem[active_list+i]&32u)restore_errors++;
        }
        fprintf(out,"{\"peakPreFence\":%llu,\"peakDmaOn\":%llu,\"minimumFence\":%llu,\"dliCount\":%u}\n",max_pre,max_wall,min_margin,dli_count);
        finished=1;
    }
    if (finished && pc==pc_summary) {
        summary=1;
        if(shake_addr && MEMORY_mem[0x8006u]!=rng_saved)rng_errors++;
    }
    if(strips && wanted_strip>strip_count && (unsigned)ANTIC_ypos>=248u && host!=strip_host) {
        const UBYTE *pixels=(const UBYTE *)Screen_atari;
        fwrite(pixels+8u*Screen_WIDTH,1,8u*Screen_WIDTH,strips);
        fwrite(pixels+208u*Screen_WIDTH,1,32u*Screen_WIDTH,strips);
        fflush(strips);strip_count++;strip_host=host;
    }
    if(dli_begin_clock) {dli_prev_pc=pc; dli_prev_op=MEMORY_mem[pc];}
    (void)x;(void)y;(void)s;(void)menu;
}
