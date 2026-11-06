import {useEffect,useRef,useState} from 'react';
import {HexColorPicker} from 'react-colorful';
import {X} from 'lucide-react';

export default function ColorPicker({title,color,onChange,onClose}:{title:string;color:string;onChange:(color:string)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [hex,setHex]=useState(color);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 useEffect(()=>setHex(color),[color]);
 return <dialog ref={dialog} className="color-dialog" aria-labelledby="color-dialog-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="color-dialog-body"><div className="color-dialog-heading"><h2 id="color-dialog-title">{title}</h2><button className="icon-button" aria-label="Farbauswahl schließen" onClick={onClose}><X size={21}/></button></div><HexColorPicker color={color} onChange={onChange}/><label className="hex-field">Hex-Farbwert<input value={hex} maxLength={7} spellCheck={false} onChange={e=>{setHex(e.target.value);if(/^#[0-9a-f]{6}$/i.test(e.target.value))onChange(e.target.value);}} onBlur={()=>setHex(color)}/><span style={{background:color}}/></label><button className="primary" onClick={onClose}>Übernehmen</button></div></dialog>;
}
