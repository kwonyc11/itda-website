import main from '../site/main.html?raw';
import first from '../site/archive-1.html?raw';
import second from '../site/archive-2.html?raw';
import third from '../site/archive-3.html?raw';
import {escapeHtml as e,renderBody,postPath,kindNames} from './content.mjs';

const templates:Record<number,string>={1:first,2:second,3:third};
export const sharedHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
export function page(html:string,status=200,privatePage=false) {
  return new Response(html,{status,headers:{...sharedHeaders,...(privatePage?{'X-Robots-Tag':'noindex, nofollow'}:{})}});
}
function editions(round:number,kind='') {
  return `<nav class="archive-editions" aria-label="학술제 회차"><p>학술제 회차 선택</p><div>${[1,2,3].map(n=>`<a href="/archive/${n}/${kind && !(kind==='interview'&&n===1)?kind+'/':''}"${n===round?' aria-current="page"':''}>제${n}회</a>`).join('')}</div></nav>`;
}
function summary(post:any,compact=false) {
  const label=(kindNames as any)[post.kind];
  return `<article class="record-summary${post.kind==='award'?' award-summary':''}"><p class="record-label">${label}</p>${post.kind==='award'?`<h${compact?'4':'3'}>${e(post.title)}</h${compact?'4':'3'}>${post.credit?`<p class="record-credit">${e(post.credit)}</p>`:''}`:''}<p>${e(post.summary)}</p><a class="text-link" href="${postPath(post)}" aria-label="제${post.round}회 ${label} 자세히 보기">${post.kind==='guide'?'프로젝트 가이드라인 보기':post.kind==='award'?'대상작 자세히 보기':'자세히 보기'} <span aria-hidden="true">→</span></a></article>`;
}
export function home(posts:any[]) {
  let html=main;
  for(const n of [1,2,3]) {
    const cards=['guide','award'].map(kind=>posts.find(p=>p.round===n&&p.kind===kind)).filter(Boolean).map(post=>summary(post,true)).join('');
    html=html.replace(`<!--ARCHIVE_${n}-->`,`<a class="text-link archive-more" href="/archive/${n}/">제${n}회 프로젝트 소개 <span aria-hidden="true">→</span></a><div class="record-pair">${cards}</div>`);
  }
  return html;
}
export function archive(round:number,posts:any[]) {
  let html=templates[round];
  for(const kind of ['guide','award','interview']) {
    const post=posts.find(p=>p.round===round&&p.kind===kind);
    html=html.replace(`<!--POST_${kind.toUpperCase()}-->`,post?`<section class="archive-section" id="${kind}" aria-label="${(kindNames as any)[kind]}">${summary(post)}</section>`:'');
  }
  const stories=posts.filter(p=>p.round===round&&p.kind==='story');
  return html.replace('<!--STORIES-->',stories.length?`<section class="archive-section"><h2>프로젝트 기록</h2><div class="story-list">${stories.map(p=>`<article><h3><a href="${postPath(p)}">${e(p.title)} <span aria-hidden="true">→</span></a></h3><p>${e(p.summary)}</p></article>`).join('')}</div></section>`:'');
}
export function article(post:any,preview=false) {
  let html=templates[post.round];
  const title=`${post.title} | 제${post.round}회 ITDA`;
  html=html.replace(/<title>.*?<\/title>/,`<title>${e(title)}</title>`)
    .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*/,`$1${e(post.summary)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/,`$1${e(title)}`)
    .replace(/https:\/\/itda-academy.kwonyc5820.chatgpt.site\/archive\/[123]\//g,`https://itda-academy.kwonyc5820.chatgpt.site${postPath(post)}`);
  const content=`<main id="main"><div class="container archive-container"><nav class="archive-breadcrumb" aria-label="현재 위치"><a href="/">ITDA</a><span>/</span><a href="/archive/${post.round}/">제${post.round}회 학술제</a><span>/</span><span aria-current="page">${(kindNames as any)[post.kind]}</span></nav>${editions(post.round,post.kind==='story'?'':post.kind)}${preview?'<p class="draft-banner">저장된 초안 미리보기 · 방문자에게 공개되지 않은 내용입니다.</p>':''}<header class="article-hero"><p class="label">제${post.round}회 · ${(kindNames as any)[post.kind]}</p><h1>${e(post.title)}</h1>${post.credit?`<p class="article-credit">${e(post.credit)}</p>`:''}<p class="archive-lead">${e(post.summary)}</p></header><article class="article-body">${renderBody(post.body)}</article>${post.source?`<aside class="source-note"><p>자료 기준</p><span>${e(post.source)}</span></aside>`:''}<a class="archive-back" href="/archive/${post.round}/"><span aria-hidden="true">←</span> 제${post.round}회 학술제로 돌아가기</a></div></main>`;
  return html.replace(/<main id="main">[\s\S]*?<\/main>/,content);
}
export function admin() {
  return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>운영진 글 관리 | ITDA</title><link rel="icon" href="/assets/logo.png"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><link rel="stylesheet" href="/style.css?v=20261103"><link rel="stylesheet" href="/cms.css?v=20261103-1"></head><body class="admin-page"><a class="skip-link" href="#main">본문으로 바로 가기</a><header class="nav"><div class="container nav-inner"><a href="/" class="logo" aria-label="ITDA 홈페이지"><img src="/assets/logo.png" alt="ITDA"></a><a href="/">홈페이지로 돌아가기 <span aria-hidden="true">↗</span></a></div></header><main class="container admin-container" id="main"><header class="admin-heading"><div><p class="label">ITDA · EDITOR</p><h1>운영진 글 관리</h1><p>학술제 가이드와 대상작, 프로젝트 기록을 작성하고 공개하세요.</p></div><div id="account"></div></header><div id="status" class="admin-status" role="status" aria-live="polite">로그인 상태를 확인하고 있어요.</div><section id="login-panel" hidden><h2>운영진 로그인</h2><p>글쓰기 권한을 받은 ChatGPT 계정으로 로그인해 주세요.</p><a class="btn btn-primary" href="/signin-with-chatgpt?return_to=%2Fadmin%2F" target="_top">ChatGPT로 로그인 <span aria-hidden="true">→</span></a></section><section id="access-panel" hidden><h2>글쓰기 권한이 필요해요.</h2><p>관리자에게 현재 로그인 이메일을 알려 주세요. 권한을 받은 뒤 이 페이지를 다시 열면 글을 작성할 수 있어요.</p><a class="text-link" href="/admin/">권한 다시 확인 →</a></section><section id="workspace" hidden><details id="permissions" class="permissions" hidden><summary>운영진 권한 관리</summary><p>운영진이 ChatGPT 로그인에 사용하는 이메일을 등록하세요. 메일 발송 없이 글쓰기 권한만 부여됩니다.</p><form id="invite-form"><label for="invite-email">운영진 로그인 이메일</label><div class="invite-line"><input id="invite-email" type="email" maxlength="254" required placeholder="name@example.com"><button class="btn btn-primary" type="submit">권한 부여</button></div></form><div id="member-list"></div></details><div class="editor-layout"><aside class="editor-sidebar"><div class="sidebar-heading"><h2>학술제 기록</h2><button class="small-button" id="reload" type="button">새로고침</button></div><div id="post-list"></div><button class="btn btn-ghost" type="button" id="new-post">+ 프로젝트 기록 작성</button></aside><section class="editor-panel"><div id="empty-editor"><h2>작성할 글을 선택해 주세요.</h2><p>대상작은 문제·접근 방법·결과를 중심으로 정리하고, 공개 가능한 자료 링크를 함께 남겨 주세요.</p></div><form id="post-form" hidden><div class="editor-meta"><span id="post-kind"></span><span id="post-state"></span></div><div class="editor-round" id="round-field"><label for="post-round">학술제 회차</label><select id="post-round"><option value="1">제1회</option><option value="2">제2회</option><option value="3">제3회</option></select></div><label for="post-title">제목</label><input id="post-title" maxlength="120" required><label for="post-summary">메인에 보여줄 요약</label><textarea id="post-summary" rows="3" maxlength="400" required></textarea><label for="post-credit">팀·소속 또는 인터뷰 대상 <span class="muted">(선택)</span></label><input id="post-credit" maxlength="160"><label for="post-body">본문</label><p class="field-help" id="body-help">문단은 빈 줄로 나눠요. ‘## 제목’, ‘- 목록’, ‘[자료명](https://...)’ 형식을 쓸 수 있어요.</p><textarea id="post-body" rows="18" maxlength="50000" aria-describedby="body-help" required></textarea><label for="post-source">자료 출처·확인 범위 <span class="muted">(선택)</span></label><textarea id="post-source" rows="2" maxlength="1200"></textarea><div class="editor-actions"><button class="btn btn-ghost" type="submit" value="save">초안 저장</button><button class="btn btn-ghost" type="button" id="preview">작성 내용 미리보기</button><button class="btn btn-primary" type="submit" value="publish">홈페이지에 공개</button><button class="small-button" type="button" id="unpublish">공개 내리기</button></div><p class="field-help">초안 저장은 현재 공개된 글을 바꾸지 않아요. 공개하면 메인 요약과 상세 페이지에 함께 반영돼요.</p><div id="editor-preview" class="editor-preview" hidden tabindex="-1"></div></form></section></div></section></main><script type="module" src="/admin.js?v=20261103-1"></script></body></html>`;
}
export function notFound() {return `<!doctype html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>페이지를 찾을 수 없습니다 | ITDA</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><link rel="stylesheet" href="/style.css"><main class="container" style="padding-block:150px"><h1>페이지를 찾을 수 없습니다.</h1><p>공개된 글이 없거나 주소가 변경됐을 수 있어요.</p><a class="text-link" href="/">ITDA 홈페이지로 →</a></main></html>`;}
