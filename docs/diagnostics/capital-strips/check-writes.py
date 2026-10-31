"""Read-only native write-journal audit. Arguments: linked build, journal CSV.
Shadow terrain is fed only by authored row publishers, blank generation and
physical divider-to-ring recycling; actor restores never author terrain.
"""
import csv,json,sys
from pathlib import Path
build, journal=map(Path,sys.argv[1:3])
labels={}
if build.suffix=='.json':
 labels=json.loads(build.read_text())
else:
 for name in ['void-strike-65.lbl','light-kernel.lbl','l2.lbl','integration-glue.lbl']:
  for line in (build/name).read_text().splitlines():
   a=line.split()
   if len(a)>2:labels.setdefault(a[2].lstrip('.'),int(a[1],16))
L=lambda n:labels[n]
actual=bytearray(65536); terrain=bytearray(65536); writers={}
first=None;first_bad_pointer=None;badframes=0;checked=0;phase=0;sector=7;frame=0; capital_seen=False
ring=range(0x8140,0x8578);divider=range(0x4028,0x4050)
row_order=list(range(0x8140,0x8578,40));recycle=0
authored=[(L('l2_draw_row'),L('l2_commit_row')+12),(L('draw_hull_row'),L('fill_starfield_empty_cells')),(L('generate_starfield_row'),L('generate_starfield_row')+48)]
copy=L('rotate_playfield_rows')+17 # STA (dst_ptr),Y in @copy_divider
# Resolve the store from the linked local loop label.
copy=L('@copy_divider')+3 if '@copy_divider' in labels else copy

def finish():
 global first,badframes,checked,capital_seen
 if phase==6 and sector<7:capital_seen=True
 if phase!=6 or not capital_seen or frame==0:return
 checked+=1
 bad=[]
 for base in [0x4028]+list(range(0x8140,0x8578,40)):
  for col in range(8,32):
   a=base+col;v=actual[a]
   if 59<= (v&127)<90 and v!=terrain[a]:bad.append({'address':a,'column':col,'value':v,'authored':terrain[a],'writer':writers.get(a)})
 if bad:
  badframes+=1
  if first is None:first={'trace':frame,'cells':bad}

for raw in csv.DictReader(journal.open()):
 if any(v is None or v=="" for v in raw.values()):continue
 r={k:int(v) for k,v in raw.items()}
 if r['trace']!=frame:finish();frame=r['trace']
 phase,sector=r['phase'],r['sector'];pc,a,v,y=r['pc'],r['address'],r['value'],r['y']
 actual[a]=v;writers[a]=r
 if a in ring or a in divider:
  if a in divider and any(lo<=pc<hi for lo,hi in authored):terrain[a]=v
  elif pc in [L("redraw_tracked_muzzles")+26,L("restore_active_muzzles")+19,L("render_launch_flashes")+35,L("restore_launch_flash_cell")+9] and ((a-0x8140)%40 if a in ring else a-0x4028) in [8,31]:terrain[a]=v
  elif pc==copy:
   if y==39:recycle=row_order.pop();row_order.insert(0,recycle)
   terrain[recycle+y]=terrain[0x4028+y]
 if phase==6 and L('PLAYFIELD_ROW_LO')<=a<L('PLAYFIELD_ROW_LO')+27 and v%8 and first_bad_pointer is None:first_bad_pointer=r
finish()
print(json.dumps({'build':str(build),'journal':str(journal),'checkedCapitalFrames':checked,'badFrames':badframes,'firstWrongHull':first,'firstBadRowPointer':first_bad_pointer,'copyPc':copy},indent=2))

if "--assert" in sys.argv:
 assert checked>=500, "capital entry and after-entry coverage is missing"
 assert badframes==0 and first_bad_pointer is None, "native corridor or row-table corruption"
