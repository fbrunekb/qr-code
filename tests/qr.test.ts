import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {defaults,logoSizing,normalizeUrl,renderSvg,contrast,frameLabel,monochromePath,customPath,builtinShapes,frameOptions,framePreview,activeCustomForm,addCustomForms,selectCustomForm,invertCustomForm,removeCustomForm,truncateFrameLabel,type Settings} from '../src/qr';

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
for(const {id:shape} of builtinShapes)for(const {id:frame} of frameOptions)test(`decode exported ${shape} QR with ${frame} frame`,async()=>{
 const url='https://meine-website.de/';assert.equal(await decode(url,{shape,frame}),url);
});
test('custom modules and logo preserve encoded URL',async()=>{
 const custom='M0 0h48v48H0Z';
 const logo='data:image/png;base64,'+(await sharp({create:{width:48,height:48,channels:4,background:'#269954'}}).png().toBuffer()).toString('base64');
 const url='https://example.com/custom-logo';assert.equal(await decode(url,{shape:'custom',customForms:[{id:'test',name:'test.svg',path:custom,inverted:false}],customId:'test',logo,frame:'bottom'}),url);
});
test('round forms style timing and format modules and round the recognition corners',()=>{
 const svg=renderSvg('https://example.com/',{...defaults,shape:'round'});
 assert.equal((svg.match(/data-eye="7"/g)||[]).length,3);
 assert.ok(svg.includes('rx="18"'));
 assert.ok(!svg.includes('shape-rendering="crispEdges"'));
 assert.ok(svg.includes('<circle'));
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
for(const frameWidth of [2,16,32])test(`frame width ${frameWidth} preserves quiet zone and is scannable`,async()=>{
 const url='https://example.com/';assert.equal(await decode(url,{frame:'pill',frameWidth}),url);
 const svg=renderSvg(url,{...defaults,frame:'pill',frameWidth});
 assert.ok(svg.includes(`stroke-width="${frameWidth}"`));
 assert.ok(!svg.includes('shape-rendering="crispEdges" x="'+(frameWidth/2+4)+'"'));
});
test('long frame labels fit and custom labels are XML-escaped',()=>{
 const svg=renderSvg('https://example.com/',{...defaults,frame:'bottom'},'https://example.com/'+ 'long-url/'.repeat(20));
 assert.ok(/<text[^>]*>[^<]*\.\.\.<\/text>/.test(svg));
 assert.ok(!svg.includes('textLength='));
 assert.ok(renderSvg('https://example.com/',{...defaults,frame:'bottom',labelTouched:true,label:'<Hallo & Welt>'}).includes('&lt;Hallo &amp; Welt&gt;'));
});

test('export background pixels exactly match the selected color',async()=>{
 const svg=renderSvg('https://example.com/',{...defaults,background:'#e9dfe8'});
 const {data}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual([...data.subarray(0,4)],[233,223,232,255]);
});

test('frame label spans the complete outside width of the frame',()=>{
 for(const frame of ['bottom','pill-top','pill'] as const)for(const frameWidth of [2,16,32]){
  const svg=renderSvg('https://example.com/',{...defaults,frame,frameWidth});
  const width=Number(svg.match(/<svg[^>]* width="(\d+)"/)![1]);
  assert.ok(svg.includes(`<rect data-frame-label="true" x="4" y="${frame==='pill-top'?8:Number(svg.match(/<svg[^>]* height="(\d+)"/)![1])-(frame==='pill'?64:56)}" width="${width-8}"`));
 }
});
test('QR quiet zone includes an additional ten pixels on every side',()=>{
 const url='https://example.com/',qr=QRCode.create(url,{errorCorrectionLevel:'H'});
 const svg=renderSvg(url,defaults);
 assert.ok(svg.includes(`width="${(qr.modules.size+8)*12+20}"`));
 assert.ok(svg.includes('data-eye="7" shape-rendering="crispEdges"><rect x="58" y="58"'));
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

test('frame labels truncate without changing the original input or shortening short labels',()=>{
 assert.equal(defaults.frameWidth,16);
 const measure=(text:string)=>Array.from(text).length*10;
 assert.equal(truncateFrameLabel('example.com',200,measure),'example.com');
 assert.equal(truncateFrameLabel('https://example.com/long/path',150,measure),'https://exam...');
 assert.equal(truncateFrameLabel('',150,measure),'');
 const settings={...defaults,frame:'bottom' as const,labelTouched:true,label:'Eigener langer Text '.repeat(20)};
 const original=settings.label;
 const svg=renderSvg('https://example.com/',settings);
 assert.equal(settings.label,original);
 assert.ok(/<text[^>]*>[^<]*\.\.\.<\/text>/.test(svg));
});

test('deleting custom forms preserves other entries, selection and inversion',()=>{
 const forms=[{id:'a',name:'a.svg',path:'M0 0Z',inverted:false},{id:'b',name:'b.svg',path:'M0 0h48v48H0Z',inverted:true},{id:'c',name:'c.svg',path:'M0 0Z',inverted:false}];
 const start=selectCustomForm(addCustomForms(defaults,forms),'b');
 const unselectedRemoved=removeCustomForm(start,'a');
 assert.equal(activeCustomForm(unselectedRemoved)?.id,'b');
 assert.equal(activeCustomForm(unselectedRemoved)?.inverted,true);
 const selectedRemoved=removeCustomForm(start,'b');
 assert.equal(activeCustomForm(selectedRemoved)?.id,'c');
 assert.deepEqual(selectedRemoved.customForms.map(form=>form.id),['a','c']);
 const last=removeCustomForm(removeCustomForm(selectedRemoved,'a'),'c');
 assert.equal(last.shape,'square');assert.equal(last.customId,null);assert.equal(last.customForms.length,0);
 assert.equal(removeCustomForm(start,'missing'),start);
 assert.equal(removeCustomForm({...start,shape:'heart'},'b').shape,'heart');
 assert.equal(start.customForms.length,3);
});
import './clipboard.test';

for(const logoScale of [10,18,25])test(`logo size ${logoScale}% remains scannable in an exported QR`,async()=>{
 const logo='data:image/png;base64,'+(await sharp({create:{width:48,height:48,channels:4,background:'#269954'}}).png().toBuffer()).toString('base64');
 const url='https://example.com/logo-size';
 assert.equal(await decode(url,{logo,logoScale}),url);
});
test('logo size is capped at 50 percent',()=>{
 const url='https://example.com/',logo='data:image/png;base64,test';
 const max=renderSvg(url,{...defaults,logo,logoScale:50});
 assert.equal(renderSvg(url,{...defaults,logo,logoScale:100}),max);
 assert.equal(renderSvg(url,{...defaults,logo,logoScale:0}),renderSvg(url,{...defaults,logo,logoScale:10}));
});

test('large logos render at the requested size rather than the old 25 percent cap',()=>{
 const url='https://example.com/',n=QRCode.create(url,{errorCorrectionLevel:'H'}).modules.size;
 for(const logoScale of [30,40,50]){
  const svg=renderSvg(url,{...defaults,logo:'data:image/png;base64,test',logoScale});
  const width=Number(svg.match(/<image [^>]*width="([^"]+)"/)![1]);
  assert.equal(width,logoSizing(url,logoScale).modules*12);
  assert.ok(width>n*12*.25);
 }
});

test('nine frames follow the requested three-by-three order',()=>{
 assert.deepEqual(frameOptions.map(frame=>frame.id),['none','bottom','script','block-top','pill-top','bubble-top','block-bottom','pill','bubble-bottom']);
});
test('classic and handwriting have no QR outline; block and bubble silhouettes match their positions',()=>{
 const url='https://example.com/';
 for(const frame of ['bottom','script'] as const){
  const svg=renderSvg(url,{...defaults,frame});assert.ok(!svg.includes('stroke-width='));
 }
 for(const position of ['top','bottom'] as const){
  const block=renderSvg(url,{...defaults,frame:`block-${position}`});
  assert.ok(block.includes(`data-block-frame="${position}"`));
  assert.ok(!block.includes('data-frame-label'));
  assert.ok(renderSvg(url,{...defaults,frame:`bubble-${position}`}).includes(`data-bubble-tail="${position}"`));
 }
});

test('speech bubbles use the same outline and label radius as round frames',()=>{
 for(const [round,bubble] of [['pill-top','bubble-top'],['pill','bubble-bottom']] as const){
  const rounded=renderSvg('https://example.com/',{...defaults,frame:round});
  const speech=renderSvg('https://example.com/',{...defaults,frame:bubble});
  const radii=(svg:string)=>[svg.match(/rx="(\d+)" fill="none" stroke=/)![1],svg.match(/data-frame-label="true"[^>]*rx="(\d+)"/)![1]];
  assert.deepEqual(radii(speech),radii(rounded));
 }
});
test('all nine frame examples show a simple grid and distinct frame designs',()=>{
 const examples=frameOptions.map(({id})=>decodeURIComponent(framePreview(id).split(',')[1]));
 assert.equal(new Set(examples).size,9);
 for(const svg of examples){
  assert.ok(svg.includes('data-example-grid="true"'));
  assert.ok(!svg.includes('data-eye='));
 }
});

test('logo and its white padding align to complete modules at every slider size',()=>{
 for(const url of ['https://example.com/','https://example.com/'+ 'long-path/'.repeat(12)]){
  const n=QRCode.create(url,{errorCorrectionLevel:'H'}).modules.size;
  for(let scale=10;scale<=50;scale++){
   const svg=renderSvg(url,{...defaults,logo:'data:image/png;base64,test',logoScale:scale});
   const logo=svg.match(/<g mask="url\(#logo-mask\)"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/)!;
   const origin=58;
   assert.equal((Number(logo[1])-origin)%12,0);
   assert.equal((Number(logo[2])-origin)%12,0);
   assert.equal(Number(logo[3])%12,0);
   assert.equal(Number(logo[4])%12,0);
   assert.equal(logoSizing(url,scale).modules%2,1);
   assert.equal(logoSizing(url,scale).total,n);
  }
 }
});
