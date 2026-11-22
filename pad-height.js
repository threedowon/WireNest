// Display Y is vertical; modelHeight stores height as a fraction of board thickness.
export function offsetPadHeight(pad,thickness,delta){
  if(!delta)return;
  const height=pad.modelHeight??(pad.face==='bottom'?0:1);
  pad.modelHeight=height+delta/thickness;
}
