import React,{useEffect,useRef,useState} from 'react';
import {ArrowDownToLine,Check,ChevronDown,Clipboard,Grid3X3,Image as ImageIcon,Link,Mail,Palette,PenLine,ScanLine,SquareDashed,Upload,X,Spline,ShieldCheck,Info} from 'lucide-react';
import jsQR from 'jsqr';
import {defaults,normalizeUrl,renderSvg,contrast,svgToCanvas,canvasBlob,readImage,readCustomImage,customPreview,frameLabel,builtinShapes,shapePreview,frameOptions,framePreview,activeCustomForm,addCustomForms,selectCustomForm,invertCustomForm,removeCustomForm,type CustomForm,type Settings} from './qr';
import ColorPicker from './ColorPicker';
import {copySvgText} from './clipboard';
import '@fontsource-variable/manrope';
import './style.css';
export default function App(){
 const [input,setInput]=useState(''),[settings,setSettings]=useState<Settings>(defaults),[open,setOpen]=useState(''),[editing,setEditing]=useState(false),[svg,setSvg]=useState(''),[error,setError]=useState(''),[scan,setScan]=useState<'idle'|'checking'|'ok'|'fail'>('idle'),[toast,setToast]=useState('');
 const [colorTarget,setColorTarget]=useState<'foreground'|'background'|null>(null);
 const customSequence=useRef(0);
 const editorStart=useRef<HTMLDivElement>(null),inputArea=useRef<HTMLDivElement>(null),logoBusy=useRef(false);
 const [logoLoading,setLogoLoading]=useState(false);
 const customUpload=useRef<HTMLInputElement>(null);
 const field=useRef<HTMLInputElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const url=normalizeUrl(input);const update=(patch:Partial<Settings>)=>setSettings(s=>({...s,...patch}));
 const selectedCustom=activeCustomForm(settings);
 const selectedFrame=frameOptions.find(frame=>frame.id===settings.frame)??frameOptions[0];
 const notify=(message:string)=>{setToast(message);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(''),4000);};
 useEffect(()=>{let active=true;setError('');setScan('idle');if(!url){setSvg('');return;}let markup='';try{markup=renderSvg(url,settings,input);setSvg(markup);}catch{setSvg('');setError('Diese URL ist zu lang. Bitte verwende eine kürzere Adresse.');return;}
 setScan('checking');const timeout=setTimeout(async()=>{try{const canvas=await svgToCanvas(markup,900),ctx=canvas.getContext('2d')!,pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const decoded=jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});if(active)setScan(decoded?.data===url?'ok':'fail');}catch{if(active)setScan('fail');}},250);return()=>{active=false;clearTimeout(timeout);};},[url,settings,input]);
 useEffect(()=>{
  if(!open)return;
  const frame=requestAnimationFrame(()=>{
   if(!editorStart.current)return;
   const mobile=window.matchMedia('(max-width:640px)').matches&&!!svg;
   const offset=mobile?(inputArea.current?.getBoundingClientRect().height??0)+16:20;
   window.scrollTo({top:window.scrollY+editorStart.current.getBoundingClientRect().top-offset,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  return()=>cancelAnimationFrame(frame);
 },[open]);
 async function uploadLogo(file:File|undefined){
  if(!file||settings.logo||logoBusy.current)return;
  logoBusy.current=true;setLogoLoading(true);
  try{const logo=await readImage(file);setSettings(s=>s.logo?s:{...s,logo});}
  catch(e){notify(e instanceof Error?e.message:'Das Bild konnte nicht geladen werden.');}
  finally{logoBusy.current=false;setLogoLoading(false);}
 }
 async function uploadCustom(files:File[]){
  const results=await Promise.allSettled(files.map(async(file):Promise<CustomForm>=>({id:`custom-${++customSequence.current}`,name:file.name,path:await readCustomImage(file),inverted:false})));
  const forms=results.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
  setSettings(s=>addCustomForms(s,forms));
  const failed=results.filter(result=>result.status==='rejected').length;
  if(failed)notify(`${failed} ${failed===1?'Datei konnte':'Dateien konnten'} nicht geladen werden. Bitte verwende gültige PNG- oder SVG-Dateien.`);
 }
 async function exportQr(format:'png'|'svg',copy=false){if(!svg)return;try{
  if(copy){
   if(format==='svg'){await copySvgText(svg);notify('SVG-Quelltext in die Zwischenablage kopiert');return;}
   if(!navigator.clipboard)throw new Error('Die Zwischenablage benötigt HTTPS oder localhost. Bitte nutze Download.');
   if(!window.ClipboardItem)throw new Error('Dein Browser unterstützt das Kopieren von Bildern nicht. Bitte nutze Download.');
   await navigator.clipboard.write([new ClipboardItem({'image/png':svgToCanvas(svg).then(canvasBlob)})]);
   notify('PNG in die Zwischenablage kopiert');
  }else{const blob=format==='png'?await canvasBlob(await svgToCanvas(svg)):new Blob([svg],{type:'image/svg+xml'});const object=URL.createObjectURL(blob),a=document.createElement('a');a.href=object;a.download=`qr-studio.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(object),1000);notify(`${format.toUpperCase()} wird heruntergeladen`);}
 }catch(e){const known=e instanceof Error&&/^(Die Zwischenablage benötigt|Dein Browser unterstützt|Bild konnte)/.test(e.message);notify(known?e.message:copy?'Kopieren fehlgeschlagen. Bitte erlaube den Zugriff auf die Zwischenablage oder nutze Download.':'Download fehlgeschlagen. Bitte versuche es erneut.');}}
 const warning=scan==='fail'?'Scanprüfung fehlgeschlagen. Bitte teste den QR-Code mit deinem Smartphone. Ein guter QR-Punkt braucht eine dunkle Mitte, klare Konturen und hohen Kontrast.':'';
 const preview=<button className={`qr-preview ${!svg?'empty':''}`} disabled={!svg} onClick={()=>exportQr('png',true)} title="QR-Code als PNG kopieren" aria-label="QR-Code als PNG kopieren">{svg?<img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="Dein gestalteter QR-Code"/>:<div className="placeholder"><ScanLine size={112} strokeWidth={1}/><span>Hier entsteht dein QR-Code</span></div>}</button>;
 const previewNotes=svg&&<div className="preview-notes" aria-live="polite">{scan==='ok'&&<p className="scan-status"><Check size={15}/>Scanprüfung erfolgreich</p>}{scan==='checking'&&<p className="scan-status checking">Scanprüfung läuft …</p>}{warning&&<p className="warning">{warning}</p>}</div>;
 const panels=[{id:'shape',title:'Punktform',icon:Grid3X3},{id:'colors',title:'Farben',icon:Palette},{id:'logo',title:'Logo & Bild',icon:ImageIcon},{id:'frame',title:'Rahmen',icon:SquareDashed}];
 return <main className={`studio ${url&&svg?'has-code':''}`}>
 <div className="wave wave-one"/><div className="wave wave-two"/>
 <header><a className="brand" href="./" aria-label="QR Studio Startseite"><span className="brand-mark"><i/><i/><i/><i/></span>QR Studio</a><span className="local-badge"><ShieldCheck size={15}/> 100 % in deinem Browser</span></header>
 <section className="hero"><h1>Dein QR-Code<span className="spark"><i/><i/><i/></span></h1><p>Kein Login. Kein Tracking. Keine Umleitung.</p></section>
 <div ref={inputArea} className={`input-area ${editing?'is-editing':''}`}>
 <div className="mobile-preview">{preview}</div>
 <div className="url-controls"><div className="url-field"><Link className="link-icon" size={23}/><input ref={field} aria-label="Website-URL" type="text" inputMode="url" placeholder="URL hier eingeben" value={input} onChange={e=>setInput(e.target.value)} onFocus={()=>setEditing(true)} onBlur={()=>setEditing(false)} onKeyDown={e=>{if(e.key==='Enter')field.current?.blur();}} spellCheck={false} autoComplete="url"/>{input?<button className="clear" aria-label="URL löschen" onClick={()=>{setInput('');field.current?.focus();}}><X size={21}/></button>:null}<button className="edit" aria-label="URL bearbeiten" onClick={()=>field.current?.focus()}><PenLine size={20}/></button></div>
 <button className="mobile-download primary" disabled={!svg} onClick={()=>document.getElementById('exports')?.scrollIntoView({behavior:'smooth'})}>Download<ArrowDownToLine size={23}/></button></div>
 {svg&&<div className="mobile-preview-notes">{previewNotes}</div>}
 </div>
 {((input&&!url)||error)&&<p className="input-error" role="alert">{error||'Bitte gib eine gültige Website ein, z. B. meine-website.de.'}</p>}

 <div ref={editorStart} className="editor"><section className="settings" aria-label="QR-Code gestalten">{colorTarget&&<ColorPicker key={colorTarget} title={colorTarget==='foreground'?'QR-Code-Farbe':'Hintergrundfarbe'} color={settings[colorTarget]} onChange={color=>update({[colorTarget]:color})} onClose={()=>setColorTarget(null)}/>}{panels.map(({id,title,icon:Icon})=><article className={`panel ${open===id?'expanded':''}`} key={id}><button className="panel-heading" aria-expanded={open===id} aria-controls={`panel-${id}`} onClick={()=>{setOpen(open===id?'':id);setColorTarget(null);}}><Icon size={27}/><span>{title}</span><ChevronDown size={21}/></button>{open===id&&<div className="panel-body" id={`panel-${id}`}>
 {id==='shape'&&<><div className="shape-grid">{builtinShapes.map(shape=><button key={shape.id} className={`shape-tile ${settings.shape===shape.id?'selected':''}`} aria-pressed={settings.shape===shape.id} onClick={()=>update({shape:shape.id})}><img className="shape-sample" src={shapePreview(shape.id)} alt=""/><strong>{shape.label}</strong>{settings.shape===shape.id&&<span className="selected-check"><Check size={17}/></span>}</button>)}{settings.customForms.map(form=><div className="custom-form-entry" key={form.id}><button className={`shape-tile custom-form-tile ${selectedCustom?.id===form.id?'selected':''}`} aria-label={`Custom-Form ${form.name}`} aria-pressed={selectedCustom?.id===form.id} title={form.name} onClick={()=>setSettings(s=>selectCustomForm(s,form.id))}><img className="shape-sample" src={customPreview(form.path,form.inverted)} alt=""/><strong>{form.name}</strong>{selectedCustom?.id===form.id&&<span className="selected-check"><Check size={17}/></span>}</button><button className="remove-custom" aria-label={`Form ${form.name} entfernen`} title="Form entfernen" onClick={()=>setSettings(s=>removeCustomForm(s,form.id))}><X size={15}/></button></div>)}<button className="shape-tile shape-upload" onClick={()=>customUpload.current?.click()}><Upload size={36}/><strong>Eigene Form verwenden</strong></button></div><input ref={customUpload} className="custom-file-input" tabIndex={-1} aria-label="Eigene Formen hochladen" type="file" accept="image/png,image/svg+xml" multiple onChange={e=>{uploadCustom(Array.from(e.target.files??[]));e.target.value='';}}/><div className="custom-actions">{selectedCustom&&<label className="invert-option"><input type="checkbox" checked={selectedCustom.inverted} onChange={e=>{const inverted=e.target.checked;setSettings(s=>invertCustomForm(s,inverted));}}/> Form invertieren</label>}<details className="custom-info"><summary aria-label="Informationen zu Custom-Formen"><Info size={21}/></summary><p>PNG oder SVG. Wir wandeln das Bild in Schwarz-Weiß um. QR-Code-Punkte müssen möglichst mittig gefärbt sein, damit sie gut gescannt werden können</p></details></div></>}
 {id==='colors'&&<>{([{id:'foreground',label:'QR-Code'},{id:'background',label:'Hintergrund'}] as const).map(item=><div className="color-row" key={item.id}><span>{item.label}</span><code>{settings[item.id].toUpperCase()}</code><button className="color-swatch" aria-label={`${item.label} auswählen`} aria-expanded={colorTarget===item.id} aria-controls="color-picker" style={{background:settings[item.id]}} onClick={()=>setColorTarget(item.id)}/></div>)}{contrast(settings.foreground,settings.background)<4.5&&<p className="warning">Wenig Kontrast. Wähle einen dunklen QR-Code auf hellem Hintergrund, damit er gut lesbar bleibt.</p>}<button className="text-button" onClick={()=>update({foreground:defaults.foreground,background:defaults.background})}>Standardfarben wiederherstellen</button></>}
 {id==='logo'&&<>{settings.logo?<><div className="logo-row"><img src={settings.logo} alt="Hochgeladenes Logo"/><button className="text-button" onClick={()=>update({logo:'',logoScale:defaults.logoScale})}><X size={16}/> Bild entfernen</button></div><label className="range-label" htmlFor="logo-scale"><span>Logogröße</span><output>{settings.logoScale??defaults.logoScale} %</output></label><input id="logo-scale" className="frame-width" type="range" min="10" max="50" step="1" value={settings.logoScale??defaults.logoScale} onChange={e=>update({logoScale:Number(e.target.value)})}/></>:<label className={`upload ${logoLoading?'is-loading':''}`}><Upload size={20}/>{logoLoading?'Bild wird geladen …':'Logo oder Bild hochladen'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={logoLoading} onChange={e=>{uploadLogo(e.target.files?.[0]);e.target.value='';}}/></label>}<p className="help">PNG, JPG, WebP oder SVG. Wir prüfen die Lesbarkeit.</p></>}
 {id==='frame'&&<><div className="frame-grid">{frameOptions.map(frame=><button className={`frame-tile ${settings.frame===frame.id?'selected':''}`} key={frame.id} aria-pressed={settings.frame===frame.id} onClick={()=>update({frame:frame.id})}><img className="frame-sample" src={framePreview(frame.id)} alt=""/><span>{frame.label}</span></button>)}</div>{settings.frame!=='none'&&<>{['round','block','bubble'].includes(selectedFrame.kind)&&<><label className="range-label" htmlFor="frame-width"><span>Rahmenbreite</span><output>{settings.frameWidth} px</output></label><input className="frame-width" id="frame-width" type="range" min="2" max="32" step="1" value={settings.frameWidth} onChange={e=>update({frameWidth:Number(e.target.value)})}/></>}<label className="label-input">Rahmentext<input value={frameLabel(input,settings)} onChange={e=>update({label:e.target.value,labelTouched:true})}/></label></>}</>}
 </div>}</article>)}<p className="editor-note"><ShieldCheck size={15}/> Deine URL und Bilder bleiben auf deinem Gerät.</p></section>
 <section className="preview-area" aria-label="Live-Vorschau"><div className="preview-sticky"><div className="preview-blob"/><div className="qr-card">{preview}{previewNotes}</div></div></section></div>

 <section id="exports" className="exports"><h2><ArrowDownToLine size={27}/>Deinen QR-Code speichern</h2><div className="export-grid">{(['png','svg'] as const).map(format=><article className="export-card" key={format}><div className="format-title"><span className="format-icon">{format==='png'?<ImageIcon size={28}/>:<Spline size={28}/>}</span><h3>{format.toUpperCase()}</h3></div><div className="export-actions"><button className="primary" disabled={!svg} onClick={()=>exportQr(format)}><ArrowDownToLine size={21}/>Download</button><button className="secondary" disabled={!svg} onClick={()=>exportQr(format,true)}><Clipboard size={20}/>Kopieren</button></div></article>)}</div></section>
 <footer><div><h2>Von deiner Idee zur passenden Software.</h2><p>Du hast Wünsche für QR Studio oder eine neue Softwareidee? Wir freuen uns über dein Feedback und deine Projektanfrage.</p><a className="feedback-email" href="mailto:fabian.brune@klosebrothers.de?subject=Softwareanfrage%20oder%20Feedback%20zu%20QR%20Studio">fabian.brune@klosebrothers.de</a></div><a className="contact" href="mailto:fabian.brune@klosebrothers.de?subject=Softwareanfrage%20oder%20Feedback%20zu%20QR%20Studio"><Mail size={17}/>Entwickler kontaktieren</a><div className="credit-row"><a className="credit" href="https://klosebrothers.de/" target="_blank" rel="noreferrer"><span className="credit-label">Entwickelt durch die klose brothers GmbH <span aria-hidden="true">↗</span></span></a></div></footer>
 {toast&&<div className="toast" role="status">{toast}<button aria-label="Meldung schließen" onClick={()=>setToast('')}><X size={16}/></button></div>}
 </main>;
}
