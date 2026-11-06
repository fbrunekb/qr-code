/** Keep a text representation alongside SVG so paste targets can choose either. */
export async function copySvg(svg:string):Promise<'image'|'text'> {
  const clipboard=navigator.clipboard;
  if(clipboard&&typeof ClipboardItem!=='undefined'&&ClipboardItem.supports?.('image/svg+xml')){
    try{
      await clipboard.write([new ClipboardItem({
        'image/svg+xml':new Blob([svg],{type:'image/svg+xml'}),
        'text/plain':new Blob([svg],{type:'text/plain'}),
      })]);
      return 'image';
    }catch{/* Some browsers advertise SVG support but reject it when writing. */}
  }
  if(clipboard){try{await clipboard.writeText(svg);return 'text';}catch{/* Try the selection-based fallback while the document is focused. */}}
  const previous=document.activeElement;
  const field=document.createElement('textarea');field.value=svg;field.readOnly=true;
  field.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
  document.body.append(field);field.select();
  try{if(!document.execCommand('copy'))throw new Error('Kopieren fehlgeschlagen.');return 'text';}
  finally{field.remove();if(previous instanceof HTMLElement)previous.focus();}
}
