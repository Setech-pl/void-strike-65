; ============================================================================
; Void Strike 65 — the boss entry's pinned addresses (M5b-S3, owner answer Q-S3)
; ============================================================================
;
; docs/plans/m5-loading-boss.md §5.11.4 item 2, §5.11.7. The boss entry's
; resident half lives in the window (src/hybrid/c-asm-abi.s), in the Director
; link, which links FIRST: before main, the gameplay music player and the
; sector reader whose routines it calls. It therefore names them here, by
; value, and scripts/build.mjs fails the build - naming the pin, its link and
; the address that link really gave the label - if any of them moves. Each
; line is `pin_<label> = $address ; <link>`, and <label> is the label's own
; name in that link's .lbl file; tests/boss-overlay.test.mjs checks the same.
;
; The slot-A overlay itself links LAST and imports every one of these from the
; build's own generated includes, so it cannot drift; only this file can.

pin_music_stop_gameplay          = $6101   ; main
pin_pause_silence_audio          = $6089   ; main
pin_capital_slot_a               = $6DE8   ; main
pin_game_music_data_start        = $A717   ; music
pin_sector_reader_blank          = $A03D   ; reader
pin_sector_reader_show_records   = $A0A7   ; reader
pin_sector_reader_failure_screen = $A0D6   ; reader
pin_sr_slot_a_overlaid           = $A576   ; reader
; S5-1 (owner decision Q8): the HUD booster backup, the kernel link's last segment.
pin_boss_enter_hud_backup        = $B802   ; kernel
