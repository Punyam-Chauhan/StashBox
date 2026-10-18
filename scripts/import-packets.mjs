// Run: node scripts/import-packets.mjs "C:/path/to/PACKET"
// Copies originals unchanged. Matching is reviewed, never guessed from a hash filename.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const folder=process.argv[2];if(!folder)throw new Error('Pass the PACKET folder path.');
const files=JSON.parse(readFileSync(new URL('./packet-import-map.json',import.meta.url),'utf8'));
const existing=JSON.parse(readFileSync('app/packet-library.json','utf8'));
const result=[];mkdirSync('public/packets',{recursive:true});
for(const item of files){
 const source=path.resolve(folder,item.file);if(!source.startsWith(path.resolve(folder)+path.sep)||!existsSync(source))throw new Error('Missing supplied image: '+item.file);
 const old=existing.find(p=>p.key===item.key),extension=path.extname(item.file).toLowerCase(),destination=`${item.key}-supplied${extension}`;
 copyFileSync(source,path.join('public/packets',destination));
 result.push({key:item.key,name:item.name,category:item.category,aliases:[...new Set([...(old?.aliases||[]),...(item.aliases||[])])],image:'/packets/'+destination,source:'provided',source_url:null,source_name:item.name,credit:'Product photo supplied by maintainer',license:null,original_file:item.file});
}
for(const old of existing)if(!result.some(p=>p.key===old.key))result.push({...old,image:null,source:'provided',source_url:null,license:null});
writeFileSync('app/packet-library.json',JSON.stringify(result,null,2)+'\n');
console.log(`Imported ${files.length} supplied photos; ${result.length} product names available.`);
