import type {Pricing} from "./pricing";
import preparedPackets from "./packet-library.json";
export const HOSTELS = [
  {id:"general-bipin-rawat",name:"General Bipin Rawat Bhawan",short:"General Bipin Rawat",initials:"BR"},
  {id:"tagore",name:"Tagore Bhawan",short:"Tagore",initials:"TB"},
  {id:"patel",name:"Patel Bhawan",short:"Patel",initials:"PB"},
  {id:"silver-jubilee",name:"Silver Jubilee Bhawan",short:"Silver Jubilee",initials:"SJ"},
  {id:"vishwesharya",name:"Vishwesharya Bhawan",short:"Vishwesharya",initials:"VB"},
  {id:"saraswati",name:"Saraswati Bhawan",short:"Saraswati",initials:"SB"},
  {id:"mandakini",name:"Mandakini Bhawan",short:"Mandakini",initials:"MB"},
  {id:"sarojini",name:"Sarojini Bhawan",short:"Sarojini",initials:"SN"},
] as const;
export const isHostel = (id:unknown):id is string => typeof id==="string"&&HOSTELS.some(h=>h.id===id);
export const hostelName = (id:string|null|undefined) => HOSTELS.find(h=>h.id===id)?.name||"Choose a hostel";
export const PHASE_NOTICE = "Phase 3 is separated from Phases 1–2. Rooms across this divide may be unreachable after 10 PM. Check access with the seller before heading over.";
export function locationText(location:{room:string|number;wing?:string|null;phase?:string|null}) {
  return [location.phase?`Phase ${location.phase}`:null,location.wing?`Wing ${location.wing}`:null,`Room ${location.room}`].filter(Boolean).join(" · ");
}
export function matchesPhase(phase:string|null,group:string) {return group==="all"||(group==="connected"&&(phase==="1"||phase==="2"))||(group==="3"&&phase==="3");}
export const CATEGORIES = ["All munchies", "Chips & namkeen", "Sweet tooth", "Instant fixes", "Drinks"];
export type Product = { key: string; name: string; size: string; category: string; color: string; short: string };
export const CATALOG: Product[] = [
  {key:"kurkure-masala-40g",name:"Kurkure Masala Munch",size:"40 g",category:"Chips & namkeen",color:"#fa6932",short:"KURKURE"},
  {key:"oreo-original-120g",name:"Oreo Original",size:"120 g",category:"Sweet tooth",color:"#2477ce",short:"OREO"},
  {key:"maggi-masala-70g",name:"Maggi Masala Noodles",size:"70 g",category:"Instant fixes",color:"#f3cd34",short:"MAGGI"},
  {key:"lays-classic-40g",name:"Lay’s Classic Salted",size:"40 g",category:"Chips & namkeen",color:"#e9c843",short:"LAY’S"},
  {key:"dark-fantasy-75g",name:"Dark Fantasy Choco Fills",size:"75 g",category:"Sweet tooth",color:"#754e3a",short:"DARK FANTASY"},
  {key:"coke-250ml",name:"Coca-Cola",size:"250 ml",category:"Drinks",color:"#d53b34",short:"Coca-Cola"},
  {key:"cake-chocolate-50g",name:"Chocolate Cake",size:"50 g",category:"Sweet tooth",color:"#ad5879",short:"CAKE"},
  {key:"goodday-butter-100g",name:"Good Day Butter Cookies",size:"100 g",category:"Sweet tooth",color:"#d98c38",short:"GOOD DAY"},
  {key:"bingo-mad-angles-60g",name:"Bingo! Mad Angles",size:"60 g",category:"Chips & namkeen",color:"#ba4f78",short:"BINGO!"},
  {key:"topramen-curry-70g",name:"Top Ramen Curry",size:"70 g",category:"Instant fixes",color:"#b9652f",short:"TOP RAMEN"},
  {key:"real-mango-200ml",name:"Real Mango Juice",size:"200 ml",category:"Drinks",color:"#6c9a44",short:"REAL"},
  {key:"bourbon-100g",name:"Bourbon Biscuits",size:"100 g",category:"Sweet tooth",color:"#77412e",short:"BOURBON"},
];
// Keep the three hero products in place; extend seller choices from the prepared library.
CATALOG.push(...preparedPackets.filter(p=>!CATALOG.some(c=>c.key===p.key)).map(p=>({key:p.key,name:p.name,category:p.category,size:"",color:"#798665",short:"STASH"})));
export type User = { id:string; name:string; email:string; student_id:string; phone:string; room:string; hostel:string|null; wing:string|null; phase:string|null; show_phone:number; is_open:number; role:string; must_change_password:number; confirmed_at:number };
export type DrinkVariant={container?:string|null;volume_ml?:number|null};
export type Listing = Photo & DrinkVariant & Pricing & {mrp:number|null; id:string; product_key:string; name:string; size:string; category:string; price:number; available:number; seller_id:string; seller_name:string; room:string; hostel:string; wing:string; phase:string|null; phone:string|null; is_open:number; confirmed_at:number };
export type Photo = {photo_id:string|null;photo_path?:string|null;photo_source?:string|null;photo_credit?:string|null;photo_license?:string|null;photo_source_url?:string|null;photo_name?:string|null};
export type OwnListing = Photo & DrinkVariant & Pricing & {id:string;product_key:string;name:string;size:string;mrp:number|null;category:string;price:number;available:number};
export const mrpLabel = (value:number|null|undefined) => value ? `MRP ${money(value)}` : "MRP not set";
export const money = (paise:number) => `₹${(paise/100).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
