import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attachSplitPane} from '../split-pane.js';
test('drag changes both pane shares, clamps extremes and restores the preference',()=>{
 const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 function fixture(){const attrs={},styles={},handlers={},classes=new Set(),captures=new Set();const workspace={style:{setProperty:(k,v)=>styles[k]=v},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)},getBoundingClientRect:()=>({left:100,width:1010})};const divider={offsetWidth:10,setAttribute:(k,v)=>attrs[k]=v,addEventListener:(k,v)=>handlers[k]=v,focus(){},setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)};attachSplitPane(workspace,divider);return {attrs,styles,handlers,classes};}
 const f=fixture(),event={button:0,pointerId:1,clientX:855,preventDefault(){}};
 f.handlers.pointerdown(event);assert.equal(f.styles['--schematic-share'],.75);assert.equal(f.styles['--scene-share'],.25);assert.equal(f.attrs['aria-valuenow'],'75');
 f.handlers.pointerup(event);assert.equal(f.classes.size,0);assert.equal(fixture().attrs['aria-valuenow'],'75');
 f.handlers.pointerdown({...event,clientX:5000});assert.equal(f.attrs['aria-valuenow'],'80');f.handlers.pointercancel();assert.equal(f.classes.size,0);
 let stopped=false;f.handlers.keydown({key:'ArrowLeft',preventDefault(){},stopPropagation(){stopped=true;}});assert.equal(f.attrs['aria-valuenow'],'78');assert.ok(stopped);
 f.handlers.dblclick();assert.equal(f.attrs['aria-valuenow'],'55');delete globalThis.localStorage;
});
test('unavailable local storage does not block resizing',()=>{
 const handlers={},attrs={};const divider={setAttribute:(k,v)=>attrs[k]=v,addEventListener:(k,v)=>handlers[k]=v};attachSplitPane({style:{setProperty(){}}},divider);handlers.keydown({key:'Home',preventDefault(){},stopPropagation(){}});assert.equal(attrs['aria-valuenow'],'20');
});
