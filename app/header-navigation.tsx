"use client";
import {useEffect,useRef} from 'react';
import {ChevronDown,Compass,Store,Package,ArrowLeft} from 'lucide-react';
type Action={label:string;run:()=>void;Icon:typeof Store};
export function HeaderNavigation({label,pawn=false,onNavigate,onPawn}:{label:string;pawn?:boolean;onNavigate:(view:string)=>void;onPawn:(section:'all'|'sell'|'rules'|'moderator')=>void}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))ref.current.open=false;};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[]);
 const actions:Action[]=pawn?[{label:'Shop floor',run:()=>onPawn('all'),Icon:Store},{label:'Deploy The Pawn',run:()=>onPawn('sell'),Icon:Package},{label:'Back to StashBox',run:()=>onNavigate('browse'),Icon:ArrowLeft}]:[{label:'Find a snack',run:()=>onNavigate('browse'),Icon:Compass},{label:'My stash',run:()=>onNavigate('stash'),Icon:Store},{label:'Stasher dashboard',run:()=>onNavigate('seller'),Icon:Package},{label:'The Pawn Shop',run:()=>onPawn('all'),Icon:Store}];
 return <details className="header-quick-nav" ref={ref}><summary aria-label="Quick navigation" title={label}><span>{label}</span><ChevronDown size={14}/></summary><nav aria-label="Quick navigation links">{actions.map(({label,run,Icon})=><button key={label} onClick={()=>{if(ref.current)ref.current.open=false;run();}}><Icon size={18}/>{label}</button>)}</nav></details>;
}
