Historical record — not a current source of truth.

# Runtime checkpoints

This file preserves milestone measurements that previously appeared beside the
current PAL result. Use [runtime-headroom-layout-d2.md](runtime-headroom-layout-d2.md) for all
current acceptance decisions.

| Milestone | Accepted worst wall | Physical headroom | Context |
| --- | ---: | ---: | --- |
| Runtime-headroom checkpoint | 31,440 | 4,128 | pre entity/effects foundation baseline |
| Entity/effects foundation | 32,025 | 3,543 | +585 against its checkpoint |
| Debris visual polish | 32,081 | 3,487 | +56 |
| Explosion colour flash | 32,122 | 3,446 | +41 |
| Destructible debris | 32,719 | 2,849 | +597 |
| Enemy breakup effects | 32,869 | 2,699 | +150 |
| Rapid Fire Booster | 32,956 | 2,612 | +87 |
| Spread Shot Booster | 33,172 | 2,396 | +216 from Rapid Fire |

The old runtime-headroom gate of 31,568 cycles and the historical payload
checkpoint of 15,759 bytes remain recorded in generated manifest history. They
must not replace the current Spread Shot gate or payload snapshot.

Earlier payload milestones included a 14,314-byte baseline, a 15,759-byte
runtime-headroom result, exact 16,384-byte payloads before compaction, and the
reserve recovered by resident-suffix compression. Those values explain past
budget decisions only.
