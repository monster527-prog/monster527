from pathlib import Path,PurePosixPath
import argparse,json,zipfile,hashlib,stat,re
p=argparse.ArgumentParser();p.add_argument('--archive',required=True);p.add_argument('--output',required=True);a=p.parse_args()
root=Path(a.output).resolve()
if root.exists():raise SystemExit('Restore staging folder already exists')
uuid=r'[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}'
world=r'(?:ahmn|middle-earth|anyeonsa|unnamed-1|unnamed-2)'
patterns=[rf'worlds/{world}/documents/{uuid}/(?:original\.(?:pdf|txt|md)|text\.txt|metadata\.json|proposal-decision\.json)',rf'worlds/{world}/documents/{uuid}/extractions/{uuid}/(?:text\.txt|extraction\.json)',rf'worlds/{world}/approvals/{uuid}\.json',rf'chats/{world}/(?:marcelo|paul)/{uuid}/(?:context|request|result|proposal)\.json']
with zipfile.ZipFile(a.archive) as z:
 infos=z.infolist()
 if len(infos)>10000:raise SystemExit('Too many files')
 if len({i.filename for i in infos})!=len(infos):raise SystemExit('Duplicate ZIP paths')
 if sum(i.file_size for i in infos)>512*1024*1024:raise SystemExit('Expanded archive exceeds 512 MiB')
 if any(i.file_size>64*1024*1024 for i in infos):raise SystemExit('One file exceeds 64 MiB')
 by_name={i.filename:i for i in infos}
 if 'BACKUP-MANIFEST.json' not in by_name or by_name['BACKUP-MANIFEST.json'].file_size>4*1024*1024:raise SystemExit('Missing/oversized manifest')
 m=json.loads(z.read('BACKUP-MANIFEST.json'))
 if m.get('schema')!=1 or not isinstance(m.get('files'),list):raise SystemExit('Invalid manifest')
 expected={}
 for item in m['files']:
  rel=item.get('path','')
  if rel in expected or not any(re.fullmatch(pattern,rel) for pattern in patterns):raise SystemExit('Unexpected data path')
  if not isinstance(item.get('bytes'),int) or not re.fullmatch('[a-f0-9]{64}',item.get('sha256','')):raise SystemExit('Invalid manifest record')
  expected[rel]=item
 if set(by_name)-{'BACKUP-MANIFEST.json','RESTORE.txt'}!={'world-lab/'+rel for rel in expected}:raise SystemExit('Archive contents do not match manifest')
 for info in infos:
  if info.is_dir() or stat.S_ISLNK(info.external_attr>>16):raise SystemExit('Directories/symlinks are not accepted')
  if '\\' in info.filename or '..' in PurePosixPath(info.filename).parts or info.filename.startswith('/'):raise SystemExit('Unsafe ZIP path')
 root.mkdir(parents=True)
 for rel,item in expected.items():
  target=root.joinpath(*PurePosixPath(rel).parts);target.parent.mkdir(parents=True,exist_ok=True);h=hashlib.sha256();size=0
  with z.open('world-lab/'+rel) as src,target.open('xb') as dst:
   while True:
    chunk=src.read(65536)
    if not chunk:break
    size+=len(chunk)
    if size>64*1024*1024:raise SystemExit('File too large')
    dst.write(chunk);h.update(chunk)
  if size!=item['bytes'] or h.hexdigest()!=item['sha256']:raise SystemExit('Backup checksum mismatch')
print(json.dumps({'files':len(expected)}))
