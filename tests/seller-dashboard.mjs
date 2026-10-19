import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const base='http://127.0.0.1:5173',run='book'+Date.now(),ids=[];let checks=0;
const check=(v,msg)=>{assert(v,msg);checks++;console.log('PASS '+msg);};
function sql(command){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{encoding:'utf8'});if(r.status)throw Error(r.stderr||r.stdout);}
async function api(path,method='GET',body,cookie=''){const r=await fetch(base+'/api/'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cache:r.headers.get('cache-control'),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
async function signup(suffix){const r=await api('signup','POST',{name:'Book Tester',email:run+suffix+'@example.test',studentId:run+suffix,phone:'9000000000',password:'Test-password-482!',hostel:'patel',wing:'9',room:'224'});assert.equal(r.status,200);ids.push(r.data.user.id);return r;}
try{
check((await api('seller/book')).status===401,'Anonymous private dashboard rejected');
const a=await signup('a'),b=await signup('b'),today=new Date(Date.now()+330*60000).toISOString().slice(0,10);
const entry={kind:'purchase',name:'QA Notebook '+run,quantity:10,unitPrice:800,date:today,notes:'Opening stock'};
check((await api('seller/book','POST',entry,a.cookie)).status===200,'Opening stock can be recorded');
let book=await api('seller/book','GET',undefined,a.cookie),purchase=book.data.entries[0],key=purchase.product_key;check(book.cache==='no-store'&&book.data.entries.length===1,'Private book is uncached and owner scoped');
check((await api('seller/book?sellerId='+a.data.user.id,'GET',undefined,b.cookie)).data.entries.length===0,'Another seller cannot request the owner book');
check((await api('seller/book/'+purchase.id,'DELETE',undefined,b.cookie)).status===404,'Another seller cannot delete private records');
check((await api('seller/book/'+purchase.id,'PUT',entry,b.cookie)).status===404,'Another seller cannot edit private records');
const sale={kind:'sale',productKey:key,quantity:3,unitPrice:1500,date:today,notes:'Evening sales'};
check((await api('seller/book','POST',sale,a.cookie)).status===200,'Sales can be recorded against purchases');
check((await api('seller/book','POST',{...sale,quantity:8},a.cookie)).status===400,'Overselling is rejected');
check((await api('seller/book/'+purchase.id,'DELETE',undefined,a.cookie)).status===400,'Deleting purchase cannot strand later sales');
check((await api('seller/book','POST',{...entry,date:'2026-02-30'},a.cookie)).status===400,'Invalid calendar dates are rejected');
check((await api('seller/book','POST',{...entry,name:'Beer'},a.cookie)).status===400,'Private item names still use content checks');
const concurrent=await Promise.all([api('seller/book','POST',{...sale,quantity:5},a.cookie),api('seller/book','POST',{...sale,quantity:5},a.cookie)]);check(concurrent.filter(r=>r.status===200).length===1,'Concurrent sales cannot oversell the same stock');
check((await api('seller/book','GET',undefined,a.cookie)).data.entries.length===3,'Only valid private records persist');
check((await api('mine','POST',{name:'Oreo Original',mrp:2000,price:2500},a.cookie)).status===200,'Public snack fixture added');
await api('pawn','POST',{title:'QA Study desk '+run,description:'Solid desk in good condition.',condition:'Used - good',price:10000},a.cookie);
check((await api('listings?hostel=patel')).data.listings.some(i=>i.seller_id===a.data.user.id),'Open seller snacks visible');
check((await api('seller/shutter','POST',{sleeping:true},a.cookie)).status===200,'Going to sleep closes the shop');
check(!(await api('listings?hostel=patel')).data.listings.some(i=>i.seller_id===a.data.user.id),'Sleeping snacks hidden server side');
check((await api('pawn')).data.listings.some(i=>i.seller_id===a.data.user.id),'Snack shutter does not hide independent Pawn Shop listings');
check((await api('mine','GET',undefined,a.cookie)).data.listings.length===1,'Sleeping keeps saved stock');
check((await api('seller/shutter','POST',{sleeping:false},a.cookie)).status===400,'Reopening requires stock confirmation');
check((await api('seller/shutter','POST',{sleeping:false,confirmStock:true},a.cookie)).status===200,'Confirmed reopening succeeds');
check((await api('listings?hostel=patel')).data.listings.some(i=>i.seller_id===a.data.user.id)&&(await api('pawn')).data.listings.some(i=>i.seller_id===a.data.user.id),'Reopening restores both marketplaces');
for(const title of ['Kingfisher beer','Old Monk','vodka','live rats','pet rabbit']){check((await api('mine','POST',{name:title,mrp:2000,price:2500},a.cookie)).status===400,'Snack blocked: '+title);check((await api('pawn','POST',{title,description:'Available now.',condition:'New / sealed',price:5000},a.cookie)).status===400,'Pawn blocked: '+title);}
console.log(checks+' seller dashboard checks passed.');
}finally{if(ids.length){const quoted=ids.map(i=>"'"+i+"'").join(',');sql('DELETE FROM audit WHERE actor IN ('+quoted+');DELETE FROM users WHERE id IN ('+quoted+');DELETE FROM rate_limits;');}}
