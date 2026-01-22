import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';
import { 
  User, LogOut, Upload, FileText, 
  BarChart, Download, Clock, Trash2, 
  Image as ImageIcon, Monitor, Layers, Palette, 
  CheckCircle, RefreshCcw, Sliders, Save, Bookmark, Loader, 
  LayoutTemplate, Move, MousePointer2, Package,
  Type, AlignCenter, Minus, Plus, Eye, X, AlertCircle
} from 'lucide-react';

// === POSIÇÕES PADRÃO ===
const PORTRAIT_POS = { name: { x: 0, y: 220 }, price: { x: 0, y: 450 }, limit: { x: 0, y: 900 }, footer: { x: 0, y: 1000 } };
const LANDSCAPE_POS = { name: { x: 0, y: 220 }, price: { x: 0, y: 350 }, limit: { x: 0, y: 620 }, footer: { x: 0, y: 700 } };

const DEFAULT_DESIGN = {
  size: 'a4', orientation: 'portrait', bannerImage: null, backgroundImage: null, 
  bgColorFallback: '#ffffff', nameColor: '#000000', priceColor: '#cc0000', 
  showOldPrice: true, showSubtitle: true, 
  nameScale: 100, priceScale: 100,
  positions: PORTRAIT_POS
};

const formatDateSafe = (dateStr) => {
  if (!dateStr) return 'Data n/a';
  try { return dateStr.split('-').reverse().join('/'); } catch (e) { return dateStr; }
};

const cleanFileName = (name) => {
  if (!name) return 'cartaz';
  return name.replace(/[^a-z0-9ãõáéíóúç -]/gi, ' ').trim().substring(0, 50) || 'cartaz';
};

// ============================================================================
// 1. COMPONENTE DE CARTAZ
// ============================================================================
const Poster = ({ product, design, width, height, id, isEditable, onUpdatePosition }) => {
  if (!product) return null;
  
  const d = { ...DEFAULT_DESIGN, ...design, positions: { ...(design.orientation === 'portrait' ? PORTRAIT_POS : LANDSCAPE_POS), ...(design?.positions || {}) } };
  const safePrice = product.price ? String(product.price) : '0,00';
  const priceParts = safePrice.includes(',') ? safePrice.split(',') : [safePrice, '00'];
  const H_BANNER = 220; const scName = (Number(d.nameScale) || 100) / 100; const scPrice = (Number(d.priceScale) || 100) / 100;

  const handleMouseDown = (e, key) => {
      if (!isEditable) return;
      e.preventDefault();
      const startX = e.clientX; const startY = e.clientY; const startPos = d.positions[key] || { x: 0, y: 0 };
      const handleMouseMove = (ev) => { onUpdatePosition(key, { x: startPos.x + (ev.clientX - startX) * 3.5, y: startPos.y + (ev.clientY - startY) * 3.5 }); };
      const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
      document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
  };

  const s = {
    container: { width: `${width}px`, height: `${height}px`, backgroundColor: 'white', overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif', userSelect: 'none' },
    bannerBox: { width: '100%', height: `${H_BANNER}px`, position: 'absolute', top: 0, left: 0, backgroundImage: d.bannerImage ? `url(${d.bannerImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10 },
    movable: (key) => ({ position: 'absolute', left: 0, top: 0, transform: `translate(${d.positions[key]?.x || 0}px, ${d.positions[key]?.y || 0}px)`, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isEditable ? 'move' : 'default', border: isEditable ? '2px dashed #3b82f6' : 'none', backgroundColor: isEditable ? 'rgba(59, 130, 246, 0.1)' : 'transparent', zIndex: 20, padding: '5px' }),
    nameText: { fontSize: `${((d.orientation === 'portrait' ? 60 : 50) * scName)}px`, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1', color: d.nameColor, wordBreak: 'break-word', pointerEvents: 'none', paddingLeft:'20px', paddingRight:'20px' },
    subtitleText: { fontSize: `${((d.orientation === 'portrait' ? 30 : 25) * scName)}px`, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', color: '#cc0000', marginTop: '10px', pointerEvents: 'none' },
    priceWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' },
    oldPriceWrapper: { position: 'relative', marginBottom: '-30px', zIndex: 6 },
    oldPriceText: { fontSize: '32px', fontWeight: 'bold', color: '#555' },
    mainPriceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: d.priceColor, lineHeight: 0.80, marginTop: '0px' },
    currency: { fontSize: `${50 * scPrice}px`, fontWeight: 'bold', marginTop: `${55 * scPrice}px`, marginRight: '10px' },
    priceBig: { fontSize: `${(d.orientation === 'portrait' ? 300 : 240) * scPrice}px`, fontWeight: '900', letterSpacing: '-12px', margin: 0, zIndex: 2, lineHeight: 0.85 },
    sideColumn: { display: 'flex', flexDirection: 'column', marginLeft: '10px', marginTop: `${55 * scPrice}px`, alignItems: 'flex-start', gap: `${15 * scPrice}px` },
    cents: { fontSize: `${100 * scPrice}px`, fontWeight: '900', lineHeight: 0.8, marginBottom: '0px' },
    unitBadge: { fontSize: `${30 * scPrice}px`, fontWeight: 'bold', textTransform: 'uppercase', color: '#333', backgroundColor: 'transparent', padding: '0', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' },
    limitContent: { fontSize: '22px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', borderTop: '2px solid #ddd', paddingTop: '5px', paddingLeft: '20px', paddingRight: '20px', backgroundColor:'rgba(255,255,255,0.8)', borderRadius:'8px', pointerEvents: 'none' },
    footerText: { fontSize: '18px', fontWeight: 'bold', color: d.nameColor, textTransform: 'uppercase', pointerEvents: 'none' }
  };

  return (
    <div id={id} style={s.container}>
      <div style={s.bannerBox}>{!d.bannerImage && <div style={{fontSize:'40px', fontWeight:'bold', opacity:0.2, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>BANNER</div>}</div>
      <div style={s.movable('name')} onMouseDown={(e)=>handleMouseDown(e, 'name')}>
          <div style={s.nameText}>{product.name}</div>
          {d.showSubtitle && product.subtitle && <div style={s.subtitleText}>{product.subtitle}</div>}
      </div>
      <div style={s.movable('price')} onMouseDown={(e)=>handleMouseDown(e, 'price')}>
          <div style={s.priceWrapper}>
            {d.showOldPrice && product.oldPrice && <div style={s.oldPriceWrapper}><span style={s.oldPriceText}>De: R$ {product.oldPrice}</span></div>}
            <div style={s.mainPriceRow}><span style={s.currency}>R$</span><span style={s.priceBig}>{priceParts[0]}</span><div style={s.sideColumn}><span style={s.cents}>,{priceParts[1]}</span><div style={s.unitBadge}>{product.unit}</div></div></div>
          </div>
      </div>
      <div style={s.movable('limit')} onMouseDown={(e)=>handleMouseDown(e, 'limit')}>{product.limit && <div style={s.limitContent}>Limite: {product.limit}</div>}</div>
      <div style={s.movable('footer')} onMouseDown={(e)=>handleMouseDown(e, 'footer')}><span style={s.footerText}>{product.date ? product.date : product.footer}</span></div>
    </div>
  );
};

// ============================================================================
// 2. HOOK PRESETS
// ============================================================================
const usePresets = (setDesign) => {
  const [presets, setPresets] = useState([]);
  useEffect(() => { fetchPresets(); }, []);
  const fetchPresets = async () => { try { const { data } = await supabase.from('presets').select('*').order('created_at', { ascending: false }); if (data) setPresets(data); } catch(e){} };
  const savePreset = async (currentDesign) => { const name = prompt("Nome do Ajuste:"); if (!name) return; const { error } = await supabase.from('presets').insert([{ name, data: currentDesign }]); if (!error) { alert("Salvo na nuvem!"); fetchPresets(); } };
  const loadPreset = (p) => setDesign({...DEFAULT_DESIGN, ...p.data}); 
  const deletePreset = async (id, e) => { e.stopPropagation(); if(!confirm("Apagar da nuvem?")) return; const { error } = await supabase.from('presets').delete().eq('id', id); if (!error) fetchPresets(); };
  return { presets, savePreset, loadPreset, deletePreset };
};

// ============================================================================
// 3. FACTORY
// ============================================================================
const PosterFactory = ({ mode, onAdminReady }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', subtitle: 'SUBTITULO', price: '9,99', oldPrice: '13,99', unit: 'KG', limit: '6', date: 'DATA AQUI', footer: '' });
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [editMode, setEditMode] = useState(false);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets(setDesign);
  
  const library = { 
      banners: [ 
        { id: 'b1', file: 'oferta.png', color: '#dc2626' }, 
        { id: 'b2', file: 'saldao.png', color: '#facc15' }, 
        { id: 'b3', file: 'segundaleve.png', color: 'rgb(21, 235, 250)' }, 
        { id: 'b4', file: 'superaçougue.png', color: '#6f3107' }, 
        { id: 'b5', file: 'supersacolão.png', color: 'hsl(122, 83%, 33%)' }, 
        { id: 'b6', file: 'sextou.png', color: 'rgb(250, 196, 21)' }, 
        { id: 'b7', file: 'ofertaclube.png', color: 'hsl(236, 96%, 53%)' }, 
        { id: 'b8', file: 'fechames.png', color: 'hsl(0, 0%, 0%)' },
        { id: 'b9', file: 'dobraoferta.png', color: 'hsl(236, 96%, 53%)' }
      ]
  };

  useEffect(() => { const h = window.innerHeight * 0.85; setPreviewScale(h / (design.orientation === 'portrait' ? 1123 : 794)); }, [design.orientation]);
  useEffect(() => { if (mode === 'admin' && onAdminReady) onAdminReady({ bulkProducts, design }); }, [bulkProducts, design, mode]);

  const handleExcel = (e) => { 
      const f = e.target.files[0]; if(!f) return; 
      const r = new FileReader(); 
      r.onload = (evt) => { 
          const wb = XLSX.read(evt.target.result, { type: 'binary' }); 
          const d = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); 
          const m = d.map(item => ({ 
              name: item['Produto']||'Produto', subtitle: item['Subtitulo']||'', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), 
              oldPrice: item['Preço "DE"'] ? String(item['Preço "DE"']).replace('.', ',') : '', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer 
          })); 
          setBulkProducts(m); 
          if(mode==='local') alert(`${m.length} produtos carregados!`); 
      }; 
      r.readAsBinaryString(f); 
  };

  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (t, i) => { if(t==='banner') setDesign(p=>({...p, bannerImage: i.file ? `/assets/banners/${i.file}` : null})); else setDesign(p=>({...p, backgroundImage: i.file ? `/assets/backgrounds/${i.file}` : null, bgColorFallback: i.color})); };
  const updatePosition = (key, newPos) => { setDesign(prev => ({ ...prev, positions: { ...prev.positions, [key]: newPos } })); };
  const resetPositions = () => { if(confirm("Resetar posições?")) { const defaultPos = design.orientation === 'portrait' ? PORTRAIT_POS : LANDSCAPE_POS; setDesign(d => ({ ...d, positions: defaultPos })); }};
  const changeOrientation = (newOri) => { const defaultPos = newOri === 'portrait' ? PORTRAIT_POS : LANDSCAPE_POS; setDesign({ ...design, orientation: newOri, positions: defaultPos }); };
  const handleDateChange = (newDate) => { setProduct(prev => ({ ...prev, date: newDate })); if (bulkProducts.length > 0) setBulkProducts(prev => prev.map(item => ({ ...item, date: newDate }))); };

  const generateLocalZip = async () => {
      if (bulkProducts.length === 0) return;
      setIsGenerating(true);
      const zip = new JSZip();
      const docUnified = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size });
      try {
          for (let i = 0; i < bulkProducts.length; i++) {
              const p = bulkProducts[i];
              const el = document.getElementById(`local-ghost-${i}`);
              if (el) {
                  const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, scrollY: 0 });
                  const imgData = canvas.toDataURL('image/jpeg', 0.8);
                  const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size });
                  const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
                  pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
                  zip.file(`${cleanFileName(p.name)}.pdf`, pdf.output('blob'));
                  if (i > 0) docUnified.addPage();
                  const uw = docUnified.internal.pageSize.getWidth(); const uh = docUnified.internal.pageSize.getHeight();
                  docUnified.addImage(imgData, 'JPEG', 0, 0, uw, uh);
              }
              await new Promise(r => setTimeout(r, 10));
          }
          zip.file("#ofertaspack.pdf", docUnified.output('blob'));
          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, "CARTAZES-PRONTOS.zip");
      } catch (error) { alert("Erro: " + error.message); }
      setIsGenerating(false);
  };

  const generateSingle = async () => { 
      setIsGenerating(true); 
      const el = document.getElementById('single-ghost'); 
      if(el) { 
          const c = await html2canvas(el, { scale: 2, useCORS: true, scrollY: 0 }); 
          const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size }); 
          const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight(); 
          pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, w, h); 
          pdf.save(`${cleanFileName(product.name)}.pdf`); 
      } 
      setIsGenerating(false); 
  };

  return (
    <div className="flex h-full flex-col md:flex-row bg-slate-50 overflow-hidden font-sans">
        <div className="w-[400px] bg-white h-full flex flex-col border-r border-slate-200 shadow-xl z-20">
            <div className={`p-6 text-white bg-gradient-to-r ${mode==='admin' ? 'from-slate-900 to-slate-800' : 'from-blue-600 to-blue-800'}`}>
                <h2 className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-2"><Sliders size={18}/> {mode==='admin'?'Editor Admin':'Fábrica Própria'}</h2>
            </div>
            <div className="flex border-b bg-slate-50">
                <button onClick={()=>setActiveTab('content')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab==='content'?'text-blue-600 border-b-2 border-blue-600 bg-white':'text-slate-500 hover:bg-slate-100'}`}>1. Dados</button>
                <button onClick={()=>setActiveTab('design')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab==='design'?'text-blue-600 border-b-2 border-blue-600 bg-white':'text-slate-500 hover:bg-slate-100'}`}>2. Visual</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {activeTab === 'content' ? (
                    <div className="space-y-5">
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl text-center">
                            <h3 className="text-blue-900 font-bold text-sm mb-3">GERAÇÃO EM MASSA</h3>
                            <label className="block w-full py-3 bg-white border-2 border-dashed border-blue-300 text-blue-600 rounded-lg cursor-pointer text-xs font-bold uppercase hover:bg-blue-50 hover:border-blue-500 transition-all mb-3"><Upload className="inline w-4 h-4 mr-2"/> Carregar Planilha<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>
                            {mode === 'local' && bulkProducts.length > 0 && (
                                <button onClick={generateLocalZip} disabled={isGenerating} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold uppercase hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                    {isGenerating ? <Loader className="animate-spin" size={16}/> : <Package size={16}/>} {isGenerating ? `Gerando ZIP...` : `Baixar ZIP (${bulkProducts.length})`}
                                </button>
                            )}
                            {mode === 'admin' && bulkProducts.length > 0 && <p className="text-xs text-green-700 font-bold flex items-center justify-center gap-1"><CheckCircle size={12}/> {bulkProducts.length} produtos carregados</p>}
                        </div>
                        <div className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400">PRODUTO ÚNICO</span><div className="border-t border-slate-200"></div></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Produto</label><textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"/></div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Subtítulo (Vermelho)</label>
                                <label className="flex items-center gap-2 cursor-pointer text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                                    <input type="checkbox" checked={design.showSubtitle} onChange={e=>setDesign({...design, showSubtitle:e.target.checked})} className="hidden"/> {design.showSubtitle ? 'Ocultar' : 'Mostrar'}
                                </label>
                            </div>
                            {design.showSubtitle && <input type="text" value={product.subtitle} onChange={e=>setProduct({...product, subtitle:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none placeholder-red-200" placeholder="Ex: Pote 200g"/>}
                        </div>

                        <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Preço (R$)</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-xl text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"/></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none">{['Un','Kg','100g','Pack','Cx'].map(u=><option key={u}>{u}</option>)}</select></div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm"/></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Validade/Rodapé</label><input type="text" value={product.date} onChange={e=>handleDateChange(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm"/></div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200"><input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})} className="w-5 h-5 text-blue-600 rounded"/><div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase block">Mostrar Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm font-bold text-slate-700" placeholder="Ex: 10,99"/></div></div>
                        {mode === 'local' && (<button onClick={generateSingle} disabled={isGenerating} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4">{isGenerating ? <Loader className="animate-spin"/> : <><Download size={18}/> BAIXAR CARTAZ (PDF)</>}</button>)}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100 shadow-sm">
                             <div className="flex justify-between items-center border-b border-purple-200 pb-2 mb-2"><div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase"><Bookmark size={14}/> Meus Presets (Nuvem)</div>
                             {mode === 'admin' && (
                                 <div className="flex gap-2">
                                     <button onClick={()=>savePreset(design)} className="text-[10px] bg-purple-600 text-white px-3 py-1 rounded font-bold hover:bg-purple-700 flex items-center gap-1"><Save size={10}/> SALVAR</button>
                                     <button onClick={resetPositions} className="text-[10px] bg-gray-400 text-white px-3 py-1 rounded font-bold hover:bg-gray-500 flex items-center gap-1"><RefreshCcw size={10}/> RESET</button>
                                 </div>
                             )}
                             </div>
                             {presets.length > 0 ? (<div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">{presets.map((p,i)=>(<div key={i} onClick={()=>loadPreset(p)} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 hover:bg-purple-100 cursor-pointer group"><span className="text-xs font-bold text-slate-700">{p.name}</span>
                             {mode === 'admin' && <button onClick={(e)=>deletePreset(p.id,e)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={12}/></button>}
                             </div>))}</div>) : <p className="text-xs text-purple-400 italic text-center">Nenhum preset salvo na nuvem.</p>}
                        </div>
                        <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${editMode ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`} onClick={() => setEditMode(!editMode)}>
                            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${editMode ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{editMode ? <Move size={20}/> : <MousePointer2 size={20}/>}</div><div><h4 className={`font-bold text-sm ${editMode ? 'text-blue-700' : 'text-slate-600'}`}>Mover Itens (Drag & Drop)</h4><p className="text-[10px] text-slate-400">Clique e arraste Nome, Preço e Limite</p></div></div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${editMode ? 'bg-blue-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editMode ? 'translate-x-6' : 'translate-x-0'}`}></div></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Formato</label><div className="flex gap-2"><button onClick={()=>changeOrientation('portrait')} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='portrait'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 hover:bg-slate-100'}`}>VERTICAL</button><button onClick={()=>changeOrientation('landscape')} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='landscape'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 hover:bg-slate-100'}`}>HORIZONTAL</button></div></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Banners</label><div className="grid grid-cols-3 gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className={`h-10 rounded-md cursor-pointer border-2 transition-all ${design.bannerImage?.includes(b.file)?'border-blue-600 shadow-md scale-105':'border-transparent hover:border-slate-300'}`} style={{background:b.color, backgroundImage: `url(/assets/banners/${b.file})`, backgroundSize:'100% 100%'}}></div>)}<label className="h-10 bg-slate-100 border-2 border-dashed border-slate-300 rounded-md cursor-pointer flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 transition-colors"><Upload size={16}/><input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor do Nome</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-slate-200"/></div><div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor do Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-slate-200"/></div></div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4"><h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Sliders size={14}/> Tamanhos (Escala)</h3><div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Nome</label><span className="text-[10px] font-bold text-blue-600">{design.nameScale}%</span></div><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div><div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Preço</label><span className="text-[10px] font-bold text-blue-600">{design.priceScale}%</span></div><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div></div>
                    </div>
                )}
            </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-200 overflow-hidden relative"><div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}><Poster product={mode==='local' && bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} isEditable={editMode} onUpdatePosition={updatePosition}/></div></div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>{bulkProducts.map((p, i) => (<Poster key={i} id={`local-ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />))}<Poster id="single-ghost" product={product} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} /></div>
    </div>
  );
};

// ============================================================================
// 4. ADMIN DASHBOARD
// ============================================================================
const AdminDashboard = ({ onLogout }) => {
  const [allDownloads, setAllDownloads] = useState([]);
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [factoryData, setFactoryData] = useState({ bulkProducts: [], design: DEFAULT_DESIGN });
  
  // ESTADO PARA O MODAL DE DETALHES
  const [selectedDetail, setSelectedDetail] = useState(null);

  const STORES = ['loja01', 'loja02', 'loja03', 'loja04', 'loja05'];

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { 
      try { 
          const { data: f } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false }); 
          if(f) setFiles(f); 
          const { data: d } = await supabase.from('downloads').select('*'); 
          if(d) setAllDownloads(d);
      } catch(e){} 
  };
  
  const handleDelete = async (id) => { if(confirm("Apagar encarte?")) { await supabase.from('shared_files').delete().eq('id', id); fetchData(); }};

  // CHECK SE LOJA BAIXOU ARQUIVO
  const checkDownload = (store, fileId) => {
      // Procura se existe algum download para este arquivo que contenha o nome da loja no email
      return allDownloads.some(d => d.file_id === fileId && d.store_email.includes(store));
  };

  const send = async () => {
      if(!title || !expiry || factoryData.bulkProducts.length === 0) return alert("Faltam dados!");
      setProcessing(true); setProgress(0);
      const zip = new JSZip();
      const docUnified = new jsPDF({ orientation: factoryData.design.orientation, unit: 'mm', format: factoryData.design.size });

      try {
          const { bulkProducts, design } = factoryData;
          for(let i=0; i<bulkProducts.length; i++) {
              const el = document.getElementById(`admin-ghost-${i}`);
              if(el) { 
                  const c = await html2canvas(el, {scale: 1.5, useCORS:true, scrollY: 0}); 
                  const imgData = c.toDataURL('image/jpeg', 0.8);
                  const pdf = new jsPDF({unit:'mm', format: design.size, orientation: design.orientation});
                  const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
                  pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
                  zip.file(`${cleanFileName(bulkProducts[i].name)}.pdf`, pdf.output('blob'));
                  if (i > 0) docUnified.addPage();
                  const uw = docUnified.internal.pageSize.getWidth(); const uh = docUnified.internal.pageSize.getHeight();
                  docUnified.addImage(imgData, 'JPEG', 0, 0, uw, uh);
              }
              setProgress(Math.round(((i+1)/bulkProducts.length)*100));
              await new Promise(r=>setTimeout(r,10));
          }
          zip.file("#ofertaspack.pdf", docUnified.output('blob'));
          const zipContent = await zip.generateAsync({type:"blob"});
          const safeTitle = title.replace(/[^a-z0-9ãõáéíóúç -]/gi, '_').trim() || `Campanha_${Date.now()}`;
          const fileName = `${safeTitle}.zip`; 
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, zipContent, { contentType: 'application/zip' });
          if(upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          await supabase.from('shared_files').insert([{ title, expiry_date: expiry, file_url: publicUrl, products_json: bulkProducts, design_json: design }]);
          alert("Pacote ZIP enviado com sucesso!"); setTitle(''); setExpiry(''); fetchData();
      } catch(e) { alert("Erro: "+e.message); }
      setProcessing(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans relative">
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
            <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-3"><Monitor className="text-blue-400"/> PAINEL ADMIN</h1>
            <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-lg font-bold flex items-center gap-2"><LogOut size={14}/> Sair</button>
        </div>

        {/* MODAL DE DETALHES DE ENTREGA */}
        {selectedDetail && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 p-4 flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2"><BarChart size={16} className="text-blue-400"/> Status de Entrega</h3>
                        <button onClick={()=>setSelectedDetail(null)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        <h4 className="font-bold text-slate-800 text-lg mb-6 leading-tight border-b pb-4">{selectedDetail.title}</h4>
                        <div className="space-y-3">
                            {STORES.map((store, index) => {
                                const isDownloaded = checkDownload(store, selectedDetail.id);
                                return (
                                    <div key={index} className={`flex justify-between items-center p-3 rounded-lg border ${isDownloaded ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDownloaded ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{index + 1}</div>
                                            <span className={`font-bold uppercase ${isDownloaded ? 'text-green-800' : 'text-slate-400'}`}>{store}</span>
                                        </div>
                                        {isDownloaded ? 
                                            <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Recebido</span> : 
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock size={14}/> Pendente</span>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 h-full flex flex-col border-r bg-white relative">
                <div className="p-6 bg-white border-b flex gap-3 items-end shadow-sm z-30">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título da Campanha</label>
                        <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Ofertas de Verão"/>
                    </div>
                    <div className="w-36">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Validade</label>
                        <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                    </div>
                    <button onClick={send} disabled={processing} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 shadow-lg hover:shadow-xl transition-all flex items-center gap-2">{processing?`Gerando...`:<><Upload size={18}/> PUBLICAR</>}</button>
                </div>
                <div className="flex-1 overflow-hidden relative"><PosterFactory mode="admin" onAdminReady={setFactoryData} /></div>
            </div>
            
            {/* PAINEL DIREITO: LISTA DE ENCARTES */}
            <div className="w-1/2 h-full bg-slate-50 p-8 overflow-y-auto">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-lg"><Layers className="text-purple-500"/> Campanhas Ativas</h3>
                    <div className="space-y-3">
                        {files.length === 0 ? <p className="text-slate-400 text-center py-10">Nenhuma campanha ativa.</p> : files.map(f => (
                            <div key={f.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group">
                                <div 
                                    className="flex-1 cursor-pointer" 
                                    onClick={() => setSelectedDetail(f)} // ABRE O MODAL AO CLICAR
                                >
                                    <h4 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                        {f.title} <Eye size={14} className="text-slate-300 group-hover:text-blue-400"/>
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock size={12}/> Vence: {formatDateSafe(f.expiry_date)}</p>
                                </div>
                                <button onClick={()=>handleDelete(f.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>{factoryData.bulkProducts.map((p,i)=><Poster key={i} id={`admin-ghost-${i}`} product={p} design={factoryData.design} width={factoryData.design.orientation==='portrait'?794:1123} height={factoryData.design.orientation==='portrait'?1123:794} />)}</div>
    </div>
  );
};

// ============================================================================
// 5. LOJA LAYOUT
// ============================================================================
const StoreLayout = ({ user, onLogout }) => {
  const [view, setView] = useState('files');
  const [files, setFiles] = useState([]);

  useEffect(() => { loadFiles(); }, []);
  const loadFiles = async () => { try { const today = new Date().toISOString().split('T')[0]; const { data } = await supabase.from('shared_files').select('*').gte('expiry_date', today).order('created_at', {ascending: false}); if(data) setFiles(data); } catch(e) {} };
  const registerDownload = async (fileId) => { try { await supabase.from('downloads').insert([{ store_email: user.email, file_id: fileId }]); } catch(e){} };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
        <div className="w-24 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center py-8 text-white z-50 shadow-2xl">
            <div className="mb-10 p-3 bg-white/10 rounded-2xl backdrop-blur-sm"><ImageIcon className="text-white w-8 h-8"/></div>
            <div className="space-y-6 flex flex-col w-full px-4">
                <button onClick={()=>setView('files')} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='files'?'bg-blue-600 shadow-lg shadow-blue-900/50 scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}><LayoutTemplate size={24}/><span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Matriz</span></button>
                <button onClick={()=>setView('factory')} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='factory'?'bg-blue-600 shadow-lg shadow-blue-900/50 scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}><Layers size={24}/><span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Fábrica</span></button>
            </div>
            <div className="mt-auto px-4 w-full"><button onClick={onLogout} className="p-4 w-full flex justify-center hover:bg-red-600/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all"><LogOut size={24}/></button></div>
        </div>
        <div className="flex-1 overflow-hidden relative">
            {view === 'files' && (
                <div className="p-10 h-full overflow-y-auto">
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-8 flex gap-3 items-center"><LayoutTemplate className="text-blue-600"/> Encartes da Matriz</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {files.length > 0 ? files.map(f=>(
                            <div key={f.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group hover:-translate-y-1">
                                <div className="flex justify-between mb-6"><div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500"><FileText size={20}/></div><span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-500 h-fit">Vence: {formatDateSafe(f.expiry_date)}</span></div>
                                <h3 className="font-bold text-xl text-slate-800 mb-6 line-clamp-2 h-14">{f.title}</h3>
                                <a href={f.file_url} target="_blank" onClick={()=>registerDownload(f.id)} className="block w-full py-4 bg-slate-900 text-white font-bold rounded-xl text-center hover:bg-blue-600 shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 group-hover:scale-105"><Download size={20}/> Baixar PACOTE (ZIP)</a>
                            </div>
                        )) : (<div className="col-span-3 flex flex-col items-center justify-center h-64 text-slate-400"><FileText size={48} className="mb-4 opacity-20"/><p>Nenhum encarte disponível no momento.</p></div>)}
                    </div>
                </div>
            )}
            {view === 'factory' && <PosterFactory mode="local" />}
        </div>
    </div>
  );
};

// ============================================================================
// 6. LOGIN & APP (CORREÇÃO DE LOGOUT)
// ============================================================================
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  const handleLogin = async (e) => { e.preventDefault(); setLoading(true); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if(error) { alert("Erro: "+error.message); setLoading(false); } else { setTimeout(() => onLogin(data.session), 500); } };
  return (<div className={`h-screen w-screen bg-gradient-to-br from-blue-900 via-slate-900 to-red-900 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden`}><div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div><div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl flex flex-col items-center relative z-10"><img src="/assets/logo-full.png" alt="Cartaz No Ponto" className="w-48 mb-8 drop-shadow-xl"/><h2 className="text-2xl font-bold text-white mb-2">Bem-vindo</h2><p className="text-blue-200 text-sm mb-8">Acesse sua central de criação</p><form onSubmit={handleLogin} className="w-full space-y-5"><div className="space-y-1"><label className="text-xs font-bold text-blue-100 uppercase ml-1">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:bg-black/40 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all" placeholder="seu@email.com"/></div><div className="space-y-1"><label className="text-xs font-bold text-blue-100 uppercase ml-1">Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:bg-black/40 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all" placeholder="••••••••"/></div><button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-red-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1 transition-all disabled:opacity-50 mt-4">{loading ? <Loader className="animate-spin mx-auto"/> : 'ENTRAR NO SISTEMA'}</button></form></div><p className="mt-8 text-white/20 text-xs">© 2026 Cartaz No Ponto. Todos os direitos reservados.</p></div>);
};

const App = () => {
  const [session, setSession] = useState(null);
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setSession(session)); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session)); return () => subscription.unsubscribe(); }, []);
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };
  if (!session) return <LoginScreen onLogin={(s) => setSession(s)} />;
  if (session.user.email.includes('admin')) return <AdminDashboard onLogout={handleLogout} />;
  return <StoreLayout user={session.user} onLogout={handleLogout} />;
};

export default App;