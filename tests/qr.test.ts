import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {defaults,normalizeUrl,renderSvg,contrast,frameLabel,monochromePath,customPath,builtinShapes,activeCustomForm,addCustomForms,selectCustomForm,invertCustomForm,type Settings} from '../src/qr';

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
for(const {id:shape} of builtinShapes)for(const frame of ['none','bottom','top','pill','script'] as const)test(`decode exported ${shape} QR with ${frame} frame`,async()=>{
 const url='https://meine-website.de/';assert.equal(await decode(url,{shape,frame}),url);
});
test('custom modules and logo preserve encoded URL',async()=>{
 const custom='M0 0h48v48H0Z';
 const logo='data:image/png;base64,'+(await sharp({create:{width:48,height:48,channels:4,background:'#269954'}}).png().toBuffer()).toString('base64');
 const url='https://example.com/custom-logo';assert.equal(await decode(url,{shape:'custom',customForms:[{id:'test',name:'test.svg',path:custom,inverted:false}],customId:'test',logo,frame:'bottom'}),url);
});
test('all reserved modules remain square for custom and round shapes',()=>{
 const url='https://example.com/'+ 'long-path/'.repeat(25),qr=QRCode.create(url,{errorCorrectionLevel:'H'}),svg=renderSvg(url,{...defaults,shape:'round'});
 const reserved=(qr.modules as unknown as {reservedBit:Uint8Array}).reservedBit;
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(reserved[y*qr.modules.size+x]&&qr.modules.get(y,x))assert.ok(svg.includes(`<rect shape-rendering="crispEdges" x="${(x+4)*12+10}" y="${(y+4)*12+10}" width="12" height="12"/>`));
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
 assert.equal(await decode(url,{shape:'custom',customForms:[{id:'test',name:'test.svg',path:'M0 12H12V0H36V12H48V36H36V48H12V36H0Z',inverted:false}],customId:'test'}),url);
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

test('frame label spans the complete outside width of the frame',()=>{
 for(const frame of ['bottom','top','pill'] as const)for(const frameWidth of [2,8,24]){
  const svg=renderSvg('https://example.com/',{...defaults,frame,frameWidth});
  const width=Number(svg.match(/<svg[^>]* width="(\d+)"/)![1]);
  assert.ok(svg.includes(`<rect data-frame-label="true" x="4" y="${frame==='top'?8:Number(svg.match(/<svg[^>]* height="(\d+)"/)![1])-56}" width="${width-8}"`));
 }
});
test('QR quiet zone includes an additional ten pixels on every side',()=>{
 const url='https://example.com/',qr=QRCode.create(url,{errorCorrectionLevel:'H'});
 const svg=renderSvg(url,defaults);
 assert.ok(svg.includes(`width="${(qr.modules.size+8)*12+20}"`));
 assert.ok(svg.includes('<rect shape-rendering="crispEdges" x="58" y="58" width="12" height="12"/>'));
});

test('multiple custom forms preserve independent inversion across selection and new uploads',()=>{
 const first={id:'a',name:'first.svg',path:'M0 0h48v48H0Z',inverted:false};
 const second={id:'b',name:'second.png',path:'M0 0Z',inverted:false};
 let settings=addCustomForms(defaults,[first,second]);
 assert.equal(settings.customForms.length,2);
 assert.equal(activeCustomForm(settings)?.id,'b');
 settings=invertCustomForm(settings,true);
 assert.equal(activeCustomForm(settings)?.inverted,true);
 settings=selectCustomForm(settings,'a');
 assert.equal(activeCustomForm(settings)?.inverted,false);
 settings=selectCustomForm(settings,'b');
 assert.equal(activeCustomForm(settings)?.inverted,true);
 settings={...settings,shape:'round'};
 assert.equal(activeCustomForm(settings),undefined);
 settings=selectCustomForm(settings,'b');
 assert.equal(activeCustomForm(settings)?.inverted,true);
 settings=addCustomForms(settings,[{...first,id:'c'}]);
 assert.equal(settings.customForms.length,3);
 assert.equal(settings.customForms.find(form=>form.id==='b')?.inverted,true);
 assert.equal(activeCustomForm(settings)?.id,'c');
 assert.equal(second.inverted,false);
});
test('QR exports use the selected custom form and its own inversion',async()=>{
 const forms=[{id:'a',name:'dark.svg',path:'M0 0h48v48H0Z',inverted:false},{id:'b',name:'light.svg',path:'M0 0Z',inverted:true}];
 const settings=addCustomForms(defaults,forms),url='https://example.com/custom-selection';
 for(const id of ['a','b']){
  const selected=selectCustomForm(settings,id);
  assert.equal(await decode(url,selected),url);
  const active=activeCustomForm(selected)!;
  assert.ok(renderSvg(url,selected).includes(`d="${customPath(active.path,active.inverted)}"`));
 }
});
