import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';

// Chorus submission film. All interface data is illustrative; no transfers are staged.
const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, 'output');
fs.mkdirSync(OUT, { recursive: true });
const FFMPEG = process.env.FFMPEG_PATH || '/tmp/chorus-film-tools/node_modules/ffmpeg-static/ffmpeg';
const FPS = 24;
const VOICE = 'iP95p4xoKVk53GoZ742B'; // Chris — natural, conversational ElevenLabs voice.
export const scenes = [
  { d:9, type:'hook', kicker:'THE GROUP PROJECT PROBLEM', title:['Great idea.', 'Now what?'], sub:'Six people. Four apps. One very tired spreadsheet.', voice:'Great idea. Six people. Four apps. One spreadsheet having a nervous breakdown. Sound familiar?' },
  { d:9, type:'brand', kicker:'MEET CHORUS', title:['Many people.', 'One purpose.'], sub:'A shared home for the goal, the money, and the work.', voice:'Meet Chorus. One shared space for the goal, the people, the budget, and the work. Finally, everyone is on the same page.' },
  { d:14, type:'create', kicker:'01 / START WITH THE WHY', title:['Make the goal', 'impossible to miss.'], sub:'A clear objective. A real target. A definition of done.', voice:'Let’s launch a community art campaign. Give it a name, set a five hundred dollar target, and define what done looks like. The project becomes the team’s shared source of truth.' },
  { d:12, type:'people', kicker:'02 / BRING YOUR PEOPLE', title:['Good company.', 'Clear roles.'], sub:'Invite collaborators. Keep responsibilities visible.', voice:'Bring the right people in with a private invitation. Owners, administrators, and contributors have distinct permissions. Everyone can see the objective. Everyone knows where they fit.' },
  { d:14, type:'tasks', kicker:'03 / TURN INTENT INTO ACTION', title:['Less “any update?”', 'More momentum.'], sub:'Small tasks. Visible progress. Outcomes people can read.', voice:'Break the campaign into manageable tasks. Move the artwork into progress, then record the outcome when it’s complete. Optional NEAR AI planning can propose a draft for a person to review.' },
  { d:14, type:'funding', kicker:'04 / SEE THE MONEY CLEARLY', title:['A report is', 'a report.'], sub:'Keep contribution reports distinct from settlement evidence.', voice:'Contributions have their own ledger. Here, Maya reports one hundred and fifty dollars. Chorus keeps that separate from verified funds. A number in a dashboard should never pretend to be a payment.' },
  { d:14, type:'policy', kicker:'05 / KEEP CONTROL', title:['Ambition, meet', 'boundaries.'], sub:'Set limits. Define scope. Keep approval deliberate.', voice:'Set a transaction cap, a total budget, and allowed categories. Purchase requests carry an exact purpose, provider, and amount. Human approvals remain subject to policy and verified funds. Your budget deserves boundaries.' },
  { d:14, type:'near', kicker:'06 / BUILT WITH NEAR', title:['Shared purpose.', 'Wallet control.'], sub:'NEAR Intents funding, with the contributor in control.', voice:'For project funding, Chorus integrates NEAR Intents: wrapped NEAR to USDC on NEAR. The owner verifies the receiving account, and the contributor confirms the mainnet transaction in their own wallet.' },
  { d:12, type:'activity', kicker:'07 / CLOSE THE LOOP', title:['The whole story.', 'In one place.'], sub:'Trace decisions, contributions, and work. Export the record.', voice:'Every recorded change joins the activity ledger. Filter by project or person, then export the record. Collaboration becomes easier when the paper trail is already part of the product.' },
  { d:8, type:'close', kicker:'CHORUS / NEAR HACKATHON', title:['Bring people together.', 'Make things happen.'], sub:'Many people. One purpose.', voice:'Chorus. Bring people together. Make things happen. Built with NEAR, for the things we can only do together.' },
];
let total=0; scenes.forEach(s=>{s.start=total; total+=s.d;});
if(total!==120) throw new Error('Film must be exactly 120 seconds.');
const C={bg:'#0b0c0e',panel:'#121417',raised:'#191b20',line:'#2b2d34',text:'#f4f0ec',muted:'#a2a2ab',dim:'#73757f',coral:'#ff5873',sun:'#ffb45c',green:'#99d4b3'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>1-Math.pow(1-clamp(x),3);
const rect=(x,y,w,h,fill=C.panel,stroke=C.line,r=16)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const line=(x,y,x2,y2,col=C.line)=>`<path d="M${x} ${y}H${x2}" stroke="${col}"/>`;
const text=(x,y,s,size=22,color=C.text,weight=400,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${esc(s)}</text>`;
const mark=(x,y,size=40)=>`<g transform="translate(${x} ${y}) scale(${size/40})"><path d="M30.6 10.2C27 6.7 21.6 5.3 16.6 7 9.3 9.4 5.5 17.3 8.1 24.4c2.8 7.7 12 11.2 18.9 6.8M27.9 14.4c-2.9-2.8-7.5-3.6-11-1.4-4.3 2.6-5.4 8.3-2.3 12.2 3 3.8 8.6 4.4 12.3 1.3M25.1 18.1c-1.8-1.5-4.5-1.5-6.2.1-1.8 1.7-1.7 4.5.2 6 1.7 1.4 4.3 1.3 5.9-.2" fill="none" stroke="${C.coral}" stroke-width="2.65" stroke-linecap="round"/><circle cx="31.2" cy="20.4" r="2.55" fill="${C.sun}"/></g>`;
const pill=(x,y,label,col=C.green)=>rect(x,y,Math.max(70,label.length*8.5+24),29,`${col}12`,`${col}45`,8)+text(x+12,y+20,label,14,col,600);
const button=(x,y,w,label,primary=true)=>rect(x,y,w,44,primary?C.coral:C.raised,primary?C.coral:'#3e4049',8)+text(x+w/2,y+28,label,16,primary?'#fff':C.text,600,'text-anchor="middle"');
const field=(x,y,w,label,value)=>text(x,y,label,16,C.muted,600)+rect(x,y+13,w,52,'#0d0f12',C.line,8)+text(x+16,y+45,value,18);
function cursor(x,y,t,clickAt=5){
 const travel=ease((t-(clickAt-1.8))/1.4);x+=110*(1-travel);y+=100*(1-travel);
 const ring=clamp((t-clickAt)/.6); const visible=t>clickAt&&t<clickAt+.6;
 return `${visible?`<circle cx="${x}" cy="${y}" r="${14+ring*28}" fill="none" stroke="${C.coral}" stroke-width="3" opacity="${1-ring}"/>`:''}<path d="M${x} ${y}l2 27 7-8 9 13 6-4-9-13 10-2Z" fill="#f8f5f1" stroke="#101115" stroke-width="2"/>`;
}
function shell(active='Overview'){
 let a=rect(655,190,1185,714,'#101215','#3a3b43',18)+rect(655,190,1185,50,'#17191e','#3a3b43',18);
 a+=`<rect x="656" y="221" width="1183" height="20" fill="#17191e"/>`;
 [0,1,2].forEach(i=>a+=`<circle cx="${678+i*18}" cy="215" r="4" fill="${i===0?'#7c3b48':'#3f414a'}"/>`);
 a+=text(1245,220,'chorus / workspace',13,C.dim,400,'text-anchor="middle"');
 a+=`<rect x="656" y="241" width="175" height="662" fill="#111317"/>`+mark(673,260,32)+text(712,283,'Chorus',22,C.text,700);
 const nav=['Overview','Projects','Treasury','Approvals','Activity','Intelligence'];
 nav.forEach((n,i)=>{const y=342+i*48;if(n===active)a+=rect(670,y-26,146,38,'#2a171e','#4d2530',7); a+=text(689,y,n,16,n===active?C.coral:C.muted,n===active?600:400);});
 a+=text(686,837,'Maya Chen',15,C.text,600)+text(686,858,'Campaign workspace',12,C.dim);
 a+=text(860,276,'Workspace  /  Community art campaign',14,C.muted)+pill(1604,256,'Sample workspace',C.sun);
 return a;
}
const titleBlock=(k,title,sub,t)=>{
 const y=22*(1-ease(t/1.1)); let a=`<g transform="translate(0 ${y})" opacity="${ease(t/.8)}">`+text(80,278,k,16,C.coral,600,'letter-spacing="2"');
 title.forEach((s,i)=>a+=text(78,370+i*73,s,61,i?C.muted:C.text,600,'letter-spacing="-2.2"'));
 const words=sub.split(' '); let lines=['']; words.forEach(w=>{let j=lines.length-1;if((lines[j]+w).length>36)lines.push(w+' ');else lines[j]+=w+' ';});
 lines.forEach((s,i)=>a+=text(80,535+i*32,s.trim(),23,C.muted));
 return a+'</g>';
};
function view(type,t){
 let a=''; const on=(time)=>t>=time;
 if(type==='create'){
  a=shell('Projects')+text(867,337,'Create a project',28,C.text,600)+text(867,371,'Start with a shared purpose.',17,C.muted);
  a+=field(867,417,920,'Project name',t>1.1?'Community art campaign':'');
  a+=field(867,514,920,'What are you setting out to do?',t>2.4?'Launch a community-led art campaign.':'');
  a+=field(867,611,280,'Target budget',t>3.7?'$500.00 USD':'');
  a+=field(1175,611,612,'Expected outcome',t>4.5?'Five artworks and a launch-ready campaign.':'');
  a+=button(1576,726,211,on(7)?'Project created ✓':'Create project');
  a+=text(867,817,'One objective. One team. One accountable project.',17,C.dim);
  a+=cursor(1690+20*Math.sin(Math.min(t,6)/2),751,t,7);
 }else if(type==='people'){
  a=shell('Projects')+text(867,337,'Your people',28,C.text,600)+text(867,371,'Community art campaign',17,C.muted);
  const people=[['M','Maya Chen','Owner',C.coral],['J','Jules Park','Administrator','#aa9eea'],['S','Sam Rivera','Contributor',C.green]];
  people.forEach((p,i)=>{const y=421+i*87; const op=ease((t-i*.6-.5)/.7);a+=`<g opacity="${op}">`+rect(867,y,920,72,C.panel,C.line,10)+`<circle cx="901" cy="${y+36}" r="19" fill="${p[3]}22"/>`+text(901,y+42,p[0],17,p[3],600,'text-anchor="middle"')+text(937,y+43,p[1],19,C.text,600)+pill(1610,y+22,p[2],p[3])+'</g>';});
  a+=field(867,739,662,'Private invitation',on(3)?'Invitation link ready · single use':'Choose a role to invite a collaborator');
  a+=button(1560,752,227,on(6)?'Link copied ✓':'Copy invitation');
  a+=cursor(1685,780,t,6);
 }else if(type==='tasks'){
  a=shell('Projects')+text(867,337,'Work in progress',28,C.text,600)+pill(1610,315,on(7)?'2 completed':'2 open tasks',C.green);
  const tasks=[['Audience research','Completed',C.green],['Campaign artwork',on(7)?'Completed':on(3)?'In progress':'Planned',on(7)?C.green:'#bba8ed'],['Prepare launch package','Planned',C.muted]];
  tasks.forEach((p,i)=>{let y=393+i*123;a+=rect(867,y,920,103,C.panel,C.line,10)+text(889,y+35,p[0],21,C.text,600)+pill(1610,y+17,p[1],p[2]);a+=text(889,y+74,i===1&&on(7)?'Reported outcome: five campaign artworks delivered.':i===0?'Reported outcome: audience brief shared with the team.':'A clear next step, visible to every project member.',16,C.muted);});
  a+=button(867,800,205,'Add a task',false)+text(1100,828,'Member-reported outcomes',15,C.dim)+cursor(1690,555,t,7);
 }else if(type==='funding'){
  a=shell('Treasury')+text(867,337,'Contribution ledger',28,C.text,600);
  a+=rect(867,384,443,117,'#21161b','#4c2933',12)+text(890,416,'REPORTED · UNVERIFIED',13,C.muted,600,'letter-spacing="1.4"')+text(890,466,on(4)?'$150.00':'$0.00',36,C.coral,600);
  a+=rect(1330,384,457,117,C.panel,C.line,12)+text(1354,416,'INDEPENDENTLY VERIFIED',13,C.muted,600,'letter-spacing="1.4"')+text(1354,466,'$0.00',36,C.text,600);
  a+=field(867,553,280,'Amount','$150.00')+field(1170,553,617,'Note','Campaign contribution');
  a+=button(1525,652,262,on(4)?'Report recorded ✓':'Record report');
  if(on(4))a+=rect(867,729,920,80,C.panel,C.line,10)+text(890,762,'Maya Chen',19,C.text,600)+text(890,789,'Contribution report · no transfer initiated',15,C.muted)+text(1763,769,'$150.00',24,C.sun,600,'text-anchor="end"');
  a+=cursor(1650,679,t,4);
 }else if(type==='policy'){
  a=shell('Approvals')+text(867,337,'Policy and approvals',28,C.text,600)+pill(1610,314,'Human review',C.sun);
  a+=field(867,405,443,'Per-transaction cap','$100.00')+field(1330,405,457,'Total spending cap','$500.00');
  a+=field(867,511,920,'Allowed categories','Research · Creative · Distribution');
  a+=rect(867,615,920,135,C.panel,C.line,12)+text(890,652,'Every request has an exact scope',21,C.text,600)+text(890,689,'Task  /  purpose  /  provider  /  offer  /  amount',18,C.muted)+text(890,725,'Policy + verified funds + a person’s decision',18,C.sun,600);
  a+=button(1520,791,267,on(5)?'Policy saved ✓':'Save spending policy')+text(867,819,'Approvals do not execute payments.',16,C.dim)+cursor(1660,819,t,5);
 }else if(type==='near'){
  a=shell('Treasury')+text(867,337,'NEAR project funding',28,C.text,600);
  const items=[['1','Verify receiving account','Owner proves control with a NEP-413 signature.'],['2','Review the quote','wNEAR → USDC on NEAR, via NEAR Intents.'],['3','Confirm in your wallet','The contributor explicitly approves the mainnet transfer.']];
  items.forEach((p,i)=>{const y=397+i*114;const active=t>i*2+1;a+=rect(867,y,920,94,active?'#1b151a':C.panel,active?'#60303d':C.line,11)+`<circle cx="906" cy="${y+46}" r="21" fill="${active?'#41202a':'#22252b'}"/>`+text(906,y+53,p[0],18,active?C.coral:C.dim,600,'text-anchor="middle"')+text(946,y+37,p[1],21,C.text,600)+text(946,y+68,p[2],17,C.muted);});
  a+=text(867,803,'Integration overview · no payment performed in this film',16,C.sun);
  a+=text(867,835,'Mainnet flow untested end to end. 1Click status is not chain reconciliation.',15,C.dim);
 }else if(type==='activity'){
  a=shell('Activity')+text(867,337,'Activity ledger',28,C.text,600)+button(1620,310,167,on(7)?'Exported ✓':'Export CSV',false);
  a+=rect(867,380,920,52,'#0e1013',C.line,8)+text(889,412,'Search events',17,C.dim)+text(1320,412,'All projects',16,C.muted)+text(1580,412,'All participants',16,C.muted);
  const events=[['Task completed','Campaign artwork','Maya'],['Contribution reported','$150.00 · unverified','Maya'],['Policy updated','Spending controls','Maya'],['Member joined','Contributor role','Sam'],['Project created','Community art campaign','Maya']];
  events.forEach((p,i)=>{const y=453+i*65;a+=line(867,y,1787,y)+`<circle cx="886" cy="${y+31}" r="6" fill="${i===0?C.green:C.coral}"/>`+text(908,y+37,p[0],18,C.text,600)+text(1250,y+37,p[1],15,C.muted)+text(1760,y+37,p[2],16,C.muted,400,'text-anchor="end"');});
  a+=cursor(1710,341,t,7);
 }
 return a;
}
function frame(index,t){
 const s=scenes[index], global=s.start+t; let a='';
 a+=`<defs><radialGradient id="glow"><stop stop-color="#5e2030" stop-opacity=".32"/><stop offset="1" stop-color="#0b0c0e" stop-opacity="0"/></radialGradient><linearGradient id="fade"><stop stop-color="#ff5873"/><stop offset="1" stop-color="#ffb45c"/></linearGradient><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" stroke="#ffffff" stroke-opacity=".022" fill="none"/></pattern></defs><rect width="1920" height="1080" fill="${C.bg}"/><rect width="1920" height="1080" fill="url(#grid)"/><ellipse cx="${1400+40*Math.sin(global*.2)}" cy="390" rx="780" ry="600" fill="url(#glow)"/>`;
 a+=mark(74,54,47)+text(132,89,'Chorus',30,C.text,700,'letter-spacing="-1"')+text(1840,85,'NEAR HACKATHON  /  PRODUCT DEMO',14,C.dim,600,'text-anchor="end" letter-spacing="1.5"');
 a+=`<path d="M80 122H1840" stroke="${C.line}"/>`;
 if(s.type==='hook'){
   a+=text(80,250,s.kicker,16,C.coral,600,'letter-spacing="2"');
   a+=text(76,365,'Great idea.',100,C.text,600,'letter-spacing="-4"')+text(76,476,'Now what?',100,C.muted,600,'letter-spacing="-4"');
   const cards=[['Group chat','“Who’s paying for this?”',1010,250,-6],['Budget_final_v7.xlsx','Definitely the final version.',1245,410,5],['Project updates','14 unread messages',1030,580,-3]];
   cards.forEach((c,i)=>{const e=ease((t-i*.65-.4)/.9); a+=`<g transform="translate(${c[2]} ${c[3]+50*(1-e)+Math.sin(t*.8+i)*7}) rotate(${c[4]})" opacity="${e}">`+rect(0,0,455,166,'#191b20','#42404a',18)+text(26,44,c[0],22,C.text,600)+text(26,93,c[1],21,C.muted)+text(26,138,i===1?'Last edited: probably just now':'Coordination, everywhere.',15,C.dim)+'</g>';});
   a+=text(80,614,'A shared goal shouldn’t need',27,C.muted)+text(80,655,'a full-time group-chat archaeologist.',27,C.muted);
 }else if(s.type==='brand'||s.type==='close'){
   const e=ease(t/1.5);a+=`<g opacity="${e}" transform="translate(0 ${25*(1-e)})">`;
   a+=mark(870,181,180);
   a+=text(960,465,s.title[0],80,C.text,600,'text-anchor="middle" letter-spacing="-3"')+text(960,563,s.title[1],80,s.type==='close'?C.coral:C.muted,600,'text-anchor="middle" letter-spacing="-3"');
   a+=text(960,650,s.sub,27,C.muted,400,'text-anchor="middle"');
   if(s.type==='brand'){
    ['Purpose','People','Resources','Progress'].forEach((n,i)=>{const x=418+i*275;a+=rect(x,748,250,68,'#17171c','#37303a',12)+text(x+125,790,n,23,i===0?C.coral:C.text,600,'text-anchor="middle"');});
   }else{
    a+=pill(884.5,725,'Built with NEAR',C.green)+text(960,822,'github.com/Reinasboo/chorus',24,C.text,500,'text-anchor="middle"');
   }
   a+='</g>';
 }else{
   a+=titleBlock(s.kicker,s.title,s.sub,t);
   const enter=ease(t/1.1),zoom=1+.012*ease(t/s.d);a+=`<g transform="translate(${70*(1-enter)+1247*(1-zoom)} ${20*(1-enter)+547*(1-zoom)}) scale(${zoom})" opacity="${enter}">`+view(s.type,t)+'</g>';
   a+=text(80,812,'CHORUS WORKSPACE',13,C.dim,600,'letter-spacing="2"')+text(80,846,'Illustrative product walkthrough',16,C.muted);
 }
 // Chapter strip, playback progress and synchronized subtitles.
 a+=text(80,1007,`${String(index+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')}`,14,C.dim,600,'letter-spacing="1.5"');
 a+=text(1840,1007,`${Math.floor(global/60)}:${String(Math.floor(global%60)).padStart(2,'0')} / 2:00`,14,C.dim,400,'text-anchor="end"');
 a+=`<rect x="80" y="1036" width="1760" height="3" rx="2" fill="#25272e"/><rect x="80" y="1036" width="${1760*global/120}" height="3" rx="2" fill="url(#fade)"/>`;
 const cap=captionAt(index,t); if(cap)a+=rect(340,936,1240,55,'#0b0c0e','#26282e',10)+text(960,971,cap,23,C.text,400,'text-anchor="middle"');
 const fade=Math.min(ease(t/.4),ease((s.d-t)/.45));
 if(fade<1)a+=`<rect width="1920" height="1080" fill="${C.bg}" opacity="${1-fade}"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${a}</svg>`;
}
function captionAt(i,t){
 const f=path.join(OUT,`voice-${i}.json`); if(!fs.existsSync(f)) return '';
 const data=JSON.parse(fs.readFileSync(f,'utf8'));const al=data.normalized_alignment||data.alignment;if(!al)return '';
 const speed=Math.max(1,al.character_end_times_seconds.at(-1)/(scenes[i].d-1.2));
 const time=(t-.6)*speed; let chunks=[], words='',start=0,end=0;
 al.characters.forEach((c,j)=>{if(!words)start=al.character_start_times_seconds[j];words+=c;end=al.character_end_times_seconds[j];if((words.length>65&&c===' ')||j===al.characters.length-1){chunks.push({words:words.trim(),start,end});words='';}});
 return chunks.find(c=>time>=c.start&&time<c.end+.08)?.words||'';
}
async function speech(){
 for(let i=0;i<scenes.length;i++){
  const target=path.join(OUT,`voice-${i}.json`);if(fs.existsSync(target)){console.log(`Voice ${i+1}: cached`);continue;}
  console.log(`Generating ElevenLabs narration ${i+1}/${scenes.length}`);
  const body={text:scenes[i].voice,model_id:'eleven_multilingual_v2',voice_settings:{stability:.43,similarity_boost:.78,style:.24,use_speaker_boost:true,speed:1.02}};
  const r=spawnSync('elevenlabs',['text-to-speech','convert_with_timestamps','--voice-id',VOICE,'--json',JSON.stringify(body),'--format','json'],{encoding:'utf8',maxBuffer:25*1024*1024});
  if(r.status!==0)throw new Error(r.stderr||r.stdout);
  const data=JSON.parse(r.stdout);if(!data.audio_base64)throw new Error('No speech audio returned.');
  fs.writeFileSync(target,JSON.stringify(data));fs.writeFileSync(path.join(OUT,`voice-${i}.mp3`),Buffer.from(data.audio_base64,'base64'));
  const align=data.alignment||data.normalized_alignment; const end=align.character_end_times_seconds.at(-1);
  console.log(`Voice ${i+1}: ${end.toFixed(2)}s in ${scenes[i].d}s scene`);
  if(end>scenes[i].d-1.1)console.warn('Will gently fit speech to scene.');
 }
}
async function previews(){
 for(let i=0;i<scenes.length;i++){
  fs.writeFileSync(path.join(OUT,`scene-${String(i+1).padStart(2,'0')}.svg`),frame(i,Math.min(8,scenes[i].d-1)));
  await sharp(Buffer.from(frame(i,Math.min(8,scenes[i].d-1)))).png().toFile(path.join(OUT,`scene-${String(i+1).padStart(2,'0')}.png`));
 }
 const tiles=await Promise.all(scenes.map(async(_,i)=>({input:await sharp(path.join(OUT,`scene-${String(i+1).padStart(2,'0')}.png`)).resize(640,360).toBuffer(),left:(i%2)*640,top:Math.floor(i/2)*360})));
 await sharp({create:{width:1280,height:1800,channels:3,background:C.bg}}).composite(tiles).png().toFile(path.join(OUT,'storyboard.png'));
}
async function render(){
 for(let i=0;i<scenes.length;i++){
  const target=path.join(OUT,`scene-${i}.mp4`);if(fs.existsSync(target)){console.log(`Scene ${i+1}: cached`);continue;}
  console.log(`Rendering scene ${i+1}/${scenes.length}`);
  const proc=spawn(FFMPEG,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',target],{stdio:['pipe','inherit','inherit']});
  for(let f=0;f<scenes[i].d*FPS;f++){
   const jpeg=await sharp(Buffer.from(frame(i,f/FPS))).jpeg({quality:93,chromaSubsampling:'4:4:4'}).toBuffer();
   if(!proc.stdin.write(jpeg))await once(proc.stdin,'drain');
  }
  proc.stdin.end();const [code]=await once(proc,'close');if(code!==0)throw new Error(`Render failed ${code}`);
 }
 fs.writeFileSync(path.join(OUT,'concat.txt'),scenes.map((_,i)=>`file 'scene-${i}.mp4'`).join('\n'));
 const r=spawnSync(FFMPEG,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',path.join(OUT,'concat.txt'),'-c','copy',path.join(OUT,'chorus-picture-master.mp4')],{stdio:'inherit'});if(r.status!==0)throw new Error('Concat failed.');
}
function score(){
 const rate=44100,length=120*rate;const bytes=Buffer.alloc(44+length*2);bytes.write('RIFF',0);bytes.writeUInt32LE(36+length*2,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(length*2,40);
 const chords=[[130.81,164.81,196],[110,130.81,164.81],[87.31,130.81,174.61],[98,146.83,196]];
 for(let i=0;i<length;i++){const t=i/rate, chord=chords[Math.floor(t/8)%4],p=(t%8)/8,envelope=Math.sin(Math.PI*p)**.4;let v=0;chord.forEach((hz,j)=>{v+=.018*envelope*Math.sin(2*Math.PI*hz*t+j)*(.85+.15*Math.sin(t*.5));});const step=Math.floor(t/.5),sp=t%.5;v+=.035*Math.exp(-sp*24)*Math.sin(2*Math.PI*chord[step%3]*4*t);v*=clamp(t/3)*clamp((120-t)/4);bytes.writeInt16LE(Math.round(clamp(v,-1,1)*32767),44+i*2);}
 fs.writeFileSync(path.join(OUT,'original-score.wav'),bytes);
}
function finish(){
 score();const args=['-hide_banner','-loglevel','error','-y','-i',path.join(OUT,'chorus-picture-master.mp4'),'-i',path.join(OUT,'original-score.wav')];let filters=['[1:a]volume=0.33[bed]'];let labels=['[bed]'];
 for(let i=0;i<scenes.length;i++){
  args.push('-i',path.join(OUT,`voice-${i}.mp3`));const data=JSON.parse(fs.readFileSync(path.join(OUT,`voice-${i}.json`)));const align=data.alignment||data.normalized_alignment,end=align.character_end_times_seconds.at(-1),speed=Math.max(1,end/(scenes[i].d-1.2));
  filters.push(`[${i+2}:a]atempo=${speed.toFixed(5)},loudnorm=I=-16:TP=-1.5:LRA=9,adelay=${Math.round((scenes[i].start+.6)*1000)}:all=1[v${i}]`);labels.push(`[v${i}]`);
 }
 filters.push(`${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0,alimiter=limit=0.891:level=false[a]`);
 args.push('-filter_complex',filters.join(';'),'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t','120','-movflags','+faststart',path.join(OUT,'chorus-near-submission.mp4'));
 const r=spawnSync(FFMPEG,args,{stdio:'inherit'});if(r.status!==0)throw new Error('Audio assembly failed.');
 let srt='',n=0;for(let i=0;i<scenes.length;i++){const d=JSON.parse(fs.readFileSync(path.join(OUT,`voice-${i}.json`)));const al=d.normalized_alignment||d.alignment;const speed=Math.max(1,al.character_end_times_seconds.at(-1)/(scenes[i].d-1.2));let words='',start=0,end=0;for(let j=0;j<al.characters.length;j++){if(!words)start=al.character_start_times_seconds[j];words+=al.characters[j];end=al.character_end_times_seconds[j];if((words.length>65&&al.characters[j]===' ')||j===al.characters.length-1){const ts=x=>new Date(Math.round(x*1000)).toISOString().slice(11,23).replace('.',',');srt+=`${++n}\n${ts(scenes[i].start+.6+start/speed)} --> ${ts(scenes[i].start+.6+end/speed)}\n${words.trim()}\n\n`;words='';}}}fs.writeFileSync(path.join(OUT,'chorus-captions.srt'),srt);
 console.log('Completed: '+path.join(OUT,'chorus-near-submission.mp4'));
}
const cmd=process.argv[2];
if(cmd==='speech')await speech();
else if(cmd==='previews')await previews();
else if(cmd==='render')await render();
else if(cmd==='finish')finish();
else if(cmd==='all'){await speech();await previews();await render();finish();}
else console.log('Usage: node video/film.mjs speech|previews|render|finish|all');
