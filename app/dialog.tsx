"use client";
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export function Modal({children,title,onClose,wide=false,className=""}:{children:ReactNode;title:string;onClose:()=>void;wide?:boolean;className?:string}){
 const ref=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const d=ref.current,previous=document.activeElement as HTMLElement;d?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';heading.current?.focus({preventScroll:true});return()=>{d?.close();document.body.style.overflow=overflow;previous?.focus({preventScroll:true});};},[]);
 return <dialog ref={ref} className={`modal ${wide?'modal-wide':''} ${className}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}} aria-label={title}><div className="modal-head"><h2 ref={heading} tabIndex={-1}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={22}/></button></div><div className="modal-body">{children}</div></dialog>;
}
