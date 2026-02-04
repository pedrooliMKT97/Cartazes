import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';
import { 
  User, LogOut, Upload, FileText, 
  Download, Clock, Trash2, 
  Image as ImageIcon, Layers, 
  CheckCircle, RefreshCcw, Sliders, Save, 
  Bookmark, Loader, LayoutTemplate, Move, 
  Package, Eye, X, Search, Filter, Check, Star, Settings, Lock, FileUp, Folder,
  GraduationCap, Play // <--- ÍCONES NOVOS ADICIONADOS
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURAÇÕES GERAIS E POSIÇÕES
// ============================================================================
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

const PORTRAIT_POS = { 
    name: { x: 0, y: 220 }, 
    price: { x: 0, y: 450 }, 
    limit: { x: 0, y: 900 }, 
    footer: { x: 0, y: 1000 } 
};

const LANDSCAPE_POS = { 
    name: { x: 0, y: 220 }, 
    price: { x: 0, y: 350 }, 
    limit: { x: 0, y: 620 }, 
    footer: { x: 0, y: 760 } 
};

const MEGA_PORTRAIT_POS = { 
    mega_name: { x: 0, y: 160 }, 
    mega_offer: { x: 0, y: 340 }, 
    mega_limit: { x: 0, y: 920 }, 
    mega_footer: { x: 0, y: 1060 } 
};

const MEGA_LANDSCAPE_POS = { 
    mega_name: { x: 0, y: 140 }, 
    mega_offer: { x: 0, y: 280 }, 
    mega_limit: { x: 0, y: 680 }, 
    mega_footer: { x: 0, y: 730 } 
};

const DEFAULT_DESIGN = {
  size: 'a4', orientation: 'portrait', bannerImage: null, backgroundImage: null, 
  bgColorFallback: '#ffffff', nameColor: '#000000', priceColor: '#cc0000', 
  showOldPrice: true, showSubtitle: false, 
  nameScale: 100, priceScale: 100, limitScale: 100,
  letterSpacing: 0, 
  positions: { ...PORTRAIT_POS, ...MEGA_PORTRAIT_POS }
};

// ============================================================================
// 2. UTILITÁRIOS (Formatadores)
// ============================================================================
const formatDateSafe = (d) => { try { return String(d).split('-').reverse().join('/'); } catch (e) { return d; } };
const formatTimeSafe = (d) => { try { return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const sanitizeFileName = (n) => String(n||'cartaz').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
const formatExcelPrice = (v) => { try { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? v : n.toFixed(2).replace('.', ','); } catch (e) { return v; } };

// ============================================================================
// 3. COMPONENTES VISUAIS (Banners e Cartazes)
// ============================================================================

// Balão do Tutorial
const TutorialTip = ({ text, onClick, style }) => (
  <div onClick={onClick} className="absolute z-50 bg-red-600 text-yellow-300 font-black text-xs uppercase px-4 py-3 leading-tight rounded-lg shadow-xl animate-bounce cursor-pointer border-2 border-yellow-300 transform -translate-x-1/2 left-1/2 hover:scale-110 transition-transform flex items-center justify-center" style={{ bottom: '100%', marginBottom: '12px', whiteSpace: 'nowrap', minHeight: '40px', ...style }}>
    {text}
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-red-600"></div>
  </div>
);

// Componente: Poster Padrão
const Poster = ({ product, design, width, height, id, isEditable, onUpdatePosition }) => {
  if (!product) return null;
  const d = { ...DEFAULT_DESIGN, ...design, positions: { ...(design.orientation === 'portrait' ? PORTRAIT_POS : LANDSCAPE_POS), ...(design?.positions || {}) } };
  const safePrice = product.price ? String(product.price) : '0,00';
  const priceParts = safePrice.includes(',') ? safePrice.split(',') : [safePrice, '00'];
  const scName = (Number(d.nameScale) || 100) / 100; 
  const scPrice = (Number(d.priceScale) || 100) / 100;
  const lSpacing = d.letterSpacing || 0;

  const oldPriceConfig = d.orientation === 'portrait' 
    ? { size: '55px', margin: '-15px', top: '0px' } 
    : { size: '30px', margin: '-100px', top: '-40px' };

  const handleMouseDown = (e, key) => {
      if (!isEditable) return; e.preventDefault(); const startX = e.clientX; const startY = e.clientY; const startPos = d.positions[key] || { x: 0, y: 0 };
      const handleMouseMove = (ev) => { onUpdatePosition(key, { x: startPos.x + (ev.clientX - startX) * 3.5, y: startPos.y + (ev.clientY - startY) * 3.5 }); };
      const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
      document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
  };

  const s = {
    container: { width: `${width}px`, height: `${height}px`, backgroundColor: 'white', overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif', userSelect: 'none' },
    bannerBox: { width: '100%', height: `220px`, position: 'absolute', top: 0, left: 0, backgroundImage: d.bannerImage ? `url(${d.bannerImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10 },
    movable: (key) => ({ position: 'absolute', left: 0, top: 0, transform: `translate(${d.positions[key]?.x || 0}px, ${d.positions[key]?.y || 0}px)`, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isEditable ? 'move' : 'default', border: isEditable ? '2px dashed #3b82f6' : 'none', backgroundColor: isEditable ? 'rgba(59, 130, 246, 0.1)' : 'transparent', zIndex: 20, padding: '5px' }),
    nameText: { fontSize: `${60 * scName}px`, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2', color: d.nameColor, wordBreak: 'break-word', pointerEvents: 'none', paddingLeft:'20px', paddingRight:'20px', letterSpacing: `${lSpacing}px` },
    subtitleText: { fontSize: `${30 * scName}px`, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', color: '#cc0000', marginTop: '10px', pointerEvents: 'none' },
    priceWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' },
    oldPriceWrapper: { position: 'relative', marginBottom: oldPriceConfig.margin, top: oldPriceConfig.top, zIndex: 6 }, 
    oldPriceText: { fontSize: oldPriceConfig.size, fontWeight: 'bold', color: '#555' },      
    mainPriceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: d.priceColor, lineHeight: 0.80, marginTop: '0px' },
    currency: { fontSize: `${45 * scPrice}px`, fontWeight: 'bold', marginTop: `${55 * scPrice}px`, marginRight: '10px' },
    priceBig: { fontSize: `${300 * scPrice}px`, fontWeight: '900', letterSpacing: '-12px', margin: 0, zIndex: 2, lineHeight: 0.85 },
    sideColumn: { display: 'flex', flexDirection: 'column', marginLeft: '10px', marginTop: `${55 * scPrice}px`, alignItems: 'flex-start', gap: `${15 * scPrice}px` },
    cents: { fontSize: `${75 * scPrice}px`, fontWeight: '900', lineHeight: 0.8, marginBottom: '0px' },
    unitBadge: { fontSize: `${30 * scPrice}px`, fontWeight: 'bold', textTransform: 'uppercase', color: '#333', backgroundColor: 'transparent', padding: '0', textAlign: 'center', width: '100%', display: 'flex', justifyContent: 'center' },
    limitContent: { fontSize: '22px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', borderTop: '2px solid #ffffff', paddingTop: '5px', paddingLeft: '20px', paddingRight: '20px', backgroundColor:'rgb(255, 255, 255)', borderRadius:'8px', pointerEvents: 'none' },
    footerText: { fontSize: '18px', fontWeight: 'bold', color: d.nameColor, textTransform: 'uppercase', pointerEvents: 'none', letterSpacing: '2px' }
  };

  return (
    <div id={id} style={s.container}>
      <div style={s.bannerBox}>{!d.bannerImage && <div style={{fontSize:'40px', fontWeight:'bold', opacity:0.2, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>BANNER</div>}</div>
      <div style={s.movable('name')} onMouseDown={(e)=>handleMouseDown(e, 'name')}><div style={s.nameText}>{product.name}</div>{d.showSubtitle && product.subtitle && <div style={s.subtitleText}>{product.subtitle}</div>}</div>
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

// Componente: Mega 10
const MegaPoster = ({ product, design, width, height, id, isEditable, onUpdatePosition }) => {
    if (!product) return null;
    const isPortrait = design.orientation === 'portrait';
    const d = { ...DEFAULT_DESIGN, ...design, positions: { ...(isPortrait ? MEGA_PORTRAIT_POS : MEGA_LANDSCAPE_POS), ...(design?.positions || {}) } };
    const scName = (Number(d.nameScale) || 100) / 100;
    const scPrice = (Number(d.priceScale) || 100) / 100;
    const scLimit = (Number(d.limitScale) || 100) / 100;
    const lSpacing = d.letterSpacing || 0;
    const bgFile = isPortrait ? '/assets/backgrounds/mega10_vertical.png' : '/assets/backgrounds/mega10_horizontal.png';

    const handleMouseDown = (e, key) => {
        if (!isEditable) return; e.preventDefault(); const startX = e.clientX; const startY = e.clientY; const startPos = d.positions[key] || { x: 0, y: 0 };
        const handleMouseMove = (ev) => { onUpdatePosition(key, { x: startPos.x + (ev.clientX - startX) * 3.5, y: startPos.y + (ev.clientY - startY) * 3.5 }); };
        const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
        document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp);
    };

    const s = {
        movable: (key) => ({ position: 'absolute', left: 0, top: 0, transform: `translate(${d.positions[key]?.x || 0}px, ${d.positions[key]?.y || 0}px)`, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isEditable ? 'move' : 'default', border: isEditable ? '2px dashed #3b82f6' : 'none', backgroundColor: isEditable ? 'rgba(59, 130, 246, 0.1)' : 'transparent', zIndex: 20, padding: '5px' })
    };
    const fontMega = 'Impact, "Arial Black", sans-serif';

    return (
        <div id={id} style={{ width: `${width}px`, height: `${height}px`, backgroundColor: 'white', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, backgroundImage: `url(${bgFile})`, backgroundSize: '100% 100%', zIndex: 1 }}></div>
            {design.bannerImage && ( <div style={{ width: '100%', height: '220px', position: 'absolute', top: 0, left: 0, backgroundImage: `url(${design.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10 }}></div> )}

            <div style={s.movable('mega_name')} onMouseDown={(e) => handleMouseDown(e, 'mega_name')}>
                <div style={{ padding: '0 20px', textAlign: 'center', width: '100%' }}>
                    <h1 style={{ fontSize: `${55 * scName}px`, fontFamily: fontMega, color: 'black', textTransform: 'uppercase', lineHeight: 1.2, marginBottom: '10px', letterSpacing: `${lSpacing}px` }}>{product.name}</h1>
                    {design.showSubtitle && product.subtitle && <h2 style={{ fontSize: `${30 * scName}px`, fontFamily: fontMega, color: '#cc0000', textTransform: 'uppercase', marginTop: '10px', letterSpacing: `${lSpacing}px` }}>{product.subtitle}</h2>}
                </div>
            </div>

            <div style={s.movable('mega_offer')} onMouseDown={(e) => handleMouseDown(e, 'mega_offer')}>
                <div style={{ fontSize: `${40 * scPrice}px`, fontFamily: fontMega, color: 'black', fontStyle: 'italic', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', letterSpacing: `${lSpacing}px` }}>
                    <span>LEVE</span> <span style={{ fontSize: '1.5em', color: '#cc0000' }}>{product.leve || 'X'}</span> <span style={{ color:'#cc0000', fontSize: '0.8em', marginLeft:'5px' }}>UNID.</span> <span>POR:</span>
                </div>
            </div>

            <div style={s.movable('mega_limit')} onMouseDown={(e) => handleMouseDown(e, 'mega_limit')}>
                {product.limit && (
                    <div style={{ fontSize: `${30 * scLimit}px`, fontFamily: fontMega, color: 'black', textTransform: 'uppercase', textAlign: 'center', width:'100%', letterSpacing: '1px' }}>
                        LIMITE DE: <span style={{color: '#cc0000'}}>{product.limit}</span> COMBOS POR CLIENTE
                    </div>
                )}
            </div>

            <div style={s.movable('mega_footer')} onMouseDown={(e) => handleMouseDown(e, 'mega_footer')}>
                <div style={{ textAlign: 'center', width:'100%' }}>
                    <p style={{ fontSize: '20px', fontFamily: fontMega, color: 'black', textTransform: 'uppercase', marginBottom: '5px', letterSpacing: '3px' }}>OFERTA VÁLIDA PARA {product.date}</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', fontStyle: 'italic', letterSpacing: '5px' }}>*Ou enquanto durar o estoque*</p>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// NOVO COMPONENTE: CAMINHO DO APRENDIZADO
// ============================================================================
const LearningPath = () => {
    const [selectedVideo, setSelectedVideo] = useState(null);
  
    // --- LISTA DE VÍDEOS ---
    const tutorials = [
      { 
        id: 1, 
        title: "# 1 COMO CRIAR CARTAZ PADRÃO", 
        thumb: "/assets/thumb-cartaz.png", 
        youtubeId: "4374wDa90_E" // Troque pelo ID real
      },
      { 
        id: 2, 
        title: "#2 - COMO IMPRIMIR 2 POR FOLHA", 
        thumb: "/assets/thumb-2por.png", 
        youtubeId: "vNSrtSsKeLQ" 
      },
      { 
        id: 3, 
        title: "EM BREVE", 
        thumb: "/assets/thumb-print.png", 
        youtubeId: "dQw4w9WgXcQ" 
      },
        { 
        id: 4, 
        title: "EM BREVE", 
        thumb: "/assets/thumb-mega.png", 
        youtubeId: "dQw4w9WgXcQ" 
      },
    ];
  
    return (
      <div className="p-10 h-full overflow-y-auto bg-slate-100">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-800 flex gap-3 items-center">
            <GraduationCap className="text-blue-600" size={32}/> 
            Caminho do Aprendizado
          </h2>
          <p className="text-slate-500 mt-2">Assista aos tutoriais para dominar a ferramenta.</p>
        </div>
  
        {/* GRADE DE VÍDEOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {tutorials.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedVideo(item.youtubeId)}
              className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* THUMBNAIL */}
              <div className="relative aspect-video bg-slate-800 flex items-center justify-center overflow-hidden">
                <img 
                  src={item.thumb} 
                  alt={item.title} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                  onError={(e) => {e.target.src = 'https://via.placeholder.com/640x360?text=VIDEO';}}
                />
                <div className="absolute w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white group-hover:scale-110 transition-transform">
                  <Play fill="white" className="text-white ml-1" size={24}/>
                </div>
              </div>
              {/* TEXTO */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">Assistir Aula</p>
              </div>
            </div>
          ))}
        </div>
  
        {/* MODAL DE VÍDEO */}
        {selectedVideo && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedVideo(null)}>
            <div className="w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/50 hover:bg-red-600 rounded-full p-2 transition-all z-10"
              >
                <X size={24}/>
              </button>
              <div className="aspect-video w-full">
                <iframe 
                  width="100%" height="100%" 
                  src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`} 
                  title="YouTube video player" frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

// ============================================================================
// 4. LÓGICA DO SISTEMA (Factory, Admin, Layout)
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

const PosterFactory = ({ mode, onAdminReady, currentUser, factoryType = 'default' }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [previewScale, setPreviewScale] = useState(0.3);
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', subtitle: 'SUBTITULO', price: '9,99', oldPrice: '21,99', unit: 'UNID', limit: 'X', leve: 'x', date: 'XX A XX/XX/XX', footer: '' });
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [editMode, setEditMode] = useState(false);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets(setDesign);
  const [autoLoaded, setAutoLoaded] = useState(false);
  
  // STATE PARA O TUTORIAL
  const [tutorialStep, setTutorialStep] = useState(0); 

  useEffect(() => { const h = window.innerHeight * 0.85; setPreviewScale(h / (design.orientation === 'portrait' ? 1123 : 794)); }, [design.orientation]);
  useEffect(() => { if (mode === 'admin' && onAdminReady) onAdminReady({ bulkProducts, design }); }, [bulkProducts, design, mode]);
  
  // CORREÇÃO: Reseta o autoLoaded quando muda o tipo de fábrica
  useEffect(() => {
    setAutoLoaded(false);
  }, [factoryType]);

  // CORREÇÃO DO LOOP INFINITO NOS PRESETS
  useEffect(() => { 
    if (presets.length > 0 && !autoLoaded) {
        let targetName = 'PADRÃO VERTICAL';
        if (factoryType === 'mega10') targetName = 'MEGA 10 VERTICAL';
        
        const p = presets.find(item => item.name.trim().toUpperCase() === targetName);
        if (p) { 
            loadPreset(p); 
            setAutoLoaded(true); 
        }
    }
  }, [presets, factoryType, autoLoaded]);

  const handleExcel = (e) => { 
      const f = e.target.files[0]; if(!f) return; 
      const r = new FileReader(); 
      r.onload = (evt) => { 
          const wb = XLSX.read(evt.target.result, { type: 'binary' }); 
          const d = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); 
          const m = d.map(item => {
              if (factoryType === 'mega10') {
                  return { name: item['Produto'] || 'Produto', leve: item['Leve'] || 'X', limit: item['Limite'] || '', date: item['Data'] || product.date };
              } else {
                  return { name: item['Produto']||'Produto', subtitle: item['Subtitulo']||'', price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: formatExcelPrice(item['Preço "DE"']), unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer };
              }
          }); 
          setBulkProducts(m); 
          if(mode==='local') alert(`${m.length} produtos carregados!`); 
      }; 
      r.readAsBinaryString(f); 
  };

  const handleFileUpload = (e, field) => { const f = e.target.files[0]; if(f) setDesign({...design, [field]: URL.createObjectURL(f)}); };
  const selectLib = (t, i) => { if(t==='banner') setDesign(p=>({...p, bannerImage: i.file ? `/assets/banners/${i.file}` : null})); else setDesign(p=>({...p, backgroundImage: i.file ? `/assets/backgrounds/${i.file}` : null, bgColorFallback: i.color})); };
  const updatePosition = (key, newPos) => { setDesign(prev => ({ ...prev, positions: { ...prev.positions, [key]: newPos } })); };
  const resetPositions = () => { if(confirm("Resetar posições?")) { const defaultPos = design.orientation === 'portrait' ? (factoryType === 'mega10' ? MEGA_PORTRAIT_POS : PORTRAIT_POS) : (factoryType === 'mega10' ? MEGA_LANDSCAPE_POS : LANDSCAPE_POS); setDesign(d => ({ ...d, positions: { ...d.positions, ...defaultPos }, nameScale: 100, priceScale: 100, limitScale: 100, letterSpacing: 0 })); }};
  
  const changeOrientation = (newOri) => { 
      let targetName = '';
      if (factoryType === 'default') {
          targetName = newOri === 'portrait' ? 'PADRÃO VERTICAL' : 'PADRÃO HORIZONTAL';
      } else {
          targetName = newOri === 'portrait' ? 'MEGA 10 VERTICAL' : 'MEGA 10 HORIZONTAL'; 
      }
      const foundPreset = presets.find(p => p.name.trim().toUpperCase() === targetName);
      if (foundPreset) {
          loadPreset(foundPreset);
      } else {
          const defaultPos = newOri === 'portrait' ? (factoryType === 'mega10' ? MEGA_PORTRAIT_POS : PORTRAIT_POS) : (factoryType === 'mega10' ? MEGA_LANDSCAPE_POS : LANDSCAPE_POS);
          setDesign({ ...design, orientation: newOri, positions: { ...design.positions, ...defaultPos } }); 
      }
  };

  const handleDateChange = (newDate) => { setProduct(prev => ({ ...prev, date: newDate })); if (bulkProducts.length > 0) setBulkProducts(prev => prev.map(item => ({ ...item, date: newDate }))); };
  
  const generateSingle = async () => { 
      setIsGenerating(true); 
      try {
          const el = document.getElementById('single-ghost'); 
          if(el) { 
              const c = await html2canvas(el, { scale: 2, useCORS: true, scrollY: 0 }); 
              const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size }); 
              pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight()); 
              pdf.save(`${sanitizeFileName(product.name)}.pdf`);
              await supabase.from('poster_logs').insert([{ store_email: currentUser?.email || 'desconhecido', product_name: product.name, banner_used: design.bannerImage ? design.bannerImage.split('/').pop() : 'sem-banner' }]);
          } 
      } catch(e) { alert("Erro: " + e.message); }
      finally { setIsGenerating(false); }
  };

  const generateLocalZip = async () => {
      if (bulkProducts.length === 0) return;
      setIsGenerating(true);
      const zip = new JSZip();
      const docUnified = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size });
      try {
          for (let i = 0; i < bulkProducts.length; i++) {
              const el = document.getElementById(`local-ghost-${i}`);
              if (el) {
                  const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, scrollY: 0 });
                  const imgData = canvas.toDataURL('image/jpeg', 0.8);
                  const pdf = new jsPDF({ orientation: design.orientation, unit: 'mm', format: design.size });
                  pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
                  zip.file(`${sanitizeFileName(bulkProducts[i].name)}.pdf`, pdf.output('blob'));
                  if (i > 0) docUnified.addPage();
                  docUnified.addImage(imgData, 'JPEG', 0, 0, docUnified.internal.pageSize.getWidth(), docUnified.internal.pageSize.getHeight());
              }
              await new Promise(r => setTimeout(r, 10));
          }
          zip.file("#ofertaspack.pdf", docUnified.output('blob'));
          saveAs(await zip.generateAsync({ type: "blob" }), "CARTAZES-PRONTOS.zip");
      } catch (error) { alert("Erro: " + error.message); }
      finally { setIsGenerating(false); }
  };

  const libraryData = { 
    banners: [ 
        { id: 'b1', file: 'ofertacliente.png', color: '#dc2626' }, 
        { id: 'b2', file: 'ofertaclientedobra.png', color: '#dc2626' }, 
        { id: 'b3', file: 'promocao.png', color: '#facc15' }, 
        { id: 'b4', file: 'promocaodobra.png', color: '#facc15' }, 
        { id: 'b5', file: 'rebaixo.png', color: '#000000' }, 
        { id: 'b6', file: 'rebaixodobra.png', color: '#000000' }, 
        { id: 'b7', file: 'fruta.png', color: '#16a34a' }, 
        { id: 'b8', file: 'frutadobra.png', color: '#16a34a' }, 
        { id: 'b9', file: 'carne.png', color: '#7f1d1d' }, 
        { id: 'b10', file: 'carnedobra.png', color: '#7f1d1d' }, 
        { id: 'b11', file: 'fechames.png', color: 'rgb(4, 14, 31)' }, 
        { id: 'b12', file: 'fechamesdobra.png', color: '#1e293b' }, 
        { id: 'b13', file: 'nopontoleve.png', color: '#06b6d4' }, 
        { id: 'b14', file: 'nopontolevedobra.png', color: '#06b6d4' }, 
        { id: 'b15', file: 'sextou.png', color: '#ea580c' }, 
        { id: 'b16', file: 'sextoudobra.png', color: '#ea580c' }, 
        { id: 'b17', file: 'superaçougue.png', color: '#991b1b' }, 
        { id: 'b18', file: 'superaçouguedobra.png', color: '#991b1b' }, 
        { id: 'b19', file: 'supersacolão.png', color: '#15803d' }, 
        { id: 'b20', file: 'supersacolãodobra.png', color: '#15803d' },
        { id: 'b21', file: 'comumdobra.png', color: '#15803d' }, 
        { id: 'b22', file: 'comum.png', color: '#15803d' },
        { id: 'b23', file: 'mega10.png', color: '#15803d' },
        { id: 'b24', file: 'mega10dobra.png', color: '#15803d' }
    ] 
  };

return (
    <div className="flex h-full flex-col md:flex-row bg-slate-50 overflow-hidden font-sans">
        <div className="w-[400px] bg-white h-full flex flex-col border-r border-slate-200 shadow-xl z-20">
            <div className={`p-6 text-white bg-gradient-to-r ${mode==='admin' ? 'from-slate-900 to-slate-800' : 'from-blue-600 to-blue-800'}`}>
                <h2 className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-2">
                    <Sliders size={18}/> {factoryType === 'mega10' ? 'FÁBRICA MEGA 10' : (mode==='admin'?'Editor Admin':'Fábrica Própria')}
                </h2>
            </div>
            <div className="flex border-b bg-slate-50">
                {/* ABA DE DADOS (COM TUTORIAL PASSO 2 -> 3) */}
                <button 
                  onClick={()=>{
                    setActiveTab('content'); 
                    if(mode === 'local' && tutorialStep === 2) setTutorialStep(3); 
                  }} 
                  className={`flex-1 py-4 font-bold text-sm transition-colors relative ${activeTab==='content'?'text-blue-600 border-b-2 border-blue-600 bg-white':'text-slate-500 hover:bg-slate-100'}`}
                >
                  1. Dados
                  {mode === 'local' && tutorialStep === 2 && <TutorialTip text="AGORA VOLTE" onClick={()=>setTutorialStep(3)}/>}
                </button>
                
                {/* ABA DE VISUAL (COM TUTORIAL PASSO 0 -> 1) */}
                <button 
                  onClick={()=>{
                    setActiveTab('design');
                    if(mode === 'local' && tutorialStep === 0) setTutorialStep(1);
                  }} 
                  className={`flex-1 py-4 font-bold text-sm transition-colors relative ${activeTab==='design'?'text-blue-600 border-b-2 border-blue-600 bg-white':'text-slate-500 hover:bg-slate-100'}`}
                >
                  2. Visual
                  {mode === 'local' && tutorialStep === 0 && <TutorialTip text="PRIMEIRO PASSO" onClick={()=>setTutorialStep(1)}/>}
                </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {activeTab === 'content' ? (
                    <div className="space-y-5 relative">
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl text-center" onClick={() => { if(mode === 'local' && tutorialStep === 3) setTutorialStep(4); }}>
                            <h3 className="text-blue-900 font-bold text-sm mb-3">GERAÇÃO EM MASSA</h3>
                            <label className="block w-full py-3 bg-white border-2 border-dashed border-blue-300 text-blue-600 rounded-lg cursor-pointer text-xs font-bold uppercase hover:bg-blue-50 hover:border-blue-500 transition-all mb-3"><Upload className="inline w-4 h-4 mr-2"/> Carregar Planilha<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>
                            {mode === 'local' && bulkProducts.length > 0 && (<button onClick={generateLocalZip} disabled={isGenerating} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold uppercase hover:shadow-lg transition-all flex items-center justify-center gap-2">{isGenerating ? <Loader className="animate-spin" size={16}/> : <Package size={16}/>} {isGenerating ? `Gerando ZIP...` : `Baixar ZIP (${bulkProducts.length})`}</button>)}
                            {mode === 'admin' && bulkProducts.length > 0 && <p className="text-xs text-green-700 font-bold flex items-center justify-center gap-1"><CheckCircle size={12}/> {bulkProducts.length} produtos carregados</p>}
                        </div>
                        
                        <div className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-400">PRODUTO ÚNICO</span><div className="border-t border-slate-200"></div></div>
                        
                        {/* INPUT COM TUTORIAL EMBUTIDO */}
                        <div className="relative" onClick={() => { if(mode === 'local' && tutorialStep === 3) setTutorialStep(4); }}>
                            {mode === 'local' && tutorialStep === 3 && (
                                <TutorialTip text="PREENCHA OS DADOS" onClick={()=>setTutorialStep(4)}/>
                            )}
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Produto</label>
                            <textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"/>
                        </div>
                        
                        {factoryType === 'mega10' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantidade (Leve)</label><input type="text" value={product.leve} onChange={e=>setProduct({...product, leve:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-xl text-center text-red-600 outline-none"/></div><div className="flex flex-col justify-center items-center"><span className="text-xs font-bold text-slate-400">PREÇO FIXO</span><span className="text-2xl font-black text-slate-800">R$ 10,00</span></div></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Limite (Opcional)</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm" placeholder="Ex: 5"/></div>
                            </>
                        ) : (
                            <>
                                <div><div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-slate-500 uppercase">Subtítulo (Vermelho)</label><label className="flex items-center gap-2 cursor-pointer text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"><input type="checkbox" checked={design.showSubtitle} onChange={e=>setDesign({...design, showSubtitle:e.target.checked})} className="hidden"/> {design.showSubtitle ? 'Ocultar' : 'Mostrar'}</label></div>{design.showSubtitle && <input type="text" value={product.subtitle} onChange={e=>setProduct({...product, subtitle:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-500 outline-none placeholder-red-200" placeholder="Ex: Pote 200g"/>}</div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Preço (R$)</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-xl text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"/></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none">{['UNID','Kg','100g','Pack','Cx'].map(u=><option key={u}>{u}</option>)}</select></div></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-sm"/></div><div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-5"><input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})} className="w-5 h-5 text-blue-600 rounded"/><div className="flex-1"><label className="text-xs font-bold text-slate-500 uppercase block">Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm font-bold text-slate-700" placeholder="Ex: 10,99"/></div></div></div>
                            </>
                        )}

                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Validade/Rodapé</label><input type="text" value={product.date} onChange={e=>handleDateChange(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm"/></div>
                        
                        {mode === 'local' && (<button onClick={generateSingle} disabled={isGenerating} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-700 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4">{isGenerating ? <Loader className="animate-spin"/> : <><Download size={18}/> BAIXAR CARTAZ (PDF)</>}</button>)}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* LISTA DE PRESETS COM TUTORIAL PASSO 1 -> 2 */}
                        <div className="flex flex-col gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100 shadow-sm relative">
                            {mode === 'local' && tutorialStep === 1 && (
                                <TutorialTip text="ESCOLHA UM PRESET" onClick={()=>setTutorialStep(2)} style={{top: '40px', left: '50%'}}/>
                            )}

                            <div className="flex justify-between items-center border-b border-purple-200 pb-2 mb-2"><div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase"><Bookmark size={14}/> Meus Presets (Nuvem)</div>{mode === 'admin' && (<div className="flex gap-2"><button onClick={()=>savePreset(design)} className="text-[10px] bg-purple-600 text-white px-3 py-1 rounded font-bold hover:bg-purple-700 flex items-center gap-1"><Save size={10}/> SALVAR</button><button onClick={resetPositions} className="text-[10px] bg-gray-400 text-white px-3 py-1 rounded font-bold hover:bg-gray-500 flex items-center gap-1"><RefreshCcw size={10}/> RESET</button></div>)}</div>
                            
                            {presets.length > 0 ? (
                                <div className="space-y-1"> 
                                    {presets.map((p,i)=>(
                                        <div key={i} 
                                             onClick={()=>{ 
                                                 loadPreset(p); 
                                                 if(mode === 'local' && tutorialStep === 1) setTutorialStep(2); 
                                             }} 
                                             className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 hover:bg-purple-100 cursor-pointer group"
                                        >
                                            <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                            {mode === 'admin' && <button onClick={(e)=>deletePreset(p.id,e)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={12}/></button>}
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-purple-400 italic text-center">Nenhum preset salvo na nuvem.</p>}
                        </div>
                        
                        {/* CONTROLES EXCLUSIVOS PARA O ADMIN */}
                        {mode === 'admin' && (
                            <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${editMode ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`} onClick={() => setEditMode(!editMode)}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${editMode ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{editMode ? <Move size={20}/> : <div className="w-5 h-5"/>}</div><div><h4 className={`font-bold text-sm ${editMode ? 'text-blue-700' : 'text-slate-600'}`}>Mover Itens (Drag & Drop)</h4><p className="text-[10px] text-slate-400">Clique e arraste Nome, Preço e Limite</p></div></div><div className={`w-12 h-6 rounded-full p-1 transition-colors ${editMode ? 'bg-blue-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editMode ? 'translate-x-6' : 'translate-x-0'}`}></div></div></div>
                        )}

                        {mode !== 'admin' && (
                            <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-3">
                                <Lock size={20} className="text-yellow-600"/>
                                <div>
                                    <h4 className="font-bold text-xs text-yellow-800 uppercase">Edição Bloqueada</h4>
                                    <p className="text-[10px] text-yellow-700">Selecione um Preset acima para mudar o formato.</p>
                                </div>
                            </div>
                        )}

                        {/* BOTÕES DE FORMATO - VISÍVEIS APENAS PARA ADMIN */}
                        {mode === 'admin' && (
                            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Formato</label><div className="flex gap-2"><button onClick={()=>changeOrientation('portrait')} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='portrait'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 hover:bg-slate-100'}`}>VERTICAL</button><button onClick={()=>changeOrientation('landscape')} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='landscape'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-600 hover:bg-slate-100'}`}>HORIZONTAL</button></div></div>
                        )}
                        
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Banners</label><div className="grid grid-cols-4 gap-2">{libraryData.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className={`h-10 rounded-md cursor-pointer border-2 transition-all ${design.bannerImage?.includes(b.file)?'border-blue-600 shadow-md scale-105':'border-transparent hover:border-slate-300'}`} style={{background:b.color, backgroundImage: `url(/assets/banners/${b.file})`, backgroundSize:'100% 100%'}}></div>)}<label className="h-10 bg-slate-100 border-2 border-dashed border-slate-300 rounded-md cursor-pointer flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 transition-colors"><Upload size={16}/><input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div></div>
                        
                        {/* EXIBE SLIDERS APENAS SE FOR ADMIN */}
                        {mode === 'admin' && (
                            factoryType === 'default' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor do Nome</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-slate-200"/></div><div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor do Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-slate-200"/></div></div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4"><h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Sliders size={14}/> Tamanhos (Escala)</h3><div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Nome</label><span className="text-[10px] font-bold text-blue-600">{design.nameScale}%</span></div><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div><div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Preço</label><span className="text-[10px] font-bold text-blue-600">{design.priceScale}%</span></div><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div></div>
                                </>
                            ) : (
                                // CONTROLES ESPECÍFICOS PARA MEGA 10
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Settings size={14}/> Escalas Individuais</h3>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Nome</label><span className="text-[10px] font-bold text-blue-600">{design.nameScale}%</span></div><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600"/></div>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Oferta (Leve)</label><span className="text-[10px] font-bold text-blue-600">{design.priceScale}%</span></div><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600"/></div>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Tamanho Limite</label><span className="text-[10px] font-bold text-blue-600">{design.limitScale || 100}%</span></div><input type="range" min="50" max="150" value={design.limitScale || 100} onChange={e=>setDesign({...design, limitScale: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600"/></div>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-slate-500">Espaçamento Letras</label><span className="text-[10px] font-bold text-blue-600">{design.letterSpacing || 0}px</span></div><input type="range" min="-2" max="20" value={design.letterSpacing || 0} onChange={e=>setDesign({...design, letterSpacing: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg accent-blue-600"/></div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
        
        {/* CORREÇÃO DO PROBLEMA AQUI: REMOVIDO ID single-ghost DA PRÉ-VISUALIZAÇÃO */}
        <div className="flex-1 flex items-center justify-center bg-slate-200 overflow-auto relative custom-scrollbar"><div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transformOrigin: 'center center'}}>
            {factoryType === 'mega10' ? 
                <MegaPoster product={mode==='local' && bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} isEditable={editMode} onUpdatePosition={updatePosition} />
                :
                <Poster product={mode==='local' && bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} isEditable={editMode} onUpdatePosition={updatePosition}/>
            }
        </div></div>

        {/* MANTÉM ID single-ghost APENAS AQUI (ÁREA OCULTA) */}
        <div style={{position:'absolute', top:0, left:'-9999px'}}>
            {bulkProducts.map((p, i) => (
                factoryType === 'mega10' ? 
                <MegaPoster key={i} id={`local-ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} /> 
                :
                <Poster key={i} id={`local-ghost-${i}`} product={p} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} />
            ))}
            {factoryType === 'mega10' ? 
                <MegaPoster id="single-ghost" product={product} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} />
                :
                <Poster id="single-ghost" product={product} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} />
            }
        </div>
    </div>
  );
};

const AdminDashboard = ({ onLogout }) => {
  const [allDownloads, setAllDownloads] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [factoryData, setFactoryData] = useState({ bulkProducts: [], design: DEFAULT_DESIGN });
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [logFilter, setLogFilter] = useState('all'); 
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [adminTab, setAdminTab] = useState('factory'); // NOVO: Controla aba (Factory ou Upload)
  const [uploadFile, setUploadFile] = useState(null);
  const [factoryMode, setFactoryMode] = useState('default'); 
  const STORES = ['loja01', 'loja02', 'loja03', 'loja04', 'loja05'];

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { 
      try { 
          const { data: f } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false }); 
          if(f) setFiles(f); 
          const { data: d } = await supabase.from('downloads').select('*'); 
          if(d) setAllDownloads(d);
          const { data: l } = await supabase.from('poster_logs').select('*').order('created_at', { ascending: false }).limit(100);
          if(l) setLogs(l);
      } catch(e){} 
  };
  
  const handleDelete = async (id) => { if(confirm("Apagar encarte?")) { await supabase.from('shared_files').delete().eq('id', id); fetchData(); }};
  const clearHistory = async () => { if(!confirm("Limpar histórico?")) return; try { await supabase.from('poster_logs').delete().neq('id', 0); fetchData(); } catch(e){} };
  const checkDownload = (store, fileId) => { return (allDownloads || []).some(d => d.file_id === fileId && d.store_email?.includes(store)); };

  const handleDirectUpload = async () => {
      if (!uploadFile || !title || !expiry) return alert("Preencha título, validade e escolha o arquivo!");
      setProcessing(true);
      try {
          const fileExt = uploadFile.name.split('.').pop();
          const fileName = `${sanitizeFileName(title)}_${Date.now()}.${fileExt}`;
          
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, uploadFile);
          if (upErr) throw upErr;
          
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          
          await supabase.from('shared_files').insert([{ 
              title, 
              expiry_date: expiry, 
              file_url: publicUrl, 
              products_json: [], // Vazio pois é upload direto
              design_json: {} 
          }]);
          
          alert("Arquivo enviado com sucesso!"); 
          setTitle(''); setExpiry(''); setUploadFile(null); fetchData();
      } catch(e) { alert("Erro no upload: "+e.message); }
      setProcessing(false);
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
                  zip.file(`${sanitizeFileName(bulkProducts[i].name)}.pdf`, pdf.output('blob'));
                  if (i > 0) docUnified.addPage();
                  const uw = docUnified.internal.pageSize.getWidth(); const uh = docUnified.internal.pageSize.getHeight();
                  docUnified.addImage(imgData, 'JPEG', 0, 0, uw, uh);
              }
              setProgress(Math.round(((i+1)/bulkProducts.length)*100));
              await new Promise(r=>setTimeout(r,10));
          }
          zip.file("#ofertaspack.pdf", docUnified.output('blob'));
          const zipContent = await zip.generateAsync({type:"blob"});
          const safeTitle = sanitizeFileName(title) || `Campanha_${Date.now()}`;
          const fileName = `${safeTitle}.zip`; 
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, zipContent, { contentType: 'application/zip' });
          if(upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          await supabase.from('shared_files').insert([{ title, expiry_date: expiry, file_url: publicUrl, products_json: bulkProducts, design_json: design }]);
          alert("Sucesso!"); setTitle(''); setExpiry(''); fetchData();
      } catch(e) { alert("Erro: "+e.message); }
      setProcessing(false);
  };

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.store_email && l.store_email.includes(logFilter));

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans relative">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-3"><Layers className="text-blue-400"/> PAINEL ADMIN</h1>
                <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                    <button onClick={()=>setAdminTab('factory')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${adminTab==='factory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Settings size={14}/> GERADOR
                    </button>
                    <button onClick={()=>setAdminTab('upload')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${adminTab==='upload' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <FileUp size={14}/> UPLOAD DIRETO
                    </button>
                </div>
            </div>

            {adminTab === 'factory' && (
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setFactoryMode('default')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${factoryMode === 'default' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}>PADRÃO</button>
                    <button onClick={() => setFactoryMode('mega10')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${factoryMode === 'mega10' ? 'bg-yellow-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>MEGA 10</button>
                </div>
            )}

            <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-lg font-bold flex items-center gap-2"><LogOut size={14}/> Sair</button>
        </div>
        
        {showCampaignsModal && ( 
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 p-4 flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg uppercase flex items-center gap-2"><Layers size={20} className="text-purple-400"/> Gerenciar Todas as Campanhas</h3>
                        <button onClick={()=>setShowCampaignsModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
                    </div>
                    <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                        <div className="grid grid-cols-1 gap-3">
                            {files.length === 0 ? <p className="text-center text-slate-400 mt-10">Nenhuma campanha encontrada.</p> : files.map(f => (
                                <div key={f.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 text-lg">{f.title}</h4>
                                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2"><Clock size={14}/> Vence: {formatDateSafe(f.expiry_date)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedDetail(f)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 flex items-center gap-2"><Eye size={16}/> Detalhes</button>
                                        <button onClick={()=>handleDelete(f.id)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 flex items-center gap-2"><Trash2 size={16}/> Excluir</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div> 
        )}

        {selectedDetail && ( 
            <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 p-4 flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2"><FileText size={16} className="text-blue-400"/> Status de Entrega</h3>
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
                                        {isDownloaded ? <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Recebido</span> : <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock size={14}/> Pendente</span>}
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
                {/* ÁREA DE PUBLICAÇÃO (Muda conforme a aba) */}
                <div className="p-6 bg-white border-b flex flex-col gap-4 shadow-sm z-30">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título da Campanha</label>
                            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Ofertas de Verão"/>
                        </div>
                        <div className="w-36">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Validade</label>
                            <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                    </div>
                    
                    {adminTab === 'upload' && (
                        <div className="w-full">
                            <label className="block w-full py-8 bg-green-50 border-2 border-dashed border-green-300 text-green-700 rounded-xl cursor-pointer hover:bg-green-100 transition-all text-center">
                                <FileUp className="mx-auto mb-2" size={32}/>
                                <span className="font-bold text-sm block">CLIQUE PARA SELECIONAR PDF ou ZIP</span>
                                <span className="text-xs opacity-70 block mt-1">{uploadFile ? uploadFile.name : 'Nenhum arquivo selecionado'}</span>
                                <input type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files[0])} accept=".pdf,.zip,.rar" />
                            </label>
                        </div>
                    )}

                    <button onClick={adminTab === 'factory' ? send : handleDirectUpload} disabled={processing} className={`w-full py-4 font-bold rounded-xl shadow-lg text-white flex items-center justify-center gap-2 transition-all ${processing ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'} ${adminTab === 'factory' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
                        {processing ? <Loader className="animate-spin"/> : (adminTab === 'factory' ? <><Upload size={20}/> PUBLICAR CARTAZES</> : <><CheckCircle size={20}/> ENVIAR ARQUIVO</>)}
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-slate-100">
                    {adminTab === 'factory' ? (
                        <PosterFactory mode="admin" onAdminReady={setFactoryData} currentUser={{email:'admin'}} factoryType={factoryMode} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center">
                            <Folder size={64} className="mb-4 text-green-200"/>
                            <h3 className="text-xl font-bold text-slate-600">Modo de Upload Direto</h3>
                            <p className="max-w-xs mt-2 text-sm">Use este modo para enviar PDFs ou ZIPs prontos (feitos no Photoshop/Canva) diretamente para as lojas.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="w-1/2 h-full bg-slate-50 p-8 overflow-y-auto">
                {/* PAINEL CAMPANHAS */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-lg"><Layers className="text-purple-500"/> Campanhas</h3>
                        <p className="text-sm text-slate-400 mt-1">{files.length} ativas.</p>
                    </div>
                    <button onClick={() => setShowCampaignsModal(true)} className="px-5 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 flex items-center gap-2">
                        <Sliders size={16}/> GERENCIAR
                    </button>
                </div>

                {/* PAINEL HISTÓRICO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-lg"><Clock className="text-orange-500"/> Histórico</h3>
                            <div className="flex gap-2">
                                <button onClick={clearHistory} className="text-xs text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg font-bold flex items-center gap-1"><Trash2 size={12}/> LIMPAR</button>
                                <button onClick={fetchData} className="text-xs text-blue-500 hover:bg-blue-50 px-3 py-2 rounded-lg font-bold flex items-center gap-1"><RefreshCcw size={12}/> ATUALIZAR</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <Filter size={16} className="text-slate-400"/>
                            <span className="text-xs font-bold text-slate-500 uppercase">Filtrar:</span>
                            <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none flex-1">
                                <option value="all">Todas as Lojas</option>
                                {STORES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr><th className="p-3">Horário</th><th className="p-3">Loja</th><th className="p-3">Produto</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.length === 0 ? <tr><td colSpan="3" className="p-4 text-center text-slate-400">Vazio.</td></tr> : filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono text-xs text-slate-500">{formatDateSafe(log.created_at.split('T')[0])} {formatTimeSafe(log.created_at)}</td>
                                        <td className="p-3 font-bold text-slate-700 uppercase">{log.store_email ? log.store_email.split('@')[0] : 'Admin'}</td>
                                        <td className="p-3 text-slate-600">{log.product_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <div style={{position:'absolute', top:0, left:'-9999px'}}>
            {factoryData.bulkProducts.map((p,i) => (
                factoryMode === 'mega10' ? 
                <MegaPoster key={i} id={`admin-ghost-${i}`} product={p} design={factoryData.design} width={factoryData.design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={factoryData.design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} /> 
                : 
                <Poster key={i} id={`admin-ghost-${i}`} product={p} design={factoryData.design} width={factoryData.design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={factoryData.design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} />
            ))}
        </div>
    </div>
  );
};

const StoreLayout = ({ user, onLogout }) => {
  // Views possíveis: 'files', 'learning', 'factory'
  const [view, setView] = useState('files');
  const [files, setFiles] = useState([]);
  const [myDownloads, setMyDownloads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [factoryMode, setFactoryMode] = useState('default'); 

  useEffect(() => { loadFiles(); }, []);
  const loadFiles = async () => { try { const today = new Date().toISOString().split('T')[0]; const { data: f } = await supabase.from('shared_files').select('*').gte('expiry_date', today).order('created_at', {ascending: false}); if(f) setFiles(f); const { data: dls } = await supabase.from('downloads').select('file_id').eq('store_email', user.email); if(dls) setMyDownloads(dls.map(d => d.file_id)); } catch(e) {} };
  const registerDownload = async (fileId) => { try { await supabase.from('downloads').insert([{ store_email: user.email, file_id: fileId }]); setMyDownloads(prev => [...prev, fileId]); } catch(e){} };
  
  const renderFiles = () => {
      const filtered = files.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase()));
      if (filtered.length === 0) return <div className="col-span-3 flex flex-col items-center justify-center h-64 text-slate-400"><FileText size={48} className="mb-4 opacity-20"/><p>Nenhum encarte encontrado.</p></div>;
      
      return filtered.map(f => { 
          const isDownloaded = myDownloads.includes(f.id); 
          return (
            <div key={f.id} className={`p-6 rounded-2xl shadow-sm transition-all duration-300 border group hover:-translate-y-1 ${isDownloaded ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100 hover:shadow-xl'}`}>
                <div className="flex justify-between mb-6">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDownloaded ? 'bg-green-200 text-green-700' : 'bg-red-50 text-red-500'}`}>{isDownloaded ? <Check size={20}/> : <FileText size={20}/>}</div>
                    <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-500 h-fit">Vence: {formatDateSafe(f.expiry_date)}</span>
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-6 line-clamp-2 h-14">{f.title}</h3>
                <a href={f.file_url} target="_blank" rel="noreferrer" onClick={()=>registerDownload(f.id)} className={`block w-full py-4 font-bold rounded-xl text-center shadow-lg transition-all flex items-center justify-center gap-2 group-hover:scale-105 ${isDownloaded ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>{isDownloaded ? <><CheckCircle size={20}/> JÁ BAIXADO</> : <><Download size={20}/> Baixar PACOTE (ZIP)</>}</a>
            </div>
          ); 
      });
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
        {/* SIDEBAR LATERAL */}
        <div className="w-24 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center py-8 text-white z-50 shadow-2xl">
            <div className="mb-10 p-3 bg-white/10 rounded-2xl backdrop-blur-sm"><ImageIcon className="text-white w-8 h-8"/></div>
            
            <div className="space-y-6 flex flex-col w-full px-4">
                {/* Botão Matriz (Arquivos) */}
                <button onClick={()=>setView('files')} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='files'?'bg-blue-600 shadow-lg shadow-blue-900/50 scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <LayoutTemplate size={24}/>
                    <span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">Matriz</span>
                </button>

                {/* Botão Aprenda (Novo) */}
                <button onClick={()=>setView('learning')} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='learning'?'bg-purple-600 shadow-lg scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <GraduationCap size={24}/>
                    <span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">Aprenda</span>
                </button>

                {/* Separador */}
                <div className="h-px w-full bg-white/10 my-2"></div>

                {/* Botão Fábrica Padrão */}
                <button onClick={()=>{setView('factory'); setFactoryMode('default');}} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='factory' && factoryMode==='default' ?'bg-blue-500 shadow-lg shadow-blue-900/50 scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <Layers size={24}/>
                    <span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">Padrão</span>
                </button>

                {/* Botão Fábrica Mega 10 */}
                <button onClick={()=>{setView('factory'); setFactoryMode('mega10');}} className={`p-4 rounded-2xl transition-all duration-300 group relative flex justify-center ${view==='factory' && factoryMode==='mega10' ?'bg-yellow-500 text-slate-900 shadow-lg scale-110':'hover:bg-white/10 text-slate-400 hover:text-white'}`}>
                    <Star size={24}/>
                    <span className="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">Mega 10</span>
                </button>
            </div>

            <div className="mt-auto px-4 w-full">
                <button onClick={onLogout} className="p-4 w-full flex justify-center hover:bg-red-600/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                    <LogOut size={24}/>
                </button>
            </div>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* VIEW 1: ARQUIVOS/MATRIZ */}
            {view === 'files' && (
                <div className="p-10 h-full overflow-y-auto">
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-3xl font-extrabold text-slate-800 flex gap-3 items-center">
                            <LayoutTemplate className="text-blue-600"/> Encartes da Matriz
                        </h2>
                        <div className="relative w-96">
                            <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
                            <input type="text" placeholder="Pesquisar campanha..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-600"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                        {renderFiles()}
                    </div>
                </div>
            )}

            {/* VIEW 2: APRENDIZADO (NOVO) */}
            {view === 'learning' && (
                <LearningPath />
            )}

            {/* VIEW 3: FÁBRICA (PADRÃO OU MEGA 10) */}
            {view === 'factory' && (
                <PosterFactory 
                    key={factoryMode} // <--- ISSO RESOLVE A TELA BRANCA AO TROCAR DE MODO
                    mode="local" 
                    currentUser={user} 
                    factoryType={factoryMode} 
                />
            )}

        </div>
    </div>
  );
};

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
  if (session?.user?.email?.includes('admin')) return <AdminDashboard onLogout={handleLogout} />;
  return <StoreLayout user={session.user} onLogout={handleLogout} />;
};

export default App;