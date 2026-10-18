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
const desired=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
const built=existsSync('dist/server/wrangler.json')?JSON.parse(readFileSync('dist/server/wrangler.json','utf8')):null;
if(!built||(desired.r2&&!built.r2_buckets?.some(b=>b.binding===desired.r2)))run(['scripts/run-framework.mjs','build']);
const cli=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'];
const inspected=spawnSync(process.execPath,[...cli,'--json','--command',"SELECT name FROM sqlite_master WHERE type='table' AND name='users'"],{encoding:'utf8'});
if(inspected.status!==0){console.error('Could not inspect the local database.');console.error(inspected.stderr);process.exit(1);}
let found=false;try{found=JSON.parse(inspected.stdout).some(r=>r.results?.some(t=>t.name==='users'));}catch{console.error('Could not read the local database check.');process.exit(1);}
// Keep a database-local migration journal so restarting applies only new SQL.
run([...cli,'--command','CREATE TABLE IF NOT EXISTS _stashbox_local_migrations (name TEXT PRIMARY KEY NOT NULL)']);
const migrationFiles=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
if(found&&migrationFiles[0])run([...cli,'--command',`INSERT OR IGNORE INTO _stashbox_local_migrations (name) VALUES ('${migrationFiles[0]}')`]);
const journal=spawnSync(process.execPath,[...cli,'--json','--command','SELECT name FROM _stashbox_local_migrations'],{encoding:'utf8'});
if(journal.status!==0){console.error('Could not read local migration history.');process.exit(1);}
const applied=new Set(JSON.parse(journal.stdout).flatMap(r=>r.results||[]).map(r=>r.name));
for(const file of migrationFiles){
  if(applied.has(file))continue;
  run([...cli,'--file',`drizzle/${file}`]);
  run([...cli,'--command',`INSERT INTO _stashbox_local_migrations (name) VALUES ('${file}')`]);
}
console.log('\nStashBox stays on your computer. No online deployment is performed.');
console.log('Open http://127.0.0.1:5173/');
console.log('Maintainer instructions: .sites-runtime/maintainer-setup.txt\n');
const preview=spawn(process.execPath,['scripts/run-framework.mjs','dev'],{stdio:'inherit'});
process.on('SIGINT',()=>{preview.kill('SIGINT');});
process.on('SIGTERM',()=>{preview.kill('SIGTERM');});
preview.on('exit',code=>process.exit(code||0));
