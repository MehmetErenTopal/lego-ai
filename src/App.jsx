import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Plus, Mic, Send, Image as ImageIcon, 
  Video, Music, MessageSquare, Copy, Download, Trash2, Volume2, VolumeX
} from 'lucide-react';

// --- API GÜVENLİĞİ (BASE64) ---
const ENCODED_API_KEY = "c2tfbldBbmdVcGw1OFIyQ1hFb3NXa01IcHQ5MlNnQWdsZGc="; 
const decodeApiKey = (encodedKey) => {
  try {
    return atob(encodedKey);
  } catch (e) {
    console.error("API Anahtarı çözülemedi.");
    return "";
  }
};
const API_KEY = decodeApiKey(ENCODED_API_KEY);

// --- BİRLEŞİK MODELLER VE URL YAPILARI ---
const MODELS = {
  text: 'gemma',
  image: 'dreamshaper',
  video: 'nova-reel',
  audio: 'kokoro'
};

// KaTeX Matematik kütüphanesini dinamik yükleme
const loadKatex = () => {
  if (!document.getElementById('katex-css')) {
    const link = document.createElement('link');
    link.id = 'katex-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
    document.head.appendChild(link);
  }
  if (!window.katex) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
    script.async = true;
    document.head.appendChild(script);
  }
};

// --- ÖZEL KOD BLOĞU BİLEŞENİ ---
const CodeBlock = ({ className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
  };

  const handleDownload = () => {
    const blob = new Blob([codeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const extMap = {
      javascript: 'js', python: 'py', html: 'html', css: 'css', json: 'json',
      typescript: 'ts', java: 'java', cpp: 'cpp', 'c++': 'cpp', text: 'txt', react: 'jsx'
    };
    const ext = extMap[language.toLowerCase()] || 'txt';
    a.download = `lego_code.${ext}`;
    
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 border border-gray-800 rounded bg-black">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0c0c0c] border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400">{language}</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-gray-400 hover:text-white p-1" title="Kopyala">
            <Copy size={14} />
          </button>
          <button onClick={handleDownload} className="text-gray-400 hover:text-white p-1" title="İndir">
            <Download size={14} />
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-gray-200">
        <pre><code className={className}>{codeContent}</code></pre>
      </div>
    </div>
  );
};

// --- LATEX MATEMATİK YORUMLAYICI ---
const MathRenderer = ({ inline, math }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.katex && containerRef.current) {
      try {
        window.katex.render(math, containerRef.current, {
          displayMode: !inline,
          throwOnError: false
        });
      } catch (err) {
        console.error("LaTeX rendering hatası:", err);
      }
    }
  }, [math, inline]);

  if (inline) {
    return <span ref={containerRef} className="font-serif italic text-yellow-200 px-1">{`$${math}$`}</span>;
  }
  return (
    <div className="my-4 overflow-x-auto py-3 text-center bg-gray-950 border border-gray-900 rounded">
      <div ref={containerRef} className="inline-block font-serif text-yellow-100">{`$$${math}$$`}</div>
    </div>
  );
};

// --- GELİŞMİŞ MARKDOWN YORUMLAYICI ---
const parseContent = (text) => {
  const blocks = [];
  const lines = text.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let inMath = false;
  let mathLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', lang: codeLang, content: codeLines.join('\n') });
        inCode = false;
        codeLines = [];
      } else {
        inCode = true;
        codeLang = line.trim().slice(3).trim() || 'text';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.trim().startsWith('$$')) {
      if (inMath) {
        blocks.push({ type: 'math-block', content: mathLines.join('\n') });
        inMath = false;
        mathLines = [];
      } else {
        inMath = true;
        const remaining = line.trim().slice(2).trim();
        if (remaining) mathLines.push(remaining);
      }
      continue;
    }

    if (inMath) {
      mathLines.push(line);
      continue;
    }

    blocks.push({ type: 'text', content: line });
  }

  if (inCode) blocks.push({ type: 'code', lang: codeLang, content: codeLines.join('\n') });
  if (inMath) blocks.push({ type: 'math-block', content: mathLines.join('\n') });

  return blocks;
};

const groupBlocks = (blocks) => {
  const grouped = [];
  let currentParagraph = [];
  let currentList = null;
  let currentTable = null;

  const flushPara = () => {
    if (currentParagraph.length > 0) {
      grouped.push({ type: 'paragraph', content: currentParagraph.join('\n') });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      grouped.push(currentList);
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      grouped.push(currentTable);
      currentTable = null;
    }
  };

  const flushAll = () => {
    flushPara();
    flushList();
    flushTable();
  };

  for (const block of blocks) {
    if (block.type !== 'text') {
      flushAll();
      grouped.push(block);
      continue;
    }

    const line = block.content;
    const trimmed = line.trim();

    if (trimmed === '') {
      flushAll();
      continue;
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushAll();
      grouped.push({ type: 'hr' });
      continue;
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushAll();
      grouped.push({ type: 'header', level: headerMatch[1].length, content: headerMatch[2] });
      continue;
    }

    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      flushPara();
      flushTable();
      if (!currentList || currentList.listType !== 'ul') {
        flushList();
        currentList = { type: 'list', listType: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      flushPara();
      flushTable();
      if (!currentList || currentList.listType !== 'ol') {
        flushList();
        currentList = { type: 'list', listType: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushPara();
      flushList();
      const cells = trimmed.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
      const isSeparator = cells.every(c => c.match(/^:?-+:?$/));
      
      if (isSeparator) continue;

      if (!currentTable) {
        currentTable = { type: 'table', headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    }

    flushList();
    flushTable();
    currentParagraph.push(line);
  }

  flushAll();
  return grouped;
};

const renderInline = (text) => {
  let tokens = [{ type: 'text', text }];

  const splitTokens = (regex, type) => {
    let nextTokens = [];
    for (const token of tokens) {
      if (token.type !== 'text') {
        nextTokens.push(token);
        continue;
      }
      const parts = token.text.split(regex);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          nextTokens.push({ type, text: parts[i] });
        } else {
          if (parts[i]) {
            nextTokens.push({ type: 'text', text: parts[i] });
          }
        }
      }
    }
    tokens = nextTokens;
  };

  splitTokens(/`([^`]+)`/g, 'code');
  splitTokens(/\$([^\$]+)\$/g, 'math');
  splitTokens(/\*\*([^*]+)\*\*/g, 'bold');
  splitTokens(/\*([^*]+)\*/g, 'italic');

  return tokens.map((token, index) => {
    switch (token.type) {
      case 'code':
        return <code key={index} className="bg-gray-900 px-1.5 py-0.5 rounded text-red-400 font-mono text-xs border border-gray-800">{token.text}</code>;
      case 'math':
        return <MathRenderer key={index} inline math={token.text} />;
      case 'bold':
        return <strong key={index} className="font-bold text-white">{token.text}</strong>;
      case 'italic':
        return <em key={index} className="italic text-gray-300">{token.text}</em>;
      default:
        return token.text;
    }
  });
};

const LegoMarkdown = ({ content }) => {
  const blocks = parseContent(content || '');
  const grouped = groupBlocks(blocks);

  return (
    <div className="space-y-4">
      {grouped.map((block, idx) => {
        switch (block.type) {
          case 'header': {
            const Tag = `h${block.level}`;
            const sizes = {
              1: 'text-2xl font-black border-b border-gray-800 pb-2 mb-4 mt-6 text-white',
              2: 'text-xl font-bold border-b border-gray-900 pb-1 mb-3 mt-5 text-gray-100',
              3: 'text-lg font-bold mb-2 mt-4 text-gray-200',
              4: 'text-base font-semibold mb-2 mt-3 text-gray-300',
            };
            return <Tag key={idx} className={sizes[block.level] || sizes[3]}>{renderInline(block.content)}</Tag>;
          }
          case 'paragraph':
            return <p key={idx} className="text-gray-300 leading-relaxed text-sm md:text-base">{renderInline(block.content)}</p>;
          case 'hr':
            return <hr key={idx} className="border-gray-800 my-6" />;
          case 'list': {
            const Tag = block.listType === 'ol' ? 'ol' : 'ul';
            return (
              <Tag key={idx} className={`pl-6 space-y-1.5 my-3 text-sm md:text-base ${block.listType === 'ol' ? 'list-decimal' : 'list-disc'} text-gray-300`}>
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </Tag>
            );
          }
          case 'table':
            return (
              <div key={idx} className="overflow-x-auto my-4 border border-gray-800 rounded">
                <table className="min-w-full divide-y divide-gray-800 text-sm">
                  <thead className="bg-gray-950">
                    <tr>
                      {block.headers.map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left font-semibold text-gray-200 border-r border-gray-800 last:border-0">{renderInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 bg-black">
                    {block.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-950 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-2 text-gray-300 border-r border-gray-900 last:border-0">{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'code':
            return <CodeBlock key={idx} className={`language-${block.lang}`}>{block.content}</CodeBlock>;
          case 'math-block':
            return <MathRenderer key={idx} inline={false} math={block.content} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

// --- ANA UYGULAMA ---
export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('text'); // text, image, video, audio
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Bildirim Toast State'i
  const [toastMessage, setToastMessage] = useState('');
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  
  // Sohbet Geçmişi
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Boş Ekran Animasyonu
  const fallTexts = ["Sorumu Yanıtla", "Görsel Oluştur", "Video Oluştur", "Ses Oluştur", "Bana Yardım Et"];
  const [currentFallText, setCurrentFallText] = useState(0);
  const messagesEndRef = useRef(null);

  // Başlangıç Yüklemeleri
  useEffect(() => {
    loadKatex();
    const savedChats = localStorage.getItem('lego_chats');
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
  }, []);

  // Animasyon Zamanlayıcısı
  useEffect(() => {
    if (messages.length === 0) {
      const interval = setInterval(() => {
        setCurrentFallText((prev) => (prev + 1) % fallTexts.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [messages.length]);

  // Sohbetleri Kaydetme
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('lego_chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Sayfa Altına Otomatik Kaydırma
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toast Bildirimi Gösterme Fonksiyonu
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Ses Algılama (Speech-to-Text)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Tarayıcınız veya şu anki ortam ses tanımayı desteklemiyor. Lütfen Chrome kullanın veya yerel olarak (localhost) çalıştırmayı deneyin.");
      return;
    }
    
    if (isListening) {
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => (prev ? prev + ' ' : '') + transcript);
        };
        recognition.onerror = (e) => {
          console.error("Speech Recognition Hatası: ", e);
          setIsListening(false);
          if (e.error === 'not-allowed') {
            showToast("Mikrofon izni reddedildi. Lütfen tarayıcı adres barındaki kilit simgesinden mikrofon izni verin.");
          } else {
            showToast("Ses algılanamadı veya izin verilmedi.");
          }
        };
        recognition.onend = () => setIsListening(false);
        
        recognition.start();
      } catch (err) {
        console.error(err);
        showToast("Ses tanıma başlatılamadı. İzinlerinizi kontrol edin.");
        setIsListening(false);
      }
    }
  };

  // Sesli Okuma (Text-to-Speech)
  const speakText = (text, msgId) => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (activeSpeechId === msgId) {
          setActiveSpeechId(null);
          return;
        }
      }

      const cleanText = text
        .replace(/```[\s\S]*?```/g, '') // Kod bloklarını sil
        .replace(/`([^`]+)`/g, '$1') // Inline kodları düzelt
        .replace(/[*_#\-|]/g, '') // Sembolleri temizle
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'tr-TR';

      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find(voice => voice.lang.includes('TR') || voice.lang.includes('tr'));
      if (trVoice) utterance.voice = trVoice;

      utterance.onstart = () => setActiveSpeechId(msgId);
      utterance.onend = () => setActiveSpeechId(null);
      utterance.onerror = () => setActiveSpeechId(null);

      window.speechSynthesis.speak(utterance);
    } else {
      showToast("Tarayıcınız sesli okumayı desteklemiyor.");
    }
  };

  // Sohbeti Geçmişe Kaydetme / Güncelleme
  const saveMessageToChat = (newMessages) => {
    let chatId = currentChatId;
    if (!chatId) {
      chatId = Date.now().toString();
      setCurrentChatId(chatId);
      const newChat = {
        id: chatId,
        title: newMessages[0].content.substring(0, 30) + "...",
        messages: newMessages,
        date: new Date().toISOString()
      };
      setChats([newChat, ...chats]);
    } else {
      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, messages: newMessages } : chat
      ));
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setActiveSpeechId(null);
  };

  const loadChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const deleteChat = (e, chatId) => {
    e.stopPropagation();
    const updatedChats = chats.filter(c => c.id !== chatId);
    setChats(updatedChats);
    if (updatedChats.length === 0) localStorage.removeItem('lego_chats');
    else localStorage.setItem('lego_chats', JSON.stringify(updatedChats));
    
    if (currentChatId === chatId) startNewChat();
  };

  // Pollinations Birleşik API'sine güvenli ve yüksek toleranslı istek yapısı
  const fetchTextFromAI = async (prompt, systemInstruction = null) => {
    const messagesPayload = [];
    if (systemInstruction) {
      messagesPayload.push({ role: 'system', content: systemInstruction });
    }
    messagesPayload.push({ role: 'user', content: prompt });

    try {
      const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messagesPayload,
          model: MODELS.text
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.warn("POST chat/completions hatası, GET metoduna geçiliyor...", e);
    }

    const combinedPrompt = systemInstruction ? `${systemInstruction}\n\nUser: ${prompt}` : prompt;
    const encodedPrompt = encodeURIComponent(combinedPrompt);
    try {
      const response = await fetch(`https://gen.pollinations.ai/text/${encodedPrompt}?model=${MODELS.text}`);
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.warn("gen.pollinations.ai/text/ GET hatası, alternatif modele geçiliyor...", e);
    }

    try {
      const response = await fetch(`https://gen.pollinations.ai/text/${encodedPrompt}?model=openai`);
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.error("Metin üretimi tamamen başarısız oldu.", e);
    }

    throw new Error("Ağ hatası");
  };

  // İstem Genişletici (Türkçe basit istemleri detaylı İngilizceye çevirir)
  const expandPrompt = async (simplePrompt, targetMode) => {
    try {
      const systemPrompt = `You are a professional prompt engineer. Translate the user's simple prompt to English and expand it into a highly detailed, stunning, descriptive, specific aesthetic prompt suitable for generating a beautiful high-quality ${targetMode === 'image' ? 'digital artwork/image' : 'video clip'}. Do not include any preambles, extra text, explanations, or quotes. Output ONLY the final detailed English prompt. User prompt: ${simplePrompt}`;
      const expanded = await fetchTextFromAI(simplePrompt, systemPrompt);
      return expanded.trim() || simplePrompt;
    } catch (e) {
      console.error("Prompt genişletme hatası:", e);
    }
    return simplePrompt;
  };

  // Mesaj Gönderme
  const handleSend = async () => {
    if (!input.trim()) return;

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setActiveSpeechId(null);

    const userMessage = { role: 'user', content: input, type: 'text' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveMessageToChat(newMessages);
    setInput('');
    
    const promptText = input;
    
    // Geçici Yükleniyor Mesajı
    const loadingId = Date.now();
    setMessages(prev => [...prev, { id: loadingId, role: 'assistant', content: '...', type: 'loading' }]);

    try {
      const seed = Math.floor(Math.random() * 1000000);
      let assistantMessage = { role: 'assistant', type: mode };

      if (mode === 'text') {
        // Yapay zekaya kim olduğunu ve Türkçe konuşması gerektiğini bildiren güçlü Sistem Yönergesi
        const textSystemPrompt = "Sen LEGO AI adında samimi, son derece akıllı ve yardımsever bir yapay zeka asistanısın. Kullanıcı seninle hangi dilde konuşursa konuşsun (özellikle Türkçe konuşulduğunda), her zaman cana yakın, samimi bir Türkçe üslupla yanıt vermelisin. Yanıtlarında Markdown başlıklarını, tabloları ve listeleri şık bir şekilde kullan. Sana verdiğimiz bilgileri kullanıcılara direkt ben şöyleyim böyleyim diye yazmana gerek yok, sadece senin genel kişilğini bilmen yeterli.";
        const data = await fetchTextFromAI(promptText, textSystemPrompt);
        assistantMessage.content = data;
      } else if (mode === 'image' || mode === 'video') {
        const detailedPrompt = await expandPrompt(promptText, mode);
        let safePrompt = detailedPrompt;
        if (safePrompt.length > 800) {
          safePrompt = safePrompt.substring(0, 800);
        }
        const encodedPrompt = encodeURIComponent(safePrompt);
        const mediaUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${MODELS[mode]}&nologo=true&seed=${seed}&width=1024&height=1024`;
        
        assistantMessage.url = mediaUrl;
        assistantMessage.content = `**Orijinal İstem:** ${promptText}\n\n**Genişletilmiş İngilizce İstem:** ${detailedPrompt}`;
      } else if (mode === 'audio') {
        const encodedPrompt = encodeURIComponent(promptText);
        const mediaUrl = `https://gen.pollinations.ai/audio/${encodedPrompt}?model=${MODELS.audio}&seed=${seed}`;
        
        assistantMessage.url = mediaUrl;
        assistantMessage.content = `**İstenen Ses Metni:** ${promptText}`;
      }

      setMessages(prev => prev.map(msg => msg.id === loadingId ? assistantMessage : msg));
      saveMessageToChat([...newMessages, assistantMessage]);

    } catch (error) {
      console.error("API Hatası detayları:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId ? { role: 'assistant', content: 'Üzgünüm, Pollinations AI sunucularına bağlanırken bir ağ hatası oluştu. Lütfen tekrar deneyin.', type: 'text' } : msg
      ));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden selection:bg-gray-800 relative">
      
      {/* ÖZEL TOAST BİLDİRİMİ */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-[#0d0d0d] border border-red-500 text-gray-200 px-4 py-3 text-xs md:text-sm max-w-sm md:max-w-md text-center transition-all duration-300">
          <p className="font-bold text-red-500 uppercase tracking-widest mb-1">DİKKAT</p>
          {toastMessage}
        </div>
      )}

      {/* Özel Keyframes */}
      <style>{`
        @keyframes fallIn {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fall {
          animation: fallIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* SİDEBAR (GEÇMİŞ) */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-gray-800 bg-[#0a0a0a] flex flex-col flex-shrink-0 relative overflow-hidden z-20`}>
        <div className="h-14 px-4 border-b border-gray-800 flex justify-between items-center bg-black">
          <span className="font-bold tracking-widest text-sm text-gray-300">GEÇMİŞ</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center gap-2 p-3 text-sm border border-gray-800 hover:bg-gray-900 transition-colors text-left"
          >
            <Plus size={16} /> Yeni Sohbet
          </button>
          
          <div className="mt-4 space-y-1">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => loadChat(chat.id)}
                className={`w-full flex items-center justify-between p-3 text-sm border ${currentChatId === chat.id ? 'border-gray-500 bg-gray-900' : 'border-transparent hover:border-gray-800'} cursor-pointer group`}
              >
                <div className="truncate flex-1 text-gray-400 group-hover:text-gray-200">
                  {chat.title}
                </div>
                <button 
                  onClick={(e) => deleteChat(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ANA EKRAN */}
      <div className="flex-1 flex flex-col h-full bg-black relative">
        
        {/* Üst Bar */}
        <div className="h-14 border-b border-gray-800 flex items-center px-4 justify-between bg-black flex-shrink-0">
          <div className="w-6 flex items-center justify-start">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-white">
                <Menu size={24} />
              </button>
            )}
          </div>
          <div className="font-bold tracking-widest text-xs text-gray-500">LEGO AI</div>
          <div className="w-6"></div>
        </div>

        {/* Mesaj Alanı */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-start min-h-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 select-none w-full max-w-2xl text-center md:text-left my-auto">
              <span className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-yellow-400 to-white">
                LEGO
              </span>
              <span className="hidden md:inline text-5xl md:text-7xl font-black text-gray-800">|</span>
              <div className="h-[3rem] md:h-[4.5rem] overflow-hidden relative w-[250px] md:w-[400px] flex items-center justify-center md:justify-start">
                <span 
                  key={currentFallText} 
                  className="absolute text-3xl md:text-5xl font-bold text-gray-300 animate-fall"
                >
                  {fallTexts[currentFallText]}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-6">
              {messages.map((msg, idx) => {
                const uniqueId = msg.id || idx;
                return (
                  <div key={uniqueId} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] p-4 border ${msg.role === 'user' ? 'bg-gray-900 border-gray-700' : 'bg-black border-gray-800'} relative group`}>
                      
                      {/* Sesli Okuma (Hoparlör) Butonu */}
                      {msg.role === 'assistant' && msg.type === 'text' && (
                        <button
                          onClick={() => speakText(msg.content, uniqueId)}
                          className="absolute -top-3 -right-3 bg-[#0d0d0d] border border-gray-700 p-1.5 text-gray-400 hover:text-white hover:border-gray-500 transition-colors z-10"
                          title="Seslendir / Durdur"
                        >
                          {activeSpeechId === uniqueId ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
                        </button>
                      )}

                      {msg.type === 'loading' ? (
                        <div className="flex gap-1 items-center h-6">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></div>
                        </div>
                      ) : (
                        <>
                          {msg.role === 'assistant' && msg.type !== 'text' && (
                            <div className="mb-4 text-xs font-bold tracking-widest text-gray-500 border-b border-gray-800 pb-2 mb-3 uppercase flex items-center gap-2">
                              {msg.type === 'image' && <ImageIcon size={14}/>}
                              {msg.type === 'video' && <Video size={14}/>}
                              {msg.type === 'audio' && <Music size={14}/>}
                              {msg.type} OLUŞTURULDU
                            </div>
                          )}
                          
                          {(msg.type === 'text' || msg.role === 'user') && (
                             <div className="text-gray-200 leading-relaxed">
                                <LegoMarkdown content={msg.content} />
                             </div>
                          )}
                          
                          {msg.role === 'assistant' && msg.type === 'image' && (
                            <div className="space-y-4">
                              <div className="border border-gray-800 bg-[#0a0a0a] p-2">
                                <img src={msg.url} alt="AI Generated" className="max-w-full h-auto w-full object-cover" />
                              </div>
                              <div className="text-xs text-gray-400 bg-gray-950 p-3 border border-gray-900 rounded">
                                <LegoMarkdown content={msg.content} />
                              </div>
                            </div>
                          )}
                          
                          {msg.role === 'assistant' && msg.type === 'video' && (
                            <div className="space-y-4">
                              <div className="border border-gray-800 bg-[#0a0a0a] p-2">
                                <video src={msg.url} controls autoPlay loop className="max-w-full h-auto w-full" />
                              </div>
                              <div className="text-xs text-gray-400 bg-gray-950 p-3 border border-gray-900 rounded">
                                <LegoMarkdown content={msg.content} />
                              </div>
                            </div>
                          )}
                          
                          {msg.role === 'assistant' && msg.type === 'audio' && (
                            <div className="space-y-4">
                              <div className="border border-gray-800 bg-[#0a0a0a] p-4">
                                <audio src={msg.url} controls className="w-full" />
                              </div>
                              <div className="text-xs text-gray-400 bg-gray-950 p-3 border border-gray-900 rounded">
                                <LegoMarkdown content={msg.content} />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Girdi Alanı */}
        <div className="w-full bg-[#030303] border-t border-gray-900 p-4 flex justify-center flex-shrink-0 z-10">
          <div className="w-full max-w-4xl relative">
            
            {isModeMenuOpen && (
              <div 
                className="fixed inset-0 z-20 cursor-default" 
                onClick={() => setIsModeMenuOpen(false)} 
              />
            )}

            {isModeMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 bg-[#0a0a0a] border border-gray-800 flex flex-col p-1 w-48 z-30">
                <button onClick={() => { setMode('text'); setIsModeMenuOpen(false); }} className={`flex items-center gap-3 p-3 text-sm hover:bg-gray-900 transition-colors ${mode === 'text' ? 'text-white' : 'text-gray-500'}`}>
                  <MessageSquare size={16} /> Metin ({MODELS.text})
                </button>
                <div className="h-px bg-gray-800 w-full" />
                <button onClick={() => { setMode('image'); setIsModeMenuOpen(false); }} className={`flex items-center gap-3 p-3 text-sm hover:bg-gray-900 transition-colors ${mode === 'image' ? 'text-white' : 'text-gray-500'}`}>
                  <ImageIcon size={16} /> Görsel ({MODELS.image})
                </button>
                <div className="h-px bg-gray-800 w-full" />
                <button onClick={() => { setMode('video'); setIsModeMenuOpen(false); }} className={`flex items-center gap-3 p-3 text-sm hover:bg-gray-900 transition-colors ${mode === 'video' ? 'text-white' : 'text-gray-500'}`}>
                  <Video size={16} /> Video ({MODELS.video})
                </button>
                <div className="h-px bg-gray-800 w-full" />
                <button onClick={() => { setMode('audio'); setIsModeMenuOpen(false); }} className={`flex items-center gap-3 p-3 text-sm hover:bg-gray-900 transition-colors ${mode === 'audio' ? 'text-white' : 'text-gray-500'}`}>
                  <Music size={16} /> Ses ({MODELS.audio})
                </button>
              </div>
            )}

            <div className="border border-gray-700 bg-[#0a0a0a] flex items-end p-2 focus-within:border-gray-500 transition-colors relative z-30">
              
              <button 
                onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                className={`p-3 text-gray-400 hover:text-white transition-colors flex-shrink-0 ${mode !== 'text' ? 'text-red-400' : ''}`}
                title="Mod Seçimi (Metin, Görsel, Video, Ses)"
              >
                <Plus size={24} />
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'text' ? "LEGO'ya bir şeyler sor..." : 
                  mode === 'image' ? "Nasıl bir görsel oluşturmak istersin? (Basitçe Türkçe yazabilirsin)" :
                  mode === 'video' ? "Nasıl bir video oluşturmak istersin? (Basitçe Türkçe yazabilirsin)" :
                  "Nasıl bir ses/müzik oluşturmak istersin? (Söylemesini istediğin Türkçe metni buraya yaz)"
                }
                className="flex-1 bg-transparent border-none outline-none resize-none max-h-48 min-h-[44px] py-3 px-2 text-white placeholder-gray-600"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
              
              <div className="flex gap-1 flex-shrink-0 mb-1">
                <button 
                  onClick={toggleListening}
                  className={`p-3 transition-colors ${isListening ? 'text-red-500 bg-gray-900' : 'text-gray-400 hover:text-white'}`}
                  title="Sesle Yazdır"
                >
                  <Mic size={20} className={isListening ? "animate-pulse" : ""} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-3 bg-white text-black disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>

            </div>
            
            <div className="text-center mt-2 text-[10px] text-gray-600 tracking-widest uppercase">
              Pollinations AI - Ücretsiz ve Hızlı Metin/Medya Üretimi
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
