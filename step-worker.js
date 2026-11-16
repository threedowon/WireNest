// Version pinned: https://github.com/kovacsv/occt-import-js
const base='https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/';
self.onmessage=async event=>{
  try {
    importScripts(base+'occt-import-js.js');
    const occt=await occtimportjs({locateFile:name=>base+name});
    const result=occt.ReadStepFile(new Uint8Array(event.data),{linearUnit:'millimeter',linearDeflectionType:'absolute_value',linearDeflection:0.1,angularDeflection:0.5});
    if(!result.success || !result.meshes?.length) throw new Error('STEP 형상을 읽을 수 없습니다. 솔리드 또는 표면 모델을 확인해 주세요.');
    const positions=[];
    for(const mesh of result.meshes) {
      const vertices=mesh.attributes.position.array;
      if(positions.length+mesh.index.array.length*3>1800000) throw new Error('모델이 너무 복잡합니다. 20만 삼각형 이하로 단순화해 주세요.');
      for(const i of mesh.index.array) positions.push(vertices[i*3],vertices[i*3+1],vertices[i*3+2]);
    }
    self.postMessage({positions});
  } catch(error) { self.postMessage({error:error.message}); }
};
