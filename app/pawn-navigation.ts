export type PawnSection='all'|'mine'|'sell'|'rules'|'moderator';
export const pawnUrl=(section:PawnSection)=>({all:'/pawn',mine:'/pawn/deploy',sell:'/pawn/deploy',rules:'/pawn/rules',moderator:'/pawn/moderator'}[section]);
export function pawnSectionAt(path:string):PawnSection|null{const normalized=path.replace(/\/$/,'').replace(/^\/pawn(?:store|shop)(?=\/|$)/,'/pawn');return ({'/pawn':'all','/pawn/deploy':'sell','/pawn/your-listings':'sell','/pawn/sell':'sell','/pawn/rules':'rules','/pawn/moderator':'moderator'} as Record<string,PawnSection>)[normalized]||null;}
export function legacyPawnSection(section:string|null):PawnSection{return section==='payments'||section==='sell'||section==='mine'?'sell':section==='rules'||section==='moderator'?section:'all';}
export const stashPath=(view:string)=>({stash:'/stash',seller:'/dashboard',admin:'/moderator',browse:'/'}[view]||'/');
export const stashViewAt=(path:string)=>({'/stash':'stash','/dashboard':'seller','/moderator':'admin'}[path.replace(/\/$/,'')]||'browse');
