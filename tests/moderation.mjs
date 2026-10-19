import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('app/moderation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {asciiText,checkContent,prohibitedReason}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const text of ['chhoti gold','choti gold','chhota gold','CHHOTI-GOLD','c h h o t i g o l d','Gold Flake','Classic Milds','Marlboro','Wills Navy Cut','cig','cigs','c i g','cigarettes','C I G A R E T T E S','c1g4r3tt3s','c.i.g.a.r.e.t.t.e','ganja','g a n j a','vape kit','tobacco','gutkha','khaini','charas','cocaine','weed for sale','vodka'])assert(prohibitedReason(text),text+' must be blocked');
for(const text of ['Hero cycle','Engineering Mathematics book','Blue ball pens - 10 pieces','A notebook and drum sticks','Kurkure Masala Munch','Coffee mug','Oreo Original'])assert.equal(prohibitedReason(text),null,text+' must be allowed');
assert.equal(asciiText("  Hero cycle - Rs 500  ",'Title',80),'Hero cycle - Rs 500');
for(const text of ['<script>alert(1)</script>','Hello 😀','नमस्ते','cig\u200barette','bad\\text'])assert.throws(()=>asciiText(text,'Title',80));
assert.throws(()=>checkContent('Oreo','Add a v4p3 too'));
console.log('PASS automatic moderation: English/Hinglish terms, spaced/leet obfuscation, ordinary goods and ASCII enforcement');
