/* Focused observer only. Appended by measure-boss-death.mjs; no guest opcode
 * patching. Uses the existing trace header's clock/input helpers. */
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
    static int init, ready, forced, entered, finished, summary, starts, menu, card_photo;
    static unsigned host, last_host, dli_count, frame_count, read_host, misses, hud_errors, ship_errors, dli_errors;
    static unsigned ship_x, ship_size, ship_colour;
    static unsigned card_host, card_checks, card_errors;
    static unsigned char card_bottom[32 * Screen_WIDTH];
    static unsigned pc_main, pc_resume, boss_dli_pc, pc_enter, pc_read, pc_engine;
    static unsigned pc_frame, pc_fence, pc_end, pc_handoff, pc_summary, pc_start;
    static unsigned pc_failure, phase, n, last_module, death_dli_pc, score_clock;
    static unsigned long long entry_clock, read_clock, start_clock, max_pre, max_wall, min_margin;
    static unsigned char ship[256], hud[40];
    static FILE *out;
    unsigned long long clock;
    if (!init) {
        dftrace_game_state=dftrace_env_u("DFTRACE_GAME_STATE");
        dftrace_pc_frontend_poll=dftrace_env_u("DFTRACE_PC_FRONTEND_POLL");
        dftrace_frontend_selection=dftrace_env_u("DFTRACE_FRONTEND_SELECTION");
        dftrace_frontend_input_armed=dftrace_env_u("DFTRACE_FRONTEND_INPUT_ARMED");
        dftrace_difficulty_setting=dftrace_env_u("DFTRACE_DIFFICULTY_SETTING");
        dftrace_difficulty=1; dftrace_frontend_delay=300;
#define DB(n) dftrace_env_u("DFDB_" n)
        pc_main=DB("MAIN"); pc_resume=DB("RESUME"); boss_dli_pc=DB("BOSS_DLI");
        pc_enter=DB("ENTER"); pc_read=DB("READ"); pc_engine=DB("ENGINE");
        pc_frame=DB("FRAME"); pc_fence=DB("FENCE"); pc_end=DB("END");
        pc_handoff=DB("HANDOFF"); pc_summary=DB("SUMMARY"); pc_start=DB("START");
        pc_failure=DB("FAILURE"); phase=DB("PHASE"); n=DB("N");
        last_module=DB("LAST"); death_dli_pc=DB("DLI"); score_clock=DB("CLOCK");
        out=fopen(getenv("DFDB_OUTPUT"),"w"); if (!out) exit(2);
        min_margin=999999u; init=1;
    }
    host=(unsigned)Atari800_nframes;
    clock=dftrace_clock();
    if (host>3000u) { fprintf(out,"{\"failure\":\"host timeout\",\"pc\":%u}\n",pc); fclose(out); exit(2); }
    if (pc==dftrace_pc_frontend_poll) dftrace_set_frontend_input();
    if (pc==DB("RELEASE")) dftrace_set_input(15u,1u);
    if (pc==DB("PRESS")) dftrace_set_input(15u,0u);
    if (pc==pc_enter && !forced) entry_clock=clock;
    if (pc==pc_failure && MEMORY_mem[0xA600u]=='D') {
        fprintf(out,"{\"failure\":\"disk failure\",\"status\":%u}\n",a); fclose(out); exit(2);
    }
    if (pc==pc_start) {
        starts++;
        if (summary) {
            fprintf(out,"{\"restartedLevel\":%u,\"summary\":true,\"frames\":%u,\"misses\":%u,\"hudErrors\":%u,\"shipErrors\":%u,\"dliErrors\":%u,\"returnedToMenu\":%u,\"cardChecks\":%u,\"cardErrors\":%u}\n",
                MEMORY_mem[0xA603u],frame_count,misses,hud_errors,ship_errors,dli_errors,menu,card_checks,card_errors);
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
                MEMORY_mem[DB("POSITION")]=(UBYTE)p;
                MEMORY_mem[DB("POSSTATE")]=(UBYTE)p;
                MEMORY_mem[DB("DLI_POS")]=(UBYTE)p;
                MEMORY_mem[DB("DIR")]=0;MEMORY_mem[DB("STEP_TIMER")]=255;
            }
            MEMORY_mem[phase]=2; MEMORY_mem[n]=(UBYTE)last_module;
            MEMORY_mem[score_clock]=100; MEMORY_mem[score_clock+1]=0;
            memcpy(ship,&MEMORY_mem[0x3C00],256); memcpy(hud,&MEMORY_mem[0x4000],40);
            ship_x=GTIA_HPOSP0;ship_size=GTIA_SIZEP0;ship_colour=GTIA_COLPM0;
            forced=1;
        }
    }
    if (forced && !entered && pc==pc_read && !read_clock) {read_clock=clock;read_host=host;}
    if (read_clock && !entered && host>=read_host+2u && host!=card_host && ANTIC_ypos>=248) {
        const UBYTE *bottom=(const UBYTE *)Screen_atari+208u*Screen_WIDTH;
        unsigned i, hud_pixels=0, ship_pixels=0;
        card_host=host;
        for(i=24u*Screen_WIDTH;i<32u*Screen_WIDTH;i++) if(bottom[i]) hud_pixels++;
        for(i=0;i<24u*Screen_WIDTH;i++) if(bottom[i]) ship_pixels++;
        if(!card_checks) memcpy(card_bottom,bottom,sizeof(card_bottom));
        if(!hud_pixels || !ship_pixels || memcmp(card_bottom,bottom,sizeof(card_bottom)) ||
            memcmp(ship,&MEMORY_mem[0x3C00],256) || memcmp(hud,&MEMORY_mem[0x4000],40) ||
            GTIA_HPOSP0!=ship_x || GTIA_SIZEP0!=ship_size || GTIA_COLPM0!=ship_colour) card_errors++;
        card_checks++;
    }
    if (read_clock && !entered && !card_photo && host>=read_host+2u && ANTIC_ypos>=248) {
        db_picture(100); card_photo=1;
    }
    if (forced && !entered && pc==pc_engine) {
        fprintf(out,"{\"readPauseFrames\":%.3f}\n",(clock-read_clock)/35568.0);
        db_picture(0);
        entered=1;
    }
    if (finished && pc==DB("MENU")) menu=1;
    if (entered && pc==death_dli_pc) {
        unsigned index=MEMORY_mem[0x4D05u];
        unsigned expected=index==128u ? 239u : 15u+index*8u;
        dli_count++;
        if ((unsigned)ANTIC_ypos!=expected) dli_errors++;
    }
    if (entered && pc==pc_frame) {
        if (!frame_count) fprintf(out,"{\"pauseHostFrames\":%u,\"pauseClockFrames\":%.3f}\n",host-read_host,(clock-read_clock)/35568.0);
        if (last_host && host-last_host!=1) misses++;
        last_host=host; start_clock=clock;
    }
    if (entered && pc==pc_fence) {
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
        if (memcmp(ship,&MEMORY_mem[0x3C00],256) || GTIA_HPOSP0!=ship_x ||
            GTIA_SIZEP0!=ship_size || GTIA_COLPM0!=ship_colour) ship_errors++;
        if (memcmp(hud,&MEMORY_mem[0x4000],40)) hud_errors++;
        if (frame_count==1 || frame_count==12 || frame_count==18 || frame_count==26 || frame_count==40) {
            db_picture(frame_count);
        }
    }
    if (entered && pc==pc_handoff && !finished) {
        fprintf(out,"{\"peakPreFence\":%llu,\"peakDmaOn\":%llu,\"minimumFence\":%llu,\"dliCount\":%u}\n",max_pre,max_wall,min_margin,dli_count);
        finished=1;
    }
    if (finished && pc==pc_summary) summary=1;
    (void)x;(void)y;(void)s;(void)menu;
}
