import QRCode from 'qrcode';
export type Shape = 'square' | 'rounded' | 'round' | 'diamond' | 'heart' | 'blur' | 'custom';
export type Frame = 'none' | 'bottom' | 'top' | 'pill' | 'script';
export type Settings = {shape:Shape; foreground:string; background:string; custom:string; logo:string; frame:Frame; frameWidth:number; label:string; labelTouched:boolean; customInverted:boolean};
export const defaults: Settings = {shape:'square',foreground:'#123d3c',background:'#ffffff',custom:'',logo:'',frame:'none',frameWidth:8,label:'',labelTouched:false,customInverted:false};
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
export function frameLabel(input:string,s:Settings):string {return s.labelTouched?s.label:input.trim();}

/** Dark runs become a reusable vector shape; no filling or forced center pixels. */
export function monochromePath(pixels:Uint8ClampedArray,width:number,height:number):string {
  let path='';
  for(let y=0;y<height;y++){
    let start=-1;
    for(let x=0;x<=width;x++){
      const i=(y*width+x)*4,alpha=pixels[i+3]/255;
      const brightness=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])*alpha+255*(1-alpha);
      const dark=x<width&&brightness<128;
      if(dark&&start<0)start=x;
      if(!dark&&start>=0){path+=`M${start} ${y}h${x-start}v1H${start}Z`;start=-1;}
    }
  }
  return path;
}
export function customPath(path:string,inverted:boolean):string {return inverted?`M0 0h48v48H0Z${path}`:path;}
export function customPreview(path:string,inverted:boolean):string {
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="white"/><path d="${customPath(path,inverted)}" fill="black" fill-rule="evenodd"/></svg>`);
}
export async function readCustomImage(file:File):Promise<string>{
  if(!['image/png','image/svg+xml'].includes(file.type))throw new Error('Bitte PNG oder SVG verwenden.');
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
    const ctx=canvas.getContext('2d')!;
    // Flatten transparency onto white before thresholding or optional inversion.
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,48,48);
    const scale=Math.min(48/img.width,48/img.height);
    ctx.drawImage(img,(48-img.width*scale)/2,(48-img.height*scale)/2,img.width*scale,img.height*scale);
    // An empty path is valid (an all-white upload) and is still invertible.
    return monochromePath(ctx.getImageData(0,0,48,48).data,48,48)||'M0 0Z';
  }finally{URL.revokeObjectURL(url);}
}
export const builtinShapes = [
  {id:'square',label:'Standard'},{id:'rounded',label:'Abgerundet'},
  {id:'round',label:'Rund'},{id:'diamond',label:'Karo'},
  {id:'heart',label:'Herzchen'},{id:'blur',label:'Blurry-rund'},
] as const;
const blurFilter='<filter id="soft-dot" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.4"/></filter>';
export function moduleSvg(shape:Shape,x:number,y:number):string {
  const at=`transform="translate(${x} ${y})"`;
  switch(shape){
    case 'rounded':return `<rect x="${x}" y="${y}" width="12" height="12" rx="3.5"/>`;
    case 'round':return `<circle cx="${x+6}" cy="${y+6}" r="6"/>`;
    case 'diamond':return `<path ${at} d="M6 0 12 6 6 12 0 6Z"/>`;
    case 'heart':return `<path ${at} d="M6 11.6C4.7 10.3 0 7.2 0 3.7C0 -.3 4.5 -1 6 2C7.5 -1 12 -.3 12 3.7C12 7.2 7.3 10.3 6 11.6Z"/>`;
    case 'blur':return `<circle cx="${x+6}" cy="${y+6}" r="5.8" filter="url(#soft-dot)"/>`;
    default:return `<rect shape-rendering="crispEdges" x="${x}" y="${y}" width="12" height="12"/>`;
  }
}
export function shapePreview(shape:Shape):string {
  let cells='';for(let y=0;y<3;y++)for(let x=0;x<3;x++)cells+=moduleSvg(shape,x*17+3,y*17+3);
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><defs>${blurFilter}</defs><g fill="#123d3c">${cells}</g></svg>`);
}
export function renderSvg(url:string,s:Settings,defaultLabel=url):string {
  const qr=QRCode.create(url,{errorCorrectionLevel:'H'});
  const n=qr.modules.size, m=12, size=(n+8)*m+20;
  const framed=s.frame!=='none', stroke=Math.max(2,Math.min(24,s.frameWidth)), pad=framed?stroke+12:0, top=s.frame==='top'?64:0, bottom=framed&&s.frame!=='top'?64:0;
  const width=size+pad*2,height=size+pad*2+top+bottom;
  const cells:string[]=[];
  const protectedCells:string[]=[];
  const reserved=(qr.modules as unknown as {reservedBit:Uint8Array}).reservedBit;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    if(reserved[y*n+x])protectedCells.push(`<rect x="${(x+4)*m+pad+10}" y="${(y+4)*m+pad+top+10}" width="12" height="12" fill="black"/>`);
    if(!qr.modules.get(y,x))continue;
    const px=(x+4)*m+pad+10,py=(y+4)*m+pad+top+10;
    const fixed=!!reserved[y*n+x];
    if(!fixed&&s.shape==='custom'&&s.custom)cells.push(`<use href="#custom" xlink:href="#custom" x="${px}" y="${py}" width="12" height="12"/>`);
    else cells.push(moduleSvg(fixed?'square':s.shape,px,py));
  }
  const label=esc(frameLabel(defaultLabel,s));
  let frame='';
  if(framed){
    const inset=stroke/2+4, radius=s.frame==='pill'?28:14;
    frame=`<rect x="${inset}" y="${top+inset}" width="${width-2*inset}" height="${size+2*pad-2*inset}" rx="${radius}" fill="none" stroke="${s.foreground}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    const labelY=s.frame==='top'?8:height-56, textY=labelY+30;
    const script=s.frame==='script',fontSize=script?28:24;
    // SVG textLength keeps long URLs within their label in preview and exports alike.
    const textWidth=width-8-32, fit=label.length*fontSize*.62>textWidth?` textLength="${textWidth}" lengthAdjust="spacingAndGlyphs"`:'';
    if(!script)frame+=`<rect data-frame-label="true" x="4" y="${labelY}" width="${width-8}" height="48" rx="${s.frame==='pill'?24:10}" fill="${s.foreground}"/>`;
    frame+=`<text x="${width/2}" y="${textY}" fill="${script?s.foreground:s.background}" text-anchor="middle" font-family="${script?'Georgia,serif':'Arial,sans-serif'}" font-style="${script?'italic':'normal'}" font-weight="${script?'400':'700'}" font-size="${fontSize}"${fit}>${label}</text>`;
  }
  const logoSize=Math.floor(n*.18)*m,center=pad+size/2;
  const logo=s.logo?`<g mask="url(#logo-mask)"><rect x="${center-logoSize/2-6}" y="${center+top-logoSize/2-6}" width="${logoSize+12}" height="${logoSize+12}" rx="6" fill="${s.background}"/><image href="${s.logo}" x="${center-logoSize/2}" y="${center+top-logoSize/2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/></g>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${blurFilter}<mask id="logo-mask"><rect width="100%" height="100%" fill="white"/>${protectedCells.join('')}</mask>${s.custom?`<symbol id="custom" viewBox="0 0 48 48"><path d="${customPath(s.custom,s.customInverted)}" fill-rule="evenodd"/></symbol>`:''}</defs><rect width="100%" height="100%" fill="${s.background}"/><g fill="${s.foreground}">${cells.join('')}</g>${logo}${frame}</svg>`;
}
export async function svgToCanvas(svg:string,size=1200):Promise<HTMLCanvasElement> {
  const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
  try {const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');const scale=Math.max(1,Math.floor(size/img.width));canvas.width=img.width*scale;canvas.height=img.height*scale;canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);return canvas;}finally{URL.revokeObjectURL(url);}
}
export async function canvasBlob(canvas:HTMLCanvasElement):Promise<Blob> {return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Bild konnte nicht erstellt werden.')),'image/png'));}
export async function readImage(file:File):Promise<string>{
  if(file.size>5*1024*1024)throw new Error('Bitte wähle ein Logo mit höchstens 5 MB.');
  if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type))throw new Error('Bitte PNG, JPG, WebP oder SVG verwenden.');
  const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d')!;
    const ratio=Math.min(canvas.width/img.width,canvas.height/img.height);ctx.drawImage(img,(canvas.width-img.width*ratio)/2,(canvas.height-img.height*ratio)/2,img.width*ratio,img.height*ratio);
    return canvas.toDataURL('image/png');
  }finally{URL.revokeObjectURL(url);}
}
