const pinKey=n=>JSON.stringify([n.gerber.reference,n.gerber.pin,n.gerber.side||n.face]);
const defaultName=g=>g.reference+'.'+g.pin+(g.net?' / '+g.net:'');

// Plan first; callers commit the complete change in a single undo transaction.
export function planGerberReplacement(board,planned,nodes,wires){
  const old=nodes.filter(n=>n.board===board.id&&n.gerber),byKey=new Map(),seen=new Set();
  for(const n of old){const key=pinKey(n);if(byKey.has(key))throw Error('동일 부품·핀·면의 기존 연결점이 여러 개입니다. 중복 패드를 정리한 뒤 교체하세요.');byKey.set(key,n);}
  const updates=[],additions=[];
  for(const n of planned){
    const key=pinKey(n);if(seen.has(key))throw Error('새 거버에 동일 부품·핀·면의 패드가 여러 개여서 자동 연결할 수 없습니다.');seen.add(key);
    const prior=byKey.get(key);
    if(prior){updates.push({...prior,...n,id:prior.id,kind:prior.kind,state:prior.state,name:prior.name===defaultName(prior.gerber)?n.name:prior.name,gerberStale:false});byKey.delete(key);}
    else additions.push(n);
  }
  const linked=new Set(wires.flatMap(w=>[w.a,w.b])),removeIds=[],retained=[];
  for(const n of byKey.values()){
    if(linked.has(n.id))retained.push({...n,gerberStale:true});else removeIds.push(n.id);
  }
  return {updates,additions,removeIds,retained};
}

export function replacePCBModel(board,model,nodes=[],texts=[]){
  const [w,d,thick]=model.size;
  if(![w,d,thick].every(v=>Number.isFinite(v)&&v>0))throw Error('새 모델의 크기를 확인하세요.');
  const oldD=board.d??board.h,oldT=board.thick||1.6,oldFlip=board.model?.cadYDirection===-1,newFlip=model.cadYDirection===-1;
  const newV=v=>newFlip?d-(oldFlip?oldD-v:v):(oldFlip?oldD-v:v);
  const attached=[...nodes,...texts].filter(n=>n.board===board.id);
  const edits=attached.map(n=>({n,v:newV(n.v),modelHeight:n.modelHeight==null?null:n.modelHeight*oldT/thick}));
  for(const {n,v,modelHeight} of edits){n.v=v;if(modelHeight!=null)n.modelHeight=modelHeight;}
  Object.assign(board,{model,w,d,thick});
  // x/y/z, rotation, identity, names and wire IDs intentionally remain unchanged.
}
