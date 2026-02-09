import React, { useState, useEffect, createContext, useContext } from 'react';
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
  GraduationCap, Play, Timer, CalendarClock, Sun, Moon, Sparkles, Zap, TrendingUp
} from 'lucide-react';

// ============================================================================
// THEME CONTEXT (LÓGICA DO TEMA)
// ============================================================================
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="theme-switcher" title="Alternar Tema">
      {theme === 'dark' ? <Sun size={20} className="text-yellow-400"/> : <Moon size={20} className="text-blue-600"/>}
    </button>
  );
};

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
// COMPONENTE: CRONÔMETRO
// ============================================================================
const CountdownTimer = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState('');
  
    useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = new Date(targetDate).getTime() - now;
  
        if (distance < 0) {
          clearInterval(interval);
          setTimeLeft("LIBERANDO...");
          window.location.reload(); 
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          
          if (days > 0) {
              setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          } else {
              setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          }
        }
      }, 1000);
  
      return () => clearInterval(interval);
    }, [targetDate]);
  
    return <span className="font-mono text-lg font-black tracking-widest text-[var(--accent)] animate-pulse">{timeLeft}</span>;
};

// ============================================================================
// 3. COMPONENTES VISUAIS (Banners e Cartazes)
// ============================================================================

const TutorialTip = ({ text, onClick, style }) => (
  <div onClick={onClick} className="absolute z-50 bg-[var(--accent)] text-white font-bold text-xs uppercase px-4 py-2 rounded-lg shadow-xl animate-bounce cursor-pointer border-2 border-white transform -translate-x-1/2 left-1/2 hover:scale-110 transition-transform flex items-center justify-center" style={{ bottom: '100%', marginBottom: '12px', whiteSpace: 'nowrap', minHeight: '40px', ...style }}>
    {text}
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--accent)]"></div>
  </div>
);

// Componente: Poster Padrão (MANTIDO IGUAL)
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
    nameText: { fontSize: `${60 * scName}px`, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.2', color: d.nameColor, wordBreak: 'break-word', pointerEvents: 'none', paddingLeft: '50px', paddingRight: '50px', letterSpacing: `${lSpacing}px`, whiteSpace: 'pre-wrap' },
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
      <div style={s.movable('name')} onMouseDown={(e)=>handleMouseDown(e, 'name')}>
          <div style={s.nameText}>{product.name}</div>
          {product.subtitle && <div style={s.subtitleText}>{product.subtitle}</div>}
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

// Componente: Mega 10 (MANTIDO IGUAL)
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
                <div style={{ padding: '0 50px', textAlign: 'center', width: '100%' }}>
                    <h1 style={{ fontSize: `${55 * scName}px`, fontFamily: fontMega, color: 'black', textTransform: 'uppercase', lineHeight: 1.2, marginBottom: '10px', letterSpacing: `${lSpacing}px`, whiteSpace: 'pre-wrap' }}>{product.name}</h1>
                    {product.subtitle && <h2 style={{ fontSize: `${30 * scName}px`, fontFamily: fontMega, color: '#cc0000', textTransform: 'uppercase', marginTop: '10px', letterSpacing: `${lSpacing}px` }}>{product.subtitle}</h2>}
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
// COMPONENTE: CAMINHO DO APRENDIZADO
// ============================================================================
const LearningPath = () => {
    const [selectedVideo, setSelectedVideo] = useState(null);
  
    const tutorials = [
      { id: 1, title: "# 1 - COMO CRIAR CARTAZ PADRÃO", thumb: "/assets/thumb-cartaz.png", youtubeId: "4374wDa90_E" },
      { id: 2, title: "# 2 - COMO IMPRIMIR 2 POR FOLHA", thumb: "/assets/thumb-2por.png", youtubeId: "vNSrtSsKeLQ" },
      { id: 3, title: "# 3 - MEGA 10", thumb: "/assets/thumb-mega10.png", youtubeId: "zGmBddxDTJ8" },
      { id: 4, title: "EM BREVE", thumb: "/assets/thumb-mega.png", youtubeId: "dQw4w9WgXcQ" },
    ];
  
    return (
      <div className="p-10 h-full overflow-y-auto" style={{backgroundColor: 'var(--bg-page)', color: 'var(--text-main)'}}>
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold flex gap-3 items-center">
            <GraduationCap className="text-[var(--accent)]" size={32}/> 
            Caminho do Aprendizado
          </h2>
          <p className="text-[var(--text-muted)] mt-2">Assista aos tutoriais para dominar a ferramenta.</p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {tutorials.map((item, index) => (
            <div key={item.id} onClick={() => setSelectedVideo(item.youtubeId)} className="group bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
                <img src={item.thumb} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" onError={(e) => {e.target.src = 'https://via.placeholder.com/640x360?text=VIDEO';}} />
                <div className="absolute w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white group-hover:scale-110 transition-transform">
                  <Play fill="white" className="text-white ml-1" size={24}/>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{item.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-2 font-bold uppercase tracking-wider">Assistir Aula</p>
              </div>
            </div>
          ))}
        </div>
  
        {selectedVideo && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedVideo(null)}>
            <div className="w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/50 hover:bg-red-600 rounded-full p-2 transition-all z-10"><X size={24}/></button>
              <div className="aspect-video w-full">
                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

// ============================================================================
// 4. LÓGICA DO SISTEMA (Factory, Admin, Layout) - TODAS FUNÇÕES MANTIDAS
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
  const [product, setProduct] = useState({ name: 'OFERTA EXEMPLO', subtitle: '', price: '9,99', oldPrice: '21,99', unit: 'UNID', limit: 'X', leve: 'x', date: 'XX A XX/XX/XX', footer: '' });
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [editMode, setEditMode] = useState(false);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets(setDesign);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); 

  useEffect(() => { const h = window.innerHeight * 0.85; setPreviewScale(h / (design.orientation === 'portrait' ? 1123 : 794)); }, [design.orientation]);
  useEffect(() => { if (mode === 'admin' && onAdminReady) onAdminReady({ bulkProducts, design }); }, [bulkProducts, design, mode]);
  useEffect(() => { setAutoLoaded(false); }, [factoryType]);

  // CORREÇÃO: Loop infinito + Carregamento do MEGA 10 V2
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
              const excelSubtitle = item['Subtitulo'] || item['Subtítulo'] || '';
              if (factoryType === 'mega10') {
                  return { name: item['Produto'] || 'Produto', subtitle: excelSubtitle, leve: item['Leve'] || 'X', limit: item['Limite'] || '', date: item['Data'] || product.date };
              } else {
                  return { name: item['Produto']||'Produto', subtitle: excelSubtitle, price: (String(item['Preço']||'00').trim()) + (String(item['Preço cent.']||',00').trim()), oldPrice: formatExcelPrice(item['Preço "DE"']), unit: item['Unidade']||'Un', limit: item['Limite']||'', date: item['Data']||product.date, footer: product.footer };
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
          targetName = newOri === 'portrait' ? 'MEGA 10 V2' : 'MEGA 10 HORIZONTAL'; 
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
    <div className="flex h-full flex-col md:flex-row bg-[var(--bg-page)] overflow-hidden font-sans transition-colors duration-300">
        {/* SIDEBAR COM TEMA APLICADO */}
        <div className="w-[400px] bg-[var(--bg-surface)] h-full flex flex-col border-r border-[var(--border)] shadow-xl z-20">
            <div className={`p-6 text-white bg-gradient-to-r ${mode==='admin' ? 'from-slate-900 to-slate-800' : 'from-blue-600 to-blue-800'}`}>
                <h2 className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-2">
                    <Sliders size={18}/> {factoryType === 'mega10' ? 'FÁBRICA MEGA 10' : (mode==='admin'?'Editor Admin':'Fábrica Própria')}
                </h2>
            </div>
            
            {/* TABS COM CORES DO TEMA */}
            <div className="flex border-b border-[var(--border)] bg-[var(--bg-page)]">
                <button 
                  onClick={()=>{ setActiveTab('content'); if(mode === 'local' && tutorialStep === 2) setTutorialStep(3); }} 
                  className={`flex-1 py-4 font-bold text-sm transition-colors relative ${activeTab==='content'?'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-surface)]':'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}
                >
                  1. Dados
                  {mode === 'local' && tutorialStep === 2 && <TutorialTip text="AGORA VOLTE" onClick={()=>setTutorialStep(3)}/>}
                </button>
                <button 
                  onClick={()=>{ setActiveTab('design'); if(mode === 'local' && tutorialStep === 0) setTutorialStep(1); }} 
                  className={`flex-1 py-4 font-bold text-sm transition-colors relative ${activeTab==='design'?'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--bg-surface)]':'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}
                >
                  2. Visual
                  {mode === 'local' && tutorialStep === 0 && <TutorialTip text="PRIMEIRO PASSO" onClick={()=>setTutorialStep(1)}/>}
                </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-[var(--text-main)]">
                {activeTab === 'content' ? (
                    <div className="space-y-5 relative">
                        {/* BOX DE UPLOAD - ESTILIZADO */}
                        <div className="bg-[var(--accent-light)] border border-blue-200 p-5 rounded-xl text-center" onClick={() => { if(mode === 'local' && tutorialStep === 3) setTutorialStep(4); }}>
                            <h3 className="text-[var(--accent)] font-bold text-sm mb-3">GERAÇÃO EM MASSA</h3>
                            <label className="block w-full py-3 bg-[var(--bg-surface)] border-2 border-dashed border-blue-300 text-[var(--accent)] rounded-lg cursor-pointer text-xs font-bold uppercase hover:border-[var(--accent)] transition-all mb-3"><Upload className="inline w-4 h-4 mr-2"/> Carregar Planilha<input type="file" className="hidden" onChange={handleExcel} accept=".xlsx, .csv" /></label>
                            {mode === 'local' && bulkProducts.length > 0 && (<button onClick={generateLocalZip} disabled={isGenerating} className="btn-primary w-full py-3 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2">{isGenerating ? <Loader className="animate-spin" size={16}/> : <Package size={16}/>} {isGenerating ? `Gerando ZIP...` : `Baixar ZIP (${bulkProducts.length})`}</button>)}
                            {mode === 'admin' && bulkProducts.length > 0 && <p className="text-xs text-green-600 font-bold flex items-center justify-center gap-1"><CheckCircle size={12}/> {bulkProducts.length} produtos carregados</p>}
                        </div>
                        
                        <div className="relative"><span className="absolute -top-2 left-3 bg-[var(--bg-surface)] px-1 text-[10px] font-bold text-[var(--text-muted)]">PRODUTO ÚNICO</span><div className="border-t border-[var(--border)]"></div></div>
                        
                        <div className="relative" onClick={() => { if(mode === 'local' && tutorialStep === 3) setTutorialStep(4); }}>
                            {mode === 'local' && tutorialStep === 3 && (<TutorialTip text="PREENCHA OS DADOS" onClick={()=>setTutorialStep(4)}/>)}
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Nome do Produto</label>
                            <textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg font-bold focus:border-[var(--accent)] outline-none resize-none h-20"/>
                        </div>
                        
                        {factoryType === 'mega10' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Quantidade (Leve)</label><input type="text" value={product.leve} onChange={e=>setProduct({...product, leve:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg font-bold text-xl text-center outline-none"/></div><div className="flex flex-col justify-center items-center"><span className="text-xs font-bold text-[var(--text-muted)]">PREÇO FIXO</span><span className="text-2xl font-black text-[var(--text-main)]">R$ 10,00</span></div></div>
                                <div><label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Limite (Opcional)</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg text-sm" placeholder="Ex: 5"/></div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Subtítulo (Opcional)</label>
                                    <input type="text" value={product.subtitle} onChange={e=>setProduct({...product, subtitle:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] rounded-lg font-bold text-red-500 focus:border-red-500 outline-none" placeholder="Deixe vazio para não aparecer"/>
                                </div>

                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Preço (R$)</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg font-bold text-xl outline-none"/></div><div><label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg font-bold outline-none">{['UNID','Kg','100g','Pack','Cx'].map(u=><option key={u}>{u}</option>)}</select></div></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg text-sm"/></div><div className="flex items-center gap-3 bg-[var(--bg-page)] p-3 rounded-lg border border-[var(--border)] mt-5"><input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})} className="w-5 h-5 accent-blue-600 rounded"/><div className="flex-1"><label className="text-xs font-bold text-[var(--text-muted)] uppercase block">Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full bg-transparent border-b border-[var(--border)] focus:border-blue-500 outline-none text-sm font-bold text-[var(--text-muted)]" placeholder="Ex: 10,99"/></div></div></div>
                            </>
                        )}

                        <div><label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Validade/Rodapé</label><input type="text" value={product.date} onChange={e=>handleDateChange(e.target.value)} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg text-sm"/></div>
                        
                        {mode === 'local' && (<button onClick={generateSingle} disabled={isGenerating} className="btn-primary w-full py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4">{isGenerating ? <Loader className="animate-spin"/> : <><Download size={18}/> BAIXAR CARTAZ (PDF)</>}</button>)}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* PRESETS */}
                        <div className="flex flex-col gap-3 p-4 bg-[var(--accent-light)] rounded-xl border border-blue-100 shadow-sm relative">
                            {mode === 'local' && tutorialStep === 1 && (<TutorialTip text="ESCOLHA UM PRESET" onClick={()=>setTutorialStep(2)} style={{top: '40px', left: '50%'}}/>)}

                            <div className="flex justify-between items-center border-b border-blue-200 pb-2 mb-2"><div className="flex items-center gap-2 text-[var(--accent)] font-bold text-xs uppercase"><Bookmark size={14}/> Meus Presets (Nuvem)</div>{mode === 'admin' && (<div className="flex gap-2"><button onClick={()=>savePreset(design)} className="text-[10px] bg-purple-600 text-white px-3 py-1 rounded font-bold hover:bg-purple-700 flex items-center gap-1"><Save size={10}/> SALVAR</button><button onClick={resetPositions} className="text-[10px] bg-gray-400 text-white px-3 py-1 rounded font-bold hover:bg-gray-500 flex items-center gap-1"><RefreshCcw size={10}/> RESET</button></div>)}</div>
                            
                            {presets.length > 0 ? (
                                <div className="space-y-1"> 
                                    {presets.map((p,i)=>(
                                        <div key={i} onClick={()=>{ loadPreset(p); if(mode === 'local' && tutorialStep === 1) setTutorialStep(2); }} className="flex justify-between items-center bg-[var(--bg-surface)] p-2 rounded border border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer group">
                                            <span className="text-xs font-bold text-[var(--text-main)]">{p.name}</span>
                                            {mode === 'admin' && <button onClick={(e)=>deletePreset(p.id,e)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={12}/></button>}
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-[var(--text-muted)] italic text-center">Nenhum preset salvo na nuvem.</p>}
                        </div>
                        
                        {mode === 'admin' && (<div className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${editMode ? 'border-blue-500 bg-blue-50' : 'border-[var(--border)] hover:border-blue-300'}`} onClick={() => setEditMode(!editMode)}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${editMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{editMode ? <Move size={20}/> : <div className="w-5 h-5"/>}</div><div><h4 className={`font-bold text-sm ${editMode ? 'text-blue-700' : 'text-gray-600'}`}>Mover Itens (Drag & Drop)</h4><p className="text-[10px] text-gray-400">Clique e arraste Nome, Preço e Limite</p></div></div><div className={`w-12 h-6 rounded-full p-1 transition-colors ${editMode ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editMode ? 'translate-x-6' : 'translate-x-0'}`}></div></div></div>)}

                        {mode !== 'admin' && (
                            <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-3">
                                <Lock size={20} className="text-yellow-600"/>
                                <div><h4 className="font-bold text-xs text-yellow-800 uppercase">Edição Bloqueada</h4><p className="text-[10px] text-yellow-700">Selecione um Preset acima para mudar o formato.</p></div>
                            </div>
                        )}

                        {mode === 'admin' && (<div><label className="text-xs font-bold text-[var(--text-muted)] uppercase block mb-2">Formato</label><div className="flex gap-2"><button onClick={()=>changeOrientation('portrait')} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='portrait'?'bg-blue-600 text-white border-blue-600':'bg-[var(--bg-surface)] text-[var(--text-main)]'}`}>VERTICAL</button><button onClick={()=>changeOrientation('landscape')} className={`flex-1 py-2 text-xs font-bold rounded border ${design.orientation==='landscape'?'bg-blue-600 text-white border-blue-600':'bg-[var(--bg-surface)] text-[var(--text-main)]'}`}>HORIZONTAL</button></div></div>)}
                        
                        <div><label className="text-xs font-bold text-[var(--text-muted)] uppercase block mb-2">Banners</label><div className="grid grid-cols-4 gap-2">{libraryData.banners.map(b=><div key={b.id} onClick={()=>selectLib('banner', b)} className={`h-10 rounded-md cursor-pointer border-2 transition-all ${design.bannerImage?.includes(b.file)?'border-blue-600 shadow-md scale-105':'border-transparent hover:border-gray-300'}`} style={{background:b.color, backgroundImage: `url(/assets/banners/${b.file})`, backgroundSize:'100% 100%'}}></div>)}<label className="h-10 bg-[var(--bg-page)] border-2 border-dashed border-[var(--border)] rounded-md cursor-pointer flex items-center justify-center text-[var(--text-muted)] hover:text-blue-500 transition-colors"><Upload size={16}/><input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label></div></div>
                        
                        {mode === 'admin' && (
                            factoryType === 'default' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-[var(--text-muted)] uppercase block mb-1">Cor do Nome</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-[var(--border)]"/></div><div><label className="text-xs font-bold text-[var(--text-muted)] uppercase block mb-1">Cor do Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full h-10 rounded cursor-pointer border border-[var(--border)]"/></div></div>
                                    <div className="bg-[var(--bg-page)] p-4 rounded-xl border border-[var(--border)] space-y-4"><h3 className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2"><Sliders size={14}/> Tamanhos (Escala)</h3><div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)]">Tamanho Nome</label><span className="text-[10px] font-bold text-blue-600">{design.nameScale}%</span></div><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div><div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)]">Tamanho Preço</label><span className="text-[10px] font-bold text-blue-600">{design.priceScale}%</span></div><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div></div>
                                </>
                            ) : (
                                <div className="bg-[var(--bg-page)] p-4 rounded-xl border border-[var(--border)] space-y-4">
                                    <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2"><Settings size={14}/> Escalas Individuais</h3>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)]">Tamanho Nome</label><span className="text-[10px] font-bold text-blue-600">{design.nameScale}%</span></div><input type="range" min="50" max="150" value={design.nameScale} onChange={e=>setDesign({...design, nameScale: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600"/></div>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)]">Tamanho Oferta (Leve)</label><span className="text-[10px] font-bold text-blue-600">{design.priceScale}%</span></div><input type="range" min="50" max="150" value={design.priceScale} onChange={e=>setDesign({...design, priceScale: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600"/></div>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)]">Tamanho Limite</label><span className="text-[10px] font-bold text-blue-600">{design.limitScale || 100}%</span></div><input type="range" min="50" max="150" value={design.limitScale || 100} onChange={e=>setDesign({...design, limitScale: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600"/></div>
                                    <div><div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-[var(--text-muted)]">Espaçamento Letras</label><span className="text-[10px] font-bold text-blue-600">{design.letterSpacing || 0}px</span></div><input type="range" min="-2" max="20" value={design.letterSpacing || 0} onChange={e=>setDesign({...design, letterSpacing: Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600"/></div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-page)] overflow-auto relative custom-scrollbar">
            <div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transformOrigin: 'center center'}}>
                {factoryType === 'mega10' ? 
                    <MegaPoster product={mode==='local' && bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} isEditable={editMode} onUpdatePosition={updatePosition} />
                    :
                    <Poster product={mode==='local' && bulkProducts.length>0 ? bulkProducts[0] : product} design={design} width={design.orientation==='portrait'?A4_WIDTH_PX:A4_HEIGHT_PX} height={design.orientation==='portrait'?A4_HEIGHT_PX:A4_WIDTH_PX} isEditable={editMode} onUpdatePosition={updatePosition}/>
                }
            </div>
        </div>

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
  const [releaseDate, setReleaseDate] = useState(''); 
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [factoryData, setFactoryData] = useState({ bulkProducts: [], design: DEFAULT_DESIGN });
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [logFilter, setLogFilter] = useState('all'); 
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [adminTab, setAdminTab] = useState('factory');
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

  const getSafeReleaseDate = (localDateString) => {
      if (!localDateString) return null;
      return new Date(localDateString).toISOString();
  };

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
              release_date: getSafeReleaseDate(releaseDate), 
              file_url: publicUrl, 
              products_json: [], 
              design_json: {} 
          }]);
          
          alert("Arquivo enviado com sucesso!"); 
          setTitle(''); setExpiry(''); setReleaseDate(''); setUploadFile(null); fetchData();
      } catch(e) { alert("Erro no upload: "+e.message); }
      setProcessing(false);
  };

  // --- NOVA FUNÇÃO SEND OTIMIZADA PARA LOTES GRANDES ---
  const send = async () => {
      if(!title || !expiry || factoryData.bulkProducts.length === 0) return alert("Faltam dados!");
      setProcessing(true); 
      setProgress(0);
      
      const zip = new JSZip();
      const docUnified = new jsPDF({ orientation: factoryData.design.orientation, unit: 'mm', format: factoryData.design.size });

      // CONFIGURAÇÃO INTELIGENTE DE QUALIDADE
      const isHeavy = factoryData.bulkProducts.length > 50;
      const renderScale = isHeavy ? 1.0 : 1.5; 
      const jpegQuality = isHeavy ? 0.6 : 0.8; 

      try {
          const { bulkProducts, design } = factoryData;
          
          for(let i=0; i<bulkProducts.length; i++) {
              const el = document.getElementById(`admin-ghost-${i}`);
              if(el) { 
                  const c = await html2canvas(el, {
                      scale: renderScale, 
                      useCORS: true, 
                      scrollY: 0,
                      logging: false 
                  }); 
                  
                  const imgData = c.toDataURL('image/jpeg', jpegQuality);
                  
                  const pdf = new jsPDF({unit:'mm', format: design.size, orientation: design.orientation});
                  const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
                  pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
                  
                  zip.file(`${sanitizeFileName(bulkProducts[i].name)}.pdf`, pdf.output('blob'));
                  
                  if (i > 0) docUnified.addPage();
                  const uw = docUnified.internal.pageSize.getWidth(); const uh = docUnified.internal.pageSize.getHeight();
                  docUnified.addImage(imgData, 'JPEG', 0, 0, uw, uh);
              }

              setProgress(Math.round(((i+1)/bulkProducts.length)*100));
              
              if (i % 10 === 0) await new Promise(r => setTimeout(r, 300));
              else await new Promise(r => setTimeout(r, 10));
          }

          zip.file("#ofertaspack.pdf", docUnified.output('blob'));
          
          const zipContent = await zip.generateAsync({type:"blob"});
          
          if (zipContent.size > 50000000) console.warn("Atenção: Arquivo maior que 50MB!");

          const safeTitle = sanitizeFileName(title) || `Campanha_${Date.now()}`;
          const fileName = `${safeTitle}.zip`; 
          
          const { error: upErr } = await supabase.storage.from('excel-files').upload(fileName, zipContent, { contentType: 'application/zip' });
          if(upErr) throw upErr;
          
          const { data: { publicUrl } } = supabase.storage.from('excel-files').getPublicUrl(fileName);
          
          await supabase.from('shared_files').insert([{ 
              title, 
              expiry_date: expiry,
              release_date: getSafeReleaseDate(releaseDate), 
              file_url: publicUrl, 
              products_json: bulkProducts, 
              design_json: design 
          }]);
          
          alert(isHeavy ? "Lote Grande Enviado! (Qualidade otimizada para web)" : "Sucesso!"); 
          setTitle(''); setExpiry(''); setReleaseDate(''); fetchData();

      } catch(e) { 
          alert("Erro: "+e.message); 
      }
      setProcessing(false);
  };

  const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.store_email && l.store_email.includes(logFilter));

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)] font-sans relative transition-colors duration-300">
        <div className="bg-[var(--bg-surface)] border-b border-[var(--border)] p-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <h1 className="font-extrabold text-xl tracking-tight flex items-center gap-3 text-[var(--text-main)]"><Layers className="text-[var(--accent)]"/> PAINEL ADMIN</h1>
                <div className="flex bg-[var(--bg-page)] rounded-lg p-1 gap-1 border border-[var(--border)]">
                    <button onClick={()=>setAdminTab('factory')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${adminTab==='factory' ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                        <Settings size={14}/> GERADOR
                    </button>
                    <button onClick={()=>setAdminTab('upload')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${adminTab==='upload' ? 'bg-[var(--bg-surface)] text-green-600 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                        <FileUp size={14}/> UPLOAD DIRETO
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
              {adminTab === 'factory' && (
                  <div className="flex bg-[var(--bg-page)] rounded-lg p-1 border border-[var(--border)]">
                      <button onClick={() => setFactoryMode('default')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${factoryMode === 'default' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>PADRÃO</button>
                      <button onClick={() => setFactoryMode('mega10')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${factoryMode === 'mega10' ? 'bg-yellow-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>MEGA 10</button>
                  </div>
              )}
              
              <ThemeToggle />
              <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 text-white transition-colors px-4 py-2 rounded-lg font-bold flex items-center gap-2"><LogOut size={14}/> Sair</button>
            </div>
        </div>
        
        {showCampaignsModal && ( 
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-[var(--border)]">
                    <div className="bg-[var(--bg-page)] p-4 flex justify-between items-center border-b border-[var(--border)]">
                        <h3 className="text-[var(--text-main)] font-bold text-lg uppercase flex items-center gap-2"><Layers size={20} className="text-purple-500"/> Gerenciar Todas as Campanhas</h3>
                        <button onClick={()=>setShowCampaignsModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={24}/></button>
                    </div>
                    <div className="p-6 overflow-y-auto bg-[var(--bg-page)] flex-1">
                        <div className="grid grid-cols-1 gap-3">
                            {files.length === 0 ? <p className="text-center text-[var(--text-muted)] mt-10">Nenhuma campanha encontrada.</p> : files.map(f => (
                                <div key={f.id} className="flex justify-between items-center p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[var(--text-main)] text-lg">{f.title}</h4>
                                        <div className="flex gap-4 mt-1">
                                            <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Clock size={14}/> Vence: {formatDateSafe(f.expiry_date)}</p>
                                            {f.release_date && <p className="text-sm text-blue-500 flex items-center gap-2"><CalendarClock size={14}/> Libera: {new Date(f.release_date).toLocaleString('pt-BR')}</p>}
                                        </div>
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
                <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-[var(--border)]">
                    <div className="bg-[var(--bg-page)] p-4 flex justify-between items-center border-b border-[var(--border)]">
                        <h3 className="text-[var(--text-main)] font-bold text-sm uppercase flex items-center gap-2"><FileText size={16} className="text-blue-400"/> Status de Entrega</h3>
                        <button onClick={()=>setSelectedDetail(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        <h4 className="font-bold text-[var(--text-main)] text-lg mb-6 leading-tight border-b border-[var(--border)] pb-4">{selectedDetail.title}</h4>
                        <div className="space-y-3">
                            {STORES.map((store, index) => { 
                                const isDownloaded = checkDownload(store, selectedDetail.id); 
                                return (
                                    <div key={index} className={`flex justify-between items-center p-3 rounded-lg border ${isDownloaded ? 'bg-green-50 border-green-200' : 'bg-[var(--bg-page)] border-[var(--border)]'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDownloaded ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{index + 1}</div>
                                            <span className={`font-bold uppercase ${isDownloaded ? 'text-green-800' : 'text-[var(--text-muted)]'}`}>{store}</span>
                                        </div>
                                        {isDownloaded ? <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle size={14}/> Recebido</span> : <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1"><Clock size={14}/> Pendente</span>}
                                    </div>
                                ); 
                            })}
                        </div>
                    </div>
                </div>
            </div> 
        )}

        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 h-full flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] relative">
                {/* ÁREA DE PUBLICAÇÃO */}
                <div className="p-6 bg-[var(--bg-surface)] border-b border-[var(--border)] flex flex-col gap-4 shadow-sm z-30">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Título da Campanha</label>
                            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Ofertas de Verão"/>
                        </div>
                        <div className="w-36">
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Validade</label>
                            <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                        </div>
                    </div>
                    
                    {/* NOVO CAMPO DE AGENDAMENTO DE LANÇAMENTO */}
                    <div className="w-full">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block flex items-center gap-2">
                            <Timer size={14} className="text-orange-500"/> Agendar Liberação (Opcional)
                        </label>
                        <input 
                            type="datetime-local" 
                            value={releaseDate} 
                            onChange={e=>setReleaseDate(e.target.value)} 
                            className="w-full p-3 border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                        />
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
                        {processing ? <Loader className="animate-spin"/> : (adminTab === 'factory' ? <><Upload size={20}/> {processing ? `Gerando ${progress}%` : 'PUBLICAR CARTAZES'}</> : <><CheckCircle size={20}/> ENVIAR ARQUIVO</>)}
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-[var(--bg-page)]">
                    {adminTab === 'factory' ? (
                        <PosterFactory mode="admin" onAdminReady={setFactoryData} currentUser={{email:'admin'}} factoryType={factoryMode} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] p-10 text-center">
                            <Folder size={64} className="mb-4 text-green-200"/>
                            <h3 className="text-xl font-bold text-[var(--text-main)]">Modo de Upload Direto</h3>
                            <p className="max-w-xs mt-2 text-sm">Use este modo para enviar PDFs ou ZIPs prontos (feitos no Photoshop/Canva) diretamente para as lojas.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="w-1/2 h-full bg-[var(--bg-page)] p-8 overflow-y-auto">
                {/* PAINEL CAMPANHAS */}
                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-sm border border-[var(--border)] mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2 text-lg"><Layers className="text-purple-500"/> Campanhas</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{files.length} ativas.</p>
                    </div>
                    <button onClick={() => setShowCampaignsModal(true)} className="px-5 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 flex items-center gap-2">
                        <Sliders size={16}/> GERENCIAR
                    </button>
                </div>

                {/* PAINEL HISTÓRICO */}
                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2 text-lg"><Clock className="text-orange-500"/> Histórico</h3>
                            <div className="flex gap-2">
                                <button onClick={clearHistory} className="text-xs text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg font-bold flex items-center gap-1"><Trash2 size={12}/> LIMPAR</button>
                                <button onClick={fetchData} className="text-xs text-blue-500 hover:bg-blue-50 px-3 py-2 rounded-lg font-bold flex items-center gap-1"><RefreshCcw size={12}/> ATUALIZAR</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--bg-page)] p-3 rounded-lg border border-[var(--border)]">
                            <Filter size={16} className="text-[var(--text-muted)]"/>
                            <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Filtrar:</span>
                            <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="bg-transparent font-bold text-[var(--text-main)] outline-none flex-1">
                                <option value="all">Todas as Lojas</option>
                                {STORES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[var(--bg-page)] text-[var(--text-muted)] uppercase text-xs">
                                <tr><th className="p-3">Horário</th><th className="p-3">Loja</th><th className="p-3">Produto</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {filteredLogs.length === 0 ? <tr><td colSpan="3" className="p-4 text-center text-[var(--text-muted)]">Vazio.</td></tr> : filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-[var(--bg-page)]">
                                        <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{formatDateSafe(log.created_at.split('T')[0])} {formatTimeSafe(log.created_at)}</td>
                                        <td className="p-3 font-bold text-[var(--text-main)] uppercase">{log.store_email ? log.store_email.split('@')[0] : 'Admin'}</td>
                                        <td className="p-3 text-[var(--text-muted)]">{log.product_name}</td>
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

// ============================================================================
// STORE LAYOUT ATUALIZADO (Menu no topo, Design novo)
// ============================================================================
const StoreLayout = ({ user, onLogout }) => {
  const [view, setView] = useState('files');
  const [files, setFiles] = useState([]);
  const [myDownloads, setMyDownloads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [factoryMode, setFactoryMode] = useState('default'); 
  const [now, setNow] = useState(new Date());

  useEffect(() => { loadFiles(); }, []);
  
  // ATUALIZA O RELÓGIO A CADA SEGUNDO
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadFiles = async () => { try { const today = new Date().toISOString().split('T')[0]; const { data: f } = await supabase.from('shared_files').select('*').gte('expiry_date', today).order('created_at', {ascending: false}); if(f) setFiles(f); const { data: dls } = await supabase.from('downloads').select('file_id').eq('store_email', user.email); if(dls) setMyDownloads(dls.map(d => d.file_id)); } catch(e) {} };
  const registerDownload = async (fileId) => { try { await supabase.from('downloads').insert([{ store_email: user.email, file_id: fileId }]); setMyDownloads(prev => [...prev, fileId]); } catch(e){} };
  
  const renderFiles = () => {
      const filtered = files.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase()));
      if (filtered.length === 0) return <div className="col-span-3 flex flex-col items-center justify-center h-64 text-[var(--text-muted)]"><FileText size={48} className="mb-4 opacity-20"/><p>Nenhum encarte encontrado.</p></div>;
      
      return filtered.map(f => { 
          const isDownloaded = myDownloads.includes(f.id); 
          
          // LÓGICA DE BLOQUEIO
          const releaseDate = f.release_date ? new Date(f.release_date) : null;
          const isLocked = releaseDate && releaseDate > now;

          return (
            <div key={f.id} className={`file-card-modern ${isLocked ? 'border-orange-500/30 bg-orange-50/5' : ''}`}>
                <div className="flex justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLocked ? 'bg-orange-100 text-orange-600' : (isDownloaded ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600')}`}>
                        {isLocked ? <Lock size={24}/> : (isDownloaded ? <Check size={24}/> : <FileText size={24}/>)}
                    </div>
                    <span className="text-xs bg-[var(--bg-page)] border border-[var(--border)] px-3 py-1 rounded-full font-bold text-[var(--text-muted)] h-fit">Vence: {formatDateSafe(f.expiry_date)}</span>
                </div>
                <h3 className="font-bold text-xl text-[var(--text-main)] mb-4 line-clamp-2 h-14">{f.title}</h3>
                
                {/* ÁREA DE STATUS (BLOQUEADO OU LIBERADO) */}
                {isLocked ? (
                    <div className="bg-orange-500/10 rounded-xl p-4 text-center border-2 border-orange-500/20 border-dashed">
                        <p className="text-xs font-bold text-orange-600 uppercase mb-1 flex items-center justify-center gap-2"><Timer size={14}/> Liberado em:</p>
                        <div className="text-orange-700 font-mono text-lg font-black">
                            <CountdownTimer targetDate={releaseDate} />
                        </div>
                    </div>
                ) : (
                    <a href={f.file_url} target="_blank" rel="noreferrer" onClick={()=>registerDownload(f.id)} className={`btn-modern w-full ${isDownloaded ? 'bg-green-600 hover:bg-green-700' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'}`}>
                        {isDownloaded ? <><CheckCircle size={20}/> JÁ BAIXADO</> : <><Download size={20}/> BAIXAR PACOTE</>}
                    </a>
                )}
            </div>
          ); 
      });
  };

  return (
    <div className="flex h-screen bg-[var(--bg-page)] font-sans overflow-hidden transition-colors duration-300">
        
        {/* SIDEBAR - SEM BOTÃO DE SAIR AGORA */}
        <div className="w-24 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col items-center py-8 z-50 shadow-xl transition-colors duration-300">
            <div className="mb-10 p-3 bg-blue-500/10 rounded-2xl backdrop-blur-sm border border-blue-500/20"><ImageIcon className="text-blue-500 w-8 h-8"/></div>
            
            <div className="space-y-6 flex flex-col w-full px-4">
                <button onClick={()=>setView('files')} className={`nav-btn p-4 flex flex-col items-center ${view==='files'?'active':''}`}>
                    <LayoutTemplate size={24}/> <span className="text-[10px] font-bold mt-1">Matriz</span>
                </button>

                <button onClick={()=>setView('learning')} className={`nav-btn p-4 flex flex-col items-center ${view==='learning'?'active':''}`}>
                    <span className="absolute top-2 right-4 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                    <GraduationCap size={24}/> <span className="text-[10px] font-bold mt-1">Aprenda</span>
                </button>

                <div className="h-px w-full bg-[var(--border)] my-2"></div>

                <button onClick={()=>{setView('factory'); setFactoryMode('default');}} className={`nav-btn p-4 flex flex-col items-center ${view==='factory' && factoryMode==='default' ?'active':''}`}>
                    <Layers size={24}/> <span className="text-[10px] font-bold mt-1">Padrão</span>
                </button>

                <button onClick={()=>{setView('factory'); setFactoryMode('mega10');}} className={`nav-btn p-4 flex flex-col items-center ${view==='factory' && factoryMode==='mega10' ?'active':''}`}>
                    <Star size={24}/> <span className="text-[10px] font-bold mt-1">Mega 10</span>
                </button>
            </div>
        </div>

        {/* ÁREA PRINCIPAL COM HEADER NO TOPO */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* --- NOVO HEADER (BOTÃO DE TEMA E SAIR) --- */}
            <div className="h-20 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-8 z-40 transition-colors duration-300">
                <div>
                    <h2 className="text-2xl font-extrabold text-[var(--text-main)] flex gap-3 items-center">
                        {view === 'files' && <><LayoutTemplate className="text-[var(--accent)]"/> Encartes da Matriz</>}
                        {view === 'learning' && <><GraduationCap className="text-purple-500"/> Caminho do Aprendizado</>}
                        {view === 'factory' && <><Settings className="text-[var(--accent)]"/> Fábrica: {factoryMode === 'mega10' ? 'Mega 10' : 'Padrão'}</>}
                    </h2>
                </div>

                <div className="flex items-center gap-4">
                    {/* Pesquisa (só aparece em arquivos) */}
                    {view === 'files' && (
                        <div className="relative w-72 mr-4 group">
                            <Search className="absolute left-4 top-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" size={20}/>
                            <input type="text" placeholder="Pesquisar campanha..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                                   className="w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-main)] focus:ring-2 focus:ring-blue-500 outline-none transition-all"/>
                        </div>
                    )}
                    
                    <div className="h-8 w-px bg-[var(--border)]"></div>
                    
                    {/* BOTÃO DE TEMA AQUI */}
                    <ThemeToggle />
                    
                    {/* BOTÃO SAIR AQUI */}
                    <button onClick={onLogout} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-red-500 transition-colors font-bold text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                        <LogOut size={18}/>
                        <span className="hidden md:inline">Sair</span>
                    </button>
                </div>
            </div>

            {/* CONTEÚDO ROLÁVEL */}
            <div className="flex-1 overflow-y-auto p-8 bg-[var(--bg-page)] transition-colors duration-300">
                
                {view === 'files' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20 animate-in fade-in zoom-in duration-300">
                        {renderFiles()}
                    </div>
                )}

                {view === 'learning' && <LearningPath />}

                {view === 'factory' && (
                    <div className="h-full">
                        <PosterFactory 
                            key={factoryMode} 
                            mode="local" 
                            currentUser={user} 
                            factoryType={factoryMode} 
                        />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  const handleLogin = async (e) => { e.preventDefault(); setLoading(true); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if(error) { alert("Erro: "+error.message); setLoading(false); } else { setTimeout(() => onLogin(data.session), 500); } };
  return (<div className="h-screen w-screen bg-[var(--bg-page)] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden"><div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] p-10 rounded-3xl shadow-2xl flex flex-col items-center relative z-10"><img src="/assets/logo-full.png" alt="Cartaz No Ponto" className="w-48 mb-8 drop-shadow-xl"/><h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Bem-vindo</h2><p className="text-[var(--text-muted)] text-sm mb-8">Acesse sua central de criação</p><form onSubmit={handleLogin} className="w-full space-y-5"><div className="space-y-1"><label className="text-xs font-bold text-[var(--accent)] uppercase ml-1">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} className="input-modern" placeholder="seu@email.com"/></div><div className="space-y-1"><label className="text-xs font-bold text-[var(--accent)] uppercase ml-1">Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input-modern" placeholder="••••••••"/></div><button disabled={loading} className="btn-modern w-full py-4 shadow-lg mt-4">{loading ? <Loader className="animate-spin mx-auto"/> : 'ENTRAR NO SISTEMA'}</button></form></div><p className="mt-8 text-[var(--text-muted)] text-xs">© 2026 Cartaz No Ponto. Todos os direitos reservados.</p></div>);
};

const App = () => {
  const [session, setSession] = useState(null);
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setSession(session)); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session)); return () => subscription.unsubscribe(); }, []);
  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };
  return (
    <ThemeProvider>
      {!session ? <LoginScreen onLogin={(s) => setSession(s)} /> : 
       session?.user?.email?.includes('admin') ? <AdminDashboard onLogout={handleLogout} /> : 
       <StoreLayout user={session.user} onLogout={handleLogout} />
      }
    </ThemeProvider>
  );
};

export default App;