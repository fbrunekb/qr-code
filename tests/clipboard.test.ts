import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copySvg} from '../src/clipboard';

for(const mode of ['image','text','rejected-image'] as const)test(`SVG clipboard supports ${mode}`,async()=>{
 const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const originalItem=Object.getOwnPropertyDescriptor(globalThis,'ClipboardItem');
 const svg='<svg xmlns="http://www.w3.org/2000/svg"><text>QR</text></svg>';
 let written:Record<string,Blob>|undefined,text='';
 class Item {
   static supports(){return mode!=='text';}
   constructor(public data:Record<string,Blob>){}
 }
 Object.defineProperty(globalThis,'ClipboardItem',{configurable:true,value:Item});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{
   async write(items:Item[]){if(mode==='rejected-image')throw new Error('Unsupported SVG');written=items[0].data;},
   async writeText(value:string){text=value;},
 }}});
 try{
   assert.equal(await copySvg(svg),mode==='image'?'image':'text');
   if(mode==='image'){
     assert.equal(await written!['image/svg+xml'].text(),svg);
     assert.equal(await written!['text/plain'].text(),svg);
   }else assert.equal(text,svg);
 }finally{
   if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else Reflect.deleteProperty(globalThis,'navigator');
   if(originalItem)Object.defineProperty(globalThis,'ClipboardItem',originalItem);else Reflect.deleteProperty(globalThis,'ClipboardItem');
 }
});
