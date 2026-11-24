const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13)){
 console.error('Node.js 22.13+ required. Install current Node.js LTS: https://nodejs.org');
 process.exit(1);
}
