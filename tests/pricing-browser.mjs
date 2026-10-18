import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/Punyam/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:fileURLToPath(new URL('../.sites-runtime/browsers/chromium-1234/chrome-win64/chrome.exe',import.meta.url))});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const user={id:'pricing-fixture',name:'QA Seller',room:'224',hostel:'patel',wing:'A',phase:null,role:'seller',confirmed_at:Date.now(),is_open:1,show_phone:0,must_change_password:0};
let saved;
const row={id:'pricing-row',seller_id:user.id,seller_name:user.name,product_key:'pricing-row',name:'Kurkure Masala Munch',category:'Chips & namkeen',size:'',mrp:2000,price:2000,photo_id:null,available:1,...user,id:'pricing-row',name:'Kurkure Masala Munch',usual_price:2500,price_after:3000,price_until:Date.now()+3600000,offer_text:'Midnight deal'};
await page.route('**/api/me',r=>r.fulfill({json:{user}}));
await page.route('**/api/listings?hostel=patel',r=>r.fulfill({json:{hostel:'patel',listings:[row]}}));
await page.route('**/api/mine',r=>r.fulfill({json:{listings:[row]}}));
await page.route('**/api/mine/pricing-row',r=>{saved=r.request().postDataJSON();return r.fulfill({json:{ok:true}})});
try{
 await page.goto('http://127.0.0.1:5173/?hostel=patel');await page.locator('.product-card').waitFor();
 assert.equal(await page.locator('.product-info h3').evaluate(e=>getComputedStyle(e).fontSize),'16px');
 await page.locator('.product-card').click();let dialog=page.getByRole('dialog');await dialog.getByText('Midnight deal').waitFor();assert((await dialog.innerText()).includes('Save ₹5'));
 await dialog.screenshot({path:'outputs/timed-pricing-desktop.png'});
 // Crossing the boundary updates both the expanded comparison and card without refresh.
 row.price_until=Date.now()+1500;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(()=>document.querySelector('.offer-price strong')?.textContent==='₹30');assert.equal(await dialog.getByText('Midnight deal').count(),0);
 await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();assert((await page.locator('.product-price').innerText()).includes('₹30'));
 await page.getByRole('button',{name:'My stash',exact:true}).click();await page.getByRole('button',{name:'Edit pricing & photo'}).click();dialog=page.getByRole('dialog');
 await dialog.getByRole('button',{name:'Tonight at midnight (12 AM)'}).click();await dialog.locator('[name=priceAfter]').fill('35');await dialog.locator('[name=offerText]').fill('Tonight only');
 assert.equal(await dialog.locator('[name=price]').evaluate(e=>getComputedStyle(e).fontSize),'16px');
 await page.setViewportSize({width:390,height:844});
 assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Seller form fits mobile');
 await dialog.screenshot({path:'outputs/timed-pricing-mobile-form.png'});
 await dialog.getByRole('button',{name:'Save snack',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.snack-form'));
 assert.equal(saved.priceAfter,3500);assert.equal(saved.offerText,'Tonight only');assert(saved.priceUntil>Date.now());assert.equal(saved.usualPrice,2500);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS pricing UI: discount, live cutoff, card update, IST midnight form submission, readable typography and mobile fit');
}finally{await browser.close();}
