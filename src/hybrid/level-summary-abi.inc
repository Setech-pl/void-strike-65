; ============================================================================
; Void Strike 65 — the level-summary ABI (M5a-S2)
; ============================================================================
;
; docs/plans/m5-loading-boss.md §4.8. Shared by the sector reader (the stat
; hooks, the transitions, the record's sector I/O), the $0500 summary module
; (the screen, the arithmetic, the record's contents) and the Light kernel
; (which reaches the hooks through the reader's fixed vectors). Hand-written,
; not generated: every value here is a reservation, not a link result.

; The stat block, in zero page $AC-$B5 that no link claims (docs/memory-map.md,
; "Linked segments": $00AC-$00FF). The counters are binary, so the summary can
; divide them; the bonus is packed BCD like the score it is added to.
STATS_SHOTS     = $AC   ; 2 B: PlayerFighter shots fired this level (Q13 scan)
STATS_HITS      = $AE   ; 2 B: PairShot hits; a destroyed debris is three (Q14)
STATS_KILLS     = $B0   ; 2 B: enemies destroyed for score
STATS_END_HOLD  = $B2   ; frames of the level's terminal COMPLETE seen so far
SUMMARY_FRAMES  = $B3   ; frames the summary has been up, saturating at 255
STATS_BONUS     = $B4   ; 2 B packed BCD lo/hi: the boss bonus (M5b); 0 until then
STATS_BLOCK_END = $B6

; The reader's fixed stat vectors (src/hybrid/sector-reader.s asserts them;
; src/main.s names the same addresses for its operand-only re-points).
SECTOR_READER_STATS_FIGHTER        = $A00C
SECTOR_READER_STATS_CAPITAL        = $A00F
SECTOR_READER_STATS_KILL           = $A012
SECTOR_READER_STATS_DEBRIS_SHOT    = $A015
SECTOR_READER_STATS_DEBRIS_CONTACT = $A018
SECTOR_READER_STATS_LIGHT_HIT      = $A01B

; The $0500 module's two entries (the splash RAM, read once per session).
SUMMARY_MODULE     = $0500
SUMMARY_START_GAME = $0500     ; A = level id; returns once FIRE is accepted
SUMMARY_LEVEL_END  = $0503     ; the level in LEVEL_BUFFER; returns once FIRE is accepted
SUMMARY_ANIMATE    = $0506     ; the reader's per-sector dotted-row step (owner review)

; Staging, in the pause-screen backup ($7810-$7BCF, free at a transition):
; the art run lands here and is copied out; the save record follows it here,
; and its read-back verify lands one sector further on.
SUMMARY_STAGING     = $7810
SAVE_RECORD_BUFFER  = $7810
SAVE_VERIFY_BUFFER  = $7890

; Timing. The minimum display is owner answer Q15; the hold after the level's
; terminal COMPLETE lets the last frames of the cleared screen be seen.
SUMMARY_MINIMUM_FRAMES = 150
LEVEL_END_HOLD_FRAMES  = 50

; The summary screen's rows in the frontend screen RAM (40 B each). The
; reader's per-sector animation writes its own row of the same layout.
SUMMARY_SCREEN        = $4000
SUMMARY_ANIMATION_ROW = SUMMARY_SCREEN + 10 * 40
SUMMARY_PROMPT_ROW    = SUMMARY_SCREEN + 11 * 40
SUMMARY_PICTURE       = SUMMARY_SCREEN + 12 * 40
