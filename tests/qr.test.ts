import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {defaults,normalizeUrl,renderSvg,contrast,frameLabel,monochromePath,customPath,type Settings} from '../src/qr';

test('URLs normalize without redirects and reject invalid or unsafe input',()=>{
 assert.equal(normalizeUrl(' meine-website.de/path?q=test '),'https://meine-website.de/path?q=test');
 assert.equal(normalizeUrl('http://example.com'),'http://example.com/');
 assert.equal(normalizeUrl('https://bücher.de'),'https://xn--bcher-kva.de/');
 for(const value of ['', 'hello','https://','javascript:alert(1)','ftp://example.com','a b.de','https://user:pass@example.com'])assert.equal(normalizeUrl(value),null,value);
});
test('contrast flags unreadable colors',()=>{assert.equal(contrast('#ffffff','#ffffff'),1);assert.ok(contrast(defaults.foreground,defaults.background)>10);});
async function decode(url:string,patch:Partial<Settings>={}){
 const svg=renderSvg(url,{...defaults,...patch});
 const {data,info}=await sharp(Buffer.from(svg)).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data;
}
for(const shape of ['square','round'] as const)for(const frame of ['none','bottom','top','pill','script'] as const)test(`decode exported ${shape} QR with ${frame} frame`,async()=>{
 const url='https://meine-website.de/';assert.equal(await decode(url,{shape,frame}),url);
});
test('custom modules and logo preserve encoded URL',async()=>{
 const custom='M0 0h48v48H0Z';
 const logo='data:image/png;base64,'+(await sharp({create:{width:48,height:48,channels:4,background:'#269954'}}).png().toBuffer()).toString('base64');
 const url='https://example.com/custom-logo';assert.equal(await decode(url,{shape:'custom',custom,logo,frame:'bottom'}),url);
});
test('all reserved modules remain square for custom and round shapes',()=>{
 const url='https://example.com/'+ 'long-path/'.repeat(25),qr=QRCode.create(url,{errorCorrectionLevel:'H'}),svg=renderSvg(url,{...defaults,shape:'round'});
 const reserved=(qr.modules as unknown as {reservedBit:Uint8Array}).reservedBit;
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(reserved[y*qr.modules.size+x]&&qr.modules.get(y,x))assert.ok(svg.includes(`<rect shape-rendering="crispEdges" x="${(x+4)*12}" y="${(y+4)*12}" width="12" height="12"/>`));
});

test('frame label follows the entered URL until manually edited, including clearing it',()=>{
 assert.equal(frameLabel('example.com',defaults),'example.com');
 assert.equal(frameLabel('other.example',defaults),'other.example');
 const edited={...defaults,label:'Mein Text',labelTouched:true};
 assert.equal(frameLabel('example.com',edited),'Mein Text');
 assert.equal(frameLabel('other.example',edited),'Mein Text');
 assert.equal(frameLabel('other.example',{...edited,label:''}),'');
});
test('black-white conversion uses a fixed threshold, preserves white centers and handles transparency',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255, 127,127,127,255, 128,128,128,255, 0,0,0,0]);
 assert.equal(monochromePath(pixels,4,1),'M0 0h2v1H0Z');
 assert.equal(monochromePath(new Uint8ClampedArray(48*48*4).fill(255),48,48),'');
});
test('inversion swaps foreground and background without forcing a center',async()=>{
 const custom='M12 12h24v24H12Z';
 async function pixel(inverted:boolean,x:number,y:number){
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="white"/><path fill="black" fill-rule="evenodd" d="${customPath(custom,inverted)}"/></svg>`;
   const {data}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});return data[(y*48+x)*4];
 }
 assert.equal(await pixel(false,24,24),0);assert.equal(await pixel(false,2,2),255);
 assert.equal(await pixel(true,24,24),255);assert.equal(await pixel(true,2,2),0);
});
test('custom vector points with an uploaded-like centered shape are scannable',async()=>{
 const url='https://example.com/custom';
 assert.equal(await decode(url,{shape:'custom',custom:'M0 12H12V0H36V12H48V36H36V48H12V36H0Z'}),url);
});
for(const frameWidth of [2,8,24])test(`frame width ${frameWidth} preserves quiet zone and is scannable`,async()=>{
 const url='https://example.com/';assert.equal(await decode(url,{frame:'pill',frameWidth}),url);
 const svg=renderSvg(url,{...defaults,frame:'pill',frameWidth});
 assert.ok(svg.includes(`stroke-width="${frameWidth}"`));
 assert.ok(!svg.includes('shape-rendering="crispEdges" x="'+(frameWidth/2+4)+'"'));
});
test('long frame labels fit and custom labels are XML-escaped',()=>{
 const svg=renderSvg('https://example.com/',{...defaults,frame:'bottom'},'https://example.com/'+ 'long-url/'.repeat(20));
 assert.ok(svg.includes('lengthAdjust="spacingAndGlyphs"'));
 assert.ok(renderSvg('https://example.com/',{...defaults,frame:'bottom',labelTouched:true,label:'<Hallo & Welt>'}).includes('&lt;Hallo &amp; Welt&gt;'));
});

test('export background pixels exactly match the selected color',async()=>{
 const svg=renderSvg('https://example.com/',{...defaults,background:'#e9dfe8'});
 const {data}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual([...data.subarray(0,4)],[233,223,232,255]);
});
import './clipboard.test';
