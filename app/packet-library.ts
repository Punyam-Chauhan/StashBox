import entries from "./packet-library.json";
import type {Photo} from "./shared";
export const PACKET_LIBRARY=entries;
export const normalizePacketName=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/[’']/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function libraryProduct(name:string){const n=normalizePacketName(name);return PACKET_LIBRARY.find(p=>normalizePacketName(p.name)===n||p.aliases.some(a=>normalizePacketName(a)===n));}
export function photoGroup(name:string,category:string){return `${normalizePacketName(libraryProduct(name)?.name||name)}|${normalizePacketName(category)}`;}
export function libraryPhoto(name:string):Photo|null {
 const p=libraryProduct(name);return p?.image?{photo_id:`library-${p.key}`,photo_path:p.image,photo_source:p.source,photo_credit:p.credit,photo_license:p.license,photo_source_url:p.source_url,photo_name:p.name}:null;
}
export function libraryPhotoById(id:string){const p=PACKET_LIBRARY.find(p=>`library-${p.key}`===id);return p?libraryPhoto(p.name):null;}
