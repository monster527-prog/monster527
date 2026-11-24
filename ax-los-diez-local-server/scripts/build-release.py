from pathlib import Path
import argparse,zipfile
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()
root=Path(__file__).resolve().parent.parent;out=Path(a.output).resolve()
if root==out or root in out.parents:raise SystemExit('Choose output outside application folder')
allowed_dirs={'assets','lib','scripts','tests','verification','vendor','data-samples'}
allowed_roots={'.gitignore','README.md','먼저읽어주세요.txt','START-WINDOWS.cmd','START-MAC-LINUX.command','CHECK-PDF-WINDOWS.cmd','IMPORT-OLD-DATA.cmd','package.json','index.html','style.css','app.js','world-lab.js','agent-chat.js','reference-books.js','server.mjs','distribution-scan.json'}
exclude={'saved-world-lab','private-settings','node_modules','.git','__pycache__'}
files=[f for f in root.rglob('*') if f.is_file() and (f.relative_to(root).parts[0] in allowed_dirs or str(f.relative_to(root)) in allowed_roots) and not any(x in exclude or x.startswith('.importing-') or x.startswith('.env') for x in f.relative_to(root).parts) and f.name!='pdf-diagnostics.json' and f.suffix not in {'.zip','.pem','.key'}]
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'x',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(files):
  data=f.read_bytes()
  if f.suffix=='.cmd':data=data.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
  z.writestr('AX-LOS-DIEZ-AGENT-CHAT/'+str(f.relative_to(root)),data)
print(f'Created {out.name}: {len(files)} files, {out.stat().st_size} bytes. Runtime user data excluded.')
