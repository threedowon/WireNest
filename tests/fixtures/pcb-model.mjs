export function pcbModel(bottom=3,top=4.6){
  const vertices=[];
  function face(height,half=.5){
    const y=height/10-.5;
    vertices.push(-half,y,-half,half,y,-half,half,y,half,-half,y,-half,half,y,half,-half,y,half);
  }
  face(0,.02);face(bottom);face(top);face(10,.1);
  return {size:[20,10,10],format:'step',cadYDirection:-1,vertices};
}
