"""Refresh factual reference fields only; does not publish lessons or write to the LMS DB."""
from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import json, time, hashlib
root=Path(__file__).resolve().parent.parent
output=root/'content/references/pubchem-element-properties.json'
existing=json.loads(output.read_text(encoding='utf-8')) if output.exists() else {}
lock=Lock(); next_request=0.0

def fetch(z):
 global next_request
 if str(z) in existing:return z,existing[str(z)]
 with lock:
  delay=max(0,next_request-time.monotonic())
  if delay:time.sleep(delay)
  next_request=time.monotonic()+0.45
 url=f'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/element/{z}/JSON'
 try:
  raw=urlopen(Request(url,headers={'User-Agent':'Vela educational reference snapshot (no learner data)'}),timeout=20).read();data=json.loads(raw)
  result={'sourceUrl':url,'retrieved':'2026-11-27','sha256':hashlib.sha256(raw).hexdigest(),'covalentRadius':None,'isotopes':[]}
  def values(info):return [s.get('String','').strip() for s in info.get('Value',{}).get('StringWithMarkup',[])]
  def walk(node):
   if isinstance(node,dict):
    heading=node.get('TOCHeading','')
    if heading=='Atomic Radius':
     for info in node.get('Information',[]):
      if 'Covalent' in info.get('Name','') and values(info) and result['covalentRadius'] is None:result['covalentRadius']=values(info)[0]
    if heading=='Isotope Mass and Abundance':
     for info in node.get('Information',[]):
      if info.get('Name')=='Isotope' and not result['isotopes']:result['isotopes']=values(info)[:30]
    for item in node.values():walk(item)
   elif isinstance(node,list):
    for item in node:walk(item)
  walk(data);return z,result
 except Exception as error:return z,{'error':type(error).__name__,'sourceUrl':url}

with ThreadPoolExecutor(max_workers=2) as pool:
 for future in as_completed([pool.submit(fetch,z) for z in range(1,119)]):
  z,value=future.result()
  if 'error' not in value:existing[str(z)]=value
  output.write_text(json.dumps(dict(sorted(existing.items(),key=lambda p:int(p[0]))),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  if len(existing)%20==0 or len(existing)==118:print('Reference records:',len(existing),'/ 118',flush=True)
print('Snapshot complete:',len(existing),'records; no database writes',flush=True)
