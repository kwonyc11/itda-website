export const kindNames = {guide:'프로젝트 가이드라인',award:'대상 수상작',interview:'수상자 인터뷰',story:'프로젝트 기록'};
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function inline(value) {
  const text = escapeHtml(value);
  return text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (all,label,url) => {
    const raw = url.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
    const valid = safeUrl(raw);
    return valid ? `<a href="${escapeHtml(valid)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (새 창)</span></a>` : all;
  }).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
}
export function renderBody(body = '') {
  const parts = []; let paragraph = []; let list = [];
  const flushP = () => { if(paragraph.length) { parts.push(`<p>${inline(paragraph.join('\n')).replace(/\n/g,'<br>')}</p>`); paragraph=[]; } };
  const flushL = () => { if(list.length) { parts.push(`<ul>${list.map(s=>`<li>${inline(s)}</li>`).join('')}</ul>`); list=[]; } };
  for(const line of body.replace(/\r/g,'').split('\n')) {
    if(!line.trim()) { flushP();flushL(); }
    else if(/^#{1,3}\s/.test(line)) { flushP();flushL(); const level=line.startsWith('### ')?3:2; parts.push(`<h${level}>${inline(line.replace(/^#{1,3}\s+/,''))}</h${level}>`); }
    else if(/^-\s/.test(line)) { flushP();list.push(line.slice(2)); }
    else { flushL();paragraph.push(line); }
  }
  flushP();flushL();return parts.join('\n');
}
export function validatePost(input) {
  if(!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('글 내용을 확인해 주세요.');
  const round = Number(input.round), kind = String(input.kind ?? '');
  if(![1,2,3].includes(round) || !Object.hasOwn(kindNames,kind)) throw new Error('회차와 글 종류를 확인해 주세요.');
  if(kind==='interview' && round===1) throw new Error('수상자 인터뷰는 제2·3회에만 등록할 수 있습니다.');
  const output = {round,kind};
  for(const [key,max] of [['title',120],['summary',400],['body',50000],['credit',160],['source',1200]]) {
    if(typeof input[key] !== 'string' && input[key] != null) throw new Error('입력값을 확인해 주세요.');
    const value=String(input[key]??'').trim();
    if(value.length>max) throw new Error(`${key==='body'?'본문':'입력 내용'}이 너무 깁니다. 최대 ${max.toLocaleString('ko-KR')}자입니다.`);
    if(['title','summary','body'].includes(key) && !value) throw new Error('제목·요약·본문을 모두 입력해 주세요.');
    output[key]=value;
  }
  return output;
}
export function requireSameOrigin(request) {
  if(request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new Error('같은 사이트에서 요청해 주세요.');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('JSON 요청만 허용됩니다.');
}
export function postPath(post) {
  return post.kind==='story' ? `/archive/${post.round}/posts/${encodeURIComponent(post.id)}/` : `/archive/${post.round}/${post.kind}/`;
}
