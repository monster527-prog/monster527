from pathlib import Path
import argparse,hashlib,json,zipfile
p=argparse.ArgumentParser();p.add_argument('--data-dir',required=True);p.add_argument('--output',required=True);a=p.parse_args()
root=Path(a.data_dir).resolve();out=Path(a.output).resolve()
if root==out or root in out.parents:raise SystemExit('Backup output must be outside live data')
out.parent.mkdir(parents=True,exist_ok=True)
files=sorted(f for f in root.rglob('*') if f.is_file() and not any(x.startswith('.staging-') for x in f.relative_to(root).parts) and not f.name.endswith('.tmp'))
manifest=[]
with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
 for f in files:
  data=f.read_bytes();name=str(f.relative_to(root));z.writestr('world-lab/'+name,data);manifest.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 z.writestr('BACKUP-MANIFEST.json',json.dumps({'schema':1,'files':manifest},ensure_ascii=False,indent=2))
 z.writestr('RESTORE.txt','서버를 멈춘 뒤 world-lab 폴더를 새 AX_WORLD_DATA_DIR 위치에 복원하고 서버를 시작하세요. 기존 데이터에 덮어쓰지 말고 별도 폴더에서 먼저 확인하세요.\n')
print(f'Backed up {len(files)} files')
