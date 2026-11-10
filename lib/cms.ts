import { env } from 'cloudflare:workers';
import seed from '../site/content.json';
import { validatePost, requireSameOrigin } from './content.mjs';

type Identity = {userId:string,email:string,name:string,role:'owner'|'editor'|'visitor'};
type PostRow = {id:string,round:number,kind:string,draft_json:string,live_json:string|null,version:number,updated_by:string,updated_at:string,published_at:string|null};
function db() { if(!env.DB) throw new Error('게시글 저장소가 연결되지 않았습니다.'); return env.DB; }
function problem(message:string,status=400) { return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}}); }
function json(data:unknown) { return Response.json(data,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
function identity(request:Request): Omit<Identity,'role'>|null {
  const userId=request.headers.get('oai-authenticated-user-id'), email=request.headers.get('oai-authenticated-user-email');
  if(!userId || !email) return null;
  let name=request.headers.get('oai-authenticated-user-full-name')||email;
  if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8') { try{name=decodeURIComponent(name);}catch{name=email;} }
  return {userId,email:email.trim().toLowerCase(),name};
}
export async function getRole(request:Request,claim=false):Promise<Identity|null> {
  const user=identity(request);if(!user)return null;
  const database=db();
  let owner=await database.prepare('SELECT user_id FROM site_owner WHERE key = ?').bind('owner').first<{user_id:string}>();
  // Only the verified Site owner's configured email can bind the first stable ID.
  if(!owner && claim && env.ITDA_OWNER_EMAIL && user.email===env.ITDA_OWNER_EMAIL.trim().toLowerCase()) {
    await database.prepare('INSERT OR IGNORE INTO site_owner (key,user_id) VALUES (?,?)').bind('owner',user.userId).run();
    owner=await database.prepare('SELECT user_id FROM site_owner WHERE key = ?').bind('owner').first<{user_id:string}>();
  }
  if(owner?.user_id===user.userId) return {...user,role:'owner'};
  if(claim) {
    await database.batch([
      database.prepare('INSERT INTO editors (user_id,email,name,active,joined_at) SELECT ?,?,?,1,? WHERE EXISTS (SELECT 1 FROM editor_invitations WHERE email=?) ON CONFLICT(user_id) DO UPDATE SET active=1,email=excluded.email,name=excluded.name')
        .bind(user.userId,user.email,user.name,new Date().toISOString(),user.email),
      database.prepare('DELETE FROM editor_invitations WHERE email=? AND EXISTS (SELECT 1 FROM editors WHERE user_id=? AND active=1)').bind(user.email,user.userId),
    ]);
  }
  const member=await database.prepare('SELECT active FROM editors WHERE user_id=?').bind(user.userId).first<{active:number}>();
  return {...user,role:member?.active===1?'editor':'visitor'};
}
async function seedOnce(userId:string) {
  const database=db();
  await database.batch(seed.map(post=>database.prepare('INSERT OR IGNORE INTO archive_posts (id,round,kind,draft_json,live_json,version,updated_by,updated_at,published_at) VALUES (?,?,?,?,?,1,?,?,?)').bind(post.id,post.round,post.kind,JSON.stringify(post),JSON.stringify(post),userId,new Date().toISOString(),new Date().toISOString())));
}
export async function publicPosts() {
  const rows=await db().prepare('SELECT id,round,kind,live_json FROM archive_posts').all<Pick<PostRow,'id'|'round'|'kind'|'live_json'>>();
  const map=new Map<string,any>(seed.map(p=>[p.id,p]));
  for(const row of rows.results) { if(row.live_json) map.set(row.id, {...JSON.parse(row.live_json),id:row.id,round:row.round,kind:row.kind}); else map.delete(row.id); }
  return [...map.values()];
}
export async function getAdminPost(id:string) { return db().prepare('SELECT * FROM archive_posts WHERE id=?').bind(id).first<PostRow>(); }
export async function api(request:Request,path:string):Promise<Response> {
  const read=request.method==='GET';
  let raw='';
  if(!read) {
    // Finish reading a bounded body before an early rejection or D1 await.
    // This also prevents unread request streams from affecting the next request.
    if(request.body) {
      const reader=request.body.getReader(), decoder=new TextDecoder();let size=0;
      while(true) { const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
        if(size>200000) {await reader.cancel();return problem('요청 내용이 너무 큽니다.',413);}
        raw+=decoder.decode(part.value,{stream:true});
      }
      raw+=decoder.decode();
    }
    if(raw.length>65000)return problem('요청 내용이 너무 큽니다.',413);
    try{requireSameOrigin(request);}catch(e){return problem((e as Error).message,403);}
  }
  const user=await getRole(request,path==='/session');
  if(!user) return problem('로그인이 필요합니다.',401);
  if(path==='/session' && read) {
    if(user.role!=='visitor') await seedOnce(user.userId);
    return json({user});
  }
  if(user.role==='visitor')return problem('운영진 글쓰기 권한이 없습니다. 관리자에게 로그인 이메일을 알려 주세요.',403);
  if(path==='/posts' && read) {
    const rows=await db().prepare('SELECT * FROM archive_posts ORDER BY round,kind,id').all<PostRow>();
    return json({posts:rows.results.map(row=>({id:row.id,round:row.round,kind:row.kind,content:JSON.parse(row.draft_json),live:row.live_json?JSON.parse(row.live_json):null,version:row.version,updatedAt:row.updated_at,publishedAt:row.published_at}))});
  }
  if(path==='/members' && read) {
    if(user.role!=='owner')return problem('관리자만 운영진 권한을 관리할 수 있습니다.',403);
    const [members,invitations]=await Promise.all([
      db().prepare('SELECT user_id,email,name,active,joined_at FROM editors ORDER BY joined_at').all(),
      db().prepare('SELECT email,created_at FROM editor_invitations ORDER BY created_at').all(),
    ]);
    return json({members:members.results,invitations:invitations.results});
  }
  if(read)return problem('요청한 기능을 찾을 수 없습니다.',404);
  if(request.method!=='POST')return problem('지원하지 않는 요청 방식입니다.',405);
  let input:any;try{input=JSON.parse(raw);}catch{return problem('입력 내용을 확인해 주세요.');}
  if(!input||typeof input!=='object'||Array.isArray(input))return problem('입력 내용을 확인해 주세요.');
  if(path==='/posts') {
    let content:any;try{content=validatePost(input.content);}catch(e){return problem((e as Error).message);}
    const action=input.action;
    if(!['save','publish','unpublish'].includes(action))return problem('저장 방식을 확인해 주세요.');
    const id=typeof input.id==='string'?input.id:'';
    if(!id || !/^[a-z0-9-]{1,70}$/.test(id))return problem('글 주소를 확인해 주세요.');
    const previous=await getAdminPost(id);
    if(!previous && (content.kind!=='story' || !id.startsWith('story-')))return problem('새 글은 프로젝트 기록으로 작성해 주세요.');
    if(previous && (previous.round!==content.round || previous.kind!==content.kind))return problem('기존 글의 회차·종류는 변경할 수 없습니다.');
    if(!Number.isSafeInteger(input.version)||input.version<0)return problem('글 버전을 확인해 주세요.');
    if((previous?.version??0)!==input.version)return problem('다른 운영진이 수정했어요. 작성 중인 내용을 복사한 뒤 목록을 새로 불러와 주세요.',409);
    const now=new Date().toISOString(), text=JSON.stringify({...content,id});
    const live=action==='publish'?text:action==='unpublish'?null:(previous?.live_json??null);
    const publishedAt=action==='publish'?now:action==='unpublish'?null:(previous?.published_at??null);
    const database=db();
    const change=previous
      ? database.prepare('UPDATE archive_posts SET draft_json=?,live_json=?,version=version+1,updated_by=?,updated_at=?,published_at=? WHERE id=? AND version=?').bind(text,live,user.userId,now,publishedAt,id,input.version)
      : database.prepare('INSERT OR IGNORE INTO archive_posts (id,round,kind,draft_json,live_json,version,updated_by,updated_at,published_at) VALUES (?,?,?,?,?,1,?,?,?)').bind(id,content.round,content.kind,text,live,user.userId,now,publishedAt);
    const results=await database.batch([
      change,
      database.prepare('INSERT INTO archive_revisions (post_id,version,content_json,action,actor_id,created_at) SELECT id,version,draft_json,?,?,? FROM archive_posts WHERE id=? AND changes()=1').bind(action,user.userId,now,id),
    ]);
    if(results[0].meta.changes!==1)return problem('다른 운영진이 먼저 저장했어요. 내용을 복사한 뒤 목록을 다시 불러와 주세요.',409);
    return json({id,version:input.version+1,action});
  }
  if(path==='/members') {
    if(user.role!=='owner')return problem('관리자만 운영진 권한을 관리할 수 있습니다.',403);
    if(input.action==='invite') {
      const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
      if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return problem('이메일 주소를 확인해 주세요.');
      if(email===user.email)return problem('현재 계정은 이미 관리자입니다.');
      await db().prepare('INSERT OR IGNORE INTO editor_invitations (email,invited_by,created_at) VALUES (?,?,?)').bind(email,user.userId,new Date().toISOString()).run();
      return json({ok:true});
    }
    if(input.action==='cancel' && typeof input.email==='string') {
      await db().prepare('DELETE FROM editor_invitations WHERE email=?').bind(input.email.toLowerCase()).run();return json({ok:true});
    }
    if(input.action==='revoke' && typeof input.userId==='string' && input.userId!==user.userId) {
      await db().batch([
        db().prepare('DELETE FROM editor_invitations WHERE email IN (SELECT email FROM editors WHERE user_id=?)').bind(input.userId),
        db().prepare('UPDATE editors SET active=0 WHERE user_id=?').bind(input.userId),
      ]);return json({ok:true});
    }
    return problem('권한 요청을 확인해 주세요.');
  }
  return problem('요청한 기능을 찾을 수 없습니다.',404);
}
