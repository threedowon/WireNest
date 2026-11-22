import {detectPCBSurfaces} from './pcb-surfaces.js?v=2';
// Images belong on the substrate, not on connector pads or a manually moved silk plane.
export function boardImageHeight(board,side){
 if(Number.isFinite(board.imageHeights?.[side]))return board.imageHeights[side];
 const key=side==='bottom'?'bottomHeight':'topHeight';
 if(!board.model)return side==='bottom'?0:board.thick;
 const surface=detectPCBSurfaces(board,1.6);
 if(surface)return surface[key];
 const saved=board.gerberImport;
 return Number.isFinite(saved?.[key])?saved[key]:(side==='bottom'?0:board.thick);
}
export function imagePlaneLayout(board,side){
 return {width:board.w,depth:board.d,height:boardImageHeight(board,side)+(side==='bottom'?-.02:.02),rotationX:side==='bottom'?Math.PI/2:-Math.PI/2};
}
