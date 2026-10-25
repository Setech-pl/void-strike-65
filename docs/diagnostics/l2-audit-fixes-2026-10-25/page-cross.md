| Routine | Before | After | Crossings | New | Phase |
| --- | --- | --- | --- | --- | --- |
| main.lst:CODE:start_gameplay | $2664 | $2664 | 1 → 0 | 0 | per-frame |
| main.lst:CODE:wait_frame | $271E | $2725 | 0 → 0 | 0 | per-frame |
| main.lst:CODE:wait_frame_at_line | $2720 | $2727 | 0 → 0 | 0 | per-frame |
| main.lst:CODE:publish_fighter_projectile_overlays | $272B | $2732 | 0 → 0 | 0 | per-frame |
| main.lst:CODE:fighter_projectile_publication_capital_render | $2754 | $275B | 0 → 0 | 0 | per-frame |
| main.lst:CODE:fighter_projectile_option_debounce_wait | $275A | $2761 | 0 → 0 | 0 | per-frame |
| main.lst:CODE:wait_frame_start | $2762 | $2769 | 0 → 0 | 0 | per-frame |
| main.lst:CODE:show_loader | $276D | $2774 | 0 → 0 | 0 | cold/transition |
| main.lst:CODE:set_loader_title_palette | $27A1 | $27A8 | 0 → 0 | 0 | cold/transition |
| main.lst:ENTITY_CODE:player_inside_universal_hull_corridor | $949C | $9490 | 0 → 0 | 0 | per-frame |
| encounter-director-lifecycle.lst:HYBRID_C_SECTOR:_sector_c_update_capital_phase | $8653 | $8653 | 0 → 0 | 0 | per-frame |
| encounter-director-lifecycle.lst:HYBRID_C_SECTOR:_sector_c_complete_scroll_tick | $86C0 | $86C0 | 0 → 0 | 0 | per-frame |
| encounter-director-lifecycle.lst:HYBRID_C_SECTOR:_sector_c_force_final_drain | $86D7 | $86DA | 0 → 0 | 0 | per-frame |
| sector-reader.lst:SECTOR_READER:sector_reader_read_run | $A120 | $A120 | 0 → 0 | 0 | cold/transition |
| sector-reader.lst:SECTOR_READER:sector_reader_read_run_inline | new | $A124 | 0 → 0 | 0 | cold/transition |
| l2.lst:L2:l2_contact | $19BB | $19C2 | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_space | new | $1D1A | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_enter | new | $1D2C | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_store_hook_hi | new | $1D36 | 0 → 0 | 0 | per-frame |
NEW per-frame crossings: 0

| Indexed table | Address | Maximum index | Page penalty |
| --- | --- | --- | --- |
| l2_part_offsets | $1B00 | 5 | 0 |
| l2_recipe_offsets | $1B06 | 2 | 0 |
| l2_left_caps | $1B09 | 2 | 0 |
| l2_right_caps | $1B0C | 2 | 0 |
| l2_recipes | $1B0F | 107 | 0 |
| _l2_normal_rates | $1B89 | 2 | 0 |
| _l2_half_rates | $1B8C | 2 | 0 |
| level allied sequence | $AC08 | 119 | 0 |
| level enemy sequence | $AC80 | 119 | 0 |
| current-sector lookup | $AD80 | 119 | 0 |
