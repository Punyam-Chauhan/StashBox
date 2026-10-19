import {DEFAULT_HOSTELS} from '../shared';
export async function hostelDirectory(db:D1Database){const rows=(await db.prepare('SELECT id,name,short,initials FROM campus_hostels ORDER BY created_at,id').all<{id:string;name:string;short:string;initials:string}>()).results;return [...DEFAULT_HOSTELS,...rows];}
export async function registeredHostel(db:D1Database,id:unknown){return typeof id==='string'&&(DEFAULT_HOSTELS.some(h=>h.id===id)||!!await db.prepare('SELECT id FROM campus_hostels WHERE id=?').bind(id).first());}
