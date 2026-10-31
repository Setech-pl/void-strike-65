"""Compare native capital-shell restore stores, including timing and address."""
import csv,json,sys,hashlib
from pathlib import Path

def read(build,journal):
 labels={}
 if Path(build).suffix=='.json':labels=json.loads(Path(build).read_text())
 else:
  for l in (Path(build)/'void-strike-65.lbl').read_text().splitlines():
   a=l.split()
   if len(a)>2:labels.setdefault(a[2].lstrip('.'),int(a[1],16))
 begin=labels['erase_broadside_slot'];pcs=[begin+38,begin+47]
 result=[]
 for r in csv.DictReader(open(journal)):
  if any(v is None or v=='' for v in r.values()):continue
  if int(r['pc']) in pcs and int(r['phase'])==6:
   result.append([int(r[k]) for k in ['trace','pc','address','value','x','y']])
 return result

left=read(*sys.argv[1:3]);right=read(*sys.argv[3:5])
report={'referenceWrites':len(left),'candidateWrites':len(right),'byteExact':left==right,'tuple':'trace frame, writer PC, screen address, restored byte, X, Y','referenceSha256':hashlib.sha256(json.dumps(left).encode()).hexdigest(),'candidateSha256':hashlib.sha256(json.dumps(right).encode()).hexdigest(),'firstDifference':next(([a,b] for a,b in zip(left,right) if a!=b),None)}
print(json.dumps(report,indent=2))
if '--assert' in sys.argv:
 assert left and left==right,'capital shell restore stores differ'
