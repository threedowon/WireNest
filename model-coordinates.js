// Z-up CAD coordinates are normalized to a centered, Y-up display mesh.
export function normalizeModel(positions) {
  if (!positions.length || positions.length % 9) throw new Error('삼각형 형상이 없습니다.');
  if (positions.length > 1800000) throw new Error('모델이 너무 복잡합니다. 20만 삼각형 이하로 단순화해 주세요.');
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i++) {
    const v=positions[i], a=i%3;
    if(!Number.isFinite(v)) throw new Error('잘못된 모델 좌표입니다.');
    min[a]=Math.min(min[a],v); max[a]=Math.max(max[a],v);
  }
  const size=max.map((v,a)=>v-min[a]);
  if(size.some(v=>v<=0)) throw new Error('부피가 있는 3D 모델이 필요합니다.');
  const vertices=[];
  // Rotate CAD (X,Y,Z) to display (X,Z,-Y): determinant +1, no reflection.
  for(let i=0;i<positions.length;i+=9) for(const j of [0,3,6]) {
    vertices.push((positions[i+j]-min[0])/size[0]-.5,
      (positions[i+j+2]-min[2])/size[2]-.5,
      .5-(positions[i+j+1]-min[1])/size[1]);
  }
  return {vertices,size,cadYDirection:-1};
}

// Explicit, undoable repair of legacy mirrored meshes and attached annotations.
export function restoreCADOrientation(board,nodes=[],texts=[]){
  if(!board.model||board.model.cadYDirection===-1)return false;
  const old=board.model.vertices,vertices=[];
  for(let i=0;i<old.length;i+=9)for(const j of [0,6,3])vertices.push(old[i+j],old[i+j+1],-old[i+j+2]);
  board.model={...board.model,vertices,cadYDirection:-1};
  for(const item of [...nodes,...texts])if(item.board===board.id&&Number.isFinite(item.v))item.v=board.d-item.v;
  return true;
}
