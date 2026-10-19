import {registeredHostel} from "./hostels";
import {reservePhoto,releasePhoto,pruneUnusedImages,deleteMarketMedia,MAX_STORAGE_BYTES,MAX_IMAGE_BYTES} from './image-storage';
import {asciiText,checkContent,prohibitedReason} from '../moderation';
import {imageType,MAX_PHOTO_BYTES,photoService} from './packet-photos';
import {libraryPhoto} from '../packet-library';
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
  if(!['pawn','qr'].includes(kind||'')||!bytes||bytes.length>MAX_PHOTO_BYTES||imageType(bytes)!=='image/webp'||req.headers.get('content-type')!=='image/webp')return json({error:'Use StashBox to convert and upload a compressed WebP image under 200 KB.'},400);
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
  const rows=await db.prepare(`SELECT p.*,${location} FROM pawn_listings p JOIN users u ON u.id=p.seller_id LEFT JOIN market_media qr ON qr.id=u.upi_qr_id WHERE u.shop_sleeping=0 AND p.status='approved' AND p.available=1 AND p.updated_at>? ORDER BY p.created_at DESC LIMIT 200`).bind(Date.now()-30*86400000).all<any>();return json({listings:rows.results.filter(p=>!prohibitedReason(p.title+' '+p.description))});
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
 if(path==='admin/review'&&req.method==='GET'){
  requireAdmin();const service=photoService(db,bucket);
  const snacks=await service.decorate((await db.prepare(`SELECT l.*,u.name AS seller_name,u.hostel,u.wing,COALESCE(u.room_label,CAST(u.room AS TEXT)) AS room,p.id AS photo_id,p.source AS photo_source FROM listings l JOIN users u ON u.id=l.seller_id LEFT JOIN packet_photos p ON p.id=l.photo_id ORDER BY l.updated_at DESC LIMIT 100`).all<any>()).results,true);
  const photos=(await db.prepare("SELECT p.*,u.name AS seller_name FROM packet_photos p LEFT JOIN users u ON u.id=p.uploaded_by WHERE p.source='seller' ORDER BY p.created_at DESC LIMIT 100").all()).results;
  const products=await service.decorate((await db.prepare('SELECT * FROM product_catalog ORDER BY created_at DESC LIMIT 100').all<any>()).results,true);
  const pawn=(await db.prepare(`SELECT p.*,${location} FROM pawn_listings p JOIN users u ON u.id=p.seller_id LEFT JOIN market_media qr ON qr.id=u.upi_qr_id ORDER BY p.created_at DESC LIMIT 100`).all()).results;
  const qrs=(await db.prepare("SELECT m.*,u.name AS seller_name FROM market_media m JOIN users u ON u.id=m.owner_id AND u.upi_qr_id=m.id WHERE m.kind='qr' ORDER BY m.created_at DESC LIMIT 100").all()).results;
  const storage=await db.prepare('SELECT COALESCE(SUM(byte_size),0) AS used,COUNT(*) AS files FROM image_storage').first();
  return json({storage:{...storage,limit:MAX_STORAGE_BYTES,max_photo:MAX_IMAGE_BYTES},snacks:snacks.map(s=>({...s,missing_photo:!s.photo_id&&!libraryPhoto(s.name),user_photo:s.photo_source==='seller'})),photos,products:products.map(p=>({...p,missing_photo:!p.photo_id})),pawn,qrs});
 }
 if(path==='admin/review'&&req.method==='PUT'){
  requireAdmin();const b=await c.body();if(!['approved','rejected'].includes(b.status)||typeof b.id!=='string')return json({error:'Choose an item and review action.'},400);
  const tables:any={snack:['listings','moderation_status'],photo:['packet_photos','review_status'],product:['product_catalog','moderation_status'],pawn:['pawn_listings','status'],qr:['market_media','status']};
  const config=tables[b.kind];if(!config)return json({error:'Unknown review type.'},400);
  const [table,column]=config,key=b.kind==='product'?'product_group':'id',row=await db.prepare(`SELECT * FROM ${table} WHERE ${key}=?`).bind(b.id).first<any>();if(!row)return json({error:'Review item not found.'},404);
  if(b.kind==='qr'&&row.kind!=='qr')return json({error:'Choose a payment QR.'},400);
  if(b.status==='approved')checkContent(row.name||row.title||row.matched_name||'',row.description||'',row.offer_text||'');
  await db.prepare(`UPDATE ${table} SET ${column}=? WHERE ${key}=?`).bind(b.status,b.id).run();
  if(b.status==='approved'&&b.kind==='snack'){
   await db.prepare("UPDATE product_catalog SET moderation_status='approved' WHERE name=? AND category=?").bind(row.name,row.category).run();
   if(row.photo_id)await db.prepare("UPDATE packet_photos SET review_status='approved' WHERE id=?").bind(row.photo_id).run();
  }
  if(b.kind==='product')await db.prepare('UPDATE listings SET moderation_status=? WHERE name=? AND category=?').bind(b.status,row.name,row.category).run();
  if(b.kind==='photo'&&b.status==='rejected')await db.prepare('DELETE FROM product_photo_defaults WHERE photo_id=?').bind(b.id).run();
  if(b.kind==='pawn'&&row.photo_id)await db.prepare('UPDATE market_media SET status=? WHERE id=?').bind(b.status,row.photo_id).run();
  await audit(b.id,`review_${b.kind}_${b.status}`);return json({ok:true});
 }
 return null;
}
