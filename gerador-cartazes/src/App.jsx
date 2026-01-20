import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';
import { 
  LogOut, Upload, FileText, Download, Trash2, Search, Loader, 
  CheckCircle, Image as ImageIcon, LayoutTemplate, ShoppingBag, 
  User, Database, FileArchive
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURAÇÕES E UTILITÁRIOS
// ============================================================================
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  } catch (e) { return dateString; }
};

const cleanFileName = (name) => {
  return name.replace(/[^a-z0-9ãõáéíóúç -]/gi, ' ').trim().substring(0, 50) || 'cartaz';
};

// ============================================================================
// 2. COMPONENTE VISUAL DO CARTAZ (PONTO NOVO ORIGINAL)
// ============================================================================
const Poster = ({ data, id, width = 794, height = 1123, scale = 1 }) => {
  if (!data) return null;

  const styles = {
    container: { width: `${width}px`, height: `${height}px`, backgroundColor: 'white', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif', transform: `scale(${scale})`, transformOrigin: 'top left', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    header: { height: '220px', background: 'linear-gradient(to bottom, #dc2626, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '60px', fontWeight: 'bold', textTransform: 'uppercase' },
    body: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 300px)' },
    productName: { fontSize: '70px', fontWeight: '900', textAlign: 'center', color: '#1a1a1a', marginBottom: '40px', textTransform: 'uppercase', lineHeight: '1.1' },
    priceContainer: { display: 'flex', alignItems: 'flex-start', color: '#dc2626', fontWeight: 'bold', lineHeight: '0.8' },
    currency: { fontSize: '60px', marginTop: '40px', marginRight: '10px' },
    priceWhole: { fontSize: '380px', letterSpacing: '-15px' },
    priceCentsBox: { display: 'flex', flexDirection: 'column', marginTop: '45px' },
    priceCents: { fontSize: '120px' },
    unit: { fontSize: '40px', color: '#666', marginTop: '10px' },
    footer: { position: 'absolute', bottom: 0, width: '100%', height: '80px', backgroundColor: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b', fontSize: '24px', fontWeight: 'bold' }
  };

  const priceStr = data.price ? String(data.price) : '0,00';
  const [whole, cents] = priceStr.includes(',') ? priceStr.split(',') : [priceStr, '00'];

  return (
    <div id={id} style={styles.container}>
      <div style={styles.header}>OFERTA ESPECIAL</div>
      <div style={styles.body}>
        <div style={styles.productName}>{data.name}</div>
        <div style={styles.priceContainer}>
          <span style={styles.currency}>R$</span>
          <span style={styles.priceWhole}>{whole}</span>
          <div style={styles.priceCentsBox}><span style={styles.priceCents}>,{cents}</span><span style={styles.unit}>{data.unit}</span></div>
        </div>
      </div>
      <div style={styles.footer}>Oferta válida enquanto durarem os estoques</div>
    </div>
  );
};

// ============================================================================
// 3. COMPONENTE GERADOR (AGORA DISPONÍVEL PARA LOJAS E ADMIN)
// ============================================================================
const GeneratorPanel = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        setProducts(data.map(item => ({
          name: item['Produto'] || item['PRODUTO'] || 'Item',
          price: item['Preço'] || item['PRECO'] || '0,00',
          unit: item['Unidade'] || item['UNIDADE'] || 'Un'
        })));
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  // --- AQUI ESTÁ A LÓGICA DO PDF UNIFICADO ---
  const handleGenerateZip = async () => {
    if (products.length === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();
    
    // Cria o PDF Mestre (Que vai ter todas as páginas)
    const docUnified = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    try {
      for (let i = 0; i < products.length; i++) {
        const element = document.getElementById(`ghost-poster-${i}`);
        if (element) {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);

          // 1. PDF Individual
          const docSingle = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const width = docSingle.internal.pageSize.getWidth();
          const height = docSingle.internal.pageSize.getHeight();
          docSingle.addImage(imgData, 'JPEG', 0, 0, width, height);
          zip.file(`${cleanFileName(products[i].name)}.pdf`, docSingle.output('blob'));

          // 2. Adicionar ao PDF Unificado
          if (i > 0) docUnified.addPage();
          docUnified.addImage(imgData, 'JPEG', 0, 0, width, height);
        }
        await new Promise(r => setTimeout(r, 20));
      }

      // Salva o PDF Mestre no ZIP
      zip.file("Ofertas_Todas_Paginas.pdf", docUnified.output('blob'));

      // Gera e baixa
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Cartazes_${user.email.split('@')[0]}.zip`);
      
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar arquivos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Upload className="text-red-600"/> Gerador de Cartazes</h2>
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
            <input type="file" onChange={handleFileChange} accept=".xlsx, .csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                <FileText size={48} className="text-slate-400 mb-4 group-hover:text-red-500"/>
                <p className="font-bold text-slate-600">Clique para selecionar o Excel</p>
                <p className="text-sm text-slate-400">Gera PDF individual e Arquivo Unificado</p>
            </div>
        </div>
        {products.length > 0 && (
            <div className="mt-8 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-green-600 flex items-center gap-2"><CheckCircle size={20}/> {products.length} itens detectados</span>
                    <button onClick={handleGenerateZip} disabled={isProcessing} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex items-center gap-2 disabled:opacity-50">
                        {isProcessing ? <Loader className="animate-spin"/> : <FileArchive/>} {isProcessing ? 'Processando...' : 'Baixar ZIP Completo'}
                    </button>
                </div>
                <div className="bg-slate-100 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left"><thead className="text-xs text-slate-500 uppercase border-b"><tr><th className="py-2">Produto</th><th>Preço</th></tr></thead><tbody>{products.map((p, i) => (<tr key={i} className="border-b border-slate-200 last:border-0"><td className="py-2 font-bold text-slate-700">{p.name}</td><td className="py-2 text-red-600 font-bold">R$ {p.price}</td></tr>))}</tbody></table>
                </div>
            </div>
        )}
        {/* Fantasmas Ocultos */}
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>{products.map((p, i) => <Poster key={i} id={`ghost-poster-${i}`} data={p} />)}</div>
    </div>
  );
};

// ============================================================================
// 4. PAINEL DE DOWNLOADS (PARA LOJAS VEREM O QUE O ADMIN MANDOU)
// ============================================================================
const DownloadsPanel = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data } = await supabase.from('shared_files').select('*').order('created_at', { ascending: false });
        setFiles(data || []);
        setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><ShoppingBag className="text-red-600"/> Arquivos da Matriz</h2>
        {loading ? <div className="text-center"><Loader className="animate-spin inline text-red-600"/></div> : (
            <div className="space-y-3">
                {files.length === 0 ? <p className="text-slate-500 text-center">Nenhum arquivo recebido.</p> : files.map(file => (
                    <div key={file.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50">
                        <div><h4 className="font-bold text-slate-700">{file.title}</h4><span className="text-xs text-slate-400">{formatDate(file.created_at)}</span></div>
                        <a href={file.file_url} target="_blank" className="text-blue-600 font-bold hover:underline flex items-center gap-1"><Download size={16}/> Baixar</a>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

// ============================================================================
// 5. LAYOUT PRINCIPAL (ADMIN E LOJAS)
// ============================================================================
const MainLayout = ({ user, onLogout }) => {
  // Se for admin, pode ter recursos extras no futuro, mas agora ambos geram cartaz
  const isAdmin = user.email.includes('admin'); 
  const storeName = isAdmin ? "Administração" : `Loja ${user.email.replace(/[^0-9]/g, '')}`;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar Vermelha */}
      <div className="w-64 bg-red-900 text-white flex flex-col p-6 shadow-2xl z-10">
        <div className="mb-8">
            <h1 className="text-2xl font-black italic tracking-tighter">PONTO NOVO</h1>
            <span className="bg-yellow-400 text-red-900 text-xs font-bold px-2 py-1 rounded uppercase">{storeName}</span>
        </div>
        <nav className="flex-1 space-y-2">
            <button className="flex items-center gap-3 w-full p-3 bg-red-800 rounded-lg font-bold shadow-inner"><LayoutTemplate size={20}/> Gerador</button>
            <button className="flex items-center gap-3 w-full p-3 hover:bg-red-800/50 rounded-lg text-red-200 transition-colors"><Database size={20}/> Histórico</button>
        </nav>
        <div className="mt-auto border-t border-red-800 pt-4">
            <div className="flex items-center gap-2 mb-4 text-red-300 text-xs"><User size={12}/> {user.email}</div>
            <button onClick={onLogout} className="flex items-center justify-center gap-2 w-full py-2 bg-black/20 hover:bg-black/40 rounded text-sm font-bold transition-colors"><LogOut size={16}/> Sair</button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto space-y-8">
            {/* 1. GERADOR (Disponível para TODOS agora) */}
            <GeneratorPanel user={user} />

            {/* 2. AREA DE DOWNLOADS (Matriz envia, Loja recebe) */}
            <DownloadsPanel />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. TELA DE LOGIN
// ============================================================================
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert("Acesso negado: " + error.message); setLoading(false); } 
    else { onLogin(data.session); }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ImageIcon className="text-red-700 w-12 h-12"/></div>
        <h1 className="text-3xl font-black text-slate-800 mb-1 uppercase italic">Ponto Novo</h1>
        <p className="text-slate-500 mb-8 text-sm">Sistema Integrado de Cartazes</p>
        <form onSubmit={handleLogin} className="space-y-5 text-left">
            <div><label className="text-xs font-bold text-slate-600 uppercase ml-1">Email</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" placeholder="loja1@pontnovo.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div><label className="text-xs font-bold text-slate-600 uppercase ml-1">Senha</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" type="password" placeholder="••••••" value={password} onChange={e=>setPassword(e.target.value)} /></div>
            <button disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-red-500/30 transform hover:-translate-y-1 transition-all disabled:opacity-50 mt-2">
                {loading ? 'Validando Acesso...' : 'ENTRAR NO SISTEMA'}
            </button>
        </form>
        <p className="mt-8 text-xs text-slate-300">© 2026 Tecnologia Varejo</p>
      </div>
    </div>
  );
};

// ============================================================================
// 7. APP PRINCIPAL
// ============================================================================
const App = () => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <LoginScreen onLogin={(s) => setSession(s)} />;

  return <MainLayout user={session.user} onLogout={() => supabase.auth.signOut()} />;
};

export default App;