// Run only against the local built Worker; these headers emulate trusted Sites dispatch.
import assert from 'node:assert/strict';
import http from 'node:http';
const origin='http://127.0.0.1:8774';
const owner={'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'};
const editor={'oai-authenticated-user-id':'qa_editor','oai-authenticated-user-email':'qa-editor@example.test'};
async function publicPage(path,remaining=4) {
  return new Promise((resolve,reject)=>{
    const req=http.get(origin+path,{agent:false},res=>{let text='';res.setEncoding('utf8');res.on('data',part=>text+=part);res.on('end',()=>{if(res.statusCode>=300&&res.statusCode<400&&res.headers.location&&remaining>0){resolve(publicPage(new URL(res.headers.location,origin).pathname,remaining-1));}else{resolve({status:res.statusCode,text});}});});req.on('error',reject);
  });
}
async function api(path,identity={},body=null,headers={}) {
  // Fresh connections avoid a Windows Undici/workerd keep-alive race in local QA.
  return new Promise((resolve,reject)=>{
    const payload=body?JSON.stringify(body):null;
    const req=http.request(origin+'/api/admin'+path,{method:body?'POST':'GET',agent:false,headers:{...identity,...(body?{origin,'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{}),...headers}},res=>{
      let text='';res.setEncoding('utf8');res.on('data',part=>text+=part);res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(text)});}catch{reject(new Error(`${res.statusCode}: ${text}`));}});
    });req.on('error',reject);req.end(payload);
  });
}
assert.equal((await api('/posts')).status,401);
assert.equal((await api('/session',owner)).data.user.role,'owner');
await api('/members',owner,{action:'cancel',email:'qa-editor@example.test'});
await api('/members',owner,{action:'revoke',userId:'qa_editor'});
assert.equal((await api('/session',editor)).data.user.role,'visitor');
assert.equal((await api('/posts',editor)).status,403);
assert.equal((await api('/members',owner,{action:'invite',email:'qa-editor@example.test'},{origin:'https://evil.example'})).status,403);
assert.equal((await api('/members',owner,{action:'invite',email:'qa-editor@example.test'})).status,200);
assert.equal((await api('/session',editor)).data.user.role,'editor');
assert.equal((await api('/members',editor)).status,403);
assert.equal((await api('/members',editor,{action:'invite',email:'outsider@example.test'})).status,403);
const id='story-qa-'+Date.now(), content={round:3,kind:'story',title:'로컬 QA 기록',summary:'로컬 검수용',body:'## 문제\n검수용 본문 <script>alert(1)</script>',credit:'',source:''};
assert.equal((await api('/posts',editor,{id,version:0,action:'save',content})).status,200);
assert.equal((await publicPage(`/archive/3/posts/${id}/`)).status,404);
assert.equal((await api('/posts',editor,{id,version:1,action:'publish',content})).status,200);
let publicHtml=(await publicPage(`/archive/3/posts/${id}/`)).text;
assert(publicHtml.includes('로컬 QA 기록'));assert(!publicHtml.includes('<script>alert(1)</script>'));
const updated={...content,title:'변경된 초안'};
assert.equal((await api('/posts',editor,{id,version:2,action:'save',content:updated})).status,200);
publicHtml=(await publicPage(`/archive/3/posts/${id}/`)).text;
assert(publicHtml.includes('로컬 QA 기록'));assert(!publicHtml.includes('변경된 초안'));
assert.equal((await api('/posts',editor,{id,version:2,action:'publish',content:updated})).status,409);
assert.equal((await api('/posts',editor,{id,version:3,action:'publish',content:{...updated,round:2}})).status,400);
assert.equal((await api('/posts',editor,{id,version:3,action:'publish',content:updated})).status,200);
assert.equal((await api('/posts',editor,{id,version:4,action:'unpublish',content:updated})).status,200);
assert.equal((await publicPage(`/archive/3/posts/${id}/`)).status,404);
assert.equal((await api('/members',owner,{action:'revoke',userId:'qa_editor'})).status,200);
assert.equal((await api('/posts',editor)).status,403);
assert.equal((await api('/posts',editor,{id,version:5,action:'publish',content})).status,403);
assert.equal((await api('/session',{'oai-authenticated-user-id':'other_id','oai-authenticated-user-email':'seedy@sites.test'})).data.user.role,'visitor');
const routes=['/','/archive/1/','/archive/2/','/archive/3/','/archive/1/guide/','/archive/2/guide/','/archive/3/guide/','/archive/3/award/','/members/code/','/members/dat/','/members/dscover/','/members/ibas/','/members/insight/','/admin/'];
for(const path of routes)assert.equal((await publicPage(path)).status,200,path);
assert.equal((await publicPage('/archive/1/interview/')).status,404);
console.log('PASS: anonymous/role/CSRF protection, invitations/revocation, draft vs published, concurrent edits, XSS escaping, 14 public routes.');
