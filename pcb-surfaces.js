// Find the broad, horizontal faces of the PCB substrate, not connector extrema.
// Heights are measured from the normalized model floor, just like modelHeight.
export function detectPCBSurfaces(board,thickness){
  if(!board.model)return {bottomHeight:0,topHeight:thickness};
  const vertices=board.model.vertices;
  if(!vertices?.length||!Number.isFinite(thickness)||thickness<=0)return null;
  const planes=new Map(),t=board.thick;
  for(let i=0;i<vertices.length;i+=9){
    const heights=[vertices[i+1],vertices[i+4],vertices[i+7]].map(y=>(y+.5)*t);
    if(heights.some(y=>!Number.isFinite(y))||Math.max(...heights)-Math.min(...heights)>.002)continue;
    const area=Math.abs((vertices[i+3]-vertices[i])*(vertices[i+8]-vertices[i+2])-(vertices[i+6]-vertices[i])*(vertices[i+5]-vertices[i+2]))*board.w*board.d/2;
    if(!Number.isFinite(area)||area<=0)continue;
    const height=heights.reduce((a,b)=>a+b,0)/3,key=Math.round(height/.01);
    const plane=planes.get(key)||{area:0,weightedHeight:0};
    plane.area+=area;plane.weightedHeight+=height*area;planes.set(key,plane);
  }
  const faces=[...planes.values()].filter(p=>p.area>=board.w*board.d*.4)
    .map(p=>({area:p.area,height:p.weightedHeight/p.area})).sort((a,b)=>a.height-b.height);
  const pairs=[];
  // Gerber Job gives nominal finished thickness; a STEP substrate can omit
  // copper/mask layers (e.g. 1.51 mm geometry for a nominal 1.6 mm PCB).
  // Match within 10%, but always place pads on the measured mesh faces.
  const thicknessTolerance=Math.max(.05,thickness*.1);
  for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
    if(Math.abs(faces[j].height-faces[i].height-thickness)<=thicknessTolerance)
      pairs.push({bottomHeight:faces[i].height,topHeight:faces[j].height});
  }
  // Ambiguous or irregular assemblies need explicit surface heights.
  return pairs.length===1?pairs[0]:null;
}
