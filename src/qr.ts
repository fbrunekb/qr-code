import QRCode from 'qrcode';
export type Shape = 'square' | 'round' | 'custom';
export type Frame = 'none' | 'bottom' | 'top' | 'pill' | 'script';
export type Settings = {shape:Shape; foreground:string; background:string; custom:string; logo:string; frame:Frame; label:string};
export const defaults: Settings = {shape:'square',foreground:'#123d3c',background:'#ffffff',custom:'',logo:'',frame:'none',label:'SCAN ME'};
export function normalizeUrl(input:string):string | null {
  const value=input.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url=new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value)?value:`https://${value}`);
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (!url.hostname.includes('.') && url.hostname!=='localhost') || url.hostname.endsWith('.')) return null;
    return url.href;
  } catch { return null; }
}
export function contrast(a:string,b:string) {
  const lum=(hex:string)=>{const c=hex.match(/\w\w/g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
  const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const esc=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export function renderSvg(url:string,s:Settings):string {
  const qr=QRCode.create(url,{errorCorrectionLevel:'H'});
  const n=qr.modules.size, m=12, size=(n+8)*m;
  const framed=s.frame!=='none', pad=framed?12:0, top=s.frame==='top'?48:0, bottom=framed&&s.frame!=='top'?48:0;
  const width=size+pad*2,height=size+pad*2+top+bottom;
  const cells:string[]=[];
  const protectedCells:string[]=[];
  const reserved=(qr.modules as unknown as {reservedBit:Uint8Array}).reservedBit;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    if(reserved[y*n+x])protectedCells.push(`<rect x="${(x+4)*m+pad}" y="${(y+4)*m+pad+top}" width="12" height="12" fill="black"/>`);
    if(!qr.modules.get(y,x))continue;
    const px=(x+4)*m+pad,py=(y+4)*m+pad+top;
    const fixed=!!reserved[y*n+x];
    if(!fixed&&s.shape==='custom'&&s.custom)cells.push(`<use href="#custom" x="${px}" y="${py}" width="12" height="12"/><rect x="${px+4}" y="${py+4}" width="4" height="4"/>`);
    else if(!fixed&&s.shape==='round')cells.push(`<circle cx="${px+6}" cy="${py+6}" r="6"/>`);
    else cells.push(`<rect x="${px}" y="${py}" width="12" height="12"/>`);
  }
  const label=esc(s.label.slice(0,32)||'SCAN ME');
  let frame='';
  if(framed){
    frame=`<rect x="6" y="${top+6}" width="${width-12}" height="${size+12}" rx="${s.frame==='pill'?20:3}" fill="none" stroke="${s.foreground}" stroke-width="3"/>`;
    const ty=s.frame==='top'?32:height-16;
    frame+=s.frame==='script'?`<text x="${width/2}" y="${ty}" fill="${s.foreground}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="28">${label}</text>`:`<rect x="${pad}" y="${s.frame==='top'?0:height-44}" width="${size}" height="44" rx="${s.frame==='pill'?22:3}" fill="${s.foreground}"/><text x="${width/2}" y="${ty}" fill="${s.background}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="22">${label}</text>`;
  }
  const logoSize=Math.floor(n*.18)*m,center=pad+size/2;
  const logo=s.logo?`<g mask="url(#logo-mask)"><rect x="${center-logoSize/2-6}" y="${center+top-logoSize/2-6}" width="${logoSize+12}" height="${logoSize+12}" rx="6" fill="${s.background}"/><image href="${s.logo}" x="${center-logoSize/2}" y="${center+top-logoSize/2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/></g>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="logo-mask"><rect width="100%" height="100%" fill="white"/>${protectedCells.join('')}</mask>${s.custom?`<mask id="custom-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="12" height="12"><image href="${s.custom}" width="12" height="12"/></mask><symbol id="custom" viewBox="0 0 12 12"><rect width="12" height="12" mask="url(#custom-mask)"/></symbol>`:''}</defs><rect width="100%" height="100%" fill="${s.background}"/><g fill="${s.foreground}">${cells.join('')}</g>${logo}${frame}</svg>`.replaceAll('<rect ', '<rect shape-rendering="crispEdges" ');
}
export async function svgToCanvas(svg:string,size=1200):Promise<HTMLCanvasElement> {
  const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
  try {const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');const scale=Math.max(1,Math.floor(size/img.width));canvas.width=img.width*scale;canvas.height=img.height*scale;canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);return canvas;}finally{URL.revokeObjectURL(url);}
}
export async function canvasBlob(canvas:HTMLCanvasElement):Promise<Blob> {return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Bild konnte nicht erstellt werden.')),'image/png'));}
export async function readImage(file:File,custom=false):Promise<string>{
  if(file.size>5*1024*1024)throw new Error('Bitte wähle ein Bild mit höchstens 5 MB.');
  if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))throw new Error('Bitte PNG, JPG, WebP oder SVG verwenden.');
  const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=custom?48:256;canvas.height=canvas.width;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);const ratio=Math.min(canvas.width/img.width,canvas.height/img.height);ctx.drawImage(img,(canvas.width-img.width*ratio)/2,(canvas.height-img.height*ratio)/2,img.width*ratio,img.height*ratio);
    if(custom){const pixels=ctx.getImageData(0,0,48,48);const levels=[];for(let i=0;i<pixels.data.length;i+=4)levels.push(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2]);const sorted=[...levels].sort((a,b)=>a-b),threshold=Math.max(128,sorted[Math.ceil(sorted.length*.6)-1]);for(let p=0;p<levels.length;p++){const x=p%48,y=Math.floor(p/48);const dark=levels[p]<=threshold||(x>=16&&x<32&&y>=16&&y<32);pixels.data[p*4]=255;pixels.data[p*4+1]=255;pixels.data[p*4+2]=255;pixels.data[p*4+3]=dark?255:0;}ctx.putImageData(pixels,0,0);}
    return canvas.toDataURL('image/png');
  }finally{URL.revokeObjectURL(url);}
}
