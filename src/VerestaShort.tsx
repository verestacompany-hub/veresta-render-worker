import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type RenderScene = { start:number; end:number; image:string; caption:string };
export type RenderSubtitle = { start:number; end:number; text:string };
export type VerestaShortProps = {
  brand:string;
  title:string;
  accent:string;
  template:"Archive Noir"|"Documentary Clean"|"Evidence Board";
  visualPace:"Fast"|"Balanced"|"Measured";
  captionStyle:"archive"|"bold"|"minimal";
  scenes:RenderScene[];
  subtitles:RenderSubtitle[];
  audioUrl?:string;
};

const mediaSource=(source:string)=>source.startsWith("/")?staticFile(source.slice(1)):source;

const Scene:React.FC<{scene:RenderScene;accent:string;template:VerestaShortProps["template"];visualPace:VerestaShortProps["visualPace"];showCaption:boolean}> = ({scene,accent,template,visualPace,showCaption}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const duration=Math.max(1,(scene.end-scene.start)*fps);
  const zoom=visualPace==="Fast"?.16:visualPace==="Measured"?.06:.10;
  const scale=interpolate(frame,[0,duration],[1.03,1.03+zoom],{extrapolateRight:"clamp"});
  const opacity=interpolate(frame,[0,7,Math.max(8,duration-7),duration],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const label=template==="Documentary Clean"?"DOCUMENTARY":template==="Evidence Board"?"EVIDENCE FILE":"HH — ARCHIVE";
  const filter=template==="Documentary Clean"?"saturate(.9) contrast(1.03)":"saturate(.68) contrast(1.1)";
  return <AbsoluteFill style={{backgroundColor:"#05070a",overflow:"hidden",opacity}}>
    {scene.image?<Img src={scene.image} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${scale})`,filter}}/>:<AbsoluteFill style={{transform:`scale(${scale})`,background:"radial-gradient(circle at 35% 28%,#445266 0,transparent 28%),linear-gradient(145deg,#2b241d,#080b10 72%)"}}/>}
    <AbsoluteFill style={{background:template==="Documentary Clean"?"linear-gradient(180deg,rgba(0,0,0,.12),transparent 55%,rgba(0,0,0,.72))":"linear-gradient(180deg,rgba(0,0,0,.28),transparent 42%,rgba(0,0,0,.9))"}}/>
    <div style={{position:"absolute",top:62,left:62,color:"#f4ead7",fontFamily:"monospace",fontWeight:700,fontSize:22,letterSpacing:5}}>{label} <span style={{color:accent}}>•</span></div>
    {template==="Evidence Board"&&<div style={{position:"absolute",top:112,left:62,padding:"8px 14px",border:`2px solid ${accent}`,color:"#fff",fontFamily:"monospace",fontSize:18,transform:"rotate(-2deg)"}}>DECLASSIFIED</div>}
    {showCaption&&<div style={{position:"absolute",left:86,right:86,bottom:210,textAlign:"center",color:"white",fontFamily:"Georgia,serif",fontSize:64,fontWeight:800,lineHeight:1.08,textShadow:"0 4px 20px #000,0 1px 3px #000"}}>{scene.caption}</div>}
    <div style={{position:"absolute",left:86,right:86,bottom:145,height:2,background:`linear-gradient(90deg,transparent,${accent},transparent)`}}/>
  </AbsoluteFill>;
};

const SubtitleLayer:React.FC<{subtitles:RenderSubtitle[];style:VerestaShortProps["captionStyle"];accent:string}> = ({subtitles,style,accent}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const time=frame/fps;
  const active=subtitles.find(item=>time>=item.start&&time<item.end);
  if(!active)return null;
  const local=time-active.start;
  const remaining=active.end-time;
  const opacity=Math.min(1,local/.08,remaining/.08);
  const archive=style==="archive";
  return <div style={{position:"absolute",zIndex:5,left:style==="minimal"?72:82,right:style==="minimal"?72:82,bottom:style==="minimal"?150:205,textAlign:style==="minimal"?"left":"center",opacity,color:"white",fontFamily:archive?"Georgia,serif":"Arial,sans-serif",fontSize:style==="minimal"?43:style==="bold"?70:62,fontWeight:800,lineHeight:1.08,letterSpacing:style==="bold"?.5:0,textTransform:style==="bold"?"uppercase":"none",textShadow:"0 4px 20px #000,0 1px 4px #000"}}>
    {style==="minimal"&&<span style={{display:"block",width:70,height:5,marginBottom:18,background:accent}}/>}{active.text}
  </div>;
};

export const VerestaShort:React.FC<VerestaShortProps> = ({scenes,accent,template,visualPace,captionStyle,subtitles,audioUrl}) => <AbsoluteFill style={{backgroundColor:"#05070a"}}>
  {audioUrl&&<Audio src={mediaSource(audioUrl)}/>} 
  {scenes.map((scene,index)=><Sequence key={`${scene.start}-${index}`} from={Math.round(scene.start*30)} durationInFrames={Math.max(1,Math.round((scene.end-scene.start)*30))}><Scene scene={{...scene,image:mediaSource(scene.image)}} accent={accent} template={template} visualPace={visualPace} showCaption={!subtitles.length}/></Sequence>)}
  <SubtitleLayer subtitles={subtitles} style={captionStyle} accent={accent}/>
</AbsoluteFill>;
