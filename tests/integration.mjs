// Runs against the local preview only. Creates synthetic accounts and removes them.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
const base=process.env.STASHBOX_TEST_URL||'http://127.0.0.1:5173';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Tests are restricted to loopback.');
const run=`qa${Date.now()}`;let checks=0;const ids=[];
function sql(command){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);}
async function call(path,method='GET',body,cookie='',extra={}){const r=await fetch(`${base}/api/${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined});const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data={error:raw};}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
function check(value,message){assert(value,message);checks++;console.log(`PASS ${message}`);}
async function signup(suffix,room=224){const r=await call('signup','POST',{name:`QA Student ${suffix}`,email:`${run}${suffix}@example.test`,studentId:`${run}${suffix}`,phone:'9000000000',room,password:'Test-password-482!'});check(r.status===200,`Signup ${suffix}`);ids.push(r.data.user.id);return {...r,user:r.data.user};}
try{
  const anonymous=await call('me');check(anonymous.status===200&&anonymous.data.user===null,'Anonymous browsing needs no account');
  const a=await signup('a'),b=await signup('b');check(a.user.room===b.user.room&&a.user.id!==b.user.id,'Roommates have separate accounts');
  check((await call('me','GET',undefined,a.cookie)).data.user?.id===a.user.id,'Session cookie identifies the student');
  check(!('password_hash' in a.user)&&!('salt' in a.user),'Private password material excluded from responses');
  check((await call('signup','POST',{name:'Other',email:`${run}a@example.test`,studentId:`${run}new`,phone:'9000000000',room:224,password:'Test-password-482!'})).status===409,'Duplicate registration rejected');
  check((await call('login','POST',{identifier:`${run}a`,password:'wrong'})).status===401,'Wrong passwords rejected');
  check((await call('login','POST',{identifier:`${run}a`,password:'Test-password-482!'})).status===200,'Student ID login works');
  check((await call('login','POST',{identifier:`${run}a@example.test`,password:'Test-password-482!'})).status===200,'Email login works');
  check((await call('mine','POST',{productKey:'oreo-original-120g',price:3500})).status===401,'Anonymous listing writes rejected');
  check((await call('mine','POST',{productKey:'oreo-original-120g',price:3500},a.cookie)).status===200,'Authenticated seller adds a snack');
  await call('mine','POST',{productKey:'oreo-original-120g',price:3000},b.cookie);
  const mine=await call('mine','GET',undefined,a.cookie),item=mine.data.listings[0];
  check((await call(`mine/${item.id}`,'PUT',{price:1000,available:true},b.cookie)).status===404,'Seller cannot edit a roommate’s listing');
  check((await call(`mine/${item.id}`,'DELETE',undefined,b.cookie)).status===404,'Seller cannot delete a roommate’s listing');
  const pub=await call('listings');const ours=pub.data.listings.filter(l=>ids.includes(l.seller_id));
  check(ours.length===2&&ours[0].price===3000,'Matching packs list both sellers in price order');
  check(ours.every(l=>l.phone===null&&!('email'in l)&&!('student_id'in l)),'Phone, email and student ID private by default');
  await call('profile','PUT',{name:a.user.name,phone:'9000000000',room:224,showPhone:true,isOpen:false},a.cookie);
  const shown=(await call('listings')).data.listings.find(l=>l.seller_id===a.user.id);
  check(shown.phone==='9000000000'&&shown.is_open===0&&shown.wing===9,'Phone opt-in, closed status and wing mapping work');
  check((await call('profile','PUT',{name:'Test',phone:'9000000000',room:999,showPhone:false,isOpen:true},a.cookie)).status===400,'Invalid rooms rejected');
  check((await call(`mine/${item.id}`,'PUT',{price:-5,available:true},a.cookie)).status===400,'Invalid prices rejected');
  await call(`mine/${item.id}`,'PUT',{price:3500,available:false},a.cookie);
  check(!(await call('listings')).data.listings.some(l=>l.id===item.id),'Sold-out items excluded from public listings');
  await call(`mine/${item.id}`,'PUT',{price:3500,available:true},a.cookie);
  sql(`UPDATE users SET confirmed_at=0 WHERE id='${a.user.id}'`);
  check(!(await call('listings')).data.listings.some(l=>l.id===item.id),'Stock older than 24 hours hidden on server');
  await call('confirm','POST',{},a.cookie);
  check((await call('listings')).data.listings.some(l=>l.id===item.id),'Daily confirmation republishes stock');
  check((await call('admin/users','GET',undefined,b.cookie)).status===403,'Ordinary sellers cannot read maintainer data');
  check((await call('admin/bootstrap','POST',{token:'wrong'},b.cookie)).status===403,'Room 224 alone does not grant admin access');
  check((await call('confirm','POST',{},a.cookie,{Origin:'https://elsewhere.invalid'})).status===403,'Cross-origin writes rejected');
  const setupKey=existsSync('.dev.vars')?readFileSync('.dev.vars','utf8').match(/^MAINTAINER_BOOTSTRAP_TOKEN="?([^"\r\n]+)"?$/m)?.[1]:null;
  if(setupKey){
    check((await call('admin/bootstrap','POST',{token:setupKey},a.cookie)).status===200,'Private setup key activates the first maintainer');
    check((await call('admin/bootstrap','POST',{token:setupKey},b.cookie)).status===409,'A second maintainer cannot claim setup');
  }else sql(`UPDATE users SET role='admin' WHERE id='${a.user.id}'`);
  check((await call('admin/users','GET',undefined,a.cookie)).status===200,'Maintainer can find accounts');
  check((await call('admin/reset','POST',{userId:b.user.id},a.cookie)).status===400,'Identity acknowledgement required before reset');
  const reset=await call('admin/reset','POST',{userId:b.user.id,identityChecked:true},a.cookie);
  check(reset.status===200&&reset.data.temporaryPassword,'Maintainer issues a temporary password');
  check((await call('mine','GET',undefined,b.cookie)).status===401,'Password reset invalidates existing sessions');
  const temp=await call('login','POST',{identifier:`${run}b`,password:reset.data.temporaryPassword});
  check(temp.status===200&&temp.data.user.must_change_password===1,'Temporary login requires a new password');
  check((await call('mine','GET',undefined,temp.cookie)).status===403,'Temporary session cannot manage stash');
  const changed=await call('password','POST',{currentPassword:reset.data.temporaryPassword,password:'Replacement-password-936!'},temp.cookie);
  check(changed.status===200&&!changed.data.user.must_change_password,'Student changes temporary password');
  check((await call('mine','GET',undefined,changed.cookie)).status===200,'New password unlocks stash');
  await call('logout','POST',{},changed.cookie);check((await call('mine','GET',undefined,changed.cookie)).status===401,'Logout revokes session');
  console.log(`\n${checks} integration checks passed.`);
}finally{if(ids.length){const quoted=ids.map(id=>`'${id}'`).join(',');sql(`DELETE FROM audit WHERE actor IN (${quoted}) OR target IN (${quoted}); DELETE FROM listings WHERE seller_id IN (${quoted}); DELETE FROM sessions WHERE user_id IN (${quoted}); DELETE FROM users WHERE id IN (${quoted}); DELETE FROM rate_limits;`);}}
