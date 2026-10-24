# L1 page-cross comparison

Baseline `a3c8e47`; fixed L1 sources on `codex/l1-window-levers`. STATIC counts from ca65 instruction records and actual linked operands; each crossing costs one cycle when its branch is taken. Data bytes are not disassembled as code. Both main and Light listings are covered, including RODATA and STARFIELD helpers.

Every per-frame routine with a changed address appears below. Frontend/event and boot-only routines are also retained for review; boot-only rows are marked. No per-frame row adds a crossing. All ENTITY_CODE gameplay routine and table addresses are restored exactly, so those unchanged rows are summarised separately.

| Segment / routine | main address | fixed address | taken branch crossings | Phase |
| --- | --- | --- | ---: | --- |
| `CODE:enter_exited_state` | `$234D` | `$2367` | 0 → 0 | runtime / frontend |
| `CODE:select_frontend_display` | `$2373` | `$238D` | 0 → 0 | runtime / frontend |
| `CODE:set_frontend_standard_palette` | `$23F3` | `$240D` | 0 → 0 | runtime / frontend |
| `CODE:frontend_hint_dli` | `$240D` | `$2427` | 0 → 0 | runtime / frontend |
| `CODE:render_frontend_state` | `$241F` | `$2439` | 0 → 0 | runtime / frontend |
| `CODE:render_frontend_data` | `$2472` | `$248C` | 0 → 0 | runtime / frontend |
| `CODE:render_frontend_records` | `$2475` | `$248F` | 0 → 0 | runtime / frontend |
| `CODE:encode_frontend_character` | `$249B` | `$24B5` | 0 → 0 | runtime / frontend |
| `CODE:read_frontend_data` | `$24D9` | `$24F3` | 0 → 0 | runtime / frontend |
| `CODE:update_frontend_marker` | `$24E4` | `$24FE` | 2 → 0 | runtime / frontend |
| `CODE:draw_frontend_marker` | `$2530` | `$254A` | 0 → 0 | runtime / frontend |
| `CODE:toggle_main_menu_highlight` | `$2547` | `$2575` | 0 → 0 | runtime / frontend |
| `CODE:draw_sound_value` | `$2555` | `$2583` | 0 → 0 | runtime / frontend |
| `CODE:draw_game_music_value` | `$257D` | `$25AB` | 0 → 0 | runtime / frontend |
| `CODE:draw_top_score_rows` | `$25C5` | `$25F3` | 2 → 2 | runtime / frontend |
| `CODE:start_gameplay` | `$2636` | `$2664` | 0 → 1 | boot/transition |
| `CODE:wait_frame` | `$26F0` | `$271E` | 0 → 0 | runtime / frontend |
| `CODE:wait_frame_at_line` | `$26F2` | `$2720` | 0 → 0 | runtime / frontend |
| `CODE:publish_fighter_projectile_overlays` | `$26FD` | `$272B` | 0 → 0 | runtime / frontend |
| `CODE:fighter_projectile_publication_capital_render` | `$2726` | `$2754` | 0 → 0 | runtime / frontend |
| `CODE:fighter_projectile_option_debounce_wait` | `$272C` | `$275A` | 0 → 0 | runtime / frontend |
| `CODE:wait_frame_start` | `$2734` | `$2762` | 0 → 0 | runtime / frontend |
| `CODE:show_loader` | `$273F` | `$276D` | 0 → 0 | boot/transition |
| `CODE:set_loader_title_palette` | `$2773` | `$27A1` | 0 → 0 | boot/transition |
| `CODE:unpack_loader_bitmap` | `$27BC` | `$27B8` | 0 → 0 | boot/transition |
| `CODE:init_state` | `$27EA` | `$27E9` | 0 → 0 | boot/transition |
| `CODE:clear_pmg` | `$2835` | `$2834` | 0 → 0 | boot/transition |
| `CODE:copy_charset` | `$284C` | `$284B` | 0 → 0 | boot/transition |
| `CODE:unpack_capital_hull_maps` | `$286A` | `$2869` | 0 → 0 | boot/transition |
| `CODE:unpack_capital_hull_map` | `$289D` | `$289C` | 0 → 0 | boot/transition |
| `CODE:copy_frontend_charset` | `$28DD` | `$28DC` | 0 → 0 | boot/transition |
| `RODATA:publish_level_hull_style` | `$3762` | `$3615` | 0 → 0 | boot/transition |
| `STARFIELD:backup_weapon_booster_hud` | `$5C65` | `$5A32` | 0 → 0 | runtime / frontend |
| `STARFIELD:restore_weapon_booster_hud` | `$5C71` | `$5A3E` | 0 → 0 | runtime / frontend |
| `STARFIELD:weapon_pickup_release_active_mask` | `$5C7D` | `$5A4A` | 0 → 0 | runtime / frontend |
| `STARFIELD:layout_d_publish_glue` | `$5C9B` | `$5A68` | 0 → 0 | boot/transition |
| `STARFIELD:layout_d_glue_publish_complete` | `$5CA8` | `$5A75` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:stage2_read_sector` | `$225E` | `$225E` | 1 → 0 | boot/transition |
| `BOOT_STAGE2:layout_d_expected_end_path` | `$22D4` | `$22FC` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:layout_d_expected_end_path_end` | `$22E8` | `$2310` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:stage2_publish_raw` | `$2304` | `$232C` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:stage2_chunk_published` | `$2324` | `$234C` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:copy_boot_splash_blob` | `$2341` | `$2369` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:boot_splash_source` | `$2343` | `$236B` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:boot_splash_source_high` | `$2349` | `$2371` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:boot_stage2_validate_manifest` | `$2353` | `$237B` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:boot_stage2_validate_record` | `$2461` | `$2489` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:stage2_validate_record_overlap` | `$257F` | `$25F1` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:stage2_validate_record_broad` | `$2582` | `$25F4` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:stage2_validate_record_staging` | `$25B8` | `$262A` | 0 → 0 | boot/transition |
| `BOOT_STAGE2:boot_stage2_crc16` | `$25CE` | `$2640` | 1 → 0 | boot/transition |
| `BOOT_STAGE2:boot_stage2_error` | `$2617` | `$2689` | 0 → 0 | boot/transition |
| `LIGHT_KERNEL:light_kernel_vectors` | `$B478` | `$3643` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:capital_vector_table` | `$B487` | `$3652` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_shot` | `$B69D` | `$3676` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_publish` | `$B4AB` | `$36F8` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_update` | `$B598` | `$37DB` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_top` | `$B58E` | `$38E0` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_hit_landed` | `$B702` | `$38EA` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_destroyed` | `$B70E` | `$38F6` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_spawn_breakup` | `$B725` | `$390D` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_backing` | `$B735` | `$391D` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_cell_resolve_sanitized` | `$B73B` | `$3923` | 0 → 0 | runtime / frontend |
| `LIGHT_KERNEL:light_cell_resolve` | `$B742` | `$392A` | 0 → 0 | runtime / frontend |
| `DISK_GUARD:guard_begin` | `$B791` | `$3979` | 0 → 0 | boot/transition |
| `DISK_GUARD:guard_reset` | `$B794` | `$397C` | 0 → 0 | boot/transition |
| `DISK_GUARD:guard_fold` | `$B79D` | `$3985` | 0 → 0 | boot/transition |
| `DISK_GUARD:guard_check` | `$B7AB` | `$3993` | 0 → 0 | boot/transition |
| `DISK_GUARD:guard_compare` | `$B7BB` | `$39A3` | 0 → 0 | boot/transition |
| `DISK_GUARD:guard_ok` | `$B7C5` | `$39AD` | 0 → 0 | boot/transition |
| `DISK_GUARD:guard_bad` | `$B7CF` | `$39B7` | 0 → 0 | boot/transition |
| `CAPITAL_VECTOR_IMAGE:capital_vector_image` | `$B7F0` | `$39DA` | 0 → 0 | runtime / frontend |
| `HUD_BOOSTER_BACKUP:boss_enter_read` | `$B814` | `$39FE` | 0 → 0 | boot/transition |
| `LIFE_CAPSULE:_life_spawned` | `$B82B` | `$3A15` | 0 → 0 | runtime / frontend |
| `LIFE_CAPSULE:life_pick` | `$B878` | `$3A62` | 0 → 0 | runtime / frontend |
| `LIFE_CAPSULE:life_pick_ordinary` | `$B884` | `$3A6E` | 0 → 0 | runtime / frontend |
| `LIFE_CAPSULE:life_enter` | `$B89A` | `$3A84` | 0 → 0 | runtime / frontend |
| `LIFE_CAPSULE:life_collect` | `$B8B8` | `$3AA2` | 0 → 0 | runtime / frontend |
| `LIFE_CAPSULE:life_colour` | `$B8E7` | `$3AD1` | 0 → 0 | runtime / frontend |

The changed branch locations in `draw_top_score_rows` retain two crossings and run only while building TOP SCORES. The extra `start_gameplay` crossing is startup-only. Neither belongs to the measured gameplay frame.

| Restored ENTITY_CODE routine | base / fixed address | pre-audit → fixed crossings | base crossings |
| --- | --- | ---: | ---: |
| `compose_player_fighter_projectile_glyph` | `$9C4A` | 2 → 0 | 0 |
| `enemy_projectile_effect_backing_resolve` | `$92B2` | 3 → 0 | 0 |
| `begin_fighter_projectile_frame` | unchanged from base | 1 → 0 | 0 |
| `entity_next_rng` | `$990E` | 1 → 0 | 0 |
| `render_interactive_entity_overlays` | unchanged from base | 3 → 1 | 1 |

The Light kernel retains all 53 branches with zero crossings. `light_glyph` and `light_interceptor_glyph` return to `$9D27` / `$9D37`; each 16-B table and their combined 32-B legal range stay in one page. The relocated 12-B missile tables and 3-B difficulty table also fit within a single page at `$3634-$363F` / `$3640-$3642`. LIFE shape reads retain single-page ranges. No new per-frame trampoline or indirect jump is introduced.

BROADSIDE, PICKUP_CODE, A2 and the C/ABI runtime segments retain their routine addresses. The remaining changed RODATA helper is level-start-only. Runtime confirmation: level-2 route 31,517 → 31,517 cycles; all reachable boss stress deltas zero. Exact machine-readable rows: [page-cross.json](page-cross.json).
