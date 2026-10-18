export const WINGS = [
  [1,101,112],[2,113,126],[3,127,137],[4,138,149],[5,150,162],[6,163,175],[7,176,183],
  [8,201,212],[9,213,226],[10,227,237],[11,238,249],[12,250,262],[13,263,275],[14,276,283],
] as const;
export const wingForRoom = (room: number) => WINGS.find(([,start,end])=>room>=start&&room<=end)?.[0];
export const ROOMS = WINGS.flatMap(([,start,end])=>Array.from({length:end-start+1},(_,i)=>start+i));
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
export type User = { id:string; name:string; email:string; student_id:string; phone:string; room:number; show_phone:number; is_open:number; role:string; must_change_password:number; confirmed_at:number };
export type Listing = { id:string; product_key:string; name:string; size:string; category:string; price:number; available:number; seller_id:string; seller_name:string; room:number; wing:number; phone:string|null; is_open:number; confirmed_at:number };
export type OwnListing = {id:string;product_key:string;name:string;size:string;category:string;price:number;available:number};
export const money = (paise:number) => `₹${(paise/100).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
