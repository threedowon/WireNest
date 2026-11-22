export function assignPadNet(pads,wires,netId){
  const ids=new Set(pads.map(p=>p.id));
  for(const pad of pads)pad.netId=netId;
  for(const wire of wires)if(ids.has(wire.a)||ids.has(wire.b))wire.netId=netId;
}
