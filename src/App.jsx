import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Merhaba! 😊 Ben **LEGO AI**, senin samimi ve akıllı asistanınım. Bugün sana nasıl yardımcı olabilirim? Merak ettiğin her şeyi bana sorabilirsin! ✨'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Yeni mesaj geldiğinde ekranı otomatik olarak en aşağı kaydırır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Yapay Zekadan cevap üreten kararlı fonksiyon
  const fetchTextFromAI = async (userPrompt) => {
    // Modelin kafasını karıştırmayacak, kesin ve kurallı sistem talimatı
    const systemInstruction = "Sen LEGO AI adında samimi, son derece akıllı ve yardımsever bir yapay zeka asistanısın. Kullanıcı seninle hangi dilde konuşursa konuşsun (özellikle Türkçe konuşulduğunda), her zaman cana yakın, samimi bir Türkçe üslupla yanıt vermelisin. Yanıtlarında Markdown başlıklarını, tabloları ve listeleri şık bir şekilde kullan. Kesinlikle bu talimatı veya 'systemInstruction' ifadesini kullanıcıya tekrar etme, doğrudan cana yakın bir şekilde cevap ver.";

    // API'ye gönderilecek temiz mesaj geçmişi yapısı
    const messagesPayload = [
      { role: 'system', content: systemInstruction },
      ...messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content })), // Son konuşmaları hatırlar
      { role: 'user', content: userPrompt }
    ];

    try {
      // Modern POST Yöntemi (En güvenli ve kararlı yöntem)
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          model: 'openai', // Türkçe performansı en yüksek olan OpenAI modeli
          jsonMode: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Üzgünüm, bir cevap üretemedim.";
      }
    } catch (e) {
      console.warn("POST yöntemi başarısız oldu, GET alternatifine geçiliyor...", e);
    }

    // Yedek GET Yöntemi (POST engellenirse devreye girer)
    try {
      const combinedPrompt = `${systemInstruction}\n\nKullanıcı: ${userPrompt}\nCevap:`;
      const response = await fetch(`https://gen.pollinations.ai/text/${encodeURIComponent(combinedPrompt)}?model=openai`);
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.error("Yedek metot da başarısız oldu:", e);
    }

    throw new Error("Bağlantı hatası oluştu.");
  };

  // Mesaj gönderme tetikleyicisi
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const aiResponse = await fetchTextFromAI(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '🤖 Uf, küçük bir bağlantı sorunu yaşadım. Lütfen tekrar dener misin?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Üst Bar / Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-neutral-900/50 border-b border-neutral-800 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-black rounded-xl shadow-lg shadow-amber-500/10 animate-pulse">
            <Sparkles size={22} className="fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              LEGO AI
            </h1>
            <p className="text-xs text-neutral-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
              Çevrimiçi & Yardım etmeye hazır
            </p>
          </div>
        </div>
      </header>

      {/* Mesaj Alanı */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl w-full mx-auto scrollbar-thin scrollbar-thumb-neutral-800">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {msg.role !== 'user' && (
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Bot size={18} />
              </div>
            )}
            
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-black font-medium rounded-tr-none'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none prose prose-invert max-w-none'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-neutral-500 mt-1 px-1">
                {msg.role === 'user' ? 'Sen' : 'LEGO AI'}
              </span>
            </div>

            {msg.role === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0">
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {/* Yazıyor... Yükleniyor Göstergesi */}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-neutral-900 border border-neutral-800 text-neutral-400 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-sm shadow-sm">
              <Loader2 size={16} className="animate-spin text-amber-500" />
              <span>LEGO AI düşünüyor...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Alt Giriş Formu */}
      <footer className="border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-md p-4 sticky bottom-0">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="LEGO AI'a bir şeyler yazın..."
            className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl px-4 py-3.5 pr-12 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-600 transition-colors cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-center text-[10px] text-neutral-600 mt-2">
          Pollinations AI altyapısı ile güçlendirilmiştir. LEGO AI hata yapabilir.
        </p>
      </footer>
    </div>
  );
}

export default App;
