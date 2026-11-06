import {useEffect,useRef,useState} from 'react';
import {HexColorPicker} from 'react-colorful';
import {X} from 'lucide-react';

export default function ColorPicker({title,color,onChange,onClose}:{title:string;color:string;onChange:(color:string)=>void;onClose:()=>void}){
 const picker=useRef<HTMLElement>(null);
 const [hex,setHex]=useState(color);
 useEffect(()=>{const previous=document.activeElement;picker.current?.focus();return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[]);
 useEffect(()=>setHex(color),[color]);
 return <section ref={picker} tabIndex={-1} id="color-picker" className="color-dialog" aria-labelledby="color-dialog-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}><div className="color-dialog-body"><div className="color-dialog-heading"><h2 id="color-dialog-title">{title}</h2><button className="icon-button" aria-label="Farbauswahl schließen" onClick={onClose}><X size={21}/></button></div><HexColorPicker color={color} onChange={onChange}/><label className="hex-field">Hex-Farbwert<input value={hex} maxLength={7} spellCheck={false} onChange={e=>{setHex(e.target.value);if(/^#[0-9a-f]{6}$/i.test(e.target.value))onChange(e.target.value);}} onBlur={()=>setHex(color)}/><span style={{background:color}}/></label><button className="primary" onClick={onClose}>Übernehmen</button></div></section>;
}
