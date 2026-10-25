| Routine | Before | After | Crossings | New | Phase |
| --- | --- | --- | --- | --- | --- |
| main.lst:STARFIELD:update_starfield | $5636 | $5636 | 0 → 0 | 0 | per-frame |
| main.lst:STARFIELD:l2_rate_selection_start | new | $564E | 0 → 0 | 0 | per-frame |
| main.lst:ENTITY_CODE:scroll_hull_copy_source_ready | $931C | $931C | 0 → 0 | 0 | per-frame |
| main.lst:ENTITY_CODE:l2_copy_start | new | $931E | 0 → 0 | 0 | per-frame |
| main.lst:ENTITY_CODE:l2_copy_end | new | $9332 | 0 → 0 | 0 | per-frame |
| main.lst:ENTITY_CODE:player_inside_universal_hull_corridor | $949C | $949C | 0 → 0 | 0 | per-frame |
| encounter-director.lst:DIRECTOR_C_CODE:_director_c_request | $9E9C | $9E9C | 1 → 1 | 0 | per-frame |
| encounter-director.lst:DIRECTOR_C_CODE:_advance_sector | $9F69 | $9F60 | 0 → 0 | 0 | per-frame |
| encounter-director.lst:DIRECTOR_C_CODE:_director_c_boss_weapon_down | $9F92 | $9F89 | 0 → 0 | 0 | per-frame |
| encounter-director.lst:DIRECTOR_C_CODE:_heavy_request | $9FB0 | $9FA7 | 0 → 0 | 0 | per-frame |
| encounter-director-lifecycle.lst:HYBRID_C_SECTOR:_sector_c_update_capital_phase | $8653 | $8653 | 0 → 0 | 0 | per-frame |
| light-kernel.lst:DISK_GUARD:guard_check | $3993 | $3993 | 0 → 0 | 0 | cold/transition |
| light-kernel.lst:DISK_GUARD:guard_check_inline | new | $3996 | 0 → 0 | 0 | cold/transition |
| sector-reader.lst:SECTOR_READER:sector_reader_l2_guard | new | $A5E4 | 0 → 0 | 0 | cold/transition |
| level-summary.lst:LEVEL_SUMMARY:summary_load_l2 | new | $BEF | 0 → 0 | 0 | cold/transition |
| l2.lst:L2:l2_start | new | $1900 | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_init | new | $1919 | 0 → 0 | 0 | cold/transition |
| l2.lst:L2:l2_brake_before_enemy | new | $191F | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_original_row | new | $1925 | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_interval | new | $192D | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_contact | new | $19BB | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_island_contact | new | $19E2 | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_draw_row | new | $1A82 | 0 → 0 | 0 | per-frame |
| l2.lst:L2:l2_commit_row | new | $1AEA | 0 → 0 | 0 | per-frame |
| l2.lst:L2:_l2_c_phase | new | $1B95 | 0 → 0 | 0 | per-frame |
| l2.lst:L2:_l2_c_enter | new | $1BF2 | 0 → 0 | 0 | cold/transition |
| l2.lst:L2:_l2_brake_tick | new | $1C8A | 0 → 0 | 0 | per-frame |
| l2.lst:L2:_l2_warning_set_timer | new | $1D00 | 0 → 0 | 0 | per-frame |
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
