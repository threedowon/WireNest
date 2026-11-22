import {detectPCBSurfaces} from './pcb-surfaces.js?v=2';
import {silkSurfaceHeight} from './gerber-silk.js?v=5';
// Image layers share the silk plane when present, otherwise use the measured PCB faces.
export function boardImageHeight(board,side,pads=[]){
 if(board.gerberSilk)return silkSurfaceHeight(board.gerberSilk,board,pads,side);
 const saved=board.gerberImport,key=side==='bottom'?'bottomHeight':'topHeight';
 if(Number.isFinite(saved?.[key]))return saved[key];
 const surface=detectPCBSurfaces(board,1.6);
 return surface?.[key]??(side==='bottom'?0:board.thick);
}
export function imagePlaneLayout(board,side,pads=[]){
 return {width:board.w,depth:board.d,height:boardImageHeight(board,side,pads)+(side==='bottom'?-.02:.02),rotationX:side==='bottom'?Math.PI/2:-Math.PI/2};
}
