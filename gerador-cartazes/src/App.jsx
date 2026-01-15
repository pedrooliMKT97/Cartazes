import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { 
  User, Lock, LogOut, Upload, FileText, 
  BarChart, Download, Clock, Trash2, 
  Image as ImageIcon, Monitor, Layers, Palette, 
  Eye, CheckCircle, RefreshCcw, X, List, Sliders, MoveVertical, Save, Bookmark, Loader
} from 'lucide-react';

// === FUNÇÃO DE SEGURANÇA PARA DATAS ===
const formatDateSafe = (dateStr) => {
  if (!dateStr) return 'Sem Data';
  try {
    return dateStr.split('-').reverse().join('/');
  } catch (e) {
    return dateStr || '-';
  }
};

// === DESIGN PADRÃO ===
const DEFAULT_DESIGN = {
  size: 'a4', orientation: 'portrait', bannerImage: null, backgroundImage: null, 
  bgColorFallback: '#ffffff', nameColor: '#000000', priceColor: '#cc0000', showOldPrice: true, 
  nameScale: 100, priceScale: 100, priceY: 0
};

// ============================================================================
// 1. COMPONENTE DE CARTAZ (V25 - IMPOSSÍVEL DE QUEBRAR)
// ============================================================================
const Poster = ({ product, design, width, height, id }) => {
  if (!product) return null;
  const d = { ...DEFAULT_DESIGN, ...design }; // Garante chaves

  const safePrice = product.price || '0,00';
  const priceParts = safePrice.includes(',') ? safePrice.split(',') : [safePrice, '00'];
  
  const H_BANNER = 220; const H_FOOTER = 60;
  const H_MIOLO = height - H_BANNER - H_FOOTER;
  const H_NOME = H_MIOLO * 0.20;
  const H_PRECO = H_MIOLO * 0.65;
  const H_LIMITE = H_MIOLO * 0.15;

  // Escalas Seguras
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
// 2. HOOK PRESETS (SALVA AJUSTES NO NAVEGADOR)
// ============================================================================
const usePresets = (setDesign) => {
  const [presets, setPresets] = useState([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('poster_presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch (e) { localStorage.removeItem('poster_presets'); }
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
// 3. FACTORY COMPARTILHADA (LOCAL & ADMIN)
// ============================================================================
const PosterFactory = ({ mode, onAdminReady }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', price: '9,99', oldPrice: '', unit: 'UN', limit: '', date: '', footer: '' });
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets(setDesign);
  const library = { banners: [ { id: 'b1', file: 'oferta.png', color: '#dc2626' }, { id: 'b2', file: 'saldao.png', color: '#facc15' } ], backgrounds: [ { id: 'bg1', file: 'vermelho.png', color: 'linear-gradient(to bottom, #ef4444, #991b1b)' }, { id: 'bg2', file: 'amarelo.png', color: 'linear-gradient(to bottom, #fde047, #ca8a04)' } ] };

  useEffect(() => { const h = window.innerHeight * 0.85; setPreviewScale(h / (design.orientation === 'portrait' ? 1123 : 794)); }, [design.orientation]);
  
  // Envia dados para o Admin (se estiver no modo admin)
  useEffect(() => { if(mode === 'admin' && onAdminReady) onAdminReady({ bulkProducts, design }); }, [bulkProducts, design, mode]);

  const handleExcel = (e) => { const f = e.target.files[0]; if(!f)return; const r = new FileReader(); r.onload = (evt) => { const wb = XLSX.read(evt.target.result, { type: 'binary' }); const d = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); const m = d.map(item => ({ name: item['Produto']||'Produto', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: item['Preço "DE"']?String(item['Preço "DE"']):'', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer })); setBulkProducts(m); if(mode==='local') alert(`${m.length} produtos carregados!`); }; r.readAsBinaryString(f); };
  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (t, i) => { if(t==='banner') setDesign(p=>({...p, bannerImage: i.file ? `/assets/banners/${i.file}` : null})); else setDesign(p=>({...p, backgroundImage: i.file ? `/assets/backgrounds/${i.file}` : null, bgColorFallback: i.color})); };
  const generateLocal = async () => { if (bulkProducts.length === 0) return; setIsGenerating(true); const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size }); const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight(); for (let i = 0; i < bulkProducts.length; i++) { const el = document.getElementById(`ghost-${i}`); if(el) { const canvas = await html2canvas(el, { scale: 2, useCORS: true }); if(i>0) pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h); } await new Promise(r => setTimeout(r, 50)); } pdf.save('MEUS-CARTAZES.pdf'); setIsGenerating(false); };

  return (
    <div className="flex h-full flex-col md:flex-row bg-slate-200 overflow-hidden">
        <div className="w-[400px] bg-white h-full flex flex-col border-r shadow-xl z-20 overflow-y-auto custom-scrollbar">
            <div className={`p-4 text-white ${mode==='admin'?'bg-slate-900':'bg-blue-900'}`}><h2 className="font-bold uppercase">{mode==='admin'?'Configurar Encarte':'Fábrica Própria'}</h2></div>
            <div className="flex border-b"><button onClick={()=>setActiveTab('content')} className={`flex-1 py-3 font-bold ${activeTab==='content'?'text-blue-600 border-b-2':''}`}>Dados</button><button onClick={()=>setActiveTab('design')} className={`flex-1 py-3 font-bold ${activeTab==='design'?'text-blue-600 border-b-2':''}`}>Visual</button></div>
            <div className="p-4 space-y-4">
                {activeTab === 'content' ? (
                    <>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded text-center"><label className="block w-full py-2 bg-blue-600 text-white rounded cursor-pointer text-xs font-bold uppercase hover:bg-blue-700 shadow mb-2"><Upload className="inline w-3 h-3 mr-1"/> Carregar Excel<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>{mode === 'local' && bulkProducts.length > 0 && (<button onClick={generateLocal} disabled={isGenerating} className="w-full py-2 bg-green-600 text-white rounded text-xs font-bold uppercase hover:bg-green-700 shadow">{isGenerating ? `Gerando...` : `Baixar PDF (${bulkProducts.length})`}</button>)}</div><hr/>
                        <div><label className="text-xs font-bold uppercase">Produto (Teste)</label><textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-2 border rounded font-bold h-20"/></div>
                        <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase">Preço</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-2 border rounded font-bold"/></div><div><label className="text-xs font-bold uppercase">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-2 border rounded">{units.map(u=><option key={u}>{u}</option>)}</select></div></div>
                        <div><label className="text-xs font-bold uppercase">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-2 border rounded"/></div>
                        <div><label className="text-xs font-bold uppercase">Rodapé/Data</label><input type="text" value={product.date} onChange={e=>setProduct({...product, date:e.target.value})} className="w-full p-2 border rounded"/></div>
                        <div className="flex items-center gap-2 border p-2 rounded"><input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})}/><label className="text-xs font-bold uppercase">Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full border-b outline-none"/></div>
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-2">
                             {presets.length > 0 && (<div className="relative group"><button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold flex items-center gap-1"><Bookmark size={12}/> Carregar</button><div className="absolute left-0 top-full bg-white shadow-xl border rounded hidden group-hover:block w-48 z-20">{presets.map((p,i)=><div key={i} onClick={()=>loadPreset(p)} className="p-2 hover:bg-slate-100 text-xs flex justify-between cursor-pointer"><span>{p.name}</span><span onClick={(e)=>deletePreset(i,e)} className="text-red-500 font-bold">x</span></div>)}</div></div>)}
                             <button onClick={()=>savePreset(design)} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded font-bold flex items-center gap-1"><Save size={12}/> Salvar</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2"><button onClick={()=>setDesign({...design, orientation:'portrait'})} className="p-2 border rounded text-xs">Vertical</button><button onClick={()=>setDesign({...design, orientation:'landscape'})} className="p-2 border rounded text-xs">Horizontal</button></div>
                        <div><label className="text-xs font-bold uppercase block mt-2 mb-1">Banners</label><div className="grid grid-cols-2 gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className="h-8 rounded border cursor-pointer" style={{background:b.color}}></div>)}</div><label className="text-xs text-blue-600 cursor-pointer"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div>
                        <div><label className="text-xs font-bold uppercase block mt-2 mb-1">Fundos</label><div className="grid grid-cols-3 gap-2">{library.backgrounds.map(b=><div key={b.id} onClick={()=>selectLib('bg', b)} className="h-8 rounded border cursor-pointer" style={{background:b.color}}></div>)}</div><label className="text-xs text-blue-600 cursor-pointer"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'backgroundImage')}/></label></div>
                        <div className="grid grid-cols-2 gap-2 mt-2"><div><label className="text-xs font-bold uppercase">Texto</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full"/></div><div><label className="text-xs font-bold uppercase">Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full"/></div></div>
                        <div className="bg-slate-50 p-3 rounded border mt-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Sliders size={12}/> Ajustes Manuais</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold">Nome</label><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-1 bg-gray-300 rounded"/></div>
                                <div><label className="text-[10px] font-bold">Preço</label><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-1 bg-gray-300 rounded"/></div>
                                <div><label className="text-[10px] font-bold">Posição</label><input type="range" min="-50" max="50" value={design.priceY} onChange={e=>setDesign({...design, priceY: Number(e.target.value)})} className="w-full h-1 bg-gray-300 rounded"/></div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-300 overflow-hidden relative"><div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}}><Poster product={product} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} /></div></div>
        {mode === 'local' && (<div style={{position: 'absolute', top: 0, left: '-9999px'}}>{bulkProducts.map((p, i) => (<Poster key={i} id={`ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />))}</div>)}
    </div>
  );
};

// ============================================================================
// 4. ADMIN DASHBOARD
// ============================================================================
const AdminDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState({});
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Estado que recebe da Factory
  const [factoryData, setFactoryData] = useState({ bulkProducts: [], design: DEFAULT_DESIGN });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    try {
        const { data: f } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false });
        if(f) setFiles(f);
        const { data: d } = await supabase.from('downloads').select('*');
        if(d) {
            const c = {}; d.forEach(x => { const n = x.store_email.split('@')[0]; c[n] = (c[n]||0)+1; });
            setStats(c);
        }
    } catch(e) { console.error(e); }
  };
  
  const resetDownloads = async () => { if(confirm("Zerar downloads?")) { await supabase.from('downloads').delete().neq('id', 0); fetchData(); }};
  const handleDelete = async (id) => { await supabase.from('shared_files').delete().eq('id', id); fetchData(); };

  const send = async () => {
      if(!title || !expiry || factoryData.bulkProducts.length === 0) return alert("Preencha título, validade e carregue o Excel.");
      setProcessing(true); setProgress(0);
      try {
          const { bulkProducts, design } = factoryData;
          const pdf = new jsPDF({unit:'mm', format: design.size, orientation: design.orientation});
          const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
          for(let i=0; i<bulkProducts.length; i++) {
              const el = document.getElementById(`admin-ghost-${i}`);
              if(el) {
                  const canvas = await html2canvas(el, {scale:2, useCORS:true});
                  if(i>0) pdf.addPage();
                  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
              }
              setProgress(Math.round(((i+1)/bulkProducts.length)*100));
              await new Promise(r=>setTimeout(r,50));
          }
          const fileName = `${Date.now()}-ENCARTE.pdf`;
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, pdf.output('blob'), { contentType: 'application/pdf' });
          if(upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          await supabase.from('shared_files').insert([{ title, expiry_date: expiry, file_url: publicUrl, products_json: bulkProducts, design_json: design }]);
          alert("Sucesso!"); setTitle(''); setExpiry(''); fetchData();
      } catch(e) { alert("Erro: "+e.message); }
      setProcessing(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
        <div className="bg-slate-900 text-white p-4 flex justify-between shadow sticky top-0 z-50"><h1 className="font-bold flex gap-2 items-center"><Monitor/> ADMIN</h1><button onClick={onLogout} className="text-xs bg-red-600 px-3 py-1 rounded">Sair</button></div>
        <div className="flex-1 flex overflow-hidden">
            {/* Esquerda: Configuração e Factory */}
            <div className="w-1/2 h-full flex flex-col border-r bg-white relative">
                <div className="p-4 bg-slate-50 border-b flex gap-2 items-end">
                    <div className="flex-1"><label className="text-xs font-bold text-slate-500">Título</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2 border rounded"/></div>
                    <div className="w-32"><label className="text-xs font-bold text-slate-500">Validade</label><input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-2 border rounded"/></div>
                    <button onClick={send} disabled={processing} className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-gray-400">{processing?`${progress}%`:'ENVIAR'}</button>
                </div>
                {/* Aqui carregamos a Factory em modo Admin, que vai preencher o 'factoryData' */}
                <div className="flex-1 overflow-hidden relative">
                    <PosterFactory mode="admin" onAdminReady={setFactoryData} />
                </div>
            </div>

            {/* Direita: Dashboard */}
            <div className="w-1/2 h-full bg-slate-100 p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded shadow">
                        <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-700">Downloads</h3><button onClick={resetDownloads} className="text-xs text-red-500 underline">Zerar</button></div>
                        <div className="space-y-1">{['loja01','loja02','loja03','loja04','loja05'].map(s=><div key={s} className="flex justify-between text-xs p-1 border-b"><span>{s}</span><span className="font-bold">{stats[s]||0}</span></div>)}</div>
                    </div>
                    <div className="bg-white p-4 rounded shadow">
                        <h3 className="font-bold text-slate-700 mb-2">Recentes</h3>
                        <div className="space-y-1 max-h-40 overflow-y-auto">{files.map(f=><div key={f.id} className="flex justify-between text-xs p-1 border-b"><span>{f.title}</span><button onClick={()=>handleDelete(f.id)} className="text-red-500"><Trash2 size={12}/></button></div>)}</div>
                    </div>
                </div>
            </div>
        </div>
        {/* Ghost para geração do PDF do Admin */}
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
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [downloadingItem, setDownloadingItem] = useState(null);

  useEffect(() => { loadFiles(); }, []);
  const loadFiles = async () => { 
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('shared_files').select('*').gte('expiry_date', today).order('created_at', {ascending: false});
        if(data) setFiles(data);
      } catch(e) { console.error(e); }
  };
  const registerDownload = async (fileId, productName = null) => { try { await supabase.from('downloads').insert([{ store_email: user.email, file_id: fileId, product_name: productName || 'PDF Completo' }]); } catch(e){} };
  const handleDownloadSingle = async (product, design, index, fileId) => {
      setDownloadingItem(index); const el = document.getElementById(`modal-ghost-${index}`);
      if(el) { const c = await html2canvas(el, {scale:2, useCORS:true}); const l = document.createElement('a'); l.href = c.toDataURL('image/png'); l.download = `${product.name.substring(0,10)}.png`; l.click(); await registerDownload(fileId, product.name); }
      setDownloadingItem(null);
  };

  return (
    <div className="flex h-screen bg-slate-200 overflow-hidden">
        <div className="w-20 bg-slate-900 flex flex-col items-center py-6 text-white z-50 shadow-2xl">
            <div className="mb-8 p-2 bg-white rounded-full"><ImageIcon className="text-red-600"/></div>
            <button onClick={()=>setView('files')} className={`p-3 mb-4 rounded-xl transition-all ${view==='files'?'bg-green-600 scale-110':'hover:bg-slate-800 text-slate-400'}`}><FolderOpen size={24}/></button>
            <button onClick={()=>setView('factory')} className={`p-3 mb-4 rounded-xl transition-all ${view==='factory'?'bg-blue-600 scale-110':'hover:bg-slate-800 text-slate-400'}`}><FileText size={24}/></button>
            <div className="mt-auto"><button onClick={onLogout} className="p-3 hover:bg-red-600 rounded-xl transition-colors text-slate-400"><LogOut size={24}/></button></div>
        </div>
        <div className="flex-1 overflow-hidden relative">
            {view === 'files' && (
                <div className="p-10 h-full overflow-y-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-6 flex gap-3 items-center"><FolderOpen className="text-green-600"/> Encartes da Matriz</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {files.length > 0 ? files.map(f=>(
                            <div key={f.id} onClick={() => setSelectedCampaign(f)} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-600 hover:shadow-2xl transition-all cursor-pointer group">
                                <div className="flex justify-between mb-4"><div className="p-3 bg-red-100 rounded group-hover:bg-red-200"><List className="text-red-600"/></div><span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">Vence: {formatDateSafe(f.expiry_date)}</span></div>
                                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                                <p className="text-xs text-gray-500 mb-4">Clique para ver os cartazes</p>
                                <button onClick={(e) => {e.stopPropagation(); window.open(f.file_url); registerDownload(f.id);}} className="block w-full py-3 bg-slate-800 text-white font-bold rounded text-center hover:bg-slate-700 shadow flex items-center justify-center gap-2"><Download size={16}/> Baixar PDF</button>
                            </div>
                        )) : <div className="col-span-3 text-center text-gray-400 mt-10">Nenhum encarte disponível no momento.</div>}
                    </div>
                </div>
            )}
            {selectedCampaign && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-10 backdrop-blur-sm">
                    <div className="bg-slate-100 w-full h-full max-w-7xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="bg-white p-4 border-b flex justify-between items-center"><div><h2 className="text-xl font-bold text-slate-800">{selectedCampaign.title}</h2></div><button onClick={()=>setSelectedCampaign(null)} className="p-2 hover:bg-gray-200 rounded-full"><X/></button></div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-200">
                            {selectedCampaign.products_json ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {selectedCampaign.products_json.map((prod, i) => {
                                        const d = selectedCampaign.design_json ? { ...DEFAULT_DESIGN, ...selectedCampaign.design_json } : DEFAULT_DESIGN;
                                        return (
                                            <div key={i} className="bg-white rounded-lg shadow p-2 flex flex-col items-center">
                                                <div className="border mb-2 overflow-hidden relative bg-gray-50" style={{width: '100%', aspectRatio: d.orientation === 'portrait' ? '0.7' : '1.4'}}><div style={{transform: `scale(${d.orientation === 'portrait' ? 0.2 : 0.25})`, transformOrigin: 'top left', position: 'absolute'}}><Poster id={`modal-ghost-${i}`} product={prod} design={d} width={d.orientation==='portrait'?794:1123} height={d.orientation==='portrait'?1123:794} /></div></div>
                                                <p className="text-xs font-bold text-center mb-2 line-clamp-1">{prod.name}</p>
                                                <button onClick={() => handleDownloadSingle(prod, d, i, selectedCampaign.id)} disabled={downloadingItem === i} className="w-full py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex justify-center items-center gap-1">{downloadingItem === i ? <Loader className="animate-spin" size={12}/> : <><Download size={12}/> Baixar</>}</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (<div className="flex flex-col items-center justify-center h-full text-gray-500"><p>Campanha antiga.</p></div>)}
                        </div>
                    </div>
                </div>
            )}
            {view === 'factory' && <PosterFactory mode="local" />}
        </div>
    </div>
  );
};

// ============================================================================
// 6. LOGIN E APP
// ============================================================================
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false); const [zooming, setZooming] = useState(false);
  const handleLogin = async (e) => { e.preventDefault(); setLoading(true); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if(error) { alert("Erro: "+error.message); setLoading(false); } else { setZooming(true); setTimeout(() => onLogin(data.session), 1200); } };
  return (<div className={`h-screen w-screen bg-slate-900 flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ${zooming?'scale-[20] opacity-0':'scale-100'}`}><div className="mb-8 p-6 bg-white rounded-full shadow-2xl relative z-10"><ImageIcon size={64} className="text-red-600"/></div><div className="bg-white p-8 rounded shadow-xl w-96 z-10"><h2 className="text-2xl font-bold text-center mb-6">Acesso Restrito</h2><form onSubmit={handleLogin} className="space-y-4"><input value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 border rounded" placeholder="Email"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 border rounded" placeholder="Senha"/><button disabled={loading} className="w-full bg-red-600 text-white font-bold py-3 rounded">{loading?'...':'ENTRAR'}</button></form></div></div>);
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