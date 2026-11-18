import * as THREE from 'three';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';

export {normalizeModel} from './model-coordinates.js';
import {normalizeModel} from './model-coordinates.js';

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
