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

// === CONFIGURAÇÕES PADRÃO GLOBAIS ===
const DEFAULT_DESIGN = {
  size: 'a4',
  orientation: 'portrait',
  bannerImage: null,
  backgroundImage: null,
  bgColorFallback: '#ffffff',
  nameColor: '#000000',
  priceColor: '#cc0000',
  showOldPrice: true,
  fontSize: 100,
  nameScale: 100,  // Novo
  priceScale: 100, // Novo
  priceY: 0        // Novo
};

// ============================================================================
// 1. COMPONENTE DE CARTAZ (V22 - ANTI-CRASH)
// ============================================================================
const Poster = ({ product, design = DEFAULT_DESIGN, width, height, id }) => {
  // 1. Proteção de Segurança: Se não tiver produto, não desenha nada (evita erro)
  if (!product) return null;

  // 2. Mesclar design com padrão para garantir que nenhuma propriedade falte
  const d = { ...DEFAULT_DESIGN, ...design };

  // 3. Tratamento de Preço (Evita erro se price for null)
  const safePrice = product.price || '0,00';
  const priceParts = safePrice.includes(',') ? safePrice.split(',') : [safePrice, '00'];

  // 4. Medidas
  const H_BANNER = 220;
  const H_FOOTER = 60;
  const H_MIOLO = height - H_BANNER - H_FOOTER;
  const H_NOME = H_MIOLO * 0.20;
  const H_PRECO = H_MIOLO * 0.65;
  const H_LIMITE = H_MIOLO * 0.15;

  // 5. Escalas Matemáticas (Forçando conversão para Número para não dar erro de NaN)
  const scaleName = (Number(d.nameScale) || 100) / 100;
  const scalePrice = (Number(d.priceScale) || 100) / 100;
  const offsetY = Number(d.priceY) || 0;

  const s = {
    container: { width: `${width}px`, height: `${height}px`, backgroundImage: d.backgroundImage ? `url(${d.backgroundImage})` : 'none', background: d.backgroundImage ? `url(${d.backgroundImage}) center/cover no-repeat` : d.bgColorFallback, backgroundColor: 'white', overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif' },
    bannerBox: { width: '100%', height: `${H_BANNER}px`, position: 'absolute', top: 0, left: 0, backgroundImage: d.bannerImage ? `url(${d.bannerImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10 },
    
    // NOME
    nameBox: { width: '100%', height: `${H_NOME}px`, position: 'absolute', top: `${H_BANNER}px`, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px', zIndex: 5 },
    nameText: { fontSize: `${((d.orientation === 'portrait' ? 60 : 50) * scaleName)}px`, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1', color: d.nameColor, wordBreak: 'break-word' },
    
    // PREÇO
    priceBox: { width: '100%', height: `${H_PRECO}px`, position: 'absolute', top: `${H_BANNER + H_NOME + offsetY}px`, left: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
    oldPriceWrapper: { position: 'relative', marginBottom: '-10px', zIndex: 6 },
    oldPriceText: { fontSize: '32px', fontWeight: 'bold', color: '#555' },
    mainPriceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: d.priceColor, lineHeight: 0.80, marginTop: '10px' },
    currency: { fontSize: `${50 * scalePrice}px`, fontWeight: 'bold', marginTop: `${55 * scalePrice}px`, marginRight: '10px' },
    priceBig: { fontSize: `${(d.orientation === 'portrait' ? 300 : 240) * scalePrice}px`, fontWeight: '900', letterSpacing: '-12px', margin: 0, zIndex: 2, lineHeight: 0.85 },
    sideColumn: { display: 'flex', flexDirection: 'column', marginLeft: '10px', marginTop: `${55 * scalePrice}px`, alignItems: 'flex-start', gap: `${15 * scalePrice}px` },
    cents: { fontSize: `${100 * scalePrice}px`, fontWeight: '900', lineHeight: 0.8, marginBottom: '0px' },
    unitBadge: { fontSize: `${30 * scalePrice}px`, fontWeight: 'bold', textTransform: 'uppercase', color: '#333', backgroundColor: 'transparent', padding: '0', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' },
    
    // RESTO
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
// 2. HOOK DE PRESETS (SALVAR PREDEFINIÇÕES)
// ============================================================================
const usePresets = (setDesign) => {
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('poster_presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch (e) {
      console.error("Erro ao carregar presets", e);
      localStorage.removeItem('poster_presets'); // Limpa se estiver corrompido
    }
  }, []);

  const savePreset = (currentDesign) => {
    const name = prompt("Dê um nome para este ajuste (ex: Oferta Fim de Semana):");
    if (!name) return;
    const newPresets = [...presets, { name, data: currentDesign }];
    setPresets(newPresets);
    localStorage.setItem('poster_presets', JSON.stringify(newPresets));
  };

  const loadPreset = (preset) => {
    // Garante que o preset carregado tenha todos os campos novos
    setDesign({ ...DEFAULT_DESIGN, ...preset.data });
  };

  const deletePreset = (index, e) => {
    e.stopPropagation();
    if(!confirm("Excluir esta predefinição?")) return;
    const newPresets = presets.filter((_, i) => i !== index);
    setPresets(newPresets);
    localStorage.setItem('poster_presets', JSON.stringify(newPresets));
  }

  return { presets, savePreset, loadPreset, deletePreset };
};

// ============================================================================
// 3. ADMIN DASHBOARD
// ============================================================================
const AdminDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState({});
  const [files, setFiles] = useState([]);
  const [downloadsRaw, setDownloadsRaw] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('');
  const [bulkProducts, setBulkProducts] = useState([]); 

  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets(setDesign);

  const library = { banners: [ { id: 'b1', file: 'oferta.png', color: '#dc2626' }, { id: 'b2', file: 'saldao.png', color: '#facc15' } ], backgrounds: [ { id: 'bg1', file: 'vermelho.png', color: 'linear-gradient(to bottom, #ef4444, #991b1b)' }, { id: 'bg2', file: 'amarelo.png', color: 'linear-gradient(to bottom, #fde047, #ca8a04)' } ] };

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    try {
        const { data: f } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false });
        if(f) setFiles(f);
        const { data: d } = await supabase.from('downloads').select('*');
        if(d) {
            setDownloadsRaw(d);
            const c = {}; d.forEach(x => { const n = x.store_email.split('@')[0]; c[n] = (c[n]||0)+1; });
            setStats(c);
        }
    } catch(e) { console.error(e); }
  };
  
  const resetDownloads = async () => { if(confirm("Zerar downloads?")) { await supabase.from('downloads').delete().neq('id', 0); fetchData(); }};
  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (type, item) => { if(type==='banner') setDesign(p=>({...p, bannerImage: item.file ? `/assets/banners/${item.file}` : null})); else setDesign(p=>({...p, backgroundImage: item.file ? `/assets/backgrounds/${item.file}` : null, bgColorFallback: item.color})); };
  
  const handleExcel = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const mapped = data.map(item => ({ name: item['Produto']||'Item', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: item['Preço "DE"']?String(item['Preço "DE"']):'', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||'Oferta da Matriz', footer: 'Imagens meramente ilustrativas' }));
      setBulkProducts(mapped);
      alert(`${mapped.length} produtos carregados!`);
    };
    reader.readAsBinaryString(file);
  };

  const generateAndSend = async () => {
    if(!title || !expiry || bulkProducts.length === 0) return alert("Faltam dados!");
    setProcessing(true); setProgress(0);
    try {
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
        
        // ENVIO SEGURO DO JSON
        const safeDesign = { ...design }; // Clone
        await supabase.from('shared_files').insert([{ title, expiry_date: expiry, file_url: publicUrl, products_json: bulkProducts, design_json: safeDesign }]);
        
        alert("Enviado com sucesso!");
        setTitle(''); setExpiry(''); setBulkProducts([]); fetchData();
    } catch(err) { alert("Erro no envio: "+err.message); }
    setProcessing(false);
  };
  const handleDelete = async (id) => { await supabase.from('shared_files').delete().eq('id', id); fetchData(); };

  return (
    <div className="min-h-screen bg-slate-100 relative">
        <div className="bg-slate-900 text-white p-4 flex justify-between shadow sticky top-0 z-50"><h1 className="font-bold flex gap-2 items-center"><Monitor/> PAINEL ADMIN</h1><button onClick={onLogout} className="text-xs bg-red-600 px-3 py-1 rounded">Sair</button></div>
        <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded shadow border-l-4 border-blue-600">
                    <h2 className="font-bold text-slate-700 mb-4 flex gap-2 items-center"><FileText/> 1. Configurar Campanha</h2>
                    <div className="grid grid-cols-2 gap-4"><input value={title} onChange={e=>setTitle(e.target.value)} className="col-span-2 p-2 border rounded" placeholder="Título (ex: Ofertas da Semana)"/><div><label className="text-xs font-bold text-slate-500">Validade</label><input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-2 border rounded"/></div><div><label className="text-xs font-bold text-slate-500">Importar Excel</label><input type="file" onChange={handleExcel} accept=".xlsx,.csv" className="w-full p-1 border rounded bg-white text-sm"/></div></div>
                    {bulkProducts.length > 0 && <div className="mt-2 text-xs text-green-700 font-bold bg-green-100 p-2 rounded text-center">{bulkProducts.length} produtos carregados.</div>}
                </div>
                <div className="bg-white p-6 rounded shadow border-l-4 border-purple-600">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-slate-700 flex gap-2 items-center"><Palette/> 2. Personalizar Visual</h2>
                        <div className="flex gap-2">
                             {presets.length > 0 && (<div className="relative group"><button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold flex items-center gap-1"><Bookmark size={12}/> Carregar</button><div className="absolute right-0 top-full bg-white shadow-xl border rounded hidden group-hover:block w-48 z-20">{presets.map((p,i)=><div key={i} onClick={()=>loadPreset(p)} className="p-2 hover:bg-slate-100 text-xs flex justify-between cursor-pointer"><span>{p.name}</span><span onClick={(e)=>deletePreset(i,e)} className="text-red-500 font-bold">x</span></div>)}</div></div>)}
                             <button onClick={()=>savePreset(design)} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded font-bold flex items-center gap-1"><Save size={12}/> Salvar</button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold uppercase">Banners</label><div className="flex gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className={`h-8 w-12 rounded cursor-pointer border-2 ${design.bannerImage?.includes(b.file) ? 'border-purple-600' : 'border-transparent'}`} style={{background:b.color}}></div>)}<label className="h-8 px-2 bg-slate-100 border rounded cursor-pointer flex items-center gap-1 text-[10px]"><Upload size={10}/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div></div>
                             <div><label className="text-xs font-bold uppercase">Fundos</label><div className="flex gap-2">{library.backgrounds.map(b=><div key={b.id} onClick={()=>selectLib('bg', b)} className={`h-8 w-8 rounded cursor-pointer border-2 ${design.backgroundImage?.includes(b.file) ? 'border-purple-600' : 'border-transparent'}`} style={{background:b.color}}></div>)}<label className="h-8 px-2 bg-slate-100 border rounded cursor-pointer flex items-center gap-1 text-[10px]"><Upload size={10}/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'backgroundImage')}/></label></div></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-xs font-bold uppercase">Texto</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full h-8 rounded cursor-pointer"/></div>
                            <div><label className="text-xs font-bold uppercase">Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full h-8 rounded cursor-pointer"/></div>
                            <div><label className="text-xs font-bold uppercase">Formato</label><button onClick={()=>setDesign({...design, orientation: design.orientation==='portrait'?'landscape':'portrait'})} className="w-full h-8 border rounded text-xs bg-slate-50 font-bold hover:bg-slate-200">{design.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}</button></div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Sliders size={12}/> Ajustes Manuais</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold">Tam. Nome</label><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-1 bg-gray-300 rounded"/></div>
                                <div><label className="text-[10px] font-bold">Tam. Preço</label><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-1 bg-gray-300 rounded"/></div>
                                <div><label className="text-[10px] font-bold flex items-center gap-1"><MoveVertical size={8}/> Posição</label><input type="range" min="-50" max="50" value={design.priceY} onChange={e=>setDesign({...design, priceY: Number(e.target.value)})} className="w-full h-1 bg-gray-300 rounded"/></div>
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={generateAndSend} disabled={processing} className={`w-full py-4 text-white font-bold rounded shadow-lg text-lg flex items-center justify-center gap-2 ${processing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>{processing ? `GERANDO... ${progress}%` : 'GERAR E ENVIAR'}</button>
            </div>
            <div className="space-y-6">
                <div className="bg-white p-4 rounded shadow flex flex-col items-center"><h3 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-1"><Eye size={14}/> Preview</h3><div className="border border-slate-300 shadow-xl overflow-hidden" style={{ width: '180px', height: design.orientation === 'portrait' ? '254px' : '127px' }}><div style={{ transform: `scale(${180 / (design.orientation==='portrait'?794:1123)})`, transformOrigin: 'top left' }}><Poster product={bulkProducts[0] || { name: 'PRODUTO EXEMPLO', price: '9,99', oldPrice: '12,99', unit: 'UN', limit: '5' }} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} /></div></div></div>
                <div className="bg-white p-6 rounded shadow"><div className="flex justify-between items-center mb-4"><h2 className="font-bold text-slate-700 flex gap-2 items-center"><BarChart/> Lojas Ativas</h2><button onClick={resetDownloads} className="text-[10px] text-red-500 underline flex items-center gap-1"><RefreshCcw size={10}/> Zerar</button></div><div className="space-y-2">{['loja01','loja02','loja03','loja04','loja05'].map(store => {const hasDownloaded = stats[store] > 0; return (<div key={store} className="flex justify-between p-2 bg-slate-50 rounded border items-center"><span className="uppercase font-bold text-xs flex items-center gap-2">{hasDownloaded ? <CheckCircle size={14} className="text-green-500"/> : <div className="w-3 h-3 rounded-full bg-gray-300"/>}{store}</span><span className={`px-2 rounded text-xs font-bold ${hasDownloaded ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>{stats[store] || 0} Downloads</span></div>)})}</div></div>
                <div className="bg-white p-6 rounded shadow"><h2 className="font-bold text-slate-700 mb-4 flex gap-2 items-center"><Clock/> Envios Recentes</h2><div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">{files.map(f=><div key={f.id} className="flex justify-between items-center p-2 border rounded text-xs"><div><b>{f.title}</b><br/><span className="text-gray-500">Vence: {f.expiry_date}</span></div><button onClick={()=>handleDelete(f.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button></div>)}</div></div>
            </div>
        </div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>{bulkProducts.map((p,i)=><Poster key={i} id={`admin-ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />)}</div>
    </div>
  );
};

// ============================================================================
// 4. LOJA LAYOUT (BLINDADA CONTRA DADOS NULOS)
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
      } catch(e) { console.error("Erro ao carregar arquivos:", e); }
  };
  
  const registerDownload = async (fileId, productName = null) => {
      try { await supabase.from('downloads').insert([{ store_email: user.email, file_id: fileId, product_name: productName || 'PDF Completo' }]); } catch(e){}
  };

  const handleDownloadSingle = async (product, design, index, fileId) => {
      setDownloadingItem(index);
      const el = document.getElementById(`modal-ghost-${index}`);
      if(el) {
          const canvas = await html2canvas(el, {scale:2, useCORS:true});
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `${product.name.substring(0,10)}.png`;
          link.click();
          await registerDownload(fileId, product.name);
      }
      setDownloadingItem(null);
  };

  return (
    <div className="flex h-screen bg-slate-200 overflow-hidden">
        <div className="w-20 bg-slate-900 flex flex-col items-center py-6 text-white z-50 shadow-2xl">
            <div className="mb-8 p-2 bg-white rounded-full"><ImageIcon className="text-red-600"/></div>
            <button onClick={()=>setView('files')} className={`p-3 mb-4 rounded-xl transition-all ${view==='files'?'bg-green-600 scale-110':'hover:bg-slate-800 text-slate-400'}`} title="Matriz"><FolderOpen size={24}/></button>
            <button onClick={()=>setView('factory')} className={`p-3 mb-4 rounded-xl transition-all ${view==='factory'?'bg-blue-600 scale-110':'hover:bg-slate-800 text-slate-400'}`} title="Fábrica Própria"><FileText size={24}/></button>
            <div className="mt-auto"><button onClick={onLogout} className="p-3 hover:bg-red-600 rounded-xl transition-colors text-slate-400"><LogOut size={24}/></button></div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
            {view === 'files' && (
                <div className="p-10 h-full overflow-y-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-6 flex gap-3 items-center"><FolderOpen className="text-green-600"/> Encartes da Matriz</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {files.map(f=>(
                            <div key={f.id} onClick={() => setSelectedCampaign(f)} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-600 hover:shadow-2xl transition-all cursor-pointer group">
                                <div className="flex justify-between mb-4"><div className="p-3 bg-red-100 rounded group-hover:bg-red-200"><List className="text-red-600"/></div><span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">Vence: {f.expiry_date}</span></div>
                                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                                <p className="text-xs text-gray-500 mb-4">Clique para ver os cartazes individuais</p>
                                <button onClick={(e) => {e.stopPropagation(); window.open(f.file_url); registerDownload(f.id);}} className="block w-full py-3 bg-slate-800 text-white font-bold rounded text-center hover:bg-slate-700 shadow flex items-center justify-center gap-2"><Download size={16}/> Baixar PDF Completo</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedCampaign && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-10 backdrop-blur-sm">
                    <div className="bg-slate-100 w-full h-full max-w-7xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="bg-white p-4 border-b flex justify-between items-center">
                            <div><h2 className="text-xl font-bold text-slate-800">{selectedCampaign.title}</h2><p className="text-sm text-slate-500">Baixe os cartazes individualmente</p></div>
                            <button onClick={()=>setSelectedCampaign(null)} className="p-2 hover:bg-gray-200 rounded-full"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-200">
                            {selectedCampaign.products_json ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {selectedCampaign.products_json.map((prod, i) => {
                                        // AQUI ESTAVA O ERRO ANTES: GARANTIR QUE DESIGN EXISTA
                                        const d = selectedCampaign.design_json ? { ...DEFAULT_DESIGN, ...selectedCampaign.design_json } : DEFAULT_DESIGN;
                                        return (
                                            <div key={i} className="bg-white rounded-lg shadow p-2 flex flex-col items-center">
                                                <div className="border mb-2 overflow-hidden relative bg-gray-50" style={{width: '100%', aspectRatio: d.orientation === 'portrait' ? '0.7' : '1.4'}}>
                                                    <div style={{transform: `scale(${d.orientation === 'portrait' ? 0.2 : 0.25})`, transformOrigin: 'top left', position: 'absolute'}}>
                                                        <Poster id={`modal-ghost-${i}`} product={prod} design={d} width={d.orientation==='portrait'?794:1123} height={d.orientation==='portrait'?1123:794} />
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-center mb-2 line-clamp-1">{prod.name}</p>
                                                <button onClick={() => handleDownloadSingle(prod, d, i, selectedCampaign.id)} disabled={downloadingItem === i} className="w-full py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex justify-center items-center gap-1">{downloadingItem === i ? <Loader className="animate-spin" size={12}/> : <><Download size={12}/> Baixar</>}</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (<div className="flex flex-col items-center justify-center h-full text-gray-500"><p>Campanha sem dados individuais.</p></div>)}
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
// 5. FACTORY LOCAL (COM PRESETS)
// ============================================================================
const PosterFactory = ({ mode }) => {
  const ghostRef = useRef(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [showListModal, setShowListModal] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', price: '9,99', oldPrice: '', unit: 'UN', limit: '', date: '', footer: '' });
  
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets(setDesign);

  const units = ['Un', 'Kg', '100g', 'Pct', 'Pack', 'Cx', 'Lt', 'Garrafa'];
  const library = { banners: [ { id: 'b1', file: 'oferta.png', color: '#dc2626' }, { id: 'b2', file: 'saldao.png', color: '#facc15' } ], backgrounds: [ { id: 'bg1', file: 'vermelho.png', color: 'linear-gradient(to bottom, #ef4444, #991b1b)' }, { id: 'bg2', file: 'amarelo.png', color: 'linear-gradient(to bottom, #fde047, #ca8a04)' } ] };

  useEffect(() => { const h = window.innerHeight * 0.85; setPreviewScale(h / (design.orientation === 'portrait' ? 1123 : 794)); }, [design.orientation]);
  const handleExcel = (e) => { const f = e.target.files[0]; if(!f)return; const r = new FileReader(); r.onload = (evt) => { const wb = XLSX.read(evt.target.result, { type: 'binary' }); const d = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); const m = d.map(item => ({ name: item['Produto']||'Produto', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: item['Preço "DE"']?String(item['Preço "DE"']):'', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer })); setBulkProducts(m); alert(`${m.length} produtos!`); if (m[0]) setProduct(m[0]); }; r.readAsBinaryString(f); };
  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (type, item) => { if(type==='banner') setDesign(p=>({...p, bannerImage: item.file ? `/assets/banners/${item.file}` : null})); else setDesign(p=>({...p, backgroundImage: item.file ? `/assets/backgrounds/${item.file}` : null, bgColorFallback: item.color})); };
  const generateLocalBatch = async () => { if (bulkProducts.length === 0) return; setIsGenerating(true); setBulkProgress(0); const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size }); const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight(); for (let i = 0; i < bulkProducts.length; i++) { const el = document.getElementById(`ghost-${i}`); if(el) { const canvas = await html2canvas(el, { scale: 2, useCORS: true }); if(i>0) pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h); } setBulkProgress(Math.round(((i + 1) / bulkProducts.length) * 100)); await new Promise(r => setTimeout(r, 50)); } pdf.save('MEUS-CARTAZES.pdf'); setIsGenerating(false); };

  return (
    <div className="flex h-full flex-col md:flex-row bg-slate-200 overflow-hidden">
        <div className="w-[400px] bg-white h-full flex flex-col border-r shadow-xl z-20 overflow-y-auto custom-scrollbar">
            <div className="p-4 bg-slate-800 text-white"><h2 className="font-bold uppercase">Minha Fábrica</h2></div>
            <div className="flex border-b"><button onClick={()=>setActiveTab('content')} className={`flex-1 py-3 font-bold ${activeTab==='content'?'text-blue-600 border-b-2':''}`}>Dados</button><button onClick={()=>setActiveTab('design')} className={`flex-1 py-3 font-bold ${activeTab==='design'?'text-blue-600 border-b-2':''}`}>Visual</button></div>
            <div className="p-4 space-y-4">
                {activeTab === 'content' ? (
                    <>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded text-center"><h3 className="font-bold text-blue-900 mb-2 flex justify-center items-center gap-2"><Layers size={16}/> GERAÇÃO EM LOTE</h3><label className="block w-full py-2 bg-blue-600 text-white rounded cursor-pointer text-xs font-bold uppercase hover:bg-blue-700 shadow mb-2"><Upload className="inline w-3 h-3 mr-1"/> Carregar Excel<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>{bulkProducts.length > 0 && (<button onClick={generateLocalBatch} disabled={isGenerating} className="w-full py-2 bg-green-600 text-white rounded text-xs font-bold uppercase hover:bg-green-700 shadow">{isGenerating ? `Gerando ${bulkProgress}%` : `Baixar PDF (${bulkProducts.length})`}</button>)}{bulkProducts.length > 0 && <button onClick={()=>setShowListModal(true)} className="text-xs text-slate-500 underline mt-2">Ver Lista</button>}</div><hr/>
                        <div><label className="text-xs font-bold uppercase">Produto</label><textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-2 border rounded font-bold h-20"/></div>
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
                        <div className="flex gap-1">{['a4','a5','a6'].map(s=><button key={s} onClick={()=>setDesign({...design, size:s})} className={`flex-1 py-1 text-xs border rounded ${design.size===s?'bg-slate-800 text-white':''}`}>{s.toUpperCase()}</button>)}</div>
                        <div className="grid grid-cols-2 gap-2"><button onClick={()=>setDesign({...design, orientation:'portrait'})} className="p-2 border rounded text-xs">Vertical</button><button onClick={()=>setDesign({...design, orientation:'landscape'})} className="p-2 border rounded text-xs">Horizontal</button></div>
                        <div><label className="text-xs font-bold uppercase block mb-1">Banners</label><div className="grid grid-cols-2 gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className="h-8 rounded border cursor-pointer" style={{background:b.color}}></div>)}</div><label className="text-xs text-blue-600 cursor-pointer"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div>
                        <div><label className="text-xs font-bold uppercase block mb-1">Fundos</label><div className="grid grid-cols-3 gap-2">{library.backgrounds.map(b=><div key={b.id} onClick={()=>selectLib('bg', b)} className="h-8 rounded border cursor-pointer" style={{background:b.color}}></div>)}</div><label className="text-xs text-blue-600 cursor-pointer"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'backgroundImage')}/></label></div>
                        <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase">Texto</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full"/></div><div><label className="text-xs font-bold uppercase">Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full"/></div></div>
                        <div className="bg-slate-50 p-3 rounded border mt-2">
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
        {showListModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-10"><div className="bg-white rounded p-5 w-1/2 h-1/2 overflow-auto relative"><button onClick={()=>setShowListModal(false)} className="absolute top-2 right-2"><X/></button><h2 className="font-bold mb-4">Lista de Produtos</h2><ul className="text-sm space-y-2">{bulkProducts.map((p,i)=><li key={i} className="border-b pb-1 flex justify-between"><span>{p.name}</span><span className="font-bold">{p.price}</span></li>)}</ul></div></div>)}
        {mode === 'local' && (<div style={{position: 'absolute', top: 0, left: '-9999px'}}>{bulkProducts.map((p, i) => (<Poster key={i} id={`ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />))}</div>)}
    </div>
  );
};

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