import {hostelDirectory,registeredHostel} from "../../server/hostels";
import {sellerDashboard} from "../../server/seller-dashboard";
import {community} from "../../server/community";
import {asciiText,checkContent,prohibitedReason} from "../../moderation";
import {libraryPhoto} from "../../packet-library";
import {validatePricing,currentPrice} from "../../pricing";
import { env } from "cloudflare:workers";
import { CATALOG, CATEGORIES } from "../../shared";
import { photoService, productKey, photoColumns, photoJoins, MAX_PHOTO_BYTES, imageType } from "../../server/packet-photos";
import {PACKET_LIBRARY,libraryProduct,normalizePacketName} from "../../packet-library";

export const dynamic = "force-dynamic";
const DAY = 86400000;
const encoder = new TextEncoder();
const requestBodies = new WeakMap<Request,string>();
const requestImages = new WeakMap<Request,Uint8Array>();
function photos() {
  if(!env.BUCKET)fail(503,"Photo storage is unavailable. You can still save your snack without a photo.");
  return photoService(db(),env.BUCKET);
}
function validMrp(value:unknown):number {if(typeof value!=="number"||!Number.isInteger(value)||value<100||value>100000)fail(400,"Enter the printed MRP between ₹1 and ₹1,000.");return value;}
function drinkVariant(category:string,b:any){
  if(category!=="Drinks")return {container:null,volumeMl:null,size:""};
  const label=str(b.container,24),volumeMl=b.volumeMl;
  if(!/^[a-zA-Z][a-zA-Z -]{1,23}$/.test(label)||typeof volumeMl!=="number"||!Number.isInteger(volumeMl)||volumeMl<20||volumeMl>20000)fail(400,"Enter the drink container and volume between 20 ml and 20 L.");
  const container=label.toLowerCase().replace(/\b\w/g,s=>s.toUpperCase());
  return {container,volumeMl,size:`${container} · ${volumeMl>=1000?`${volumeMl/1000} L`:`${volumeMl} ml`}`};
}
const db = () => { if (!env.DB) throw new Error("Database is not connected"); return env.DB; };
class ApiError extends Error { constructor(public status:number,message:string) { super(message); } }
function fail(status:number,message:string):never { throw new ApiError(status,message); }
function json(value:unknown,status=200,headers:Record<string,string>={}) {
  return Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
}
function str(value:unknown,max=120) { return typeof value==="string" ? value.trim().slice(0,max) : ""; }
async function parseLocation(value:any) {
  const room=String(value.room??"").trim(),wing=String(value.wing??"").trim(),hostel=value.hostel;
  const label=/^[A-Za-z0-9][A-Za-z0-9 .\/-]{0,23}$/;
  if(!await registeredHostel(db(),hostel)||!label.test(room)||!label.test(wing))fail(400,"Choose your hostel and enter a room and wing (up to 24 letters, numbers, spaces, / or -).");
  const phase=hostel==="mandakini"?String(value.phase??""):null;
  if(hostel==="mandakini"&&!["1","2","3"].includes(phase!))fail(400,"Choose Mandakini Phase 1, 2 or 3.");
  return {room,wing,hostel,phase};
}
function validatePassword(value:unknown) {
  if(typeof value!=="string"||value.length<10||value.length>128) fail(400,"Use a password between 10 and 128 characters.");
  return value;
}
function randomToken(bytes=32) { return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,"0")).join(""); }
async function digest(value:string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))),b=>b.toString(16).padStart(2,"0")).join(""); }
async function hashPassword(password:string,salt:string) {
  const key = await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:100000},key,256);
  return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,"0")).join("");
}
function equal(a:string,b:string) { let diff=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return diff===0; }
const safeColumns="u.shop_sleeping,u.upi_qr_id,u.id,u.name,u.email,u.student_id,u.phone,COALESCE(u.room_label,CAST(u.room AS TEXT)) AS room,u.hostel,u.wing,u.phase,u.show_phone,u.is_open,u.role,u.must_change_password,u.confirmed_at";
async function currentUser(req:Request,required=true) {
  const token=req.headers.get("cookie")?.match(/(?:^|;\s*)stash_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const user=token ? await db().prepare(`SELECT ${safeColumns} FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`).bind(await digest(token),Date.now()).first<any>() : null;
  if(!user&&required)fail(401,"Please log in to manage your stash.");
  return user;
}
async function seller(req:Request) { const user=await currentUser(req); if(user.must_change_password)fail(403,"Set your own password before continuing."); return user; }
async function admin(req:Request) { const user=await seller(req); if(user.role!=="admin")fail(403,"Maintainer access is required."); return user; }
function sessionCookie(req:Request,token:string,age=604800) {
  return `stash_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(req.url).protocol==="https:"?"; Secure":""}`;
}
async function loginResponse(req:Request,userId:string) {
  const token=randomToken();
  await db().batch([
    db().prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()),
    db().prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await digest(token),userId,Date.now()+7*DAY),
  ]);
  const user=await db().prepare(`SELECT ${safeColumns} FROM users u WHERE id=?`).bind(userId).first();
  return json({user},200,{"Set-Cookie":sessionCookie(req,token)});
}
async function rate(req:Request,action:string,limit:number,window=15*60000,identity="") {
  const ip=req.headers.get("cf-connecting-ip")||"local";
  const bucket=Math.floor(Date.now()/window);
  const key=await digest(`${action}:${ip}:${identity}:${bucket}`);
  const row=await db().prepare("INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(key,(bucket+1)*window).first<{count:number}>();
  if(row!.count>limit)fail(429,"Too many attempts. Please try again in 15 minutes.");
  // Bound retained rate-limit records without retaining IP addresses.
  if(row!.count===1)await db().prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(Date.now()).run();
}
async function body(req:Request) {
  if(!req.headers.get("content-type")?.includes("application/json"))fail(415,"Send JSON data.");
  const raw=requestBodies.get(req)??await req.text(); if(raw.length>16000)fail(413,"Request is too large.");
  try {const value=JSON.parse(raw);if(!value||typeof value!=="object"||Array.isArray(value))fail(400,"Invalid request.");return value;}catch{fail(400,"Invalid request.");}
}
async function handle(req:Request) {
  const url=new URL(req.url), path=url.pathname.replace(/^\/api\//,"");
  if(req.method!=="GET") {
    const origin=req.headers.get("origin");if(origin&&origin!==url.origin)fail(403,"Please use StashBox directly.");
    if(Number(req.headers.get("content-length")||0)>(path==="photos/upload"?MAX_PHOTO_BYTES:16000))fail(413,"Request is too large.");
  }
  if(path==="hostels"&&req.method==="GET")return json({hostels:await hostelDirectory(db())});
  if(path==="admin/hostels"&&req.method==="POST"){
    const actor=await admin(req);await rate(req,"hostel-create",20);const b=await body(req);let name;try{name=asciiText(b.name,"Bhawan name",70);checkContent(name);}catch(e){fail(400,(e as Error).message);}if(name!.length<2||!/[a-z]/i.test(name!))fail(400,"Enter a bhawan name.");
    const list=await hostelDirectory(db()),id=name!.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(list.length>=100)fail(400,"The campus directory is full. Contact support.");if(list.some(h=>h.id===id||h.name.toLowerCase()===name!.toLowerCase()))fail(409,"That bhawan is already in your directory.");
    const short=name!.replace(/ (Bhawan|Hostel)$/i,''),initials=short.split(/[^a-z0-9]+/i).filter(Boolean).slice(0,3).map(w=>w[0]).join('').toUpperCase();
    try{await db().batch([db().prepare('INSERT INTO campus_hostels (id,name,short,initials,created_at) VALUES (?,?,?,?,?)').bind(id,name!,short,initials,Date.now()),db().prepare("INSERT INTO audit (id,actor,target,action,created_at) VALUES (?,?,?,'hostel_added',?)").bind(crypto.randomUUID(),actor.id,id,Date.now())]);}catch(e){if(String(e).includes('UNIQUE'))fail(409,"That bhawan is already in your directory.");throw e;}return json({ok:true,id});
  }
  if(path.startsWith("seller/")){try{if(req.method!=="GET")await rate(req,"seller-dashboard",180);const result=await sellerDashboard(req,path,{db:db(),user:await currentUser(req,false),body:()=>body(req)});if(result)return result;}catch(e){if(e instanceof ApiError)throw e;fail(400,(e as Error).message);}}
  if(path.startsWith("pawn")||path.startsWith("market/")||path==="payment-qr"||path==="admin/review"){try{const result=await community(req,path,{db:db(),bucket:env.BUCKET!,user:await currentUser(req,false),bytes:requestImages.get(req),body:()=>body(req),rate:()=>rate(req,"community-write",30)});if(result)return result;}catch(e){fail((e as any).status||400,(e as Error).message);}}
  if(path==="photos/library"&&req.method==="GET") {
    const name=str(url.searchParams.get("name"),70),category=str(url.searchParams.get("category"),40);
    if(name.length<2||!CATEGORIES.slice(1).includes(category))fail(400,"Choose a product and category.");
    return json(await photos().choices(name,category,(await currentUser(req,false))?.role==="admin"));
  }
  if(path==="photos/upload"&&req.method==="POST") {
    const user=await seller(req);await rate(req,"photo-upload",12,15*60000,user.id);
    if(req.headers.get("x-photo-rights")!=="confirmed")fail(400,"Confirm you own this photo or have permission to share it.");
    const bytes=requestImages.get(req);
    if(!bytes||imageType(bytes)!=="image/webp"||req.headers.get("content-type")!=="image/webp")fail(415,"Use StashBox to convert and upload a compressed WebP photo.");
    const count=await db().prepare("SELECT COUNT(*) AS n FROM packet_photos").first<{n:number}>();
    if(count!.n>=3000)fail(507,"Photo storage is full. Please contact the maintainer.");
    const name=str(url.searchParams.get("name"),70),category=str(url.searchParams.get("category"),40);
    try{if(!libraryProduct(name))asciiText(name,"Product name",70);checkContent(name);}catch(e){fail(400,(e as Error).message);}
    if(name.length<2||!CATEGORIES.slice(1).includes(category))fail(400,"Enter the product name and category before uploading.");
    if(user.role!=="admin"&&(await photos().choices(name,category)).defaultPhoto)fail(409,"This product already has a shared photo. Only the maintainer can change it.");
    const photo=await photos().store(bytes,{source:user.role==="admin"?"maintainer":"seller",sourceUrl:null,credit:user.role==="admin"?"Maintainer photo":"Stasher photo - shared with permission",license:null,name,category,owner:user.id});
    return json({photo});
  }
  if(path==="photos/credits"&&req.method==="GET") {
    const rows=await db().prepare("SELECT id,source_url,credit,license,matched_name FROM packet_photos WHERE source='openfoodfacts'").all();
    return json({database_license:"ODbL 1.0",database_source:"https://openfoodfacts.org",images_license:"CC BY-SA 3.0",prepared:PACKET_LIBRARY.filter(p=>p.image),photos:rows.results});
  }
  const photoId=path.match(/^photos\/([a-z0-9-]{36})$/)?.[1];
  if(photoId&&req.method==="GET") {
    const row=await db().prepare("SELECT object_key,content_type,review_status,uploaded_by FROM packet_photos WHERE id=?").bind(photoId).first<any>();
    if(row&&row.review_status!=="approved"){const viewer=await currentUser(req,false);if(viewer?.id!==row.uploaded_by&&viewer?.role!=="admin")fail(404,"Photo not found.");}
    if(!row||!env.BUCKET)fail(404,"Photo not found.");
    const object=await env.BUCKET.get(row.object_key);if(!object)fail(404,"Photo not found.");
    return new Response(object.body,{headers:{"Content-Type":row.content_type,"Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff","ETag":object.httpEtag}});
  }
  if(path==="me"&&req.method==="GET")return json({user:await currentUser(req,false)});
  if(path==="products"&&req.method==="GET") {
    const products=(await photos().directory()).filter(p=>!prohibitedReason(p.name));
    const variants=(await db().prepare("SELECT DISTINCT name,container,volume_ml FROM listings WHERE category='Drinks' AND container IS NOT NULL AND volume_ml IS NOT NULL").all<any>()).results;
    return json({products:products.map(p=>({...p,variants:p.category==="Drinks"?variants.filter(v=>normalizePacketName(v.name)===normalizePacketName(p.name)).map(v=>({container:v.container,volumeMl:v.volume_ml})):[]}))});
  }
  if(path==="listings"&&req.method==="GET") {
    const hostel=url.searchParams.get("hostel");
    if(!await registeredHostel(db(),hostel))fail(400,"Choose a hostel to see its listings.");
    const rows=await db().prepare(`SELECT l.id,l.product_key,l.name,l.size,l.container,l.volume_ml,l.mrp,l.moderation_status,l.category,l.price,l.price_after,l.price_until,l.usual_price,l.offer_text,l.available,l.seller_id,${photoColumns},
      u.name AS seller_name,COALESCE(u.room_label,CAST(u.room AS TEXT)) AS room,u.hostel,u.wing,u.phase,
      CASE WHEN u.show_phone=1 THEN u.phone ELSE NULL END AS phone,u.is_open,u.confirmed_at,CASE WHEN qr.status='approved' THEN u.upi_qr_id ELSE NULL END AS upi_qr_id
      FROM listings l JOIN users u ON u.id=l.seller_id LEFT JOIN market_media qr ON qr.id=u.upi_qr_id ${photoJoins}
      WHERE u.shop_sleeping=0 AND l.moderation_status='approved' AND l.available=1 AND u.confirmed_at>? AND u.hostel=? AND u.wing IS NOT NULL
      AND (u.hostel!='mandakini' OR u.phase IN ('1','2','3')) ORDER BY l.price,l.id`).bind(Date.now()-DAY,hostel).all<any>();
    return json({hostel,listings:(await photos().decorate(rows.results.filter(r=>!prohibitedReason(r.name+" "+(r.offer_text||""))))).map(o=>({...o,effective_price:currentPrice(o)}))});
  }
  if(path==="signup"&&req.method==="POST") {
    await rate(req,"signup",8,15*60000);
    const b=await body(req), name=str(b.name,60),email=str(b.email,120).toLowerCase(),studentId=str(b.studentId,40).toLowerCase(),phone=str(b.phone,20).replace(/[\s()-]/g,"");
    const location=await parseLocation(b),password=validatePassword(b.password);
    try{asciiText(b.name,"Name",60);asciiText(b.email,"Email",120);checkContent(name);}catch(e){fail(400,(e as Error).message);}
    if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!/^[-a-z0-9_/.]{3,40}$/.test(studentId)||!/^\+?\d{10,15}$/.test(phone))fail(400,"Check your name, email, student ID and phone number.");
    const existing=await db().prepare("SELECT id FROM users WHERE email=? OR student_id=?").bind(email,studentId).first();
    if(existing)fail(409,"That email or student ID is already registered. Try logging in.");
    const id=crypto.randomUUID(),salt=randomToken(16),now=Date.now();
    try {await db().prepare("INSERT INTO users (id,name,email,student_id,phone,room,room_label,hostel,wing,phase,password_hash,salt,show_phone,is_open,role,must_change_password,confirmed_at,created_at) VALUES (?,?,?,?,?,0,?,?,?,?,?,?,0,1,'seller',0,?,?)").bind(id,name,email,studentId,phone,location.room,location.hostel,location.wing,location.phase,await hashPassword(password,salt),salt,now,now).run();}
    catch(e){if(String(e).includes("UNIQUE"))fail(409,"That email or student ID is already registered.");throw e;}
    return loginResponse(req,id);
  }
  if(path==="login"&&req.method==="POST") {
    const b=await body(req),identifier=str(b.identifier,120).toLowerCase();
    await rate(req,"login",30);
    await rate(req,"login-account",10,15*60000,identifier);
    const user=await db().prepare("SELECT id,password_hash,salt FROM users WHERE email=? OR student_id=?").bind(identifier,identifier).first<any>();
    const password=typeof b.password==="string"?b.password.slice(0,128):"";
    const attempt=await hashPassword(password,user?.salt||"00000000000000000000000000000000");
    if(!user||!equal(attempt,user.password_hash))fail(401,"Email/student ID or password is incorrect.");
    return loginResponse(req,user.id);
  }
  if(path==="logout"&&req.method==="POST") {
    const token=req.headers.get("cookie")?.match(/(?:^|;\s*)stash_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if(token)await db().prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return json({ok:true},200,{"Set-Cookie":sessionCookie(req,"",0)});
  }
  if(path==="password"&&req.method==="POST") {
    const user=await currentUser(req);await rate(req,"password",10);
    const b=await body(req),password=validatePassword(b.password);
    const row=await db().prepare("SELECT password_hash,salt FROM users WHERE id=?").bind(user.id).first<any>();
    if(!equal(await hashPassword(String(b.currentPassword||"").slice(0,128),row.salt),row.password_hash))fail(400,"Your current password is incorrect.");
    if(b.currentPassword===password)fail(400,"Choose a different password.");
    const salt=randomToken(16);
    await db().batch([
      db().prepare("UPDATE users SET password_hash=?,salt=?,must_change_password=0 WHERE id=?").bind(await hashPassword(password,salt),salt,user.id),
      db().prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
    ]);
    return loginResponse(req,user.id);
  }
  if(path==="profile"&&req.method==="PUT") {
    const user=await seller(req),b=await body(req);
    const name=str(b.name,60),phone=str(b.phone,20).replace(/[\s()-]/g,"");
    const location=await parseLocation(b);
    try{asciiText(b.name,"Name",60);checkContent(name);}catch(e){fail(400,(e as Error).message);}
    if(name.length<2||!/^\+?\d{10,15}$/.test(phone))fail(400,"Check your name and phone.");
    await db().prepare("UPDATE users SET name=?,phone=?,room_label=?,hostel=?,wing=?,phase=?,show_phone=?,is_open=?,shop_sleeping=? WHERE id=?").bind(name,phone,location.room,location.hostel,location.wing,location.phase,b.showPhone?1:0,b.isOpen?1:0,b.isOpen?0:1,user.id).run();
    return json({ok:true});
  }
  if(path==="confirm"&&req.method==="POST") {
    const user=await seller(req);
    await db().prepare("UPDATE users SET confirmed_at=? WHERE id=?").bind(Date.now(),user.id).run();
    return json({ok:true});
  }
  if(path==="mine"&&req.method==="GET") {
    const user=await seller(req);
    return json({listings:await photos().decorate((await db().prepare(`SELECT l.id,l.product_key,l.name,l.size,l.container,l.volume_ml,l.mrp,l.category,l.price,l.price_after,l.price_until,l.usual_price,l.offer_text,l.available,${photoColumns} FROM listings l ${photoJoins} WHERE l.seller_id=? ORDER BY l.updated_at DESC`).bind(user.id).all<any>()).results,true)});
  }
  if(path==="mine"&&req.method==="POST") {
    const user=await seller(req);await rate(req,"add-listing",50);
    if(!await registeredHostel(db(),user.hostel)||!user.wing||(user.hostel==="mandakini"&&!["1","2","3"].includes(user.phase)))fail(400,"Set your hostel, wing and phase in your profile before listing a snack.");
    const b=await body(req),product=CATALOG.find(p=>p.key===b.productKey);
    const entered=product?.name||str(b.name,70),known=libraryProduct(entered)||(await photos().directory()).find(p=>normalizePacketName(p.name)===normalizePacketName(entered));
    const name=known?.name||entered,category=known?.category||product?.category||str(b.category,40),price=Number(b.price),mrp=validMrp(b.mrp);
    if(name.length<2||!CATEGORIES.slice(1).includes(category)||!Number.isInteger(price)||price<100||price>100000)fail(400,"Choose an item and a price between ₹1 and ₹1,000.");
    let pricing;try{if(!known&&!product)asciiText(b.name,"Product name",70);checkContent(name,String(b.offerText||""));pricing=validatePricing(b,price);}catch(e){fail(400,(e as Error).message);}
    const variant=drinkVariant(category,b),key=await productKey(name,category,mrp,variant.container,variant.volumeMl);
    let photoId:string|null=null;
    if(b.photoId){try{photoId=await photos().allowed(b.photoId,user.id,name,category);}catch(e){fail(400,(e as Error).message);}}
    const count=await db().prepare("SELECT COUNT(*) AS n FROM listings WHERE seller_id=?").bind(user.id).first<{n:number}>();
    if(count!.n>=30)fail(400,"You can list up to 30 items. Remove an old listing first.");
    const id=crypto.randomUUID(),moderationStatus="approved";
    // 'none' means the seller deliberately declined a shared library picture.
    await db().prepare("INSERT INTO listings (id,seller_id,product_key,name,size,mrp,category,price,photo_id,container,volume_ml,price_after,price_until,usual_price,offer_text,moderation_status,available,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(seller_id,product_key) DO UPDATE SET moderation_status=excluded.moderation_status,price=excluded.price,price_after=excluded.price_after,price_until=excluded.price_until,usual_price=excluded.usual_price,offer_text=excluded.offer_text,photo_id=excluded.photo_id,available=1,updated_at=excluded.updated_at").bind(id,user.id,key,name,variant.size,mrp,category,price,photoId||(b.photoChoice==="none"?"none":null),variant.container,variant.volumeMl,pricing.price_after,pricing.price_until,pricing.usual_price,pricing.offer_text,moderationStatus,Date.now()).run();
    await photos().register(name,category,moderationStatus);
    return json({ok:true,moderation_status:moderationStatus});
  }
  const itemId=path.match(/^mine\/([a-z0-9-]+)$/)?.[1];
  if(itemId&&(req.method==="PUT"||req.method==="DELETE")) {
    const user=await seller(req);
    const own=await db().prepare("SELECT id,name,category,mrp,photo_id,product_key,container,volume_ml,size,moderation_status,price,price_after,price_until,usual_price,offer_text FROM listings WHERE id=? AND seller_id=?").bind(itemId,user.id).first<any>();
    if(!own)fail(404,"Listing not found in your stash.");
    if(req.method==="DELETE")await db().prepare("DELETE FROM listings WHERE id=? AND seller_id=?").bind(itemId,user.id).run();
    else {
      const b=await body(req),price=Number(b.price);
      if(!Number.isInteger(price)||price<100||price>100000||typeof b.available!=="boolean")fail(400,"Check the price and availability.");
      let pricing;try{checkContent(own.name,String(b.offerText??own.offer_text??""));pricing=validatePricing(b,price,own);}catch(e){fail(400,(e as Error).message);}
      const variant=b.container===undefined?{container:own.container,volumeMl:own.volume_ml,size:own.size}:drinkVariant(own.category,b);
      const mrp=b.mrp===undefined?own.mrp:validMrp(b.mrp),key=mrp?await productKey(own.name,own.category,mrp,variant.container,variant.volumeMl):own.product_key;
      let photoId=own.photo_id;
      if(b.photoId!==undefined){try{photoId=(b.photoId?await photos().allowed(b.photoId,user.id,own.name,own.category):"none");}catch(e){fail(400,(e as Error).message);}}
      const status=own.moderation_status==="rejected"?"rejected":"approved";
      try{await db().prepare("UPDATE listings SET moderation_status=?,price_after=?,price_until=?,usual_price=?,offer_text=?,price=?,mrp=?,product_key=?,photo_id=?,container=?,volume_ml=?,size=?,available=?,updated_at=? WHERE id=? AND seller_id=?").bind(status,pricing.price_after,pricing.price_until,pricing.usual_price,pricing.offer_text,price,mrp,key,photoId,variant.container,variant.volumeMl,variant.size,b.available?1:0,Date.now(),itemId,user.id).run();}
      catch(e){if(String(e).includes("UNIQUE"))fail(409,"You already have this snack at that MRP. Edit that listing instead.");throw e;}
    }
    return json({ok:true});
  }
  if(path==="admin/bootstrap"&&req.method==="POST") {
    const user=await seller(req);await rate(req,"bootstrap",5);
    const secret=(env as any).MAINTAINER_BOOTSTRAP_TOKEN,b=await body(req);
    if(!secret||!equal(await digest(String(b.token||"")),await digest(secret))||String(user.room)!=="224")fail(403,"Maintainer setup is unavailable or the setup key is incorrect.");
    // Atomic guard: only one initial administrator can ever be provisioned here.
    const result=await db().prepare("UPDATE users SET role='admin' WHERE id=? AND NOT EXISTS(SELECT 1 FROM users WHERE role='admin')").bind(user.id).run();
    if(!result.meta.changes)fail(409,"The maintainer account is already set up.");
    return json({ok:true});
  }
  if(path==="admin/photos"&&req.method==="GET") {
    await admin(req);return json({products:await photos().directory(true)});
  }
  if(path==="admin/products"&&req.method==="POST") {
    await admin(req);const b=await body(req),name=str(b.name,70),category=str(b.category,40);
    if(name.length<2||!CATEGORIES.slice(1).includes(category))fail(400,"Enter a product name, flavour and category.");
    try{asciiText(b.name,"Product name",70);checkContent(name);}catch(e){fail(400,(e as Error).message);}
    await photos().register(name,category,"approved");return json({ok:true});
  }
  if(path==="admin/photos"&&req.method==="PUT") {
    const user=await admin(req),b=await body(req),name=str(b.name,70),category=str(b.category,40),id=str(b.photoId,100);
    if(name.length<2||!CATEGORIES.slice(1).includes(category)||!id)fail(400,"Choose a product and photo.");
    try{await photos().selectDefault(name,category,id,user.id);}catch(e){fail(400,(e as Error).message);}
    return json({ok:true});
  }
  if(path==="admin/users"&&req.method==="GET") {
    await admin(req);
    const search=str(url.searchParams.get("search"),120).replace(/[%_\\]/g,"");
    const users=await db().prepare("SELECT id,name,email,student_id,COALESCE(room_label,CAST(room AS TEXT)) AS room,hostel,wing,phase,role FROM users WHERE name LIKE ? OR email LIKE ? OR student_id LIKE ? ORDER BY created_at DESC LIMIT 50").bind(`%${search}%`,`%${search}%`,`%${search}%`).all();
    return json({users:users.results});
  }
  if(path==="admin/reset"&&req.method==="POST") {
    const maintainer=await admin(req);await rate(req,"admin-reset",12);
    const b=await body(req),target=str(b.userId,50);
    if(b.identityChecked!==true)fail(400,"Confirm that you checked the student's identity in person.");
    const user=await db().prepare("SELECT id,role FROM users WHERE id=?").bind(target).first<any>();
    if(!user)fail(404,"Student not found.");
    if(user.role==="admin")fail(400,"Maintainer accounts cannot be reset here.");
    const password=`Stash-${randomToken(9)}`,salt=randomToken(16);
    await db().batch([
      db().prepare("UPDATE users SET password_hash=?,salt=?,must_change_password=1 WHERE id=?").bind(await hashPassword(password,salt),salt,target),
      db().prepare("DELETE FROM sessions WHERE user_id=?").bind(target),
      db().prepare("INSERT INTO audit (id,actor,target,action,created_at) VALUES (?,?,?,'password_reset',?)").bind(crypto.randomUUID(),maintainer.id,target,Date.now()),
    ]);
    return json({temporaryPassword:password});
  }
  fail(404,"That page could not be found.");
}
async function route(req:Request) {
  try {
    // Drain bounded request bodies before authorization can return early. This
    // also avoids leaving an unread stream on a reused Worker connection.
    if(req.method!=="GET"&&req.method!=="HEAD") {
      const upload=new URL(req.url).pathname.match(/^\/api\/(photos\/upload|market\/upload)$/),limit=upload?MAX_PHOTO_BYTES:16000;
      if(Number(req.headers.get("content-length")||0)>limit)fail(413,"Request is too large.");
      const reader=req.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
      if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();fail(413,"Request is too large.");}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      if(upload)requestImages.set(req,bytes);else requestBodies.set(req,new TextDecoder().decode(bytes));
    }
    return await handle(req);
  }catch(e){
    if(e instanceof ApiError)return json({error:e.message},e.status);
    if([409,413,507].includes((e as any)?.status))return json({error:(e as Error).message},(e as any).status);
    console.error("StashBox API error",e instanceof Error?e.message:"Unknown error");
    return json({error:"StashBox couldn’t complete that request. Please try again shortly."},500);
  }finally{requestBodies.delete(req);requestImages.delete(req);}
}
export const GET=route;export const POST=route;export const PUT=route;export const DELETE=route;
