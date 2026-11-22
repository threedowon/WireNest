// KiCad X2 pad centers only: not a copper renderer or a general CAM importer.
const fail=message=>{throw Error(message);};
const decode=s=>s.replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
const TAU=Math.PI*2,angle=a=>(a%TAU+TAU)%TAU;
export function parseGerber(text,name='Gerber'){
  const fileFunction=text.match(/%TF\.FileFunction,([^*]+)\*%/)?.[1]||'';
  const copper=/^Copper,.*,(Top|Bot)$/.test(fileFunction),profile=fileFunction.startsWith('Profile');
  if(!copper&&!profile)return null;
  const format=text.match(/%FSLA[X](\d)(\d)Y(\d)(\d)\*%/);
  if(!format)fail(name+': 절대 좌표·선행 0 생략 형식의 KiCad X2 거버가 필요합니다.');
  const unit=text.includes('%MOMM*%')?1:text.includes('%MOIN*%')?25.4:0;
  if(!unit)fail(name+': 좌표 단위를 찾을 수 없습니다.');
  if(/%(?:SR[^*]+|AB[^*]*|LM(?!N\*)[^*]+|LR(?!0(?:\.0+)?\*)[^*]+|LS(?!1(?:\.0+)?\*)[^*]+|OF[^*]+|SF[^*]+|MI[^*]+|AS[^*]+|IR[^*]+|IPNEG)\*/.test(text))fail(name+': 반복·변환·반전 거버는 지원하지 않습니다. KiCad 기본 설정으로 다시 내보내세요.');
  const num=(s,axis)=>Number(s)*unit/10**Number(format[axis==='x'?2:4]);
  let x=0,y=0,aperture=null,apertureFunction='',pin=null,net='',polarity='D',mode=1,region=false,op=2;
  const apertures=new Map(),pads=[],segments=[];
  const tokens=text.match(/%[^%]*%|[^%*]+\*/g)||[];
  for(let token of tokens){
    token=token.trim();
    if(token.startsWith('%')){
      const block=token.slice(1,-1).trim();if(block.startsWith('AM'))continue;
      for(const command of block.split('*').map(s=>s.trim()).filter(Boolean)){
        if(command.startsWith('TA.AperFunction,'))apertureFunction=command.slice(16).split(',')[0];
        else if(command.startsWith('ADD')){const m=command.match(/^ADD(\d+)/);if(m)apertures.set(Number(m[1]),apertureFunction);}
        else if(command.startsWith('TO.P,')){const [reference,number,...fn]=command.slice(5).split(',').map(decode);pin={reference,pin:number,pinFunction:fn.join(',')};}
        else if(command.startsWith('TO.N,'))net=decode(command.slice(5));
        else if(command==='TD'){pin=null;net='';apertureFunction='';}
        else if(command==='TD.P')pin=null;
        else if(command==='TD.N')net='';
        else if(command==='TD.AperFunction')apertureFunction='';
        else if(command==='LPD')polarity='D';
        else if(command==='LPC')polarity='C';
      }
      continue;
    }
    token=token.replace(/\s/g,'').replace(/\*$/,'');
    if(token.startsWith('G04')||token==='M02')continue;
    if(token==='G74')fail(name+': 단일 사분면 원호는 지원하지 않습니다.');
    for(const g of token.matchAll(/G0?([123])(?!\d)/g))mode=Number(g[1]);
    if(token.includes('G36'))region=true;if(token.includes('G37'))region=false;
    const d=token.match(/D(\d+)/);if(d&&Number(d[1])>=10){aperture=Number(d[1]);continue;}
    if(d)op=Number(d[1]);
    const xs=token.match(/X([+-]?\d+)/),ys=token.match(/Y([+-]?\d+)/);
    if(!xs&&!ys&&!(d&&op===3))continue;
    const nx=xs?num(xs[1],'x'):x,ny=ys?num(ys[1],'y'):y;
    if(copper&&op===3&&!region&&polarity==='D'&&pin?.reference&&pin.pin&&['ComponentPad','SMDPad'].includes(apertures.get(aperture))){
      pads.push({...pin,net,x:nx,y:ny,side:fileFunction.endsWith('Bot')?'bottom':'top',source:name});
    }
    if(profile&&op===1&&polarity==='D'){
      const points=[[x,y]];
      if(mode!==1){
        const i=num(token.match(/I([+-]?\d+)/)?.[1]||'0','x'),j=num(token.match(/J([+-]?\d+)/)?.[1]||'0','y');
        const cx=x+i,cy=y+j,r=Math.hypot(i,j),start=Math.atan2(y-cy,x-cx),end=Math.atan2(ny-cy,nx-cx);
        if(!r||Math.abs(Math.hypot(nx-cx,ny-cy)-r)>.01)fail(name+': 외곽 원호를 해석할 수 없습니다.');
        const sweep=(mode===2?angle(start-end):angle(end-start))||TAU;
        const samples=[];for(let a=0;a<=sweep;a+=Math.PI/36)samples.push(a);samples.push(sweep);
        for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const delta=mode===2?angle(start-a):angle(a-start);if(delta<=sweep)samples.push(delta);}
        samples.sort((a,b)=>a-b);for(const delta of samples){const a=start+(mode===2?-delta:delta);points.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}
      }
      points.push([nx,ny]);segments.push(points);
    }
    x=nx;y=ny;
  }
  return {name,fileFunction,copper,profile,pads,segments,project:text.match(/%TF\.ProjectId,([^,*]+)/)?.[1]||null};
}
export function parseGerberSet(files){
  const parsed=files.filter(f=>/\.gbr$/i.test(f.name)).map(f=>parseGerber(f.text,f.name)).filter(Boolean);
  const copper=parsed.filter(f=>f.copper),profiles=parsed.filter(f=>f.profile);
  if(!copper.length||profiles.length!==1)fail('앞면/뒷면 동박 거버와 외곽(Edge_Cuts) 거버 한 개를 함께 선택하세요.');
  if(new Set(parsed.map(p=>p.project).filter(Boolean)).size>1||new Set(copper.map(p=>p.fileFunction)).size!==copper.length)fail('서로 다른 보드 또는 중복 레이어입니다. 보드 한 개의 파일만 선택하세요.');
  const all=profiles[0].segments.flat();if(!all.length)fail('외곽선을 찾을 수 없습니다.');
  const min=[Infinity,Infinity],max=[-Infinity,-Infinity];for(const p of all)p.forEach((n,i)=>{min[i]=Math.min(min[i],n);max[i]=Math.max(max[i],n);});
  const width=max[0]-min[0],depth=max[1]-min[1];if(width<=0||depth<=0)fail('보드 외곽 크기를 확인하세요.');
  const pads=[...new Map(copper.flatMap(f=>f.pads).map(p=>[JSON.stringify([p.reference,p.pin,p.side,p.x,p.y]),p])).values()];
  if(!pads.length)fail('핀 정보가 있는 X2 패드를 찾지 못했습니다. KiCad에서 X2 및 네트리스트 속성을 포함해 내보내세요.');
  if(pads.length>20000)fail('최대 20,000개 패드를 지원합니다.');
  if(pads.some(p=>p.x<min[0]-.1||p.x>max[0]+.1||p.y<min[1]-.1||p.y>max[1]+.1))fail('동박과 외곽의 좌표가 맞지 않습니다. 같은 원점으로 내보내세요.');
  const jobs=files.filter(f=>/\.gbrjob$/i.test(f.name));let thickness=1.6;
  if(jobs.length>1)fail('Gerber Job 파일은 한 개만 선택하세요.');
  if(jobs.length){try{const job=JSON.parse(jobs[0].text);const n=job.GeneralSpecs?.BoardThickness;if(Number.isFinite(n)&&n>0)thickness=n;}catch{fail('Gerber Job 파일 형식을 확인하세요.');}}
  return {name:parsed[0].project||'Gerber PCB',min,max,width,depth,thickness,pads,outline:profiles[0].segments,files:parsed.map(p=>p.name)};
}
export function placePad(p,data,{rotation=0,mirrorY=false,offsetX=0,offsetY=0}={}){
  let x=p.x-data.min[0],y=p.y-data.min[1],w=data.width,h=data.depth;
  if(mirrorY)y=h-y;
  if(rotation===90)[x,y]=[h-y,x];else if(rotation===180)[x,y]=[w-x,h-y];else if(rotation===270)[x,y]=[y,w-x];
  return [x+offsetX,y+offsetY];
}
// Imported CAD uses display Z=-CAD Y. Legacy projects keep their stored mapping.
export function placeBoardPad(p,data,options,board){
  const [u,v]=placePad(p,data,options);
  return [u,board.model?.cadYDirection===-1?board.d-v:v];
}
export function planGerberNodes(data,board,pads,options={},existing=[]){
  const top=options.topHeight??data.thickness,bottom=options.bottomHeight??0;
  if(![top,bottom,options.offsetX??0,options.offsetY??0].every(Number.isFinite)||top<bottom||!Number.isFinite(board.thick)||board.thick<=0)fail('패드 높이와 위치 값을 확인하세요.');
  const keys=new Set(existing.filter(n=>n.board===board.id).map(n=>n.gerber?.key));
  return pads.flatMap(p=>{
    const [u,v]=placeBoardPad(p,data,options,board),key=JSON.stringify([data.name,p.reference,p.pin,p.side,p.x,p.y]);
    if(keys.has(key))return [];keys.add(key);
    if(u<-.1||v<-.1||u>board.w+.1||v>board.d+.1)fail('선택한 패드가 보드 범위를 벗어납니다. 회전·반전·이동을 확인하세요.');
    return [{board:board.id,name:p.reference+'.'+p.pin+(p.net?' / '+p.net:''),kind:'signal',state:false,face:p.side,u,v,modelHeight:(p.side==='top'?top:bottom)/board.thick,
      gerber:{key,project:data.name,reference:p.reference,pin:p.pin,pinFunction:p.pinFunction,net:p.net,side:p.side,source:p.source,originalMm:[p.x,p.y]}}];
  });
}

// Bounded ZIP extraction in memory, using native browser decompression. No files execute.
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export async function readGerberZip(buffer){
  if(buffer.byteLength>25*1024*1024)fail('ZIP 파일은 25MB 이하로 선택하세요.');
  const view=new DataView(buffer),bytes=new Uint8Array(buffer),u16=o=>view.getUint16(o,true),u32=o=>view.getUint32(o,true);
  let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break;}
  if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))fail('일반 단일 ZIP 파일을 선택하세요.');
  const count=u16(end+10),directory=u32(end+16);if(count>200||directory+u32(end+12)>end)fail('ZIP 파일 항목 또는 크기를 확인하세요.');
  const result=[];let pos=directory,total=0;
  for(let n=0;n<count;n++){
    if(pos+46>bytes.length||u32(pos)!==0x02014b50)fail('손상된 ZIP 목록입니다.');
    const flags=u16(pos+8),method=u16(pos+10),crc=u32(pos+16),compressed=u32(pos+20),size=u32(pos+24),len=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32),offset=u32(pos+42);
    const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+len));pos+=46+len+extra+comment;
    if(!/\.(gbr|gbrjob)$/i.test(name))continue;
    total+=size;if(size>10*1024*1024||total>40*1024*1024||(flags&1)||![0,8].includes(method))fail('지원하지 않거나 너무 큰 ZIP 항목입니다.');
    if(offset+30>bytes.length||u32(offset)!==0x04034b50)fail('손상된 ZIP 항목입니다.');
    const start=offset+30+u16(offset+26)+u16(offset+28);if(start+compressed>directory)fail('ZIP 파일 범위를 벗어났습니다.');
    let out=bytes.slice(start,start+compressed);
    if(method===8){
      const reader=new Blob([out]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;
      while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>size){await reader.cancel();fail('ZIP 압축 해제 크기가 일치하지 않습니다.');}chunks.push(value);}
      out=new Uint8Array(length);let at=0;for(const chunk of chunks){out.set(chunk,at);at+=chunk.length;}
    }
    if(out.length!==size||crc32(out)!==crc)fail('ZIP 파일 무결성 검사에 실패했습니다.');
    result.push({name,text:new TextDecoder('utf-8',{fatal:true}).decode(out)});
  }
  return result;
}
export async function readGerberFiles(files){
  files=Array.from(files);
  if(files.length===1&&/\.zip$/i.test(files[0].name)){if(files[0].size>25*1024*1024)fail('ZIP 파일은 25MB 이하로 선택하세요.');return parseGerberSet(await readGerberZip(await files[0].arrayBuffer()));}
  if(files.length>200||files.some(f=>f.size>10*1024*1024)||files.reduce((s,f)=>s+f.size,0)>40*1024*1024)fail('거버 파일 전체 크기는 40MB 이하로 선택하세요.');
  if(files.some(f=>/\.zip$/i.test(f.name)))fail('ZIP 한 개 또는 압축 해제한 거버 파일들을 선택하세요.');
  return parseGerberSet(await Promise.all(files.filter(f=>/\.(gbr|gbrjob)$/i.test(f.name)).map(async f=>({name:f.name,text:await f.text()}))));
}
