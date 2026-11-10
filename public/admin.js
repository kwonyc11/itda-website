import {escapeHtml as e,renderBody,kindNames,validatePost} from '/cms-content.mjs';
const $=id=>document.getElementById(id);
let posts=[],selected=null,dirty=false,busy=false;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
async function call(path,body){
  const r=await fetch('/api/admin'+path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok){const error=new Error(data.error||'요청을 처리하지 못했어요.');error.status=r.status;throw error;}return data;
}
function changed(){dirty=true;$('post-state').textContent='저장하지 않은 변경사항';}
function canLeave(){return !dirty||confirm('저장하지 않은 내용이 있어요. 다른 글을 열까요?');}
function drawList(){
  const order={guide:0,award:1,interview:2,story:3};
  $('post-list').innerHTML=[1,2,3].map(round=>`<section class="post-group"><h3>제${round}회</h3>${posts.filter(p=>p.round===round).sort((a,b)=>order[a.kind]-order[b.kind]).map(p=>`<button type="button" class="post-select" data-id="${e(p.id)}"${p.id===selected?.id?' aria-current="true"':''}>${e(p.kind==='story'?p.content.title:kindNames[p.kind])}<small>${p.live?'공개됨':'비공개 초안'}${p.live&&JSON.stringify(p.live)!==JSON.stringify(p.content)?' · 수정 초안 있음':''}</small></button>`).join('')}</section>`).join('');
  $('post-list').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{if(canLeave())choose(posts.find(p=>p.id===button.dataset.id));}));
}
function choose(post){
  selected=structuredClone(post);dirty=false;$('empty-editor').hidden=true;$('post-form').hidden=false;$('editor-preview').hidden=true;
  for(const key of ['title','summary','credit','body','source'])$('post-'+key).value=post.content[key]||'';
  $('post-round').value=post.round;$('post-round').disabled=post.version>0;$('round-field').hidden=post.kind!=='story';
  $('post-kind').textContent=`제${post.round}회 · ${kindNames[post.kind]}`;
  $('post-state').textContent=post.live?'공개 중 · 수정 후 초안 저장 가능':'비공개 초안';
  $('unpublish').hidden=!post.live;drawList();
}
function content(){return validatePost({round:Number($('post-round').value),kind:selected.kind,...Object.fromEntries(['title','summary','credit','body','source'].map(key=>[key,$('post-'+key).value]))});}
async function refresh(id){const data=await call('/posts');posts=data.posts;if(id){const post=posts.find(p=>p.id===id);if(post)choose(post);}drawList();}
function busyState(value){busy=value;$('post-form').querySelectorAll('button').forEach(button=>button.disabled=value);}
async function save(action){
  if(busy||!selected)return;
  let value;try{value=content();}catch(error){status(error.message,true);return;}
  if(action==='unpublish'&&!confirm('홈페이지에서 이 글을 내릴까요? 작성 내용은 초안으로 보관돼요.'))return;
  busyState(true);status(action==='publish'?'홈페이지에 반영하고 있어요.':'저장하고 있어요.');
  try{
    const result=await call('/posts',{id:selected.id,version:selected.version,action,content:value});dirty=false;
    await refresh(result.id);status(action==='publish'?'공개했어요. 메인 요약과 상세 페이지에 반영됐어요.':action==='unpublish'?'공개를 내렸어요. 작성 내용은 초안으로 남아 있어요.':'초안을 저장했어요. 현재 공개된 글은 그대로예요.');
  }catch(error){status(error.message,true);}finally{busyState(false);}
}
$('post-form').addEventListener('input',changed);
$('post-form').addEventListener('submit',event=>{event.preventDefault();if($('post-form').reportValidity())save(event.submitter?.value||'save');});
$('preview').addEventListener('click',()=>{
  try{const p=content();$('editor-preview').innerHTML=`<p class="preview-label">작성 내용 미리보기 · 아직 저장되지 않은 내용도 포함됩니다.</p><h2 class="preview-title">${e(p.title)}</h2>${p.credit?`<p>${e(p.credit)}</p>`:''}<p class="archive-lead">${e(p.summary)}</p><div class="article-body">${renderBody(p.body)}</div>${p.source?`<aside class="source-note"><p>자료 기준</p>${e(p.source)}</aside>`:''}`;$('editor-preview').hidden=false;$('editor-preview').focus();}catch(error){status(error.message,true);}
});
$('unpublish').addEventListener('click',()=>save('unpublish'));
$('reload').addEventListener('click',async()=>{if(!canLeave())return;try{await refresh(selected?.id);status('최신 글을 불러왔어요.');}catch(error){status(error.message,true);}});
$('new-post').addEventListener('click',()=>{
  if(!canLeave())return;
  choose({id:'story-'+crypto.randomUUID(),round:1,kind:'story',content:{round:1,kind:'story',title:'',summary:'',credit:'',body:'',source:''},live:null,version:0});$('post-title').focus();
});
async function loadMembers(){
  const data=await call('/members');
  $('member-list').innerHTML=`<h3>등록된 운영진</h3>${data.members.length?data.members.map(m=>`<div class="permission-row"><span>${e(m.name)}<small>${e(m.email)} · ${m.active?'글쓰기 가능':'권한 해제됨'}</small></span>${m.active?`<button type="button" class="small-button" data-user="${e(m.user_id)}">권한 해제</button>`:''}</div>`).join(''):'<p class="field-help">아직 로그인한 운영진이 없어요.</p>'}<h3>로그인 대기</h3>${data.invitations.length?data.invitations.map(i=>`<div class="permission-row"><span>${e(i.email)}<small>같은 이메일로 첫 로그인 시 글쓰기 권한 적용</small></span><button type="button" class="small-button" data-email="${e(i.email)}">등록 취소</button></div>`).join(''):'<p class="field-help">대기 중인 이메일이 없어요.</p>'}`;
  $('member-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{
    b.disabled=true;try{await call('/members',b.dataset.user?{action:'revoke',userId:b.dataset.user}:{action:'cancel',email:b.dataset.email});await loadMembers();status('운영진 권한을 변경했어요.');}catch(error){status(error.message,true);b.disabled=false;}
  }));
}
$('invite-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{await call('/members',{action:'invite',email:$('invite-email').value});$('invite-email').value='';await loadMembers();status('글쓰기 권한을 등록했어요. 해당 운영진에게 이 페이지 주소를 알려 주세요.');}catch(error){status(error.message,true);}finally{button.disabled=false;}
});
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function start(){
  try{
    const {user}=await call('/session');$('account').innerHTML=`${e(user.email)} · ${user.role==='owner'?'관리자':user.role==='editor'?'운영진':'일반 계정'}<a href="/signout-with-chatgpt?return_to=%2Fadmin%2F" target="_top">로그아웃</a>`;
    if(user.role==='visitor'){$('access-panel').hidden=false;status('현재 계정에 글쓰기 권한이 없어요.');return;}
    $('workspace').hidden=false;await refresh();choose(posts.find(p=>p.id==='3-award')||posts[0]);
    if(user.role==='owner'){$('permissions').hidden=false;await loadMembers();}
    status('기존 글을 수정하거나 새 프로젝트 기록을 작성할 수 있어요.');
  }catch(error){if(error.status===401){$('login-panel').hidden=false;status('방문자는 로그인 없이 모든 공개 글을 볼 수 있어요.');}else{status(error.message,true);}}
}
start();
