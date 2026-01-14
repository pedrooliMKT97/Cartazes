import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  Upload, Image as ImageIcon, FileText, 
  Monitor, Smartphone, Layout, Type, FolderOpen 
} from 'lucide-react';

const RetailPosterGenerator = () => {
  const printRef = useRef(null);
  const [activeTab, setActiveTab] = useState('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.4);

  // --- BIBLIOTECA DE ASSETS ---
  const library = {
    banners: [
      { id: 'b1', name: 'Oferta Vermelha', file: 'oferta.png', color: '#dc2626' }, 
      { id: 'b2', name: 'Saldão Amarelo', file: 'saldao.png', color: '#facc15' },
    ],
    backgrounds: [
      { id: 'bg1', name: 'Fundo Vermelho', file: 'vermelho.png', color: 'linear-gradient(to bottom, #ef4444, #991b1b)' },
      { id: 'bg2', name: 'Fundo Amarelo', file: 'amarelo.png', color: 'linear-gradient(to bottom, #fde047, #ca8a04)' },
      { id: 'bg3', name: 'Fundo Branco', file: null, color: '#ffffff' }
    ]
  };

  // --- ESTADOS ---
  const [product, setProduct] = useState({
    name: 'PICANHA BOVINA CORTE PREMIUM',
    price: '69,90',
    oldPrice: '89,90',
    unit: 'Kg', 
    limit: '', 
    footer: 'Oferta válida enquanto durarem os estoques',
  });

  const [design, setDesign] = useState({
    size: 'a4',
    orientation: 'portrait', 
    bannerImage: null,
    backgroundImage: null,
    bgColorFallback: '#ffffff',
    nameColor: '#000000',
    priceColor: '#cc0000',
    showOldPrice: true,
    fontSize: 100, // Escala percentual
  });

  const units = ['Un', 'Kg', '100g', 'Pct', 'Pack', 'Cx', 'Lt', 'Garrafa'];

  // Ajuste do Zoom
  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight * 0.85;
      const docH = design.orientation === 'portrait' ? 1123 : 794;
      setPreviewScale(h / docH);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [design.orientation]);

  // --- FUNÇÕES ---
  const selectFromLibrary = (type, item) => {
    const path = item.file ? `/assets/${type}s/${item.file}` : null;
    if (type === 'banner') setDesign(p => ({ ...p, bannerImage: path }));
    else setDesign(p => ({ ...p, backgroundImage: path, bgColorFallback: item.color }));
  };

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) setDesign({ ...design, [field]: URL.createObjectURL(file) });
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (data.length > 0) {
        const item = data[0];
        setProduct(prev => ({
          ...prev,
          name: item['Produto'] || prev.name,
          price: String(item['Preco'] || prev.price),
          oldPrice: item['De'] ? String(item['De']) : '',
          unit: item['Unidade'] || prev.unit,
          limit: item['Limite'] || prev.limit,
        }));
      }
    };
    reader.readAsBinaryString(file);
  };

  const generateFile = async (format) => {
    setIsGenerating(true);
    const element = printRef.current;
    
    // Configurações TRAVADAS para garantir fidelidade
    const options = {
      scale: 2, // Resolução de saída
      useCORS: true,
      backgroundColor: null,
      width: element.offsetWidth,
      height: element.offsetHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.offsetWidth,
      windowHeight: element.offsetHeight
    };

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(element, options);
        const imgData = canvas.toDataURL('image/png');

        if (format === 'pdf') {
          const pdf = new jsPDF({
            orientation: design.orientation,
            unit: 'px',
            format: [element.offsetWidth, element.offsetHeight]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
          pdf.save(`CARTAZ-${product.name.substring(0, 10)}.pdf`);
        } else {
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `CARTAZ-${product.name.substring(0, 10)}.png`;
          link.click();
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao gerar arquivo.");
      }
      setIsGenerating(false);
    }, 300);
  };

  // --- MEDIDAS DO CARTAZ ---
  // Portrait: 794x1123 | Landscape: 1123x794
  const width = design.orientation === 'portrait' ? 794 : 1123;
  const height = design.orientation === 'portrait' ? 1123 : 794;

  return (
    <div className="flex h-screen bg-slate-200 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-[400px] bg-white h-full flex flex-col border-r border-slate-300 shadow-xl z-20">
        <div className="p-4 bg-slate-900 text-white"><h1 className="font-bold">Editor V7 Flex</h1></div>
        
        <div className="flex border-b">
          <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 font-bold ${activeTab==='content'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50':''}`}>Dados</button>
          <button onClick={() => setActiveTab('design')} className={`flex-1 py-3 font-bold ${activeTab==='design'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50':''}`}>Visual</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {activeTab === 'content' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Produto</label>
                <textarea value={product.name} onChange={e=>setProduct({...product, name:e.target.value})} className="w-full p-2 border rounded font-bold h-24" />
                <div className="flex items-center gap-2 mt-2 bg-slate-100 p-2 rounded">
                  <Type size={14} />
                  <input type="range" min="50" max="150" value={design.fontSize} onChange={e=>setDesign({...design, fontSize:e.target.value})} className="flex-1 h-2 bg-slate-300 rounded-lg cursor-pointer" />
                  <span className="text-xs font-bold">{design.fontSize}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-bold text-slate-400 uppercase">Preço</label><input type="text" value={product.price} onChange={e=>setProduct({...product, price:e.target.value})} className="w-full p-2 border rounded font-bold text-lg"/></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Unidade</label><select value={product.unit} onChange={e=>setProduct({...product, unit:e.target.value})} className="w-full p-2 border rounded">{units.map(u=><option key={u}>{u}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Limite</label><input type="text" value={product.limit} onChange={e=>setProduct({...product, limit:e.target.value})} className="w-full p-2 border rounded" placeholder="Ex: 5 un/cliente"/></div>
              <div className="flex items-center gap-2 border p-2 rounded"><input type="checkbox" checked={design.showOldPrice} onChange={e=>setDesign({...design, showOldPrice:e.target.checked})}/><label className="text-xs font-bold uppercase">Preço "De"</label><input disabled={!design.showOldPrice} type="text" value={product.oldPrice} onChange={e=>setProduct({...product, oldPrice:e.target.value})} className="w-full border-b outline-none"/></div>
              <label className="block w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded text-center cursor-pointer text-xs font-bold uppercase"><Upload className="inline w-3 h-3 mr-1"/> Importar Excel <input type="file" className="hidden" onChange={handleExcelUpload}/></label>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-slate-50 p-3 rounded border">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Orientação</label>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={()=>setDesign({...design, orientation:'portrait'})} className={`p-2 border rounded flex justify-center items-center gap-2 ${design.orientation==='portrait'?'bg-blue-600 text-white':''}`}><Smartphone size={14}/> Vertical</button>
                   <button onClick={()=>setDesign({...design, orientation:'landscape'})} className={`p-2 border rounded flex justify-center items-center gap-2 ${design.orientation==='landscape'?'bg-blue-600 text-white':''}`}><Monitor size={14}/> Horiz.</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block"><FolderOpen size={12} className="inline"/> Banners</label>
                <div className="grid grid-cols-2 gap-2">{library.banners.map(b=><div key={b.id} onClick={()=>selectFromLibrary('banner', b)} className="h-10 rounded border cursor-pointer flex items-center justify-center text-[10px] font-bold text-white relative overflow-hidden" style={{background:b.color}}>{b.file && <img src={`/assets/banners/${b.file}`} className="absolute inset-0 w-full h-full object-cover" onError={e=>e.target.style.display='none'}/>}<span className="relative z-10 drop-shadow-md">{b.name}</span></div>)}</div>
                <label className="text-xs text-blue-600 cursor-pointer underline"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'bannerImage')}/></label>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block"><FolderOpen size={12} className="inline"/> Fundos</label>
                <div className="grid grid-cols-3 gap-2">{library.backgrounds.map(b=><div key={b.id} onClick={()=>selectFromLibrary('background', b)} className="h-10 rounded border cursor-pointer relative overflow-hidden" style={{background:b.color}}>{b.file && <img src={`/assets/backgrounds/${b.file}`} className="absolute inset-0 w-full h-full object-cover"/>}</div>)}</div>
                <label className="text-xs text-blue-600 cursor-pointer underline"><Upload className="inline w-3 h-3"/> Upload <input type="file" className="hidden" onChange={e=>handleFileUpload(e,'backgroundImage')}/></label>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t pt-2">
                <div><label className="text-xs font-bold uppercase">Texto</label><input type="color" value={design.nameColor} onChange={e=>setDesign({...design, nameColor:e.target.value})} className="w-full h-8 cursor-pointer rounded"/></div>
                <div><label className="text-xs font-bold uppercase">Preço</label><input type="color" value={design.priceColor} onChange={e=>setDesign({...design, priceColor:e.target.value})} className="w-full h-8 cursor-pointer rounded"/></div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-white border-t grid grid-cols-2 gap-3">
          <button onClick={()=>generateFile('png')} disabled={isGenerating} className="py-3 bg-slate-100 rounded font-bold">{isGenerating?'...':'PNG'}</button>
          <button onClick={()=>generateFile('pdf')} disabled={isGenerating} className="py-3 bg-red-600 text-white rounded font-bold">{isGenerating?'Gerando...':'PDF'}</button>
        </div>
      </div>

      {/* PREVIEW AREA (ZOOM) */}
      <div className="flex-1 flex items-center justify-center bg-slate-300 overflow-hidden">
        <div style={{transform: `scale(${previewScale})`, transition: 'transform 0.2s'}}>
          
          {/* == CARTAZ OFICIAL (ELEMENTO DOM) == */}
          <div 
            ref={printRef} 
            style={{ 
              width, 
              height, 
              background: design.backgroundImage?`url(${design.backgroundImage}) center/cover no-repeat`:design.bgColorFallback,
              display: 'flex',
              flexDirection: 'column', // PILHA VERTICAL
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }} 
            className="bg-white"
          >
            
            {/* 1. BANNER TOPO (Altura Fixa em %) */}
            <div style={{ flex: '0 0 16%', width: '100%', position: 'relative', overflow:'hidden' }}>
              {design.bannerImage ? 
                <img src={design.bannerImage} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : 
                <div style={{width:'100%', height:'100%', background:'rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', fontWeight:'bold', opacity:0.2}}>BANNER</div>
              }
            </div>

            {/* 2. ÁREA DE CONTEÚDO (Flexível - Ocupa todo o meio) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 40px', justifyContent: 'space-between' }}>
              
              {/* Nome do Produto (Parte Superior do Miolo) */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                maxHeight: '40%', // Nunca ocupa mais que 40% do miolo
                overflow: 'hidden'
              }}>
                <h1 style={{ 
                    textAlign: 'center', 
                    fontWeight: 900, 
                    textTransform: 'uppercase', 
                    lineHeight: 1.1,
                    wordBreak: 'break-word',
                    color: design.nameColor, 
                    fontSize: `${(design.orientation==='portrait'?80:90)*(design.fontSize/100)}px`,
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                  {product.name}
                </h1>
              </div>

              {/* Separador Visual (Linha fina) */}
              <div style={{height: '1px', background: 'rgba(0,0,0,0.1)', width: '80%', margin: '0 auto'}}></div>

              {/* Bloco de Preço (Parte Inferior do Miolo) */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                paddingTop: '20px'
              }}>
                
                {/* Preço "De" */}
                {design.showOldPrice && product.oldPrice && (
                   <div style={{
                     fontSize: '40px', 
                     fontWeight: 'bold', 
                     textDecoration: 'line-through', 
                     textDecorationColor: '#dc2626', 
                     textDecorationThickness: '4px',
                     color: '#64748b',
                     marginBottom: '0px'
                   }}>
                     De R$ {product.oldPrice}
                   </div>
                )}

                {/* Preço Principal */}
                <div style={{ display: 'flex', alignItems: 'flex-start', color: design.priceColor, lineHeight: 1 }}>
                  <span style={{ fontSize: '70px', fontWeight: 'bold', marginTop: '20px', marginRight: '15px' }}>R$</span>
                  <span style={{ fontSize: design.orientation==='portrait'?'280px':'220px', fontWeight: 900, letterSpacing: '-10px' }}>
                     {product.price.split(',')[0]}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: '30px', marginLeft: '10px' }}>
                     <span style={{ fontSize: '100px', fontWeight: 900 }}>,{product.price.split(',')[1]||'00'}</span>
                     <span style={{ fontSize: '30px', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(0,0,0,0.1)', padding: '5px 10px', borderRadius: '5px', textAlign: 'center', color: '#334155', marginTop: '10px' }}>
                       {product.unit}
                     </span>
                  </div>
                </div>

                {/* Limite */}
                {product.limit && (
                  <div style={{ marginTop: '20px', borderBottom: '2px solid #cbd5e1', paddingBottom: '5px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Limite: {product.limit}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* 3. RODAPÉ (Altura Fixa) */}
            <div style={{ flex: '0 0 60px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)' }}>
              <p style={{ fontWeight: 500, opacity: 0.8, color: design.nameColor, fontSize: '20px' }}>
                {product.footer}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailPosterGenerator;