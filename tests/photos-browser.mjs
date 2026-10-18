import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Punyam/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:fileURLToPath(new URL('../.sites-runtime/browsers/chromium-1234/chrome-win64/chrome.exe',import.meta.url))});
const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),base='http://127.0.0.1:5173',run='ui'+Date.now(),newName='QA Product '+run;let id;const errors=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync('outputs',{recursive:true});
function sql(command){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.stdout);}
async function addForm(text,option){await page.getByRole('button',{name:'Add a snack',exact:true}).first().click();await page.getByRole('combobox',{name:'Product name (include flavour)'}).fill(text);await page.getByRole('option',{name:option}).click();}
async function price(mrp,selling){await page.getByRole('spinbutton',{name:'Printed MRP (₹)'}).fill(mrp);await page.getByRole('spinbutton',{name:'Your selling price (₹)'}).fill(selling);}
async function save(name){await page.getByRole('button',{name:'Add to my stash',exact:true}).click();await page.locator('.own-name').getByText(name,{exact:true}).first().waitFor();}
try{
 const signup=await context.request.post(base+'/api/signup',{data:{name:'QA Image Student',email:run+'@example.test',studentId:run,phone:'9000000000',password:'Photo-test-password-482!',hostel:'tagore',room:'QA-10',wing:'QA'}});const me=await signup.json();assert.equal(signup.status(),200);id=me.user.id;
 await page.goto(base+'/?hostel=tagore');await page.locator('.account-button').waitFor();await page.getByRole('button',{name:'My stash',exact:true}).click();await page.getByRole('heading',{name:'Your stash. Your little empire.'}).waitFor();
 await addForm('oreo pink',/Oreo Strawberry Creme/);await price('10','12');
 const automatic=page.getByRole('dialog').locator('.packet-photo');await automatic.waitFor();assert((await automatic.getAttribute('src')).includes('supplied'));
 await page.screenshot({path:'outputs/autocomplete-stock-desktop.png',fullPage:true});await save('Oreo Strawberry Creme');
 await addForm('Coca',/Coca-Cola/);await page.getByLabel('Container',{exact:true}).selectOption('Can');await page.getByLabel('Drink volume',{exact:true}).fill('250');await price('40','45');await save('Coca-Cola');
 await addForm('Coca',/Coca-Cola/);await page.getByRole('button',{name:'Can · 250 ml',exact:true}).waitFor();await page.getByLabel('Container',{exact:true}).selectOption('Bottle');await page.getByLabel('Drink volume',{exact:true}).fill('250');await price('40','46');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/drink-stock-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Drink form fits mobile');await save('Coca-Cola');
 await page.setViewportSize({width:1440,height:1050});await addForm(newName,new RegExp('Add “'+newName));await price('20','25');await page.getByRole('dialog').locator('.packet-vector').waitFor();await save(newName);
 const own=(await(await context.request.get(base+'/api/mine')).json()).listings;assert.equal(own.filter(l=>l.name==='Coca-Cola').length,2);assert.equal(new Set(own.filter(l=>l.name==='Coca-Cola').map(l=>l.product_key)).size,2);
 await page.getByRole('button',{name:'Find a snack',exact:false}).click();await page.getByRole('heading',{name:'Tagore Bhawan',exact:true}).waitFor();await page.locator('.product-card').first().waitFor();
 assert.equal(await page.locator('.product-card img').evaluateAll(images=>images.every(i=>getComputedStyle(i).objectFit==='contain')),true);
 assert((await page.locator('.product-card .packet-photo-frame').first().evaluate(e=>getComputedStyle(e).backgroundImage)).includes('gradient'));
 await page.screenshot({path:'outputs/packet-stock-cards.png',fullPage:true});
 sql(`UPDATE users SET role='admin' WHERE id='${id}'`);
 await page.reload();await page.getByRole('button',{name:'Maintainer',exact:true}).click();
 const manager=page.locator('.photo-manager');await manager.getByLabel('Manage product photos').selectOption({label:newName});await manager.getByText('No cached photo yet.',{exact:false}).waitFor();
 await manager.getByRole('checkbox').check();
 const image=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=180;c.height=240;const g=c.getContext('2d');g.fillStyle='#d84b94';g.fillRect(0,0,180,240);g.fillStyle='white';g.font='bold 20px sans-serif';g.fillText('QA PACKET',20,90);return c.toDataURL('image/png').split(',')[1];}),'base64');
 await manager.getByLabel('Maintainer product photo upload').setInputFiles({name:'my-packet.png',mimeType:'image/png',buffer:image});await manager.getByText('Photo cached.',{exact:false}).waitFor();await manager.getByRole('button',{name:'Current default'}).waitFor();
 await manager.getByLabel('Maintainer product photo upload').setInputFiles({name:'alternative.png',mimeType:'image/png',buffer:image});await manager.locator('.photo-choice').nth(1).waitFor();await manager.getByRole('button',{name:'Set as default',exact:true}).click();await manager.getByText('Default updated across all listings',{exact:false}).waitFor();
 await page.screenshot({path:'outputs/maintainer-photo-defaults.png',fullPage:true});
 const feed=await(await context.request.get(base+'/api/listings?hostel=tagore')).json();assert(feed.listings.find(l=>l.name===newName).photo_id,'Maintainer photo replaces the vector for existing stock');
 const registry=await(await context.request.get(base+'/api/products')).json();assert(registry.products.some(p=>p.name===newName));
 await manager.locator('summary').click();await manager.getByLabel('New product name',{exact:true}).fill(newName+' Panel');await manager.getByRole('button',{name:'Add product',exact:true}).click();await manager.getByText('No cached photo yet.',{exact:false}).waitFor();
 assert((await(await context.request.get(base+'/api/products')).json()).products.some(p=>p.name===newName+' Panel'));
 assert.equal(errors.length,0,errors.join('\n'));
 const input=JSON.parse(readFileSync('app/packet-library.json')).filter(p=>p.image);for(const p of input){const r=await context.request.get(base+p.image);assert.equal(r.status(),200,p.name);}
 console.log('Browser checks passed: all 66 supplied assets, autocomplete/aliases, new product, automatic image, vector fallback, can/bottle/volume variants, reusable variants, mobile fit, image contain/gradient, maintainer uploads/default selection and new products.');
}catch(e){await page.screenshot({path:'outputs/photo-browser-failure.png',fullPage:true});throw e;}
finally{if(id)sql(`DELETE FROM product_photo_defaults WHERE photo_id IN (SELECT id FROM packet_photos WHERE uploaded_by='${id}');DELETE FROM packet_photos WHERE uploaded_by='${id}';DELETE FROM product_catalog WHERE name LIKE '${newName}%';DELETE FROM audit WHERE actor='${id}';DELETE FROM listings WHERE seller_id='${id}';DELETE FROM sessions WHERE user_id='${id}';DELETE FROM users WHERE id='${id}';DELETE FROM rate_limits;`);await browser.close();}
