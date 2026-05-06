/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  Radio,
  User,
  X,
  MessageSquare,
  Send
} from 'lucide-react';
import { getSupabase } from './lib/supabase';

// --- Types ---
interface Message {
  id: string;
  user: string;
  text: string;
  created_at: string;
}

// --- Types ---
interface UserData {
  nome: string;
  apelido: string;
  email: string;
  foto: string;
}

// --- Components ---

const Visualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-[240px] mb-6">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: isPlaying 
              ? [
                  `${20 + Math.random() * 80}%`, 
                  `${20 + Math.random() * 80}%`, 
                  `${20 + Math.random() * 80}%`
                ] 
              : "10%",
            opacity: isPlaying ? [0.6, 1, 0.6] : 0.3,
            backgroundColor: isPlaying ? '#ef4444' : '#64748b'
          }}
          transition={{
            duration: 0.3 + Math.random() * 0.4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-1.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          style={{
            filter: isPlaying ? 'blur(0.5px)' : 'none'
          }}
        />
      ))}
    </div>
  );
};

const NeonButton = ({ children, onClick, color = "red", className = "" }: { children: React.ReactNode; onClick?: () => void; color?: string; className?: string }) => {
  const colors: Record<string, string> = {
    red: "border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)]",
    pink: "border-pink-500 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] hover:shadow-[0_0_25px_rgba(236,72,153,0.8)]",
    green: "border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] hover:shadow-[0_0_25px_rgba(52,211,153,0.8)]"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-6 py-3 border-2 rounded-xl font-bold transition-all duration-300 bg-slate-900/50 backdrop-blur-sm ${colors[color] || colors.red} ${className}`}
    >
      {children}
    </motion.button>
  );
};

export default function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const STREAM_URL = "https://stream.zeno.fm/8sqw9xpbufvtv";

  useEffect(() => {
    const saved = localStorage.getItem("cadastrado");
    if (saved === "true") {
      setIsRegistered(true);
      const data = localStorage.getItem("userData");
      if (data) setUserData(JSON.parse(data));
    }

    // Fetch initial messages and set up subscription with Supabase
    const supabaseClient = getSupabase();
    let chatChannel: any;

    const setupChat = async () => {
      // Clear existing channel if any
      if (chatChannel) {
        supabaseClient?.removeChannel(chatChannel);
      }

      const supabase = getSupabase();
      if (!supabase) return;

      try {
        // 1. Initial fetch - Silent fail to avoid ugly console errors
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) {
          // If table is missing, show instructions
          if (error.code === 'PGRST205' || error.message?.toLowerCase().includes('relation "messages" does not exist')) {
            setIsTableMissing(true);
          } else {
            console.warn('Chat standby:', error.message);
          }
          return; // STOP HERE - Don't try to subscribe if table is missing
        }

        setIsTableMissing(false);
        setMessages(data || []);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 500);

        // 2. Real-time subscription
        chatChannel = supabase.channel('radio_chat_messages')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' }, 
            (payload: any) => {
              const newMsg = payload.new as Message;
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          )
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('Realtime standby - check if table has realtime enabled');
            }
          });

      } catch (err) {
        // Silent catch for unexpected errors
      }
    };

    setupChat();

    // Auto-show support popup after 45 seconds
    const timer = setTimeout(() => {
      setShowSupport(true);
    }, 45000);

    return () => {
      if (chatChannel) {
        supabaseClient?.removeChannel(chatChannel);
      }
      clearTimeout(timer);
    };
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSaveRegistration = (data: UserData) => {
    try {
      localStorage.setItem("cadastrado", "true");
      localStorage.setItem("userData", JSON.stringify(data));
      setUserData(data);
      setIsRegistered(true);
    } catch (e) {
      console.warn("Storage full, only saving basic data");
      const subData = { ...data, foto: "" }; // Remove photo if storage is full
      localStorage.setItem("userData", JSON.stringify(subData));
      setUserData(subData);
      setIsRegistered(true);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userData) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      alert("A conexão com o banco de dados ainda não foi configurada.");
      return;
    }

    const text = newMessage;
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        user: userData.apelido || userData.nome,
        text: text,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Supabase send error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans overflow-x-hidden">
      <audio ref={audioRef} src={STREAM_URL} crossOrigin="anonymous" />

      {/* --- Header / Live Badge --- */}
      <div className="pt-10 flex flex-col items-center">
        <motion.div 
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-red-600 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-400/30"
        >
          <div className="w-5 h-5 rounded-full bg-white overflow-hidden border border-white/50 flex items-center justify-center shrink-0">
            <img 
              src="https://i.ibb.co/v4TrFVSy/20260506-145143-0000.png" 
              alt="Sensor" 
              className="w-full h-full object-cover"
            />
          </div>
          AO VIVO
        </motion.div>
      </div>

      {/* --- Main Content --- */}
      <main className="max-w-md mx-auto px-6 flex flex-col items-center gap-8 pt-8 pb-32">
        {/* Visual Circle (Player Backdrop) */}
        <div className="relative">
          <motion.div 
            animate={{ 
              boxShadow: isPlaying 
                ? ["0 0 30px #ef4444", "0 0 80px #ef4444", "0 0 30px #ef4444"] 
                : "0 0 20px rgba(239,68,68,0.2)",
              scale: isPlaying ? [1, 1.02, 1] : 1
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className={`w-64 h-64 rounded-full border-4 border-red-500 flex items-center justify-center overflow-hidden transition-all duration-700 bg-slate-900/40`}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src="https://i.ibb.co/v4TrFVSy/20260506-145143-0000.png" 
                alt="Radio Logo" 
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500/40 bg-black/40">
                <Radio className="w-16 h-16 mb-2 animate-pulse" />
              </div>
            </div>
          </motion.div>
          {isPlaying && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 border border-red-500/20 rounded-full border-dashed"
            />
          )}
        </div>

        <div className="text-center flex flex-col items-center">
          <Visualizer isPlaying={isPlaying} />
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-red-600 mb-1">
            Let's Go Listen
          </h1>
          <p className="text-red-500/70 font-bold uppercase text-[10px] tracking-[0.3em]">A rádio que não para!</p>
        </div>

        {/* --- Player Controls --- */}
        <div className="flex items-center gap-10">
          <motion.button 
            whileHover={{ scale: 1.2, color: '#ef4444' }} 
            whileTap={{ scale: 0.8 }} 
            className="text-slate-500 transition-colors"
          >
            <SkipBack size={36} fill="currentColor" />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayPause}
            className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center text-[#020617] shadow-[0_0_40px_#ef4444] active:shadow-inner"
          >
            {isPlaying ? <Pause size={44} fill="currentColor" /> : <Play size={44} className="translate-x-1" fill="currentColor" />}
          </motion.button>

          <motion.button 
             whileHover={{ scale: 1.2, color: '#ef4444' }} 
             whileTap={{ scale: 0.8 }} 
             className="text-slate-500 transition-colors"
          >
            <SkipForward size={36} fill="currentColor" />
          </motion.button>
        </div>

        {/* --- Social Links (Neon Buttons) --- */}
        <div className="w-full grid grid-cols-1 gap-4">
          <NeonButton color="red" onClick={() => window.open('https://wa.me/message/3IQTUCLVUNOEF1', '_blank')}>
            WhatsApp
          </NeonButton>
          <NeonButton color="pink" onClick={() => window.open('https://vt.tiktok.com/ZS9NkbfKDPhbw-AyMQH/', '_blank')}>
            TikTok
          </NeonButton>
          <NeonButton color="green" onClick={() => window.open('https://meli.la/1gjezpb', '_blank')}>
            Mercado Livre
          </NeonButton>
        </div>
      </main>

      {/* --- Floating Action Buttons --- */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowChat(!showChat)}
          className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] border-2 border-white/20 text-[#020617]"
        >
          <MessageSquare fill="currentColor" size={28} />
        </motion.button>

        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowSupport(true)}
          className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.5)] border-2 border-white/20 text-white"
        >
          <Heart fill="white" size={28} />
        </motion.button>
      </div>

      {/* --- Chat Panel --- */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#0f172a]/95 backdrop-blur-2xl z-50 border-l border-slate-700/50 flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">CHAT AO VIVO</h3>
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">Fale com o locutor</p>
              </div>
              <button onClick={() => setShowChat(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!getSupabase() ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-10">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">Buscando conexão...</p>
                  <p className="text-[10px] mt-2 opacity-50">Configure o Supabase no painel de segredos para ativar o chat.</p>
                </div>
              ) : isTableMissing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
                  <div className="p-4 bg-amber-500/10 rounded-2xl mb-4">
                    <X size={32} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-black text-white mb-2">SETUP DO CHAT REQUERIDO</p>
                  <p className="text-[11px] leading-relaxed opacity-70 mb-4">
                    Para o chat funcionar, você precisa criar a tabela no seu <span className="text-red-500 font-bold underline">Supabase Dashboard</span>.
                  </p>
                  <div className="mt-4 w-full bg-black/60 p-4 rounded-2xl border border-red-500/20 text-left overflow-hidden relative group">
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-2">SQL para o Editor:</p>
                    <div className="max-h-40 overflow-y-auto scrollbar-hide">
                      <pre id="sql-code" className="text-[10px] text-red-400/90 font-mono leading-relaxed select-all cursor-text whitespace-pre-wrap">
{`CREATE TABLE messages (
  id uuid primary key default gen_random_uuid(),
  "user" text not null,
  text text not null,
  created_at timestamptz default now()
);

ALTER PUBLICATION supabase_realtime 
ADD TABLE messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON messages FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON messages FOR INSERT WITH CHECK (true);`}
                      </pre>
                    </div>
                    <button 
                      onClick={() => {
                        const code = document.getElementById('sql-code')?.innerText;
                        if (code) {
                          navigator.clipboard.writeText(code);
                          alert("Código copiado! Agora cole no SQL Editor do Supabase.");
                        }
                      }}
                      className="mt-3 w-full py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-500 font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                      Copiar Código SQL
                    </button>
                  </div>
                  <div className="mt-6 space-y-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold leading-relaxed text-center">
                      1. Abra o Supabase<br/>
                      2. Vá em "SQL Editor"<br/>
                      3. Cole o código e clique em "Run"
                    </p>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 w-full text-[12px] uppercase font-black tracking-widest text-white bg-red-600 hover:bg-red-700 p-4 rounded-2xl shadow-lg transition-all animate-pulse"
                  >
                    Já executei o código! Recarregar
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-10">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">Seja o primeiro a mandar uma mensagem!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">{msg.user}</span>
                    <div className="bg-slate-800/80 p-3 rounded-2xl rounded-tl-none border border-slate-700/50 max-w-[90%]">
                      <p className="text-sm text-slate-200">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-6 border-t border-slate-700/50 bg-[#020617]/50">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Sua mensagem..." 
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-red-500 transition-all text-sm font-medium text-white"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-3.5 bg-red-500 rounded-2xl text-[#020617] shadow-[0_5px_15px_rgba(239,68,68,0.3)] active:scale-95 transition-transform"
                >
                  <Send size={20} fill="currentColor" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Registration Modal --- */}
      <AnimatePresence mode="wait">
        {!isRegistered && (
          <RegistrationModal onSave={handleSaveRegistration} />
        )}
      </AnimatePresence>

      {/* --- Support Modal --- */}
      <AnimatePresence mode="wait">
        {showSupport && (
          <SupportModal onClose={() => setShowSupport(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RegistrationModal({ onSave }: { onSave: (data: UserData) => void }) {
  const [form, setForm] = useState({ nome: '', apelido: '', email: '', foto: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, foto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = () => {
    if (!form.nome || !form.email) {
      alert("Por favor, preencha os campos obrigatórios (Nome e Email).");
      return;
    }
    onSave(form);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-slate-900/80 border border-slate-700/50 rounded-[2.5rem] p-10 shadow-2xl relative"
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 p-4 bg-red-500 rounded-3xl shadow-[0_0_30px_#ef4444]">
          <Radio size={32} className="text-[#020617]" />
        </div>

        <div className="flex flex-col items-center gap-8 mt-4">
          <div className="text-center">
            <h2 className="text-2xl font-black text-white">BEM-VINDO!</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Faça seu cadastro inicial</p>
          </div>
          
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-2 border-red-500/30 flex items-center justify-center bg-slate-800/50 overflow-hidden shadow-inner">
              {form.foto ? (
                <img src={form.foto} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-slate-700" />
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-4 bg-red-500 rounded-2xl text-[#020617] shadow-[0_8px_20px_rgba(239,68,68,0.4)]"
            >
              <Camera size={24} />
            </motion.button>
          </div>

          <div className="w-full space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Nome" 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all font-medium"
                value={form.nome}
                onChange={e => setForm({...form, nome: e.target.value})}
              />
            </div>
            <input 
              type="text" 
              placeholder="Apelido" 
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 transition-all font-medium"
              value={form.apelido}
              onChange={e => setForm({...form, apelido: e.target.value})}
            />
            <input 
              type="email" 
              placeholder="E-mail" 
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 transition-all font-medium"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>

          <NeonButton color="red" className="w-full py-5 text-lg rounded-2xl" onClick={submit}>
            OUVIR AGORA
          </NeonButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-slate-900 border border-pink-500/20 rounded-[2.5rem] p-10 shadow-[0_0_60px_rgba(236,72,153,0.3)] relative text-center"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={28} />
        </button>

        <div className="w-20 h-20 bg-pink-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 transform -rotate-6">
          <Heart fill="#ec4899" size={44} className="text-pink-500" />
        </div>

        <h3 className="text-2xl font-black mb-3 text-white tracking-tight">APOIE NOSSO TRABALHO!</h3>
        <p className="text-slate-400 mb-8 leading-relaxed font-medium">
          Sua ajuda é fundamental para mantermos a programação 24h no ar.
        </p>

        <a 
          href="https://mpago.la/1CYznqQ" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block w-full py-5 bg-pink-500 rounded-2xl font-black text-lg text-white shadow-[0_10px_25px_rgba(236,72,153,0.4)] hover:shadow-[0_15px_35px_rgba(236,72,153,0.6)] transition-all transform hover:-translate-y-1 active:scale-95"
        >
          CONTRIBUIR AGORA
        </a>
        
        <button onClick={onClose} className="mt-6 text-slate-500 text-xs font-black uppercase tracking-[0.2em] hover:text-slate-300 transition-colors">
          Continuar ouvindo
        </button>
      </motion.div>
    </motion.div>
  );
}
