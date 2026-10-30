/* Host-only visual audit. Reads guest state; writes joystick/trigger hardware
 * inputs only. No HP, lives, wave, damage, PMG, code or phase injection. */
#include "antic.h"
#include "atari.h"
#include "gtia.h"
#include "memory.h"
#include "pia.h"
#include "screen.h"
#include "videomode.h"
#include "visual-pins.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
 unsigned host,frame,formation,difficulty,sector,wave,remaining,shape,flags,valid,departure;
 unsigned row,world,game; unsigned state[2],hp[2],x[2],y[2],stage[2],colour[2],source,index[2],player_life,player_state,claim,stamp;
 unsigned char body[2][16];
} VisualState;
static unsigned vis_host=~0u,vis_start=~0u,vis_frames,vis_formation,vis_claim,vis_stamp;
static unsigned vis_stable[6],vis_taken[6],vis_pause,vis_old_hp[2],vis_old_formation,vis_last_shot;
static unsigned vis_have_state,vis_saved_host=~0u,vis_finished;
static VisualState vis_state;
static FILE *vis_log;
static const char *vis_names[6]={"assault-intact","armour-intact","armour-first-hit","bomber-full","bomber-hp2","bomber-hp1"};
static void vis_input(unsigned stick,unsigned trigger) {
 PIA_PORT_input[0]=(PIA_PORT_input[0]&0xf0u)|(stick&15u);GTIA_TRIG[0]=(UBYTE)trigger;
}
static void vis_snapshot(void) {
 unsigned s,i;VisualState *v=&vis_state;memset(v,0,sizeof(*v));
 v->host=(unsigned)Atari800_nframes;v->frame=vis_frames;v->formation=vis_formation;
 v->difficulty=MEMORY_mem[P_DIFFICULTY];v->sector=MEMORY_mem[0x80f6];v->wave=MEMORY_mem[0x80f7];v->remaining=MEMORY_mem[0x80fc];
 v->row=MEMORY_mem[P_ROWLO]+256u*MEMORY_mem[P_ROWHI];v->world=MEMORY_mem[0x80f4]+256u*MEMORY_mem[0x80f5];v->game=MEMORY_mem[P_GAME];
 v->shape=MEMORY_mem[P_SHAPE];v->flags=MEMORY_mem[P_FLAGS];v->valid=MEMORY_mem[0x86b3];
 v->departure=v->valid?MEMORY_mem[P_DEPARTURE]:255;
 v->source=MEMORY_mem[P_SOURCE]|((unsigned)MEMORY_mem[P_SOURCE+1]<<8);
 v->player_life=MEMORY_mem[P_PLAYER_STATE+1];v->player_state=MEMORY_mem[P_PLAYER_STATE];v->claim=vis_claim;v->stamp=vis_stamp;
 for(s=0;s<2;s++) {v->state[s]=MEMORY_mem[P_STATE+s];v->hp[s]=MEMORY_mem[P_HP+s];v->x[s]=MEMORY_mem[P_X+s];v->y[s]=MEMORY_mem[P_Y+s];v->stage[s]=MEMORY_mem[P_STAGE+s];v->colour[s]=s?GTIA_COLPM2:GTIA_COLPM1;v->index[s]=MEMORY_mem[P_INDEX+s];
 for(i=0;i<16;i++)v->body[s][i]=MEMORY_mem[0x3d00+s*256+v->y[s]+i];}
 vis_have_state=1;
}
static void vis_record(const char *kind,int subject,int slot,const char *file) {
 unsigned s,i;VisualState *v=&vis_state;
 if(!vis_log){vis_log=fopen(getenv("VIS_LOG"),"w");if(!vis_log){perror("visual log");exit(2);}}
 fprintf(vis_log,"{\"kind\":\"%s\",\"subject\":%d,\"slot\":%d,\"file\":\"%s\",\"host\":%u,\"frame\":%u,\"seconds\":%.3f,\"formation\":%u,\"difficulty\":%u,\"sector\":%u,\"waveCursor\":%u,\"remaining\":%u,\"shape\":%u,\"flags\":%u,\"valid\":%u,\"departure\":%u,\"source\":%u,\"lives\":%u,\"playerState\":%u,\"claims\":%u,\"stamps\":%u,\"members\":[",kind,subject,slot,file?file:"",v->host,v->frame,vis_start==~0u?0.0:(v->host-vis_start)/50.0,v->formation,v->difficulty,v->sector,v->wave,v->remaining,v->shape,v->flags,v->valid,v->departure,v->source,v->player_life,v->player_state,v->claim,v->stamp);
 for(s=0;s<2;s++){fprintf(vis_log,"%s{\"state\":%u,\"hp\":%u,\"x\":%u,\"y\":%u,\"stage\":%u,\"colour\":%u,\"index\":%u,\"bodyHex\":\"",s?",":"",v->state[s],v->hp[s],v->x[s],v->y[s],v->stage[s],v->colour[s],v->index[s]);for(i=0;i<16;i++)fprintf(vis_log,"%02x",v->body[s][i]);fprintf(vis_log,"\"}");}fprintf(vis_log,"],\"game\":%u,\"row\":%u,\"worldRow\":%u}\n",v->game,v->row,v->world);fflush(vis_log);
}
static void vis_save(unsigned id,unsigned slot) {
 char file[1024];int x1=Screen_visible_x1,x2=Screen_visible_x2,y1=Screen_visible_y1,y2=Screen_visible_y2;
#ifdef SUPPORTS_CHANGE_VIDEOMODE
 unsigned sl=VIDEOMODE_src_offset_left,sw=VIDEOMODE_src_width;
#endif
 snprintf(file,sizeof(file),"%s/%s.png",getenv("VIS_OUT"),vis_names[id]);
 Screen_visible_x1=0;Screen_visible_x2=Screen_WIDTH;Screen_visible_y1=0;Screen_visible_y2=Screen_HEIGHT;
#ifdef SUPPORTS_CHANGE_VIDEOMODE
 VIDEOMODE_src_offset_left=0;VIDEOMODE_src_width=Screen_WIDTH;
#endif
 if(!Screen_SaveScreenshot(file,0)){perror("native visual screenshot");exit(2);}
 Screen_visible_x1=x1;Screen_visible_x2=x2;Screen_visible_y1=y1;Screen_visible_y2=y2;
#ifdef SUPPORTS_CHANGE_VIDEOMODE
 VIDEOMODE_src_offset_left=sl;VIDEOMODE_src_width=sw;
#endif
 vis_taken[id]=1;vis_record("capture",(int)id,(int)slot,file);
 printf("capture %s frame=%u seconds=%.2f formation=%u slot=%u hp=%u colour=%02x stage=%u\n",vis_names[id],vis_state.frame,(vis_state.host-vis_start)/50.0,vis_formation,slot,vis_state.hp[slot],vis_state.colour[slot],vis_state.stage[slot]);fflush(stdout);
}
/* Select a completed native raster whose body is not obscured by its peer or
 * an HPOSP update through the silhouette. This only delays the screenshot. */
static unsigned vis_body_visible(unsigned slot) {
 VisualState *v=&vis_state;int xx,yy,x,y,w=v->shape==2?8:4;
 for(yy=(int)v->y[slot]-10;yy<=(int)v->y[slot]-6;yy++)
 for(xx=(int)v->x[slot]*2-68;xx<=(int)v->x[slot]*2-58;xx++) {
  unsigned bad=0;if(xx<0||yy<0)continue;
  for(y=0;y<14&&!bad;y++)for(x=0;x<8*w;x++) {
   unsigned expected=(v->body[slot][y]&(128u>>(x/w)))!=0u;
   unsigned actual=((const UBYTE*)Screen_atari)[(yy+y)*Screen_WIDTH+xx+x]==v->colour[slot];
   if(expected!=actual){bad=1;break;}
  }
  if(!bad)return 1;
 }
 return 0;
}
static void vis_picture(void) {
 unsigned slot,id,all=1,match[6]={0};VisualState *v=&vis_state;
 if(!vis_have_state||!vis_frames||MEMORY_mem[P_GAME]!=6||vis_saved_host==(unsigned)Atari800_nframes||ANTIC_ypos<248)return;
 vis_saved_host=(unsigned)Atari800_nframes;
 for(slot=0;slot<1;slot++){
 if(v->state[slot]!=1||v->y[slot]<(getenv("VIS_ARMOUR")?32u:18u)||v->y[slot]>180)continue;
 id=99;
 if(v->shape==0&&!(v->flags&32)&&v->hp[slot]==1&&v->stage[slot]==0)id=0;
 if(v->shape==0&&(v->flags&32)&&v->hp[slot]==2&&v->stage[slot]==0)id=1;
 if(v->shape==0&&(v->flags&32)&&v->hp[slot]==1&&v->stage[slot]==2)id=2;
 if(v->shape==2&&v->hp[slot]==4&&v->stage[slot]==0&&v->colour[slot]==0xc8)id=3;
 if(v->shape==2&&v->hp[slot]==2&&v->stage[slot]==1&&v->colour[slot]==0xc6)id=4;
 if(v->shape==2&&v->hp[slot]==1&&v->stage[slot]==2&&v->colour[slot]==0xc4)id=5;
 if(id==0&&!getenv("VIS_ARMOUR")&&GTIA_COLBK!=0)id=99;
 if(id<6&&(getenv("VIS_ARMOUR")||vis_body_visible(slot)))match[id]=1;
 }
 for(id=0;id<6;id++){vis_stable[id]=match[id]?vis_stable[id]+1:0;if(!vis_taken[id]&&vis_stable[id]>=3)vis_save(id,0);if(!vis_taken[id])all=0;}
 if(all||vis_frames>=18000){vis_record("end",-1,-1,NULL);fflush(NULL);exit(all?0:3);}
}
static void vis_control(void) {
 unsigned i,slot=2,stick=15,trigger=1,px=MEMORY_mem[P_PX],py=MEMORY_mem[P_PY],target=124,y=0,shots=0,single=0;
 for(i=0;i<2;i++)if(MEMORY_mem[P_STATE+i]==1){slot=i;break;}
 if(vis_old_formation!=vis_formation){vis_old_formation=vis_formation;vis_old_hp[0]=MEMORY_mem[P_HP];vis_old_hp[1]=MEMORY_mem[P_HP+1];vis_pause=vis_frames+8;}
 for(i=0;i<2;i++)if(MEMORY_mem[P_HP+i]!=vis_old_hp[i]){vis_old_hp[i]=MEMORY_mem[P_HP+i];if(!getenv("VIS_ARMOUR")||((MEMORY_mem[P_FLAGS]&32)&&!vis_taken[2]))vis_pause=vis_frames+14;}
 if(slot<2){target=MEMORY_mem[P_X+slot]+(MEMORY_mem[P_SHAPE]==2?8:0);y=MEMORY_mem[P_Y+slot];
  if((MEMORY_mem[P_SHAPE]==2&&(!vis_taken[3]||!vis_taken[4]||!vis_taken[5]))||(MEMORY_mem[P_FLAGS]&32&&!vis_taken[2]))single=1;
  if((MEMORY_mem[P_SHAPE]==2&&MEMORY_mem[P_HP+slot]==2&&!vis_taken[4])||(MEMORY_mem[P_SHAPE]==2&&MEMORY_mem[P_HP+slot]==1&&!vis_taken[5]))vis_pause=vis_frames+2;
  if((MEMORY_mem[P_SHAPE]==0&&!(MEMORY_mem[P_FLAGS]&32)&&!vis_taken[0])||((MEMORY_mem[P_FLAGS]&32)&&!vis_taken[1])||(MEMORY_mem[P_SHAPE]==2&&!vis_taken[3])){if(y<(MEMORY_mem[P_SHAPE]==2?70:45))vis_pause=vis_frames+3;}
 }else{for(i=0;i<4;i++)if(MEMORY_mem[P_LIGHT_STATE+i]>0&&MEMORY_mem[P_LIGHT_STATE+i]<3){target=MEMORY_mem[P_LIGHT_X+i]-4;y=MEMORY_mem[P_LIGHT_Y+i];break;}}
 if(px+2<target)stick=7;else if(px>target+2)stick=11;
 for(i=0;i<5;i++)if(MEMORY_mem[P_PROJECTILES+i])shots++;
 if(y>30&&y<190&&vis_frames>vis_pause&&MEMORY_mem[P_FIRE_GATE]&&(!single||(!shots&&vis_frames>vis_last_shot+2))){trigger=0;if(single)vis_last_shot=vis_frames;}
 if(slot<2&&y>185&&y+32>=py){stick=px<124?7:11;trigger=1;}
 /* Ordinary dodge input only. */
 for(i=5;i<10;i++)if(MEMORY_mem[P_PROJECTILES+i]){unsigned sy=MEMORY_mem[P_PROJECTILE_Y+i],sx=MEMORY_mem[P_PROJECTILE_X+i];int dx=(int)sx-(int)px-8;if(sy<py+12&&sy+35>py&&dx>-16&&dx<16){stick=dx>=0?11:7;trigger=1;}}
 
 if(!MEMORY_mem[P_FIRE_GATE])trigger=1;
 vis_input(stick,trigger);
}
static void VisualObserve(unsigned pc) {
 unsigned host=(unsigned)Atari800_nframes;
 if(getenv("VIS_ARMOUR"))vis_taken[3]=vis_taken[4]=vis_taken[5]=1;else vis_taken[1]=vis_taken[2]=1;
 if(host!=vis_host){vis_host=host;if(vis_frames&&MEMORY_mem[P_GAME]==6)vis_snapshot();}
 vis_picture();
 if(vis_frames&&MEMORY_mem[P_GAME]==7){vis_record("gameover",-1,-1,NULL);fflush(NULL);exit(5);}
 if(host>25000){fprintf(stderr,"visual audit host timeout\n");exit(4);}
 if(pc==P_FRONTEND&&MEMORY_mem[P_GAME]==1){unsigned armed=MEMORY_mem[P_FRONT_ARMED],select=MEMORY_mem[P_FRONT_SELECTION];vis_input(armed&&select?14:15,armed&&select==0?0:1);}
 if(pc==P_SUMMARY_RELEASE||pc==P_SUMMARY_PRESS)vis_input(15,((host>>2)&1u)?0:1);
 if(MEMORY_mem[P_GAME]!=6)return;
 if(pc==P_INIT&&vis_frames){vis_snapshot();vis_record("restart",-1,-1,NULL);exit(6);}
 if(pc==P_ARM){vis_snapshot();vis_record("arm-wave",-1,-1,NULL);}
 if(pc==P_INSTALL){vis_formation++;}
 if(pc==P_CLAIM)vis_claim++;
 if(pc==P_STAMP)vis_stamp++;
 if(pc==P_ACTIVE){if(vis_start==~0u)vis_start=host;vis_frames++;if(vis_frames%500==0){vis_snapshot();vis_record("progress",-1,-1,NULL);printf("frame %u f%u wave%u remaining%u shape%u flags%02x lives%u\n",vis_frames,vis_formation,MEMORY_mem[0x80f7],MEMORY_mem[0x80fc],MEMORY_mem[P_SHAPE],MEMORY_mem[P_FLAGS],MEMORY_mem[P_PLAYER_STATE+1]);fflush(stdout);}}
 if(pc==P_INPUT)vis_control();
}
