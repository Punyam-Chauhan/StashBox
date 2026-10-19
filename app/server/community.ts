import {moderationConsole} from "./moderation-console";
import {registeredHostel} from "./hostels";
import {reservePhoto,releasePhoto,pruneUnusedImages,deleteMarketMedia,MAX_IMAGE_BYTES} from './image-storage';
import {asciiText,checkContent,prohibitedReason} from '../moderation';
import {imageType,MAX_PHOTO_BYTES} from './packet-photos';
type Context={db:D1Database;bucket:R2Bucket;user:any;bytes?:Uint8Array;body:()=>Promise<any>;rate:()=>Promise<void>};
export async function community(req:Request,path:string,c:Context):Promise<Response|null>{
 const {db,bucket,user}=c,url=new URL(req.url),json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
 const requireSeller=()=>{if(!user)throw Object.assign(new Error('Log in to continue.'),{status:401});if(user.must_change_password)throw Object.assign(new Error('Set your own password first.'),{status:403});};
 const requireAdmin=()=>{requireSeller();if(user.role!=='admin')throw Object.assign(new Error('Maintainer access required.'),{status:403});};
 const audit=async(target:string,action:string)=>db.prepare('INSERT INTO audit (id,actor,target,action,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),user.id,target,action,Date.now()).run();
 const location=`u.name AS seller_name,u.hostel,u.wing,u.phase,COALESCE(u.room_label,CAST(u.room AS TEXT)) AS room,CASE WHEN u.show_phone=1 THEN u.phone ELSE NULL END AS phone,CASE WHEN qr.status='approved' THEN u.upi_qr_id ELSE NULL END AS upi_qr_id`;
 const mediaId=path.match(/^market\/media\/([a-f0-9-]{36})$/)?.[1];
 if(mediaId&&req.method==='GET'){
  const row=await db.prepare('SELECT * FROM market_media WHERE id=?').bind(mediaId).first<any>();
  if(!row||!(row.status==='approved'||user?.id===row.owner_id||user?.role==='admin'))return json({error:'Image not found.'},404);
  if(row.kind==='qr'&&user?.id!==row.owner_id&&user?.role!=='admin'&&!await db.prepare('SELECT id FROM users WHERE upi_qr_id=?').bind(mediaId).first())return json({error:'Image not found.'},404);
  if(row.kind==='pawn'&&row.status==='approved'&&user?.id!==row.owner_id&&user?.role!=='admin'){const live=await db.prepare("SELECT id FROM pawn_listings WHERE photo_id=? AND status='approved' AND available=1").bind(mediaId).first();if(!live)return json({error:'Image not found.'},404);}
  const object=await bucket.get(row.object_key);if(!object)return json({error:'Image not found.'},404);
  return new Response(object.body,{headers:{'Content-Type':row.content_type,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(path==='market/upload'&&req.method==='POST'){
  requireSeller();await c.rate();const kind=url.searchParams.get('kind'),bytes=c.bytes;
  if(!['pawn','qr'].includes(kind||'')||!bytes||bytes.length>MAX_PHOTO_BYTES||imageType(bytes)!=='image/webp'||req.headers.get('content-type')!=='image/webp')return json({error:'Upload a compressed WebP image under 200 KB.'},400);
  if(req.headers.get('x-photo-rights')!=='confirmed')return json({error:'Confirm you own this image and want to share it.'},400);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM market_media WHERE owner_id=?').bind(user.id).first<any>();if(count.n>=60)return json({error:'Image limit reached. Contact the maintainer.'},400);
  const id=crypto.randomUUID(),key=`market/${id}`,type=imageType(bytes)!;
  await pruneUnusedImages(db,bucket);await reservePhoto(db,id,key,bytes.byteLength);
  try{await bucket.put(key,bytes,{httpMetadata:{contentType:type}});await db.prepare('INSERT INTO market_media (id,owner_id,kind,object_key,content_type,status,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,user.id,kind,key,type,'approved',Date.now()).run();}catch(e){await bucket.delete(key);await releasePhoto(db,id);throw e;}
  if(kind==='qr'){await db.prepare('UPDATE users SET upi_qr_id=? WHERE id=?').bind(id,user.id).run();if(user.upi_qr_id)await deleteMarketMedia(db,bucket,user.upi_qr_id);}
  return json({id,status:'approved',path:`/api/market/media/${id}`});
 }
 if(path==='payment-qr'&&req.method==='GET'){
  requireSeller();const qr=user.upi_qr_id?await db.prepare('SELECT id,status FROM market_media WHERE id=? AND owner_id=?').bind(user.upi_qr_id,user.id).first<any>():null;return json({qr});
 }
 if(path==='payment-qr'&&req.method==='DELETE'){requireSeller();await db.prepare('UPDATE users SET upi_qr_id=NULL WHERE id=?').bind(user.id).run();if(user.upi_qr_id)await deleteMarketMedia(db,bucket,user.upi_qr_id);return json({ok:true});}
 if(path==='pawn'&&req.method==='GET'){
  const rows=await db.prepare(`SELECT p.*,${location} FROM pawn_listings p JOIN users u ON u.id=p.seller_id LEFT JOIN market_media qr ON qr.id=u.upi_qr_id WHERE p.status='approved' AND p.available=1 AND p.updated_at>? ORDER BY p.created_at DESC LIMIT 200`).bind(Date.now()-30*86400000).all<any>();return json({listings:rows.results.filter(p=>!prohibitedReason(p.title+' '+p.description))});
 }
 if(path==='pawn/mine'&&req.method==='GET'){requireSeller();return json({listings:(await db.prepare(`SELECT p.*,${location} FROM pawn_listings p JOIN users u ON u.id=p.seller_id LEFT JOIN market_media qr ON qr.id=u.upi_qr_id WHERE p.seller_id=? ORDER BY p.updated_at DESC`).bind(user.id).all()).results});}
 if(path==='pawn'&&req.method==='POST'){
  requireSeller();await c.rate();if(!await registeredHostel(db,user.hostel)||!user.wing)return json({error:'Set your hostel, room and wing in your profile first.'},400);
  const b=await c.body(),title=asciiText(b.title,'Title',80),description=asciiText(b.description,'Description',600);checkContent(title,description);
  if(title.length<3||!['New / sealed','Like new','Used - good','Needs repair'].includes(b.condition)||!Number.isInteger(b.price)||b.price<100||b.price>5000000)return json({error:'Check the title, condition and price (Rs 1 to Rs 50,000).'},400);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM pawn_listings WHERE seller_id=?').bind(user.id).first<any>();if(count.n>=30)return json({error:'You can have up to 30 Pawn Shop listings.'},400);
  if(b.photoId&&!await db.prepare("SELECT id FROM market_media WHERE id=? AND owner_id=? AND kind='pawn' AND status!='rejected'").bind(b.photoId,user.id).first())return json({error:'Choose your own item photo.'},400);
  await db.prepare("INSERT INTO pawn_listings (id,seller_id,title,description,category,condition,price,photo_id,status,available,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'approved',1,?,?)").bind(crypto.randomUUID(),user.id,title,description,'General',b.condition,b.price,b.photoId||null,Date.now(),Date.now()).run();return json({ok:true,status:'approved'});
 }
 const ownId=path.match(/^pawn\/mine\/([a-f0-9-]{36})$/)?.[1];
 if(ownId&&['DELETE','PUT'].includes(req.method)){
  requireSeller();const row=await db.prepare('SELECT * FROM pawn_listings WHERE id=? AND seller_id=?').bind(ownId,user.id).first<any>();if(!row)return json({error:'Listing not found in your items.'},404);
  if(req.method==='DELETE'){await db.prepare('DELETE FROM pawn_listings WHERE id=? AND seller_id=?').bind(ownId,user.id).run();if(row.photo_id&&!await db.prepare('SELECT id FROM pawn_listings WHERE photo_id=?').bind(row.photo_id).first())await deleteMarketMedia(db,bucket,row.photo_id);}
  else{const b=await c.body();if(typeof b.available!=='boolean')return json({error:'Choose availability.'},400);await db.prepare('UPDATE pawn_listings SET available=?,updated_at=? WHERE id=? AND seller_id=?').bind(b.available?1:0,Date.now(),ownId,user.id).run();}
  return json({ok:true});
 }
 if(path==='admin/review'||path==='pawn/admin/review')return moderationConsole(req,path,{db,bucket,user,body:c.body});
 return null;
}
