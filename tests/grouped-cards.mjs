// UI-only fixtures: no student accounts or real stock are changed.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Punyam/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true,executablePath:fileURLToPath(new URL('../.sites-runtime/browsers/chromium-1234/chrome-win64/chrome.exe',import.meta.url))});
const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync('outputs',{recursive:true});
function offer(id,name,category,mrp,price,room,extra={}){return {id,product_key:id,name,category,mrp,price,room:String(room),seller_id:'seller-'+room,seller_name:'Seller '+room,hostel:'mandakini',wing:'A',phase:'1',is_open:1,available:1,confirmed_at:Date.now(),phone:null,photo_id:null,size:'',...extra};}
let rows=[
 offer('can-a','Coca-Cola','Drinks',2000,2500,224,{container:'Can',volume_ml:100,size:'Can · 100 ml'}),
 offer('can-b','Coca-Cola','Drinks',2000,2300,225,{container:'Can',volume_ml:100,size:'Can · 100 ml',phase:'2'}),
 offer('bottle','Coca-Cola','Drinks',4000,5000,226,{container:'Bottle',volume_ml:250,size:'Bottle · 250 ml',phase:'3'}),
 offer('can-large','Coca-Cola','Drinks',4000,4500,227,{container:'Can',volume_ml:250,size:'Can · 250 ml'}),
 offer('closed','Coca-Cola','Drinks',2000,100,228,{container:'Can',volume_ml:100,size:'Can · 100 ml',is_open:0}),
 offer('lays-small','Lay’s Classic Salted','Chips & namkeen',1000,1200,230),
 offer('lays-large','Lay’s Classic Salted','Chips & namkeen',2500,3000,231),
 offer('oreo','Oreo Original','Sweet tooth',1000,1200,232),
 offer('oreo-pink','Oreo Strawberry Creme','Sweet tooth',1000,1200,233),
 offer('maggi','Maggi Masala Noodles','Instant fixes',2000,2500,234),
 offer('kurkure','Kurkure Masala Munch','Chips & namkeen',1000,1200,235),
];
await page.route('**/api/listings?hostel=mandakini',route=>route.fulfill({json:{hostel:'mandakini',listings:rows}}));
try{
 await page.goto('http://127.0.0.1:5173/?hostel=mandakini');await page.locator('.product-card').first().waitFor();
 assert.equal(await page.locator('.product-card').count(),6,'Each product/flavour gets one card');
 assert.equal(await page.locator('.product-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),4,'Four columns on desktop');
 const coke=page.getByRole('button',{name:/View Coca-Cola/}),lays=page.getByRole('button',{name:/View Lay’s Classic Salted/});assert((await coke.innerText()).includes('3 pack options'));assert((await lays.innerText()).includes('2 pack options'));
 await page.locator('.product-card img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.locator('.directory').screenshot({path:'outputs/grouped-products-desktop.png'});
 await coke.click();const dialog=page.getByRole('dialog');assert.equal(await dialog.locator('.pack-variant').count(),3);
 const small=dialog.locator('.pack-variant').filter({hasText:'MRP ₹20 · Can · 100 ml'});assert.equal(await small.locator('.offer').count(),2,'Same pack groups different rooms');assert((await small.innerText()).includes('₹23'));assert((await small.innerText()).includes('₹25'));
 const bottle=dialog.locator('.pack-variant').filter({hasText:'MRP ₹40 · Bottle · 250 ml'});await bottle.locator('summary').click();assert((await bottle.innerText()).includes('Phase 3 · Separate access'));assert((await bottle.innerText()).includes('₹50'));
 const large=dialog.locator('.pack-variant').filter({hasText:'MRP ₹40 · Can · 250 ml'});await large.locator('summary').click();assert((await large.innerText()).includes('₹45'));assert.equal(await large.locator('.offer').count(),1,'Different containers remain separate at the same MRP');
 await dialog.screenshot({path:'outputs/grouped-product-options.png'});
 rows=rows.filter(r=>r.id!=='bottle');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelectorAll('.pack-variant').length===2);
 await page.getByRole('button',{name:'Close dialog'}).click();assert.equal(await page.locator('.toggle-label').count(),0,'No redundant open filter');assert((await coke.locator('.product-price').innerText()).includes('₹23'),'Starting price uses available Stashers');
 await page.getByRole('textbox',{name:'Search snacks, rooms or Stashers'}).fill('bottle');await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===0);await page.getByRole('button',{name:'Clear search'}).click();
 await page.setViewportSize({width:1000,height:1000});assert.equal(await page.locator('.product-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3,'Three columns on smaller desktop/tablet');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.product-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2,'Two columns on mobile');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.directory').screenshot({path:'outputs/grouped-products-mobile.png'});
 await coke.click();await page.getByRole('dialog').screenshot({path:'outputs/grouped-options-mobile.png'});await page.getByRole('button',{name:'Close dialog'}).click();
 rows.push(offer('phase-three','Coca-Cola','Drinks',4000,5000,226,{container:'Bottle',volume_ml:250,size:'Bottle · 250 ml',phase:'3'}));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('button',{name:'Phase 3 Separate access',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===1);await coke.click();assert.equal(await page.locator('.pack-variant').count(),1);assert((await page.locator('.pack-variant').innerText()).includes('Bottle · 250 ml'));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('Grouped-card checks passed: 4/3/2 columns, consolidated products, separate flavours/MRPs/containers, per-room prices, phase separation, live refresh, closed-stock prices, search and mobile layout.');
}catch(e){await page.screenshot({path:'outputs/grouped-cards-failure.png',fullPage:true});throw e;}finally{await browser.close();}
