import {PACKET_LIBRARY,libraryPhoto,libraryPhotoById,photoGroup,normalizePacketName} from "../packet-library";
import type {Photo} from "../shared";
export const MAX_PHOTO_BYTES=750000;
export const photoColumns="p.id AS photo_id,p.source AS photo_source,p.credit AS photo_credit,p.license AS photo_license,p.source_url AS photo_source_url,p.matched_name AS photo_name";
export const photoJoins="LEFT JOIN packet_photos p ON p.id=l.photo_id";
const columns="id AS photo_id,source AS photo_source,credit AS photo_credit,license AS photo_license,source_url AS photo_source_url,matched_name AS photo_name";
export async function productKey(name:string,category:string,mrp:number,container?:string|null,volumeMl?:number|null){
 const variant=container&&volumeMl?`|${normalizePacketName(container)}|${volumeMl}`:"";
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${photoGroup(name,category)}|${mrp}${variant}`));
 return "mrp-"+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
export function imageType(bytes:Uint8Array):string|null {
 if(bytes.length<12)return null;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return "image/png";
 if(new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP")return "image/webp";
 return null;
}
export function photoService(db:D1Database,bucket:R2Bucket){
 async function photo(id:string):Promise<Photo|null>{return libraryPhotoById(id)||await db.prepare(`SELECT ${columns} FROM packet_photos WHERE id=?`).bind(id).first<Photo>();}
 async function store(bytes:Uint8Array,info:{source:string;sourceUrl:string|null;credit:string;license:string|null;name:string;owner:string|null;category?:string}){
  const type=imageType(bytes);if(!type||bytes.byteLength>MAX_PHOTO_BYTES)throw new Error("Use a JPEG, PNG or WebP photo under 750 KB.");
  const id=crypto.randomUUID(),key=`packets/${id}`,category=info.category||"Sweet tooth",group=photoGroup(info.name,category);
  await bucket.put(key,bytes,{httpMetadata:{contentType:type}});
  try{await db.prepare("INSERT INTO packet_photos (id,object_key,content_type,source,source_url,credit,license,matched_name,uploaded_by,created_at,product_group,category) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,key,type,info.source,info.sourceUrl,info.credit,info.license,info.name,info.owner,Date.now(),group,category).run();}
  catch(e){await bucket.delete(key);throw e;}
  await register(info.name,category);
  if(!libraryPhoto(info.name))await db.prepare("INSERT OR IGNORE INTO product_photo_defaults (product_group,name,category,photo_id,selected_by,updated_at) VALUES (?,?,?,?,?,?)").bind(group,info.name,category,id,"first-upload",Date.now()).run();
  return await photo(id);
 }
 async function choices(name:string,category:string){
  const group=photoGroup(name,category),prepared=libraryPhoto(name);
  const images=(await db.prepare(`SELECT ${columns} FROM packet_photos WHERE product_group=? ORDER BY created_at DESC LIMIT 40`).bind(group).all<Photo>()).results;
  const selected=await db.prepare("SELECT photo_id FROM product_photo_defaults WHERE product_group=?").bind(group).first<{photo_id:string}>();
  const chosen=selected?await photo(selected.photo_id):null;
  const items=[...(prepared?[prepared]:[]),...images];
  if(chosen&&!items.some(p=>p.photo_id===chosen.photo_id))items.unshift(chosen);
  return {name,category,productGroup:group,photos:items,defaultPhoto:chosen||prepared||images[0]||null};
 }
 async function allowed(id:unknown,_userId:string,name?:string,category?:string){
  if(id===null||id===undefined||id==="")return null;
  if(typeof id!=="string"||!await photo(id))throw new Error("Choose a shared packet photo or upload one.");
  if(name&&category){const group=photoGroup(name,category),prepared=libraryPhoto(name);const uploaded=await db.prepare("SELECT id FROM packet_photos WHERE id=? AND product_group=?").bind(id,group).first();if(prepared?.photo_id!==id&&!uploaded)throw new Error("Choose a photo for this product and flavour.");}
  return id;
 }
 async function selectDefault(name:string,category:string,id:string,actor:string){
  const group=photoGroup(name,category),prepared=libraryPhoto(name);
  const uploaded=await db.prepare("SELECT id FROM packet_photos WHERE id=? AND product_group=?").bind(id,group).first();
  if(prepared?.photo_id!==id&&!uploaded)throw new Error("Choose a photo from this product’s library.");
  await db.batch([
   db.prepare("INSERT INTO product_photo_defaults (product_group,name,category,photo_id,selected_by,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(product_group) DO UPDATE SET photo_id=excluded.photo_id,selected_by=excluded.selected_by,updated_at=excluded.updated_at").bind(group,name,category,id,actor,Date.now()),
   db.prepare("INSERT INTO audit (id,actor,target,action,created_at) VALUES (?,?,?,'product_photo_default',?)").bind(crypto.randomUUID(),actor,group,Date.now()),
  ]);
 }
 async function decorate<T extends {name:string;category:string}>(rows:T[]):Promise<(T&Photo)[]>{
  const defaults=new Map<string,Photo>();
  const groups=[...new Set(rows.map(r=>photoGroup(r.name,r.category)))];
  for(let at=0;at<groups.length;at+=40){const part=groups.slice(at,at+40);const selected=(await db.prepare(`SELECT product_group,photo_id FROM product_photo_defaults WHERE product_group IN (${part.map(()=>"?").join(",")})`).bind(...part).all<{product_group:string;photo_id:string}>()).results;
   for(const r of selected){const p=await photo(r.photo_id);if(p)defaults.set(r.product_group,p);}
  }
  return rows.map(row=>({...row,...(defaults.get(photoGroup(row.name,row.category))||libraryPhoto(row.name)||{})})) as (T&Photo)[];
 }
 async function directory(){
  const uploads=(await db.prepare("SELECT name,category FROM product_catalog UNION SELECT DISTINCT name,category FROM listings UNION SELECT DISTINCT matched_name AS name,category FROM packet_photos WHERE product_group IS NOT NULL AND category IS NOT NULL").all<{name:string;category:string}>()).results;
  const names=new Map(PACKET_LIBRARY.map(p=>[photoGroup(p.name,p.category),{name:p.name,category:p.category,aliases:p.aliases}]));
  for(const p of uploads)if(!names.has(photoGroup(p.name,p.category)))names.set(photoGroup(p.name,p.category),{...p,aliases:[]});
  return [...names.values()].sort((a,b)=>normalizePacketName(a.name).localeCompare(normalizePacketName(b.name)));
 }
 async function register(name:string,category:string){await db.prepare("INSERT OR IGNORE INTO product_catalog (product_group,name,category,created_at) VALUES (?,?,?,?)").bind(photoGroup(name,category),name,category,Date.now()).run();}
 return {store,choices,allowed,selectDefault,decorate,directory,register};
}
