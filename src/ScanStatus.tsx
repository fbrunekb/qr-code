import {useEffect,useId,useState} from 'react';
import {Check,CircleAlert,Info} from 'lucide-react';
import {type Settings} from './qr';
import {scanFeedback} from './scanFeedback';

type Props={status:'idle'|'checking'|'ok'|'fail';settings:Settings};
export default function ScanStatus({status,settings}:Props){
 const [open,setOpen]=useState(false),id=useId();
 useEffect(()=>setOpen(false),[status]);
 if(status==='idle')return null;
 if(status==='checking')return <p className="scan-status checking">Scanprüfung läuft …</p>;
 const success=status==='ok';
 return <div className={`scan-feedback ${success?'':'scan-failed'}`} onPointerEnter={e=>{if(e.pointerType==='mouse')setOpen(true);}} onPointerLeave={e=>{if(e.pointerType==='mouse')setOpen(false);}}>
  <button type="button" className="scan-status scan-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
   {success?<Check size={15}/>:<CircleAlert size={15}/>}{success?'Scanprüfung erfolgreich':'Scanprüfung fehlgeschlagen'}<Info size={13} className="scan-info-icon"/>
  </button>
  {open&&<p id={id} className="scan-explanation">{scanFeedback(success,settings)}</p>}
 </div>;
}
