import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const localFull=process.argv.includes("--local-full");
const dryRun=process.argv.includes("--dry-run")||localFull;
const previewSecondsArg=process.argv.find(value=>value.startsWith("--preview-seconds="));
const previewSeconds=Math.max(2,Math.min(20,Number(previewSecondsArg?.split("=")[1]||2)));
const base=(process.env.VERESTA_BASE_URL||"").replace(/\/$/,"");
const configuredSitesToken=process.env.VERESTA_SITES_TOKEN||"";
const broker=(process.env.VERESTA_TOKEN_BROKER_URL||"").replace(/\/$/,"");
const githubOidc=async()=>{
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL||"";
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||"";
  if(!requestUrl||!requestToken)return "";
  const separator=requestUrl.includes("?")?"&":"?";
  const response=await fetch(`${requestUrl}${separator}audience=${encodeURIComponent("veresta-render-bridge")}`,{headers:{Authorization:`Bearer ${requestToken}`}});
  if(!response.ok)throw new Error(`GitHub identity request failed: ${response.status}`);
  return (await response.json()).value||"";
};
if(!base)throw new Error("VERESTA_BASE_URL is required.");
const identityToken=await githubOidc();
let sitesToken=configuredSitesToken;
if(!sitesToken&&identityToken&&broker){
  const response=await fetch(`${broker}/token`,{method:"POST",headers:{Authorization:`Bearer ${identityToken}`}});
  if(!response.ok)throw new Error(`Token broker failed: ${response.status} ${await response.text()}`);
  sitesToken=(await response.json()).token||"";
}
if(!sitesToken)throw new Error("Protected site authorization is unavailable.");
const auth={"OAI-Sites-Authorization":`Bearer ${sitesToken}`};
const api=async(pathname,options={})=>{
  const response=await fetch(`${base}${pathname}`,{...options,headers:{...auth,...(options.headers||{})}});
  if(!response.ok)throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  return response;
};
const heartbeat=async(state,activeRenderId=null)=>{try{await api("/api/worker",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({state,activeRenderId,version:"remotion-4.0.490"})});}catch(error){console.warn(`Worker heartbeat skipped: ${error instanceof Error?error.message:error}`);}};

await heartbeat("polling");
const queue=await (await api(`/api/renders?worker=${Date.now()}`)).json();
const item=queue.items.find(entry=>entry.status==="queued");
if(!item){await heartbeat("idle");console.log("No queued renders.");process.exit(0);}
const manifest=JSON.parse(item.manifestJson);
const assetDir=path.resolve("public","worker",`render-${item.id}`);
const outputDir=path.resolve("out");
await mkdir(assetDir,{recursive:true});await mkdir(outputDir,{recursive:true});

const download=async(source,destination)=>{
  const response=await api(source.startsWith("http")?new URL(source).pathname+new URL(source).search:source);
  await writeFile(destination,new Uint8Array(await response.arrayBuffer()));
};

const scenes=[];
for(let index=0;index<manifest.scenes.length;index++){
  const scene=manifest.scenes[index];const filename=`scene-${index}.jpg`;
  await download(scene.image,path.join(assetDir,filename));
  scenes.push({...scene,image:`/worker/render-${item.id}/${filename}`});
}
let audioUrl;
if(manifest.voiceoverUrl){await download(manifest.voiceoverUrl,path.join(assetDir,"voice.mp3"));audioUrl=`/worker/render-${item.id}/voice.mp3`;}
const captionStyle=manifest.captionStyle==="Bold Sans"?"bold":manifest.captionStyle==="Minimal Lower Third"?"minimal":"archive";
const props={brand:manifest.brand,title:manifest.title,accent:"#c9aa70",template:manifest.template,visualPace:manifest.visualPace,captionStyle,scenes,subtitles:manifest.subtitles||[],audioUrl};
const propsPath=path.join(assetDir,"props.json");await writeFile(propsPath,JSON.stringify(props,null,2));
const outputPath=path.join(outputDir,`job-${manifest.jobId}-render-${item.id}${localFull?"-full-preview":dryRun?"-dry":""}.mp4`);

if(!dryRun){await heartbeat("rendering",item.id);await api(`/api/renders?status=${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:"rendering"})});}
try{
  const args=["render","src/index.ts","VerestaShort",outputPath,`--props=${propsPath}`];
  if(dryRun&&!localFull)args.push(`--frames=0-${Math.round(previewSeconds*30)-1}`);
  const result=spawnSync("./node_modules/.bin/remotion",args,{cwd:process.cwd(),stdio:"inherit",env:{...process.env,NODE_OPTIONS:"--require=./scripts/network-shim.cjs"}});
  if(result.status!==0)throw new Error(`Remotion exited with status ${result.status}`);
  if(dryRun){console.log(`${localFull?"Full local preview":"Dry run"} complete: ${outputPath}`);process.exit(0);}
  await heartbeat("uploading",item.id);
  const video=await readFile(outputPath);
  const upload=await (await api(`/api/video?id=${manifest.jobId}&render=${item.id}&preview=1`,{method:"POST",headers:{"Content-Type":"video/mp4"},body:video})).json();
  await api(`/api/renders?status=${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:"awaiting_approval",outputKey:upload.outputKey||""})});
  await heartbeat("idle");
  console.log(`Render ${item.id} uploaded for approval.`);
}catch(error){
  if(!dryRun)await api(`/api/renders?status=${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:"failed",error:error instanceof Error?error.message:String(error)})});
  await heartbeat("idle");
  throw error;
}
