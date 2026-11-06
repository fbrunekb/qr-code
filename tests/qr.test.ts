import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {defaults,normalizeUrl,renderSvg,contrast,type Settings} from '../src/qr';

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
 const custom='data:image/png;base64,'+(await sharp({create:{width:48,height:48,channels:4,background:'#ffffff'}}).png().toBuffer()).toString('base64');
 const logo='data:image/png;base64,'+(await sharp({create:{width:48,height:48,channels:4,background:'#269954'}}).png().toBuffer()).toString('base64');
 const url='https://example.com/custom-logo';assert.equal(await decode(url,{shape:'custom',custom,logo,frame:'bottom'}),url);
});
test('all reserved modules remain square for custom and round shapes',()=>{
 const url='https://example.com/'+ 'long-path/'.repeat(25),qr=QRCode.create(url,{errorCorrectionLevel:'H'}),svg=renderSvg(url,{...defaults,shape:'round'});
 const reserved=(qr.modules as unknown as {reservedBit:Uint8Array}).reservedBit;
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(reserved[y*qr.modules.size+x]&&qr.modules.get(y,x))assert.ok(svg.includes(`<rect shape-rendering="crispEdges" x="${(x+4)*12}" y="${(y+4)*12}" width="12" height="12"/>`));
});
