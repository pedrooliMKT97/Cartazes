import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { 
  User, LogOut, Upload, FileText, 
  BarChart, Download, Clock, Trash2, 
  Image as ImageIcon, Monitor, Layers, Palette, 
  CheckCircle, RefreshCcw, X, Sliders, Save, Bookmark, Loader, LayoutTemplate, AlertTriangle
} from 'lucide-react';

// === CONFIGURAÇÃO PADRÃO ===
const DEFAULT_DESIGN = {
  size: 'a4', orientation: 'portrait', bannerImage: null, backgroundImage: null, 
  bgColorFallback: '#ffffff', nameColor: '#000000', priceColor: '#cc0000', showOldPrice: true, 
  nameScale: 100, priceScale: 100, priceY: 0
};

const formatDateSafe = (dateStr) => {
  if (!dateStr) return 'Data n/a';
  try { return dateStr.split('-').reverse().join('/'); } catch (e) { return dateStr; }
};

// ============================================================================
// 1. COMPONENTE DE CARTAZ
// ============================================================================
const Poster = ({ product, design, width, height, id }) => {
  if (!product) return null;
  const d = { ...DEFAULT_DESIGN, ...design }; 

  const safePrice = product.price ? String(product.price) : '0,00';
  const priceParts = safePrice.includes(',') ? safePrice.split(',') : [safePrice, '00'];
  
  const H_BANNER = 220; const H_FOOTER = 60;
  const H_MIOLO = height - H_BANNER - H_FOOTER;
  const H_NOME = H_MIOLO * 0.20;
  const H_PRECO = H_MIOLO * 0.65;
  const H_LIMITE = H_MIOLO * 0.15;

  // Cálculos de escala
  const scName = (Number(d.nameScale) || 100) / 100;
  const scPrice = (Number(d.priceScale) || 100) / 100;
  const posY = Number(d.priceY) || 0;

  const s = {
    container: { width: `${width}px`, height: `${height}px`, backgroundImage: d.backgroundImage ? `url(${d.backgroundImage})` : 'none', background: d.backgroundImage ? `url(${d.backgroundImage}) center/cover no-repeat` : d.bgColorFallback, backgroundColor: 'white', overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif' },
    bannerBox: { width: '100%', height: `${H_BANNER}px`, position: 'absolute', top: 0, left: 0, backgroundImage: d.bannerImage ? `url(${d.bannerImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10 },
    nameBox: { width: '100%', height: `${H_NOME}px`, position: 'absolute', top: `${H_BANNER}px`, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px', zIndex: 5 },
    nameText: { fontSize: `${((d.orientation === 'portrait' ? 60 : 50) * scName)}px`, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1', color: d.nameColor, wordBreak: 'break-word' },
    priceBox: { width: '100%', height: `${H_PRECO}px`, position: 'absolute', top: `${H_BANNER + H_NOME + posY}px`, left: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
    oldPriceWrapper: { position: 'relative', marginBottom: '-10px', zIndex: 6 },
    oldPriceText: { fontSize: '32px', fontWeight: 'bold', color: '#555' },
    mainPriceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: d.priceColor, lineHeight: 0.80, marginTop: '10px' },
    currency: { fontSize: `${50 * scPrice}px`, fontWeight: 'bold', marginTop: `${55 * scPrice}px`, marginRight: '10px' },
    priceBig: { fontSize: `${(d.orientation === 'portrait' ? 300 : 240) * scPrice}px`, fontWeight: '900', letterSpacing: '-12px', margin: 0, zIndex: 2, lineHeight: 0.85 },
    sideColumn: { display: 'flex', flexDirection: 'column', marginLeft: '10px', marginTop: `${55 * scPrice}px`, alignItems: 'flex-start', gap: `${15 * scPrice}px` },
    cents: { fontSize: `${100 * scPrice}px`, fontWeight: '900', lineHeight: 0.8, marginBottom: '0px' },
    unitBadge: { fontSize: `${30 * scPrice}px`, fontWeight: 'bold', textTransform: 'uppercase', color: '#333', backgroundColor: 'transparent', padding: '0', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' },
    limitBox: { width: '100%', height: `${H_LIMITE}px`, position: 'absolute', top: `${H_BANNER + H_NOME + H_PRECO}px`, left: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' },
    limitContent: { fontSize: '22px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', borderTop: '2px solid #ddd', paddingTop: '5px', paddingLeft: '20px', paddingRight: '20px' },
    footerBox: { width: '100%', height: `${H_FOOTER}px`, position: 'absolute', bottom: 0, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(0,0,0,0.1)', zIndex: 20 },
    footerText: { fontSize: '18px', fontWeight: 'bold', color: d.nameColor, textTransform: 'uppercase' }
  };

  return (
    <div id={id} style={s.container}>
      <div style={s.bannerBox}>{!d.bannerImage && <div style={{fontSize:'40px', fontWeight:'bold', opacity:0.2, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>BANNER</div>}</div>
      <div style={s.nameBox}><div style={s.nameText}>{product.name}</div></div>
      <div style={s.priceBox}>
        {d.showOldPrice && product.oldPrice && <div style={s.oldPriceWrapper}><span style={s.oldPriceText}>De: R$ {product.oldPrice}</span></div>}
        <div style={s.mainPriceRow}>
          <span style={s.currency}>R$</span><span style={s.priceBig}>{priceParts[0]}</span>
          <div style={s.sideColumn}><span style={s.cents}>,{priceParts[1]}</span><div style={s.unitBadge}>{product.unit}</div></div>
        </div>
      </div>
      <div style={s.limitBox}>{product.limit && <div style={s.limitContent}>Limite: {product.limit}</div>}</div>
      <div style={s.footerBox}><span style={s.footerText}>{product.date ? product.date : product.footer}</span></div>
    </div>
  );
};

// ============================================================================
// 2. HOOK PRESETS
// ============================================================================
const usePresets = (setDesign) => {
  const [presets, setPresets] = useState([]);
  useEffect(() => {
    try { const saved = localStorage.getItem('poster_presets'); if (saved) setPresets(JSON.parse(saved)); } catch (e) {}
  }, []);
  const savePreset = (current) => {
    const name = prompt("Nome do Ajuste (ex: Padrão Oferta):");
    if (!name) return;
    const novos = [...presets, { name, data: current }];
    setPresets(novos); localStorage.setItem('poster_presets', JSON.stringify(novos));
  };
  const loadPreset = (p) => setDesign({...DEFAULT_DESIGN, ...p.data});
  const deletePreset = (idx, e) => {
    e.stopPropagation(); if(!confirm("Apagar?")) return;
    const novos = presets.filter((_, i) => i !== idx);
    setPresets(novos); localStorage.setItem('poster_presets', JSON.stringify(novos));
  };
  return { presets, savePreset, loadPreset, deletePreset };
};

// ============================================================================
// 3. FACTORY (V34 - OTIMIZADA)
// ============================================================================
const PosterFactory = ({ mode, onAdminReady }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', price: '9,99', oldPrice: '', unit: 'UN', limit: '', date: '', footer: '' });
  const [design, setDesign] = useState(DEFAULT_DESIGN);
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
      ], 
      backgrounds: [ 
          { id: 'bg1', file: 'vermelho.png', color: 'linear-gradient(to bottom, #ef4444, #991b1b)' }, 
          { id: 'bg2', file: 'amarelo.png', color: 'linear-gradient(to bottom, #fde047, #ca8a04)' } 
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
          const m = d.map(item => ({ name: item['Produto']||'Produto', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: item['Preço "DE"']?String(item['Preço "DE"']):'', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer })); 
          setBulkProducts(m); 
          if(mode==='local') alert(`${m.length} produtos carregados!`); 
      }; 
      r.readAsBinaryString(f); 
  };

  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (t, i) => { if(t==='banner') setDesign(p=>({...p, bannerImage: i.file ? `/assets/banners/${i.file}` : null})); else setDesign(p=>({...p, backgroundImage: i.file ? `/assets/backgrounds/${i.file}` : null, bgColorFallback: i.color})); };
  
  // Geração em Lote OTIMIZADA (V34)
  const generateLocal = async () => { 
      if (bulkProducts.length === 0) return; 
      setIsGenerating(true); 
      const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size }); 
      const w = pdf.internal.pageSize.getWidth(); 
      const h = pdf.internal.pageSize.getHeight(); 
      
      for (let i = 0; i < bulkProducts.length; i++) { 
          const el = document.getElementById(`local-ghost-${i}`); 
          if(el) { 
              // Otimização: scale 1.5 e JPEG reduzem drasticamente o tamanho
              const c = await html2canvas(el, { scale: 1.5, useCORS: true }); 
              if(i>0) pdf.addPage(); 
              pdf.addImage(c.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, w, h); 
          } 
          await new Promise(r => setTimeout(r, 10)); // Pausa menor
      } 
      pdf.save('MEUS-CARTAZES.pdf'); 
      setIsGenerating(false); 
  };

  // Geração Unitária
  const generateSingle = async () => {
      setIsGenerating(true);
      const el = document.getElementById('single-ghost'); 
      if(el) {
          const c = await html2canvas(el, { scale: 2, useCORS: true });
          const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size });
          const w = pdf.internal.pageSize.getWidth(); 
          const h = pdf.internal.pageSize.getHeight();
          pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, w, h);
          pdf.save(`CARTAZ-${product.name.substring(0,10)}.pdf`);
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
                            {mode === 'local' && bulkProducts.length > 0 && (<button onClick={generateLocal} disabled={isGenerating} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold uppercase hover:shadow-lg transition-all">{isGenerating ? `Gerando...` : `Baixar Todos (${bulkProducts.length})`}</button>)}
                            {mode === 'admin' && bulkProducts.length > 0 && <p className="text-xs text-green-700 font-bold flex items-center justify-center gap-1"><CheckCircle size={12}/> {bulkProducts.length} produtos carregados</p>}
                        </div>
                        
                        <div className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400">PRODUTO ÚNICO</span><div className="border-t border-slate-200"></div></div>

                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Produto</label><textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Preço (R$)</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-xl text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none">{['Un','Kg','100g','Pack','Cx'].map(u=><option key={u}>{u}</option>)}</select></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm"/></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Validade/Rodapé</label><input type="text" value={product.date} onChange={e=>setProduct({...product, date:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm"/></div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})} className="w-5 h-5 text-blue-600 rounded"/>
                            <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase block">Mostrar Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm font-bold text-slate-700" placeholder="Ex: 10,99"/></div>
                        </div>
                        
                        {mode === 'local' && (
                            <button onClick={generateSingle} disabled={isGenerating} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4">
                                {isGenerating ? <Loader className="animate-spin"/> : <><Download size={18}/> BAIXAR CARTAZ (PDF)</>}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                             <div className="flex items-center gap-2 text-purple-800 font-bold text-xs"><Bookmark size={14}/> <span>PRESETS</span></div>
                             <div className="flex gap-2">
                                {presets.length > 0 && (<div className="relative group"><button className="text-xs bg-white text-purple-700 px-3 py-1.5 rounded shadow font-bold hover:bg-purple-100">Carregar</button><div className="absolute right-0 top-full mt-2 bg-white shadow-xl border rounded-lg hidden group-hover:block w-48 z-20 p-2 space-y-1">{presets.map((p,i)=><div key={i} onClick={()=>loadPreset(p)} className="p-2 hover:bg-slate-50 text-xs flex justify-between cursor-pointer rounded"><span>{p.name}</span><span onClick={(e)=>deletePreset(i,e)} className="text-red-500 font-bold px-2 hover:bg-red-50 rounded">×</span></div>)}</div></div>)}
                                <button onClick={()=>savePreset(design)} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded shadow font-bold hover:bg-purple-700">Salvar</button>
                             </div>
                        </div>

                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Formato</label><div className="flex gap-2"><button onClick={()=>setDesign({...design, orientation:'portrait'})} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='portrait'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 hover:bg-slate-50'}`}>VERTICAL</button><button onClick={()=>setDesign({...design, orientation:'landscape'})} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='landscape'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 hover:bg-slate-50'}`}>HORIZONTAL</button></div></div>

                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Banners</label><div className="grid grid-cols-3 gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className={`h-10 rounded-md cursor-pointer border-2 transition-all ${design.bannerImage?.includes(b.file)?'border-blue-600 shadow-md scale-105':'border-transparent hover:border-slate-300'}`} style={{background:b.color, backgroundImage: `url(/assets/banners/${b.file})`, backgroundSize:'cover'}}></div>)}<label className="h-10 bg-slate-100 border-2 border-dashed border-slate-300 rounded-md cursor-pointer flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 transition-colors"><Upload size={16}/><input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div></div>

                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Fundos</label><div className="grid grid-cols-4 gap-2">{library.backgrounds.map(b=><div key={b.id} onClick={()=>selectLib('bg', b)} className={`h-10 rounded-md cursor-pointer border-2 transition-all ${design.backgroundImage?.includes(b.file)?'border-blue-600 shadow-md scale-105':'border-transparent hover:border-slate-300'}`} style={{background:b.color}}></div>)}<label className="h-10 bg-slate-100 border-2 border-dashed border-slate-300 rounded-md cursor-pointer flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 transition-colors"><Upload size={16}/><input type="file" className="hidden" onChange={e=>handleFileUpload(e,'backgroundImage')}/></label></div></div>

                        <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor do Nome</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-slate-200"/></div><div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor do Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-slate-200"/></div></div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Sliders size={14}/> Ajuste Fino</h3>
                            <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Nome</label><span className="text-[10px] font-bold text-blue-600">{design.nameScale}%</span></div><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div>
                            <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Preço</label><span className="text-[10px] font-bold text-blue-600">{design.priceScale}%</span></div><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div>
                            <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Posição Vertical</label><span className="text-[10px] font-bold text-blue-600">{design.priceY}px</span></div><input type="range" min="-100" max="100" value={design.priceY} onChange={e=>setDesign({...design, priceY: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-200 overflow-hidden relative">
            <div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}><Poster product={mode==='local' && bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} /></div>
        </div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>
            {bulkProducts.map((p, i) => (<Poster key={i} id={`local-ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />))}
            <Poster id="single-ghost" product={product} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />
        </div>
    </div>
  );
};

// ============================================================================
// 4. ADMIN DASHBOARD MODERNIZADO (V34 - OTIMIZADO)
// ============================================================================
const AdminDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState({});
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [factoryData, setFactoryData] = useState({ bulkProducts: [], design: DEFAULT_DESIGN });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { try { const { data: f } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false }); if(f) setFiles(f); const { data: d } = await supabase.from('downloads').select('*'); if(d) { const c = {}; d.forEach(x => { const n = x.store_email.split('@')[0]; c[n] = (c[n]||0)+1; }); setStats(c); } } catch(e){} };
  
  const handleDelete = async (id) => { await supabase.from('shared_files').delete().eq('id', id); fetchData(); };
  const resetDownloads = async () => { if(confirm("Zerar?")) { await supabase.from('downloads').delete().neq('id', 0); fetchData(); }};

  const send = async () => {
      // 1. Verificações iniciais
      if(!title || !expiry || factoryData.bulkProducts.length === 0) return alert("Faltam dados! Carregue o Excel e preencha título/data.");
      
      setProcessing(true); setProgress(0);
      
      try {
          const { bulkProducts, design } = factoryData;
          
          // 2. Gerar PDF OTIMIZADO (JPEG + Scale menor)
          const pdf = new jsPDF({unit:'mm', format: design.size, orientation: design.orientation});
          const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
          
          for(let i=0; i<bulkProducts.length; i++) {
              const el = document.getElementById(`admin-ghost-${i}`);
              if(el) { 
                  // TRUQUE DE OTIMIZAÇÃO: Scale 1.5 e JPEG Quality 0.8
                  const c = await html2canvas(el, {scale: 1.5, useCORS:true}); 
                  if(i>0) pdf.addPage(); 
                  pdf.addImage(c.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, w, h); 
              }
              setProgress(Math.round(((i+1)/bulkProducts.length)*100));
              await new Promise(r=>setTimeout(r,10));
          }

          const fileName = `${Date.now()}-ENCARTE.pdf`;
          
          // 3. Upload do PDF
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, pdf.output('blob'), { contentType: 'application/pdf' });
          if(upErr) throw upErr;
          
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          
          // 4. Salvar no Banco (Com proteção de tamanho)
          try {
              await supabase.from('shared_files').insert([{ 
                  title, 
                  expiry_date: expiry, 
                  file_url: publicUrl, 
                  products_json: bulkProducts, 
                  design_json: design 
              }]);
              alert("Enviado com sucesso!"); 
              setTitle(''); setExpiry(''); fetchData();
          } catch (dbError) {
              // Se der erro no banco (provavelmente JSON muito grande), tenta salvar SÓ O PDF
              if (confirm("O arquivo de dados é muito grande para salvar a edição. Deseja salvar APENAS o PDF para download?")) {
                   await supabase.from('shared_files').insert([{ 
                      title, 
                      expiry_date: expiry, 
                      file_url: publicUrl, 
                      products_json: [], // Salva vazio para não travar
                      design_json: design 
                  }]);
                  alert("PDF Salvo (Sem edição disponível para este item).");
                  setTitle(''); setExpiry(''); fetchData();
              }
          }

      } catch(e) { alert("Erro fatal: "+e.message); }
      setProcessing(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
            <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-3"><Monitor className="text-blue-400"/> PAINEL ADMIN</h1>
            <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-lg font-bold flex items-center gap-2"><LogOut size={14}/> Sair</button>
        </div>
        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 h-full flex flex-col border-r bg-white relative">
                <div className="p-6 bg-white border-b flex gap-3 items-end shadow-sm z-30">
                    <div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título da Campanha</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Ofertas de Verão"/></div>
                    <div className="w-36"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Validade</label><input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                    <button onClick={send} disabled={processing} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 shadow-lg hover:shadow-xl transition-all flex items-center gap-2">{processing?`Enviando ${progress}%`:<><Upload size={18}/> PUBLICAR</>}</button>
                </div>
                <div className="flex-1 overflow-hidden relative"><PosterFactory mode="admin" onAdminReady={setFactoryData} /></div>
            </div>
            <div className="w-1/2 h-full bg-slate-50 p-8 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 flex items-center gap-2"><BarChart className="text-blue-500"/> Downloads por Loja</h3><button onClick={resetDownloads} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"><RefreshCcw size={10}/> ZERAR</button></div>
                        <div className="space-y-2">{['loja01','loja02','loja03','loja04','loja05'].map(s=><div key={s} className="flex justify-between text-sm p-3 bg-slate-50 rounded-lg border border-slate-100"> <span className="font-bold text-slate-600 uppercase">{s}</span> <span className="font-bold text-blue-600 bg-blue-50 px-2 rounded">{stats[s]||0}</span> </div>)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Clock className="text-purple-500"/> Encartes Ativos</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">{files.map(f=><div key={f.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 group"><div><p className="font-bold text-slate-800">{f.title}</p><p className="text-xs text-slate-400">Vence: {formatDateSafe(f.expiry_date)}</p></div><button onClick={()=>handleDelete(f.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div>)}</div>
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
        {/* SIDEBAR MODERNA */}
        <div className="w-24 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center py-8 text-white z-50 shadow-2xl">
            <div className="mb-10 p-3 bg-white/10 rounded-2xl backdrop-blur-sm"><ImageIcon className="text-white w-8 h-8"/></div>
            
            <div className="space-y-6 flex flex-col w-full px-4">
                <button onClick={()=>setView('files')} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='files'?'bg-blue-600 shadow-lg shadow-blue-900/50 scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <LayoutTemplate size={24}/>
                    <span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Matriz</span>
                </button>
                <button onClick={()=>setView('factory')} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='factory'?'bg-blue-600 shadow-lg shadow-blue-900/50 scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <Layers size={24}/>
                    <span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Fábrica</span>
                </button>
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
                                <div className="flex justify-between mb-6">
                                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500"><FileText size={20}/></div>
                                    <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-500 h-fit">Vence: {formatDateSafe(f.expiry_date)}</span>
                                </div>
                                <h3 className="font-bold text-xl text-slate-800 mb-6 line-clamp-2 h-14">{f.title}</h3>
                                <a href={f.file_url} target="_blank" onClick={()=>registerDownload(f.id)} className="block w-full py-4 bg-slate-900 text-white font-bold rounded-xl text-center hover:bg-blue-600 shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 group-hover:scale-105"><Download size={20}/> Baixar PDF Completo</a>
                            </div>
                        )) : (
                            <div className="col-span-3 flex flex-col items-center justify-center h-64 text-slate-400">
                                <FileText size={48} className="mb-4 opacity-20"/>
                                <p>Nenhum encarte disponível no momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {view === 'factory' && <PosterFactory mode="local" />}
        </div>
    </div>
  );
};

// ============================================================================
// 6. LOGIN MODERNIZADO
// ============================================================================
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  const handleLogin = async (e) => { e.preventDefault(); setLoading(true); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if(error) { alert("Erro: "+error.message); setLoading(false); } else { setTimeout(() => onLogin(data.session), 500); } };
  
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-900 via-slate-900 to-red-900 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl flex flex-col items-center relative z-10">
            <img src="/assets/logo-full.png" alt="Cartaz No Ponto" className="w-48 mb-8 drop-shadow-xl"/>
            <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo</h2>
            <p className="text-blue-200 text-sm mb-8">Acesse sua central de criação</p>
            <form onSubmit={handleLogin} className="w-full space-y-5">
                <div className="space-y-1"><label className="text-xs font-bold text-blue-100 uppercase ml-1">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:bg-black/40 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all" placeholder="seu@email.com"/></div>
                <div className="space-y-1"><label className="text-xs font-bold text-blue-100 uppercase ml-1">Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:bg-black/40 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all" placeholder="••••••••"/></div>
                <button disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-red-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1 transition-all disabled:opacity-50 mt-4">{loading ? <Loader className="animate-spin mx-auto"/> : 'ENTRAR NO SISTEMA'}</button>
            </form>
        </div>
        <p className="mt-8 text-white/20 text-xs">© 2026 Cartaz No Ponto. Todos os direitos reservados.</p>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState(null);
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setSession(session)); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session)); return () => subscription.unsubscribe(); }, []);
  const handleLogout = async () => await supabase.auth.signOut();
  if (!session) return <LoginScreen onLogin={(s) => setSession(s)} />;
  if (session.user.email.includes('admin')) return <AdminDashboard onLogout={handleLogout} />;
  return <StoreLayout user={session.user} onLogout={handleLogout} />;
};

export default App;