import {detectPCBSurfaces} from './pcb-surfaces.js?v=2';
export function boardImageHeight(board,side){
 const key=side==='bottom'?'bottomHeight':'topHeight';
 if(!board.model)return side==='bottom'?0:board.thick;
 const surface=detectPCBSurfaces(board,1.6);
 if(surface)return surface[key];
 if(Number.isFinite(board.imageHeights?.[side]))return board.imageHeights[side];
 const saved=board.gerberImport;
 return Number.isFinite(saved?.[key])?saved[key]:(side==='bottom'?0:board.thick);
}
export function boardImageScale(board,side){
 const scale=board.imageScales?.[side];return Number.isFinite(scale)&&scale>0?scale:1;
}
export function boardImageRotation(board,side){
 const value=board.imageRotations?.[side];
 return Number.isFinite(value)?((Math.round(value/90)*90)%360+360)%360:0;
}
// Use the substrate's existing triangles, preserving its outline and holes.
// Scale changes UV sampling around the center; it never expands the board surface.
export function boardImageSurface(board,side){
 const rotation=boardImageRotation(board,side),scale=boardImageScale(board,side),positions=[],uvs=[],target=boardImageHeight(board,side)-board.thick/2;
 let triangles=[];
 if(board.model){
  const v=board.model.vertices||[];
  for(let i=0;i<v.length;i+=9){
   const p=[0,3,6].map(j=>[v[i+j]*board.w,v[i+j+1]*board.thick,v[i+j+2]*board.d]);
   if(Math.max(...p.map(v=>v[1]))-Math.min(...p.map(v=>v[1]))<.002)triangles.push(p);
  }
  if(triangles.length){const nearest=triangles.reduce((nearest,p)=>Math.min(nearest,Math.abs(p[0][1]-target)),Infinity);triangles=triangles.filter(p=>Math.abs(p[0][1]-target)<=nearest+.002);}
 }else{
  const x=board.w/2,z=board.d/2;triangles=[[[-x,target,-z],[x,target,-z],[x,target,z]],[[-x,target,-z],[x,target,z],[-x,target,z]]];
 }
 // Clip reduced images to their footprint instead of stretching edge pixels.
 const clip=(poly,axis,bound,sign)=>{
  const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],insideA=sign*(a[axis]-bound)<=0,insideB=sign*(b[axis]-bound)<=0;if(insideA)out.push(a);if(insideA!==insideB){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push(a.map((n,j)=>n+t*(b[j]-n)));}}return out;
 };
 for(let p of triangles){
  if(scale<1)for(const [axis,size] of [[0,board.w],[2,board.d]]){p=clip(p,axis,size*scale/2,1);p=clip(p,axis,-size*scale/2,-1);}
  for(let i=1;i<p.length-1;i++){
   let tri=[p[0],p[i],p[i+1]];const [a,b,c]=tri,ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
   if(Math.abs(ny)<1e-12)continue;if((side==='bottom'?ny>0:ny<0))tri=[a,c,b];
   for(const [x,y,z] of tri){positions.push(x,y,z);let u=x/(board.w*scale),v=(side==='bottom'?z:-z)/(board.d*scale);
    if(rotation===90)[u,v]=[-v,u];else if(rotation===180)[u,v]=[-u,-v];else if(rotation===270)[u,v]=[v,-u];
    uvs.push(.5+u,.5+v);}
  }
 }
 return {positions,uvs};
}
