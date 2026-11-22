import {placeBoardPad} from './gerber-import.js?v=2';

// Keep silk as geometry: a Gerber stroke is not a semantic pin label.
export function planGerberSilk(data,board,pads,options={},radius=8){
  const points=pads.map(p=>({side:p.side,xy:placeBoardPad(p,data,options,board)}));
  const side=options.silkSide||'pads';
  const includesSide=s=>side==='both'||side===s||side==='pads'&&points.some(p=>p.side===s);
  const strokes=(data.silk||[]).map(s=>({...s,points:s.points.map(([x,y])=>placeBoardPad({x,y},data,options,board))})).filter(s=>{
    if(!includesSide(s.side))return false;
    if(radius===Infinity)return true;
    return points.some(p=>(side!=='pads'||p.side===s.side)&&s.points.some(([x,y])=>Math.hypot(x-p.xy[0],y-p.xy[1])<=radius));
  });
  return {strokes,side,baseSize:[board.w,board.d,board.thick],topHeight:options.topHeight??data.thickness,bottomHeight:options.bottomHeight??0,radius:radius===Infinity?null:radius};
}

// Pads can be raised after import. Keep each silk side on its current pad plane.
// Optional anchors let the user pick the intended plane on boards with several pad heights.
export function silkSurfaceHeight(silk,board,pads,side){
  const candidates=pads.filter(p=>p.board===board.id&&p.face===side&&Number.isFinite(p.modelHeight));
  const ids=silk.heightPadIds?.[side],anchored=ids?candidates.filter(p=>ids.includes(p.id)):[];
  const heights=(anchored.length?anchored:candidates).map(p=>p.modelHeight*board.thick).sort((a,b)=>a-b);
  return heights.length?heights[Math.floor(heights.length/2)]:(side==='bottom'?silk.bottomHeight:silk.topHeight)*board.thick/silk.baseSize[2];
}

export function silkVertices(silk,board,triangulate,pads=[]){
  const out=[],[bw,bd,bt]=silk.baseSize;
  for(const s of silk.strokes){
    const height=silkSurfaceHeight(silk,board,pads,s.side)+(s.side==='bottom'?-.035:.035)-board.thick/2;
    if(s.filled){
      if(!triangulate)throw Error('실크 영역 삼각분할 함수가 필요합니다.');
      for(const triangle of triangulate(s.points))for(const n of triangle)out.push(s.points[n][0]*board.w/bw-board.w/2,height,s.points[n][1]*board.d/bd-board.d/2);
      continue;
    }
    for(let i=1;i<s.points.length;i++){
      const a=s.points[i-1],b=s.points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;
      const nx=-dy/len*s.width/2,ny=dx/len*s.width/2;
      const q=[[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]];
      for(const n of [0,1,2,0,2,3])out.push(q[n][0]*board.w/bw-board.w/2,height,q[n][1]*board.d/bd-board.d/2);
    }
  }
  return out;
}
