#ifndef VOIDSTRIKE65_SIO_DIAG_H
#define VOIDSTRIKE65_SIO_DIAG_H

/* fix/hardware-boot (2026-10-09), Phase A diagnosis. A stand-in for
 * scripts/atari800-wall-trace.h in a separate copy of the in-repo Atari800
 * source (build/atari800-sio-diag), prepared by scripts/sio-boot-repro.mjs.
 * It records the register-level SIO traffic - the command line (PBCTL CB2),
 * every byte the computer clocks out of SEROUT and every byte the drive model
 * hands to SERIN - with the frame, the scanline, the PC and the CPU's I flag,
 * plus every OS SIOV entry with its DCB, and stops at a set of PCs or after a
 * frame budget. The wall-trace emulator is not touched.
 *
 * Environment:
 *   DFSIO_OUTPUT   the log file (required)
 *   DFSIO_FRAMES   stop after this many frames (default 3000)
 *   DFSIO_STOP_PCS comma-separated hex PCs; the first hit is logged, then exit
 *   DFSIO_FILL     cold RAM fill (decimal), applied at the first instruction
 *   DFSIO_ARM_PC   hex PC; marks and FIRE pulses are armed from its first hit
 *                  (the boot overlay at $21C1 shares addresses with the
 *                  resident suffix, so marks below it would fire during boot)
 *   DFSIO_MARK_PCS comma-separated hex PCs logged on each hit (20 per PC)
 *   DFSIO_SCREENSHOT a PNG/PCX path written at the stop
 *   DFSIO_FIRE_PC  hex PC; from its first armed hit, FIRE is pressed for 6
 *                  frames every 100 frames (the menu, the summary screen)
 */

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "antic.h"
#include "atari.h"
#include "cpu.h"
#include "gtia.h"
#include "memory.h"
#include "pia.h"
#include "pokey.h"
#include "screen.h"

int voidstrike65_warmstart_request;

static FILE *dfsio_file;
static int dfsio_ready;
static unsigned dfsio_frames = 3000u;
static unsigned dfsio_stop[16];
static unsigned dfsio_stop_count;
static unsigned dfsio_last_pc;
static unsigned dfsio_last_frame = ~0u;
static unsigned dfsio_ring[256];
static unsigned dfsio_ring_index;
static unsigned dfsio_events;
static int dfsio_fill = -1;
static int dfsio_filled;
static unsigned dfsio_red_frames;
static unsigned dfsio_arm_pc = 0x10000u;
static int dfsio_armed;
static unsigned dfsio_mark[16];
static unsigned dfsio_mark_hits[16];
static unsigned dfsio_mark_count;
static unsigned dfsio_fire_pc = 0x10000u;
static unsigned dfsio_fire_from = ~0u;

static unsigned dfsio_parse_list(const char *list, unsigned *out, unsigned limit)
{
	unsigned count = 0;
	while (list != NULL && *list != '\0' && count < limit) {
		char *end;
		out[count++] = (unsigned) strtoul(list, &end, 16);
		list = (*end == ',') ? end + 1 : NULL;
	}
	return count;
}

static void dfsio_init(void)
{
	const char *path = getenv("DFSIO_OUTPUT");
	const char *frames = getenv("DFSIO_FRAMES");
	const char *stops = getenv("DFSIO_STOP_PCS");
	const char *fill = getenv("DFSIO_FILL");
	dfsio_ready = 1;
	if (path == NULL) return;
	dfsio_file = fopen(path, "w");
	if (dfsio_file == NULL) exit(3);
	if (frames != NULL) dfsio_frames = (unsigned) strtoul(frames, NULL, 10);
	if (fill != NULL) dfsio_fill = (int) strtol(fill, NULL, 10);
	dfsio_stop_count = dfsio_parse_list(stops, dfsio_stop, 16u);
	dfsio_mark_count = dfsio_parse_list(getenv("DFSIO_MARK_PCS"), dfsio_mark, 16u);
	if (getenv("DFSIO_ARM_PC") != NULL) dfsio_arm_pc = (unsigned) strtoul(getenv("DFSIO_ARM_PC"), NULL, 16);
	else dfsio_armed = 1;
	if (getenv("DFSIO_FIRE_PC") != NULL) dfsio_fire_pc = (unsigned) strtoul(getenv("DFSIO_FIRE_PC"), NULL, 16);
}

#define DFSIO_WHERE (unsigned) Atari800_nframes, ANTIC_ypos, dfsio_last_pc, (CPU_regP & 0x04) ? 1 : 0

/* Called from the prepared sio.c. kind: 'L' command line (value 1 = asserted),
 * 'O' a byte clocked out of SEROUT to the drive model, 'I' a byte the drive
 * model hands to SERIN. */
void voidstrike65_sio_event(int kind, int value)
{
	if (dfsio_file == NULL) return;
	dfsio_events++;
	fprintf(dfsio_file, "%c %02x f=%u y=%d pc=%04x i=%d irqen=%02x skctl=%02x audf3=%02x audf4=%02x audctl=%02x\n",
		kind, value & 0xff, DFSIO_WHERE, POKEY_IRQEN, POKEY_SKCTL,
		POKEY_AUDF[POKEY_CHAN3], POKEY_AUDF[POKEY_CHAN4], POKEY_AUDCTL[0]);
}

static void dfsio_exit(const char *why, unsigned pc)
{
	unsigned index;
	/* fix/hardware-audio: the last SKCTL and AUDCTL written. POKEY_SKCTL is the
	 * write register, not SKSTAT; bit 4 set (asynchronous receive) stops
	 * channels 3 and 4 on a real POKEY, which Atari800 does not model. */
	fprintf(dfsio_file, "STOP %s pc=%04x f=%u y=%d i=%d nmien=%02x irqen=%02x portb=%02x colbk=%02x sio_events=%u skctl=%02x audctl=%02x\n",
		why, pc, (unsigned) Atari800_nframes, ANTIC_ypos, (CPU_regP & 0x04) ? 1 : 0,
		ANTIC_NMIEN, POKEY_IRQEN, PIA_PORTB | PIA_PORTB_mask, GTIA_COLBK, dfsio_events,
		POKEY_SKCTL, POKEY_AUDCTL[0]);
	fprintf(dfsio_file, "DCB ddevic=%02x dunit=%02x dcomnd=%02x dstats=%02x dbuf=%04x dtimlo=%02x dbyt=%04x daux=%04x status=%02x\n",
		MEMORY_mem[0x300], MEMORY_mem[0x301], MEMORY_mem[0x302], MEMORY_mem[0x303],
		MEMORY_mem[0x304] | (MEMORY_mem[0x305] << 8), MEMORY_mem[0x306],
		MEMORY_mem[0x308] | (MEMORY_mem[0x309] << 8), MEMORY_mem[0x30a] | (MEMORY_mem[0x30b] << 8),
		MEMORY_mem[0x30]);
	fprintf(dfsio_file, "LASTPCS");
	for (index = 0; index < 256u; index++) {
		unsigned value = dfsio_ring[(dfsio_ring_index + index) & 255u];
		fprintf(dfsio_file, " %04x", value);
	}
	fprintf(dfsio_file, "\n");
	if (getenv("DFSIO_SCREENSHOT") != NULL)
		Screen_SaveScreenshot(getenv("DFSIO_SCREENSHOT"), 0);
	fclose(dfsio_file);
	exit(0);
}

static void DFTrace_Observe(unsigned pc, unsigned a_register, unsigned x_register,
	unsigned y_register, unsigned s_register)
{
	unsigned frame;
	unsigned index;
	(void) a_register; (void) x_register; (void) s_register;
	if (!dfsio_ready) dfsio_init();
	if (dfsio_file == NULL) return;
	if (dfsio_fill >= 0 && !dfsio_filled) {
		/* The cold RAM fill the boot smoke applies: every RAM byte below the
		 * OS before the OS clears its own pages. */
		memset(MEMORY_mem + 0x0080, dfsio_fill, 0xc000 - 0x0080);
		dfsio_filled = 1;
	}
	dfsio_last_pc = pc;
	if (dfsio_ring[(dfsio_ring_index - 1u) & 255u] != pc) {
		dfsio_ring[dfsio_ring_index & 255u] = pc;
		dfsio_ring_index++;
	}
	if (pc == 0xe459u) {
		fprintf(dfsio_file, "SIOV f=%u y=%d i=%d ddevic=%02x dunit=%02x dcomnd=%02x dstats=%02x dbuf=%04x dtimlo=%02x dbyt=%04x daux=%04x critic=%02x nmien=%02x pokmsk=%02x sdmctl=%02x\n",
			(unsigned) Atari800_nframes, ANTIC_ypos, (CPU_regP & 0x04) ? 1 : 0,
			MEMORY_mem[0x300], MEMORY_mem[0x301], MEMORY_mem[0x302], MEMORY_mem[0x303],
			MEMORY_mem[0x304] | (MEMORY_mem[0x305] << 8), MEMORY_mem[0x306],
			MEMORY_mem[0x308] | (MEMORY_mem[0x309] << 8), MEMORY_mem[0x30a] | (MEMORY_mem[0x30b] << 8),
			MEMORY_mem[0x42], ANTIC_NMIEN, MEMORY_mem[0x10], MEMORY_mem[0x22f]);
	}
	frame = (unsigned) Atari800_nframes;
	if (!dfsio_armed && pc == dfsio_arm_pc) {
		dfsio_armed = 1;
		fprintf(dfsio_file, "ARM pc=%04x f=%u y=%d\n", pc, frame, ANTIC_ypos);
	}
	if (dfsio_armed) {
		for (index = 0; index < dfsio_mark_count; index++)
			if (pc == dfsio_mark[index] && dfsio_mark_hits[index]++ < 20u)
				fprintf(dfsio_file, "MARK pc=%04x f=%u y=%d hit=%u\n", pc, frame, ANTIC_ypos,
					dfsio_mark_hits[index]);
		if (pc == dfsio_fire_pc && dfsio_fire_from == ~0u) dfsio_fire_from = frame + 50u;
	}
	/* Joystick neutral; FIRE pulses once the fire PC has been reached. */
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | 0x0fu;
	GTIA_TRIG[0] = (UBYTE) (frame >= dfsio_fire_from && (frame - dfsio_fire_from) % 100u < 6u ? 0 : 1);
	for (index = 0; index < dfsio_stop_count; index++)
		if (pc == dfsio_stop[index]) dfsio_exit("pc", pc);
	if (frame != dfsio_last_frame) {
		dfsio_last_frame = frame;
		if (frame % 50u == 0u)
			fprintf(dfsio_file, "FRAME f=%u pc=%04x i=%d nmien=%02x irqen=%02x colbk=%02x\n",
				frame, pc, (CPU_regP & 0x04) ? 1 : 0, ANTIC_NMIEN, POKEY_IRQEN, GTIA_COLBK);
		/* boot_stage2_error's halt (and any like it): red COLBK, NMIs and DMA off. */
		/* Two frame edges in that state, so the screenshot shows the red. */
		if (GTIA_COLBK == 0x34u && ANTIC_NMIEN == 0u && ANTIC_DMACTL == 0u) {
			if (++dfsio_red_frames >= 3u) dfsio_exit("red-halt", pc);
		} else {
			dfsio_red_frames = 0u;
		}
		if (frame >= dfsio_frames) dfsio_exit("frames", pc);
	}
}

#endif
