// Isolated browser-test preload. Never loaded by production startup scripts.
import {appendFile} from 'node:fs/promises';
let count=0;const real=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://api.openai.com/v1/responses')){
  count++;const body=JSON.parse(options.body);if(process.env.AX_TEST_CALL_LOG)await appendFile(process.env.AX_TEST_CALL_LOG,JSON.stringify({model:body.model,input:body.input,instructions:body.instructions})+'\n');
  return Response.json({id:'BROWSER-TEST-RESPONSE-'+count,model:'TEST-DOUBLE-NOT-A-LIVE-MODEL',status:'completed',output:[{type:'message',content:[{type:'output_text',text:body.instructions.includes('Paul Rudolph')?'TEST DOUBLE — Paul 독립 평가. 원본에 기억 양도 금지 규칙이 있습니다.':'TEST DOUBLE — Marcelo의 소주제는 기억의 보관 방식입니다. <script>window.bad=true</script>'}]}],usage:{input_tokens:24,output_tokens:12}});
 }
 return real(url,options);
};
