import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderBody,validatePost,safeUrl,requireSameOrigin} from '../lib/content.mjs';
test('editor content cannot inject active HTML or script links',()=>{
  const html=renderBody('## <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n[자료](https://example.com/a?q=1&b=2)');
  assert(!html.includes('<script>'));assert(!html.includes('<img'));assert(!html.includes('href="javascript:'));
  assert(html.includes('href="https://example.com/a?q=1&amp;b=2"'));assert(html.includes('rel="noopener noreferrer"'));
  assert.equal(safeUrl('data:text/html,hello'),null);
});
test('only expected rounds and article types are accepted',()=>{
  const sample={round:2,kind:'award',title:'대상작',summary:'요약',body:'본문'};
  assert.equal(validatePost(sample).title,'대상작');
  for(const override of [{round:4},{round:1,kind:'interview'},{kind:'owner'},{title:''},{summary:'x'.repeat(401)},{body:'x'.repeat(50001)}])assert.throws(()=>validatePost({...sample,...override}));
});
test('writes reject missing or cross-site origins and non-JSON requests',()=>{
  const req=(headers)=>new Request('https://itda.example/api/admin/posts',{method:'POST',headers});
  assert.doesNotThrow(()=>requireSameOrigin(req({origin:'https://itda.example','content-type':'application/json'})));
  for(const h of [{},{origin:'https://evil.example','content-type':'application/json'},{origin:'https://itda.example','content-type':'text/plain'},{origin:'https://itda.example','content-type':'application/json','sec-fetch-site':'cross-site'}])assert.throws(()=>requireSameOrigin(req(h)));
});
