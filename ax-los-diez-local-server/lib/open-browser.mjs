import {execFile} from 'node:child_process';
export function openLocalBrowser(port){
 const url=`http://127.0.0.1:${port}/#chat`;
 const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
 // Called only after the server is listening. Never run a shell or interpolate user input.
 execFile(command,args,{timeout:10000,windowsHide:true},error=>{if(error)console.log('브라우저를 자동으로 열지 못했습니다. 직접 접속하세요: '+url);});
}
