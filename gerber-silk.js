import {placeBoardPad} from './gerber-import.js?v=2';

// Keep silk as geometry: a Gerber stroke is not a semantic pin label.
export function planGerberSilk(data,board,pads,options={},radius=8){
  const points=pads.map(p=>({side:p.side,xy:placeBoardPad(p,data,options,board)}));
  const strokes=(data.silk||[]).map(s=>({...s,points:s.points.map(([x,y])=>placeBoardPad({x,y},data,options,board))})).filter(s=>{
    if(radius===Infinity)return points.some(p=>p.side===s.side);
    return points.some(p=>p.side===s.side&&s.points.some(([x,y])=>Math.hypot(x-p.xy[0],y-p.xy[1])<=radius));
  });
  return {strokes,baseSize:[board.w,board.d,board.thick],topHeight:options.topHeight??data.thickness,bottomHeight:options.bottomHeight??0,radius:radius===Infinity?null:radius};
}

export function silkVertices(silk,board,triangulate){
  const out=[],[bw,bd,bt]=silk.baseSize;
  for(const s of silk.strokes){
    const height=(s.side==='bottom'?silk.bottomHeight:silk.topHeight)*board.thick/bt+(s.side==='bottom'?-.035:.035)-board.thick/2;
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
