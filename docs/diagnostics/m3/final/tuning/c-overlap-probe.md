# Reproduce the discarded overlap size probe

Append the following to checkpoint9f3735d lifecycle.c in an isolated export,
then normal build. No production call site, aggregation, mixed-mode filter or
veneer is included, so the89-B delta is only the decision helper + state.

```c
/* THROWAWAY sizing probe: reuse each existing path tick to aggregate terminal
 * eligibility; no additional per-frame scan. This is not production code. */
#pragma data-name (push, "CONTENT_DATA")
static uint8_t m3_nonterminal = 1u;
#pragma data-name (pop)
#pragma code-name (push, "CONTENT_CODE")
extern uint8_t sector_wave_first[10],sector_wave_count[10],wave_flags[20];
uint8_t m3_overlap_probe(void)
{
    light_fire_work=m3_nonterminal;
    m3_nonterminal=0u;
    if(light_fire_work!=0u || m3_armed_path==255u) return 0u;
    m3_index=U8_AT(0x80F7u);
    m3_dy=U8_AT(0x80F6u);
    if(m3_index>=(uint8_t)(sector_wave_first[m3_dy]+sector_wave_count[m3_dy]))return 0u;
    if((wave_flags[m3_index]&24u)!=0u || wave_path[m3_index]==255u)return 0u;
    return 1u;
}
#pragma code-name (pop)

```
