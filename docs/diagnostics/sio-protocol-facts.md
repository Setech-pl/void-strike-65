# SIO protocol facts the direct-SIO reader depends on (2026-09-20)

Roadmap 4.3, owner decision W. Written because the prior-art survey that
produced decision W never reached the repository: no file here mentioned
HiassofT, XF551 or IRQST, and the survey's conclusions survived only as
paraphrases in `STATUS.md` §W, `design-4.6-data-architecture.md` §3 and
`project-overview.md` §4.3/§6.2. This file is **not** that survey's prose. It
records the protocol facts `src/hybrid/sector-reader.s` is built on, each with
its source, so a later session can check the implementation against something
other than a recollection.

Primary source throughout:

> **[HRM]** Avery Lee, *Altirra Hardware Reference Manual*, **2026-01-02
> edition**. Chapter 9 "Serial I/O (SIO) Bus" (pp. 216-220) and section 5.6
> "Serial port" (pp. 112-117). Retrieved 2026-09-20 from
> <https://www.virtualdub.org/downloads/Altirra%20Hardware%20Reference%20Manual.pdf>

Where a fact is corroborated by the emulator the gates run against, the source
is given as `[A800]` = Atari800 7.1.2, the copy in `build/atari800-trace/`.
A corroboration is **not** a hardware fact; it only says the gate agrees.

---

## 1. The command frame and its reply codes

A command frame is **five bytes**: device ID, command, aux1, aux2, checksum.
The checksum is a **carry wrap-around 8-bit sum** of the first four, computed
by clearing carry and adding each byte with `ADC`, then folding the carry back
in with `ADC #0`. [HRM ch.9, p.217]

Device IDs `$31-$3F` are disk drives; `$31` is D1:. [HRM ch.9 Table 29, p.217]
The read-sector command is `$52` ('R'), aux1/aux2 the 16-bit sector number.

Reply codes, all sent by the peripheral: [HRM ch.9, pp.218-219]

| Byte | Name | Meaning |
| --- | --- | --- |
| `$41` `'A'` | ACK | command frame valid and accepted |
| `$4E` `'N'` | NAK | invalid command, or a framing/checksum error in the frame |
| `$43` `'C'` | COMPLETE | command executed successfully |
| `$45` `'E'` | ERROR | command failed |

A NAK ends the command: "No complete/error byte is sent if a NAK is sent."
[HRM ch.9, p.218] For commands that return data, the data frame is sent **even
if an error status (`$45`) was returned**. [HRM ch.9, p.219]

## 2. The command-line hold window

The command line is PIA port B control line CB2, driven by `PBCTL $D303`.
Bits 3-5 are set to `110` for a low state and `111` for a high state; the
conventional values are **`$34` to assert (line low) and `$3C` to release
(line high)**, which also disable the PIA interrupts and keep `PORTB` in data
mode. [HRM ch.2 "Control lines", p.34]

The frame is bracketed by **two** delays: [HRM ch.9 step 1, p.218]

1. after lowering the command line, **750µs-1600µs** for the peripheral to
   notice the line state, *before* the five bytes are sent;
2. after the five bytes, **650µs-950µs** for the peripheral to finish
   receiving, *before* the command line is raised.

The manual notes that the OS violates the *minimum* of the second delay and
that "peripherals should assume no minimum delay" — it says nothing of the
kind about the first. Both are implemented.

The reader spends both delays in `sta WSYNC` loops rather than counted cycles,
because ANTIC DMA stretches a counted loop by up to ~35% under a live text
display and would push the second delay past its 950µs ceiling. A PAL line is
114 cycles ≈ 64.3µs: 16 stores ≈ 1028µs for the first window, 12 stores ≈
707-771µs for the second (the first store finishes a partial line).

**Neither window is checked by the emulator**, which models no command-line
hold at all. Both are hardware-trust by construction, unverified until the
first SIO2SD smoke — see `hardware-testing.md`.

## 3. Asynchronous receive mode, and the transmit/receive split

`SKCTL $D20F` bits 4-6 select the serial clocking mode. The full table is
[HRM §5.6 Table 10, p.115]; the two rows that matter:

| Bits 6-4 | Input clock | Output clock |
| --- | --- | --- |
| `%010` | Channel 4 | Channel 4 |
| `%011` | Channel 3+4 (async) | Channel 4 (async) |

The manual's own captured waveforms name the values directly: "transmitting
`$4F` at 19200 baud with **`SKCTL=$23`**" and "receiving `$43` at 19200 baud
with **`SKCTL=$33`** (asynchronous)". [HRM §5.6 Figure 9, p.116]

> **This corrects plan §1.1, which specified a single `SKCTL = $13` for both
> directions.** `$13` is mode `%001`, whose **output clock is the external
> clock** — a line nothing on a standard SIO bus drives. A command frame
> written to `SEROUT` in that mode is never clocked onto the wire.
> Corroborated independently by `[A800] src/pokey.c:301`, which passes
> `SEROUT` to the SIO device model only when `(POKEY_SKCTL & 0x70) == 0x20`,
> and measured by the step-1 probe: with `$13` the ATR path returns silence,
> indistinguishable from having no disk mounted (see §8).

The reader therefore uses `$23` to send the command frame and `$33` to receive
the reply and the data frame. `$13` would also receive correctly; `$33` is
used because it is the value the manual captured.

Writing `$00` to `SKCTL` fully resets the serial port — bits 4-6 `%000` reset
the clock flip-flops, bits 0-1 clear force the input and output state machines
and flush any byte queued in `SEROUT`. [HRM §5.6 "Serial port reset", p.117]
This is the reader's settle step between retry attempts.

## 4. Polled operation with I set

"It is possible to drive the serial port in polled mode by enabling serial
interrupts on POKEY, disabling interrupts on the CPU, and then polling
`IRQST`. **The interrupt must both be enabled and masked** since the interrupt
status bit is required to detect the reception of a new data byte."
[HRM §5.6 "Polled operation", p.115]

This is the reader's whole interrupt model: `sei` is already set for the life
of the runtime, `IRQEN $D20E` arms the bits, no vector is ever taken.
`IRQST $D20E` reads **0 in the asserted bit**.

| Bit | Mask | Meaning |
| --- | --- | --- |
| 5 | `$20` | serial input ready — a byte is in `SERIN` |
| 4 | `$10` | serial output ready — `SEROUT` free for the next byte |
| 3 | `$08` | serial output complete — output shift register idle |

Bits 5 and 4 are **latched**: once asserted they stay asserted until the latch
is reset by writing `IRQEN` with that bit clear and then set again. Bit 3 is
**not** latched: "it will stay asserted even if it is disabled in `IRQEN` and
will automatically deassert when shifting begins". [HRM §5.6, p.113]

### Two hazards this creates

**Priming and the double-`SEROUT` hazard.** The output-ready IRQ fires when a
byte is loaded *from* `SEROUT` into the shift register, so "the serial output
must be primed by writing the first byte to `SEROUT` without waiting for the
output ready interrupt." Writing `SEROUT` twice without waiting in between can
fail: the second byte replaces the first before it is loaded and only the
second is sent. [HRM §5.6, pp.113-114]

**Ready before complete.** "It is necessary to wait for serial output ready
before checking serial output complete to end a transmission. Otherwise, if
there is a delay in queuing bytes and the serial output shift register
temporarily idles, it is possible for the serial output complete IRQ to fire
after `SEROUT` has been reloaded." [HRM §5.6 Warning, p.114] The reader waits
bit 4 after every byte, then bit 3 once, in that order.

## 5. Framing, overrun, and acknowledging a byte

`SKSTAT $D20F` read: bit 7 `SF` serial framing error, bit 6 `KO` **keyboard**
overrun, bit 5 `SO` **serial** input overrun, bit 4 `SI` raw serial input line.
A bit reads **0 when the error is present**. [HRM register reference, SKSTAT]

> **This corrects plan §1.1, which named "bit 7 framing, bit 6 overrun".**
> Bit 6 is the keyboard overrun. The serial overrun is bit 5. The reader's
> error mask is therefore `$A0`, not `$C0`. The manual footnotes this exact
> confusion: "Credit to HiassofT for noting that the SKSTAT reference on
> [ATA82] III.18 has D5 and D6 swapped." [HRM §5.6 n.21, p.114]

Overrun detection is tied to the *interrupt*, not to reading `SERIN`: the
overrun bit is set when a byte arrives while `IRQST` bit 5 is still asserted,
so "in order to acknowledge receipt of a byte from `SERIN`, the serial input
interrupt (`IRQST` bit 5) must be reset", and it should also be cleared before
a receive begins to discard stray data. **Overruns are not detected at all if
the interrupt is disabled.** [HRM §5.6 "Overrun errors", p.114] The reader
re-arms `IRQEN` bit 5 after every received byte for this reason alone.

The overrun bit is sticky until a write to `SKRES $D20A`, which resets SKSTAT
bits 5-7. [HRM §5.6, p.114; HRM register reference, SKRES]

The manual is explicit that this is imperfect: "The design of the serial port
makes it impossible to completely reliably detect overrun errors since the
serial input ready IRQ must be temporarily disabled to acknowledge it, during
which time an overrun can be missed". [HRM §5.6 Warning, p.114] A missed
overrun is caught one level up, by the data-frame checksum.

## 6. The back-to-back C/E-to-data hazard

The protocol specifies a minimum gap **before** the result byte but **none
between the result byte and the data frame**:

- "A delay of at least 250µs is required after the ACK byte before indicating
  the command result. Note that this delay is dead time, i.e. from the end of
  the ACK byte to the beginning of the result byte." [HRM ch.9 step 5, p.219]
- Step 6 then says only that the peripheral "now sends a data frame", with no
  delay specified. [HRM ch.9 step 6, p.219]

So the first data byte may follow COMPLETE immediately — one bit cell later.
`[A800]` sends it back-to-back. A receiver that finishes handling the C/E byte
lazily loses the first data byte to an overrun, and because §5 makes overrun
detection unreliable, it can lose it *silently*.

The reader's defence is structural: `IRQEN` bit 5 is re-armed and the next
wait entered before any branching on the C/E value, so the receiver is always
armed ahead of the wire. A byte lost anyway fails the data-frame checksum and
costs one wire-class retry (plan §3), never a wrong image.

## 7. The ACK deadline and the byte period

**ACK deadline.** "The peripheral initially checks the command code and
command parameters for validity. **This may take up to 16ms.**" [HRM ch.9
step 2, p.218] The reader's ACK budget is 3 PAL frames (60ms, at least 40ms
guaranteed by the VCOUNT edge counting), comfortably over the deadline.

**Byte period.** The nominal rate is 19200 baud, set by a 16-bit channel 3+4
divisor of `$0028` with the 1.79MHz clock — "for disk operation at 19200 baud,
it is `$0028`". The manual then gives the real figure: "Due to imprecision in
the timer divisor at high frequencies, **the actual transmission rate for the
SIO bus is 19040 baud**." [HRM §5.6, pp.115-116]

At 19040 baud one byte is 10 bit cells (start + 8 data + stop):

```
10 / 19040 Hz                    = 525.2 us per byte
525.2 us x 1,773,447 Hz (PAL)    = 931 CPU cycles per byte
931 / 114 cycles per PAL line    = 8.17 scanlines per byte
```

The reader's receive poll costs ≈60 CPU cycles per iteration (~120 wall with
DMA stealing) against that 931-cycle period: 7-15x margin. `[A800]` spaces
bytes at exactly 8 scanlines (912 cycles), ~2% fast against the real 931, so
the gate models the wire at approximately the right speed — and models no
drive latency, no jitter, no bit errors and no command-line hold at all.

**The timer divisor also fixes AUDCTL.** `AUDCTL $D208 = $28` is bit 5 (channel
3 clocked at 1.79MHz) plus bit 3 (channels 3+4 linked as one 16-bit counter).
[HRM register reference, AUDCTL] With the channels linked, `AUDF3 $D204` is the
low byte and `AUDF4 $D206` the high byte of `$0028`. `AUDC3`/`AUDC4` are set to
`$A0` — pure tone at volume 0 — because the serial clocks are "not affected by
any of the audio control bits in the `AUDC1-4` registers" [HRM §5.6, p.115],
so the channels can be silent while still clocking the port.

## 8. What step 1 measured

`docs/diagnostics/sio-register-probe-2026-09-20.json` records the run. One
command frame (`$31 $52 $01 $00 $84`, read D1: sector 1) at the register
level, under `[A800]`, PAL, `-nobasic`:

| Setup | Medium | Result |
| --- | --- | --- |
| `$23`/`$33` (corrected) | ATR mounted | byte received = **`$41` ACK**, SKSTAT `$FF` (no framing, no overrun), all 5 frame bytes sent |
| `$23`/`$33` (corrected) | XEX, no disk | **silence** — receive budget exhausted, no byte |
| `$13` (plan as written) | ATR mounted | **silence** — indistinguishable from no disk |

The third row is the negative control for the second: it proves the ATR row's
ACK is caused by the register setup and not by the mere presence of a disk,
and it is why §3 above overrides plan §1.1.

---

## What is *not* established here

Every item below is unverified on real hardware and is carried under owner
decision R. The emulator cannot speak to any of them.

- Both command-line hold windows (§2) — modelled nowhere in `[A800]`.
- Async receive against a real drive's clock recovery (§3).
- Real ACK and COMPLETE latency and jitter (§7); `[A800]` answers ACK after 44
  scanlines and COMPLETE 32 lines later, with no drive mechanics at all.
- Back-to-back C/E→data on a real 1050, XF551 or SIO2SD (§6).
- Any real bit error, and therefore the whole wire-retry path in anger.
- That a stock 65XE's POKEY latches `IRQST` exactly as §4 describes with I set.

`docs/hardware-testing.md` carries these as the reader's SIO2SD checklist.
