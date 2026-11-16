import * as THREE from 'three';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';

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
  // Swap Y/Z and reverse triangle winding to preserve outward normals.
  for(let i=0;i<positions.length;i+=9) for(const j of [0,6,3]) {
    vertices.push((positions[i+j]-min[0])/size[0]-.5,
      (positions[i+j+2]-min[2])/size[2]-.5,
      (positions[i+j+1]-min[1])/size[1]-.5);
  }
  return {vertices,size};
}

function readStep(buffer) {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./step-worker.js',import.meta.url));
    const timer=setTimeout(()=>finish(new Error('STEP 변환 시간이 초과되었습니다. 모델을 단순화해 주세요.')),120000);
    function finish(error,result) { clearTimeout(timer);worker.terminate();error?reject(error):resolve(result); }
    worker.onmessage=e=>e.data.error?finish(new Error(e.data.error)):finish(null,e.data.positions);
    worker.onerror=()=>finish(new Error('STEP 변환기를 불러오지 못했습니다. 인터넷 연결과 HTTP 서버 실행 여부를 확인해 주세요.'));
    worker.postMessage(buffer,[buffer]);
  });
}

export async function importModel(file) {
  if(file.size>30*1024*1024) throw new Error('30MB 이하의 모델을 사용해 주세요.');
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['stl','step','stp'].includes(ext)) throw new Error('STL, STEP, STP 파일을 선택해 주세요.');
  const buffer=await file.arrayBuffer();
  let positions;
  if(ext==='stl') {
    const geometry=new STLLoader().parse(buffer);
    try { positions=Array.from(geometry.getAttribute('position').array); }
    finally { geometry.dispose(); }
  } else positions=await readStep(buffer);
  return {...normalizeModel(positions),format:ext};
}

export function modelGeometry(model) {
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(model.vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}
