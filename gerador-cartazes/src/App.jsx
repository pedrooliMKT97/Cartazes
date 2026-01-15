import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { 
  User, LogOut, Upload, FileText, 
  BarChart, Download, Clock, Trash2, 
  Image as ImageIcon, Monitor, FolderOpen, Layers, CheckCircle, Loader
} from 'lucide-react';

// ============================================================================
// 1. COMPONENTE DE CARTAZ (V15 ORIGINAL - O QUE FUNCIONAVA)
// ============================================================================
const Poster = ({ product, design, width, height, id }) => {
  if (!product) return null;
  
  // Design padrão fixo (sem sliders para não dar erro)
  const d = design || {
    size: 'a4', orientation: 'portrait', 
    bgColorFallback: '#fff', nameColor: '#000', priceColor: '#cc0000', 
    showOldPrice: true, fontSize: 100
  };

  const safePrice = product.price ? String(product.price) : '0,00';
  const priceParts = safePrice.includes(',') ? safePrice.split(',') : [safePrice, '00'];
  
  const H_BANNER = 220; 
  const H_FOOTER = 60;
  const H_MIOLO = height - H_BANNER - H_FOOTER;
  const H_NOME = H_MIOLO * 0.20;
  const H_PRECO = H_MIOLO * 0.65;
  const H_LIMITE = H_MIOLO * 0.15;

  const s = {
    container: { width: `${width}px`, height: `${height}px`, backgroundImage: d.backgroundImage ? `url(${d.backgroundImage})` : 'none', background: d.backgroundImage ? `url(${d.backgroundImage}) center/cover no-repeat` : d.bgColorFallback, backgroundColor: 'white', overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif' },
    bannerBox: { width: '100%', height: `${H_BANNER}px`, position: 'absolute', top: 0, left: 0, backgroundImage: d.bannerImage ? `url(${d.bannerImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10 },
    nameBox: { width: '100%', height: `${H_NOME}px`, position: 'absolute', top: `${H_BANNER}px`, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px', zIndex: 5 },
    nameText: { fontSize: `${(d.orientation === 'portrait' ? 60 : 50)}px`, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1', color: d.nameColor, wordBreak: 'break-word' },
    priceBox: { width: '100%', height: `${H_PRECO}px`, position: 'absolute', top: `${H_BANNER + H_NOME}px`, left: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
    oldPriceWrapper: { position: 'relative', marginBottom: '-10px', zIndex: 6 },
    oldPriceText: { fontSize: '32px', fontWeight: 'bold', color: '#555' },
    mainPriceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: d.priceColor, lineHeight: 0.80, marginTop: '10px' },
    currency: { fontSize: '50px', fontWeight: 'bold', marginTop: '55px', marginRight: '10px' },
    priceBig: { fontSize: d.orientation === 'portrait' ? '300px' : '240px', fontWeight: '900', letterSpacing: '-12px', margin: 0, zIndex: 2, lineHeight: 0.85 },
    sideColumn: { display: 'flex', flexDirection: 'column', marginLeft: '10px', marginTop: '55px', alignItems: 'flex-start', gap: '15px' },
    cents: { fontSize: '100px', fontWeight: '900', lineHeight: 0.8, marginBottom: '0px' },
    unitBadge: { fontSize: '30px', fontWeight: 'bold', textTransform: 'uppercase', color: '#333', backgroundColor: 'transparent', padding: '0', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' },
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
// 2. FÁBRICA LOCAL (USADA NA LOJA PARA CRIAR OS SEUS)
// ============================================================================
const PosterFactory = ({ mode }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', price: '9,99', oldPrice: '', unit: 'UN', limit: '', date: '', footer: '' });
  const [design, setDesign] = useState({ size: 'a4', orientation: 'portrait', bannerImage: null, backgroundImage: null, bgColorFallback: '#fff', nameColor: '#000', priceColor: '#cc0000', showOldPrice: true });
  
  const units = ['Un', 'Kg', '100g', 'Pct', 'Pack', 'Cx', 'Lt', 'Garrafa'];
  const library = { banners: [ { id: 'b1', file: 'oferta.png', color: '#dc2626' }, { id: 'b2', file: 'saldao.png', color: '#facc15' } ], backgrounds: [ { id: 'bg1', file: 'vermelho.png', color: 'linear-gradient(to bottom, #ef4444, #991b1b)' }, { id: 'bg2', file: 'amarelo.png', color: 'linear-gradient(to bottom, #fde047, #ca8a04)' } ] };

  useEffect(() => { const h = window.innerHeight * 0.85; setPreviewScale(h / (design.orientation === 'portrait' ? 1123 : 794)); }, [design.orientation]);

  const handleExcel = (e) => { const f = e.target.files[0]; if(!f)return; const r = new FileReader(); r.onload = (evt) => { const wb = XLSX.read(evt.target.result, { type: 'binary' }); const d = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); const m = d.map(item => ({ name: item['Produto']||'Produto', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: item['Preço "DE"']?String(item['Preço "DE"']):'', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer })); setBulkProducts(m); alert(`${m.length} produtos!`); }; r.readAsBinaryString(f); };
  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (t, i) => { if(t==='banner') setDesign(p=>({...p, bannerImage: i.file ? `/assets/banners/${i.file}` : null})); else setDesign(p=>({...p, backgroundImage: i.file ? `/assets/backgrounds/${i.file}` : null, bgColorFallback: i.color})); };
  
  const generateLocalBatch = async () => {
    setIsGenerating(true); const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size }); const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
    for (let i = 0; i < bulkProducts.length; i++) { const el = document.getElementById(`local-ghost-${i}`); if(el) { const c = await html2canvas(el, { scale: 2, useCORS: true }); if(i>0) pdf.addPage(); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, w, h); } await new Promise(r => setTimeout(r, 50)); }
    pdf.save('MEUS-CARTAZES.pdf'); setIsGenerating(false);
  };

  return (
    <div className="flex h-full flex-col md:flex-row bg-slate-200 overflow-hidden">
        <div className="w-[400px] bg-white h-full flex flex-col border-r shadow-xl z-20 overflow-y-auto">
            <div className="p-4 bg-blue-900 text-white"><h2 className="font-bold uppercase">Fábrica Própria</h2></div>
            <div className="flex border-b"><button onClick={()=>setActiveTab('content')} className={`flex-1 py-3 font-bold ${activeTab==='content'?'text-blue-600 border-b-2':''}`}>Dados</button><button onClick={()=>setActiveTab('design')} className={`flex-1 py-3 font-bold ${activeTab==='design'?'text-blue-600 border-b-2':''}`}>Visual</button></div>
            <div className="p-4 space-y-4">
                {activeTab === 'content' ? (
                    <>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded text-center"><label className="block w-full py-2 bg-blue-600 text-white rounded cursor-pointer text-xs font-bold uppercase hover:bg-blue-700 shadow mb-2"><Upload className="inline w-3 h-3 mr-1"/> Carregar Excel<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>{bulkProducts.length > 0 && (<button onClick={generateLocalBatch} disabled={isGenerating} className="w-full py-2 bg-green-600 text-white rounded text-xs font-bold uppercase hover:bg-green-700 shadow">{isGenerating ? `Gerando...` : `Baixar PDF (${bulkProducts.length})`}</button>)}</div><hr/>
                        <div><label className="text-xs font-bold uppercase">Produto</label><textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-2 border rounded font-bold h-20"/></div>
                        <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase">Preço</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-2 border rounded font-bold"/></div><div><label className="text-xs font-bold uppercase">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-2 border rounded">{units.map(u=><option key={u}>{u}</option>)}</select></div></div>
                        <div><label className="text-xs font-bold uppercase">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-2 border rounded"/></div>
                        <div><label className="text-xs font-bold uppercase">Rodapé/Data</label><input type="text" value={product.date} onChange={e=>setProduct({...product, date:e.target.value})} className="w-full p-2 border rounded"/></div>
                        <div className="flex items-center gap-2 border p-2 rounded"><input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})}/><label className="text-xs font-bold uppercase">Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full border-b outline-none"/></div>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-2"><button onClick={()=>setDesign({...design, orientation:'portrait'})} className="p-2 border rounded text-xs">Vertical</button><button onClick={()=>setDesign({...design, orientation:'landscape'})} className="p-2 border rounded text-xs">Horizontal</button></div>
                        <div><label className="text-xs font-bold uppercase block mb-1">Banners</label><div className="grid grid-cols-2 gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className="h-8 rounded border cursor-pointer" style={{background:b.color}}></div>)}</div><label className="text-xs text-blue-600 cursor-pointer"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div>
                        <div><label className="text-xs font-bold uppercase block mb-1">Fundos</label><div className="grid grid-cols-3 gap-2">{library.backgrounds.map(b=><div key={b.id} onClick={()=>selectLib('bg', b)} className="h-8 rounded border cursor-pointer" style={{background:b.color}}></div>)}</div><label className="text-xs text-blue-600 cursor-pointer"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'backgroundImage')}/></label></div>
                        <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase">Texto</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full"/></div><div><label className="text-xs font-bold uppercase">Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full"/></div></div>
                    </>
                )}
            </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-slate-300 overflow-hidden relative">
            <div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}}><Poster product={bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} /></div>
        </div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>{bulkProducts.map((p, i) => (<Poster key={i} id={`local-ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?794:1123} height={design.orientation==='portrait'?1123:794} />))}</div>
    </div>
  );
};

// ============================================================================
// 3. ADMIN DASHBOARD (SIMPLIFICADO: APENAS GERA PDF E MANDA O LINK)
// ============================================================================
const AdminDashboard = ({ onLogout }) => {
  const [stats, setStats] = useState({});
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('');
  const [bulkProducts, setBulkProducts] = useState([]); 
  const [progress, setProgress] = useState(0);

  // Design Padrão do Admin
  const adminDesign = { size: 'a4', orientation: 'portrait', bannerImage: null, backgroundImage: null, bgColorFallback: '#fff', nameColor: '#000', priceColor: '#cc0000', showOldPrice: true, fontSize: 100 };

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { const { data: f } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false }); if(f) setFiles(f); const { data: d } = await supabase.from('downloads').select('*'); if(d) { const c = {}; d.forEach(x => { const n = x.store_email.split('@')[0]; c[n] = (c[n]||0)+1; }); setStats(c); } };
  
  const handleExcel = (e) => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = (evt) => { const wb = XLSX.read(evt.target.result, { type: 'binary' }); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); const m = data.map(item => ({ name: item['Produto']||'Item', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: item['Preço "DE"']?String(item['Preço "DE"']):'', unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||'Oferta da Matriz', footer: 'Imagens meramente ilustrativas' })); setBulkProducts(m); alert(`${m.length} produtos carregados!`); }; r.readAsBinaryString(f); };

  const send = async () => {
      if(!title || !expiry || bulkProducts.length === 0) return alert("Faltam dados!");
      setProcessing(true); setProgress(0);
      try {
          const pdf = new jsPDF({unit:'mm', format: 'a4', orientation: 'portrait'});
          const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
          for(let i=0; i<bulkProducts.length; i++) {
              const el = document.getElementById(`admin-ghost-${i}`);
              if(el) { const c = await html2canvas(el, {scale:2, useCORS:true}); if(i>0) pdf.addPage(); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, w, h); }
              setProgress(Math.round(((i+1)/bulkProducts.length)*100));
              await new Promise(r=>setTimeout(r,50));
          }
          const fileName = `${Date.now()}-ENCARTE.pdf`;
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, pdf.output('blob'), { contentType: 'application/pdf' });
          if(upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          await supabase.from('shared_files').insert([{ title, expiry_date: expiry, file_url: publicUrl }]);
          alert("Sucesso!"); setTitle(''); setExpiry(''); setBulkProducts([]); fetchData();
      } catch(e) { alert("Erro: "+e.message); }
      setProcessing(false);
  };
  
  const handleDelete = async (id) => { await supabase.from('shared_files').delete().eq('id', id); fetchData(); };
  const resetDownloads = async () => { if(confirm("Zerar?")) { await supabase.from('downloads').delete().neq('id', 0); fetchData(); }};

  return (
    <div className="flex flex-col h-screen bg-slate-100">
        <div className="bg-slate-900 text-white p-4 flex justify-between shadow sticky top-0 z-50"><h1 className="font-bold flex gap-2 items-center"><Monitor/> ADMIN</h1><button onClick={onLogout} className="text-xs bg-red-600 px-3 py-1 rounded">Sair</button></div>
        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 h-full flex flex-col border-r bg-white relative">
                <div className="p-4 bg-slate-50 border-b flex gap-2 items-end">
                    <div className="flex-1"><label className="text-xs font-bold text-slate-500">Título</label><input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2 border rounded"/></div>
                    <div className="w-32"><label className="text-xs font-bold text-slate-500">Validade</label><input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-2 border rounded"/></div>
                    <button onClick={send} disabled={processing} className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-gray-400">{processing?`${progress}%`:'ENVIAR'}</button>
                </div>
                <div className="p-6">
                    <div className="mb-6 p-4 border rounded bg-blue-50">
                        <label className="block w-full py-2 bg-blue-600 text-white rounded cursor-pointer text-xs font-bold uppercase hover:bg-blue-700 shadow text-center"><Upload className="inline w-3 h-3 mr-1"/> Carregar Excel<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>
                        {bulkProducts.length > 0 && <p className="text-center text-xs text-green-700 font-bold mt-2">{bulkProducts.length} produtos carregados.</p>}
                    </div>
                </div>
            </div>
            <div className="w-1/2 h-full bg-slate-100 p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded shadow"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-700">Downloads</h3><button onClick={resetDownloads} className="text-xs text-red-500 underline">Zerar</button></div><div className="space-y-1">{['loja01','loja02','loja03','loja04','loja05'].map(s=><div key={s} className="flex justify-between text-xs p-1 border-b"><span>{s}</span><span className="font-bold">{stats[s]||0}</span></div>)}</div></div>
                    <div className="bg-white p-4 rounded shadow"><h3 className="font-bold text-slate-700 mb-2">Recentes</h3><div className="space-y-1 max-h-40 overflow-y-auto">{files.map(f=><div key={f.id} className="flex justify-between text-xs p-1 border-b"><span>{f.title} ({f.expiry_date})</span><button onClick={()=>handleDelete(f.id)} className="text-red-500"><Trash2 size={12}/></button></div>)}</div></div>
                </div>
            </div>
        </div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>{bulkProducts.map((p,i)=><Poster key={i} id={`admin-ghost-${i}`} product={p} design={adminDesign} width={794} height={1123} />)}</div>
    </div>
  );
};

// ============================================================================
// 4. LOJA LAYOUT
// ============================================================================
const StoreLayout = ({ user, onLogout }) => {
  const [view, setView] = useState('files');
  const [files, setFiles] = useState([]);

  useEffect(() => { loadFiles(); }, []);
  const loadFiles = async () => { const today = new Date().toISOString().split('T')[0]; const { data } = await supabase.from('shared_files').select('*').gte('expiry_date', today).order('created_at', {ascending: false}); if(data) setFiles(data); };
  const registerDownload = async (fileId) => { await supabase.from('downloads').insert([{ store_email: user.email, file_id: fileId }]); };

  return (
    <div className="flex h-screen bg-slate-200 overflow-hidden">
        <div className="w-20 bg-slate-900 flex flex-col items-center py-6 text-white z-50 shadow-2xl">
            <div className="mb-8 p-2 bg-white rounded-full"><ImageIcon className="text-red-600"/></div>
            <button onClick={()=>setView('files')} className={`p-3 mb-4 rounded-xl transition-all ${view==='files'?'bg-green-600 scale-110':'hover:bg-slate-800 text-slate-400'}`}><FolderOpen size={24}/></button>
            <button onClick={()=>setView('factory')} className={`p-3 mb-4 rounded-xl transition-all ${view==='factory'?'bg-blue-600 scale-110':'hover:bg-slate-800 text-slate-400'}`}><Layers size={24}/></button>
            <div className="mt-auto"><button onClick={onLogout} className="p-3 hover:bg-red-600 rounded-xl transition-colors text-slate-400"><LogOut size={24}/></button></div>
        </div>
        <div className="flex-1 overflow-hidden relative">
            {view === 'files' && (
                <div className="p-10 h-full overflow-y-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-6 flex gap-3 items-center"><FileText className="text-green-600"/> Encartes da Matriz</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {files.length > 0 ? files.map(f=>(
                            <div key={f.id} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-600 hover:shadow-2xl transition-all">
                                <div className="flex justify-between mb-4"><span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold">Vence: {f.expiry_date}</span></div>
                                <h3 className="font-bold text-lg mb-4">{f.title}</h3>
                                <a href={f.file_url} target="_blank" onClick={()=>registerDownload(f.id)} className="block w-full py-3 bg-slate-800 text-white font-bold rounded text-center hover:bg-slate-700 shadow flex items-center justify-center gap-2"><Download size={16}/> Baixar PDF</a>
                            </div>
                        )) : <div className="col-span-3 text-center text-gray-400 mt-10">Nenhum encarte disponível.</div>}
                    </div>
                </div>
            )}
            {view === 'factory' && <PosterFactory mode="local" />}
        </div>
    </div>
  );
};

// ============================================================================
// 5. LOGIN & APP
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