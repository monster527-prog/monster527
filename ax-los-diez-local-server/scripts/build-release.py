from pathlib import Path
import argparse,zipfile
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()
root=Path(__file__).resolve().parent.parent;out=Path(a.output).resolve()
if root==out or root in out.parents:raise SystemExit('Choose output outside application folder')
exclude={'saved-world-lab','node_modules','.git','__pycache__'}
files=[f for f in root.rglob('*') if f.is_file() and not any(x in exclude or x.startswith('.importing-') or x.startswith('.env') for x in f.relative_to(root).parts) and f.name!='pdf-diagnostics.json' and f.suffix not in {'.zip','.pem','.key'}]
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(files):
  data=f.read_bytes()
  if f.suffix=='.cmd':data=data.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
  z.writestr('AX-LOS-DIEZ-PDF-RECOVERY/'+str(f.relative_to(root)),data)
print(f'Created {out.name}: {len(files)} files, {out.stat().st_size} bytes. Runtime user data excluded.')
