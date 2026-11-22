export function selectPadRange(pads,id,anchor,board){
  if(anchor?.board!==board)return null;
  const start=pads.findIndex(p=>p.id===anchor.id),end=pads.findIndex(p=>p.id===id);
  if(start<0||end<0)return null;
  return pads.slice(Math.min(start,end),Math.max(start,end)+1).map(p=>({t:'node',id:p.id}));
}
