import {api,publicPosts,getRole,getAdminPost} from '../../lib/cms';
import {home,archive,article,admin,page,notFound} from '../../lib/render';

export const dynamic='force-dynamic';
export async function GET(request:Request) {return handle(request);}
export async function POST(request:Request) {return handle(request);}
async function handle(request:Request):Promise<Response> {
  const url=new URL(request.url), path=url.pathname.replace(/\/+$/,'')||'/';
  try {
    if(path.startsWith('/api/admin/')) return await api(request,path.slice('/api/admin'.length));
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
    if(path==='/admin')return page(admin(),200,true);
    if(path==='/admin/preview') {
      const user=await getRole(request);if(!user||user.role==='visitor')return page(notFound(),403,true);
      const post=await getAdminPost(url.searchParams.get('id')||'');
      return post?page(article({...JSON.parse(post.draft_json),id:post.id,round:post.round,kind:post.kind},true),200,true):page(notFound(),404,true);
    }
    if(path==='/index.html')return Response.redirect(new URL('/'+url.search,url),301);
    if(path==='/')return page(home(await publicPosts()));
    const match=path.match(/^\/archive\/([123])(?:\/(guide|award|interview)|\/posts\/([a-z0-9-]+))?(?:\/index\.html)?$/);
    if(match) {
      const posts=await publicPosts(), round=Number(match[1]);
      if(!match[2]&&!match[3])return page(archive(round,posts));
      const post=posts.find(p=>p.round===round&&(match[3]?p.id===match[3]&&p.kind==='story':p.kind===match[2]));
      return post?page(article(post)):page(notFound(),404);
    }
    return page(notFound(),404);
  } catch(error) {
    console.error('ITDA request failed',error);
    if(path.startsWith('/api/'))return Response.json({error:'처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});
    return new Response('일시적으로 페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  }
}
