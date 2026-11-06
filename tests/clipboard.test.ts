import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copySvgText} from '../src/clipboard';

test('SVG clipboard contains the exact file contents as plain text only',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const svg='<svg xmlns="http://www.w3.org/2000/svg">\n<text>Grüße &amp; mehr</text>\n</svg>';
 let copied='';
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{
  async writeText(value:string){copied=value;},
  async write(){throw new Error('Image clipboard must not be used for SVG');},
 }}});
 try{await copySvgText(svg);assert.equal(copied,svg);}
 finally{if(original)Object.defineProperty(globalThis,'navigator',original);else Reflect.deleteProperty(globalThis,'navigator');}
});
