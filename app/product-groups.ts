import {photoGroup,libraryProduct,normalizePacketName} from "./packet-library";
import {mrpLabel,type Listing} from "./shared";

export type ProductGroup={key:string;name:string;category:string;offers:Listing[]};
export type PackVariant={key:string;label:string;offers:Listing[]};
export const productIdentity=(item:Pick<Listing,"name"|"category">)=>photoGroup(item.name,item.category);
export const sellerCount=(offers:Listing[])=>new Set(offers.map(o=>o.seller_id)).size;
export function startingPrice(offers:Listing[]){const open=offers.filter(o=>o.is_open);return Math.min(...(open.length?open:offers).map(o=>o.price));}
export function groupProducts(offers:Listing[]):ProductGroup[]{
 const groups=new Map<string,ProductGroup>();
 for(const offer of offers){const key=productIdentity(offer);if(!groups.has(key))groups.set(key,{key,name:libraryProduct(offer.name)?.name||offer.name,category:offer.category,offers:[]});groups.get(key)!.offers.push(offer);}
 for(const group of groups.values())group.offers.sort((a,b)=>b.is_open-a.is_open||a.price-b.price);
 return [...groups.values()];
}
export function variantLabel(offer:Listing){
 const parts=[mrpLabel(offer.mrp)];
 if(offer.category==="Drinks"){
  if(offer.container)parts.push(offer.container);
  if(offer.volume_ml)parts.push(offer.volume_ml>=1000?`${offer.volume_ml/1000} L`:`${offer.volume_ml} ml`);
  else if(offer.size)parts.push(offer.size);
  if(!offer.container)parts.push("Container not set");
 }else if(!offer.mrp&&offer.size)parts.push(offer.size);
 return parts.join(" · ");
}
export function groupVariants(offers:Listing[]):PackVariant[]{
 const groups=new Map<string,PackVariant>();
 for(const offer of offers){
  // Keep legacy packs with unknown MRP separate until the seller fills it in.
  const key=offer.mrp==null?`legacy:${offer.product_key}`:JSON.stringify([offer.mrp,offer.category==="Drinks"?normalizePacketName(offer.container||""):"",offer.category==="Drinks"?(offer.volume_ml||offer.size):""]);
  if(!groups.has(key))groups.set(key,{key,label:variantLabel(offer),offers:[]});groups.get(key)!.offers.push(offer);
 }
 return [...groups.values()].sort((a,b)=>(a.offers[0].mrp??Infinity)-(b.offers[0].mrp??Infinity)||a.label.localeCompare(b.label));
}
