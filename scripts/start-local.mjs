import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
mkdirSync('.sites-runtime',{recursive:true});
const varsPath=path.join(root,'.dev.vars');
let vars=existsSync(varsPath)?readFileSync(varsPath,'utf8'):'';
let token=vars.match(/^MAINTAINER_BOOTSTRAP_TOKEN="?([^"\r\n]+)"?$/m)?.[1];
if(!token){token=randomBytes(24).toString('hex');writeFileSync(varsPath,`${vars}\nMAINTAINER_BOOTSTRAP_TOKEN="${token}"\n`);}
writeFileSync('.sites-runtime/maintainer-setup.txt',`STASHBOX LOCAL MAINTAINER SETUP\n\n1. Create your own account with Room 224.\n2. Open Help & account recovery.\n3. Paste the private setup key below and activate maintainer access.\n4. The Maintainer menu will appear. Only the first account can activate.\n\nPrivate setup key:\n${token}\n\nKeep this file private. It works only with this local database and runtime configuration.\n`);
function run(args){const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
if(!existsSync('dist/server/wrangler.json'))run(['scripts/run-framework.mjs','build']);
const cli=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'];
const inspected=spawnSync(process.execPath,[...cli,'--json','--command',"SELECT name FROM sqlite_master WHERE type='table' AND name='users'"],{encoding:'utf8'});
if(inspected.status!==0){console.error('Could not inspect the local database.');console.error(inspected.stderr);process.exit(1);}
let found=false;try{found=JSON.parse(inspected.stdout).some(r=>r.results?.some(t=>t.name==='users'));}catch{console.error('Could not read the local database check.');process.exit(1);}
if(!found){for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())run([...cli,'--file',`drizzle/${file}`]);}
console.log('\nStashBox stays on your computer. No online deployment is performed.');
console.log('Open http://127.0.0.1:5173/');
console.log('Maintainer instructions: .sites-runtime/maintainer-setup.txt\n');
const preview=spawn(process.execPath,['scripts/run-framework.mjs','dev'],{stdio:'inherit'});
process.on('SIGINT',()=>{preview.kill('SIGINT');});
process.on('SIGTERM',()=>{preview.kill('SIGTERM');});
preview.on('exit',code=>process.exit(code||0));
