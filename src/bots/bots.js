import { useState, useRef, useEffect } from "react";

const CATALOG_CONTEXT = `
Store: My Store (मेरी दुकान)
📱 Electronics: [P001] 🎧 Wireless Earbuds Pro ₹3,999 | [P002] ⌚ Smart Watch X1 ₹7,499
👕 Clothing: [P003] 👕 Cotton T-Shirt ₹999 | [P004] 👖 Slim Fit Jeans ₹2,499
💍 Accessories: [P005] 👛 Leather Wallet ₹1,999 | [P006] 🕶️ Sunglasses UV400 ₹1,499`;

const SYSTEM_PROMPT = `You are a friendly WhatsApp shopping assistant for "My Store" (मेरी दुकान).

CATALOG: ${CATALOG_CONTEXT}

RULES:
1. LANGUAGE: Auto-detect. Reply ONLY in English OR Hindi — never mix.
2. CATALOG: Show products with emoji, name, price, ID when asked.
3. ORDER: Confirm product + qty + ask address. Show total.
4. SHORT: Max 3-4 lines per reply. Use emojis.
5. Never say you are AI.

INTERACTIVE MENUS — When it makes sense, end your reply with a JSON block to show a menu. Format:
<MENU>{"title":"Choose to continue","options":[{"id":"opt1","title":"Option 1","desc":"Description"},{"id":"opt2","title":"Option 2","desc":"Description"}]}</MENU>

When to show menus:
- On greeting → show main menu: Shop Products, Explore Categories, Order History, Customer Care
- After showing categories → show category buttons
- After customer picks category → show products in that category as options
- After customer wants to order → show confirm/cancel

Keep the reply text SHORT before the menu. Only include <MENU> when it genuinely helps navigation.`;

const QUICK_EN = ["Hi 👋", "Show catalog", "Electronics 📱", "Cheapest item?", "My order"];
const QUICK_HI = ["नमस्ते 👋", "सभी प्रोडक्ट", "इलेक्ट्रॉनिक्स 📱", "सबसे सस्ता?", "मेरा ऑर्डर"];

function TypingDots() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,padding:"10px 14px",background:"white",borderRadius:"18px 18px 18px 4px",width:"fit-content",boxShadow:"0 1px 2px rgba(0,0,0,.1)"}}>
      {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#999",animation:"bounce 1.2s infinite",animationDelay:`${i*.2}s`}}/>)}
    </div>
  );
}

function InteractiveMenu({ menu, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginTop:6}}>
      <button onClick={()=>setOpen(true)} style={{
        background:"white",border:"1.5px solid #25D366",borderRadius:12,
        padding:"10px 18px",cursor:"pointer",fontSize:13,color:"#25D366",
        fontWeight:600,display:"flex",alignItems:"center",gap:6,
        boxShadow:"0 1px 4px rgba(0,0,0,.1)",fontFamily:"inherit",
        transition:"all .15s"
      }}>
        ☰ {menu.title}
      </button>

      {open && (
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,.5)"}}
          onClick={()=>setOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#1a1a1a",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,
            paddingBottom:32,animation:"slideUp .25s ease"
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 8px"}}>
              <span style={{color:"white",fontWeight:700,fontSize:16}}>{menu.title}</span>
              <button onClick={()=>setOpen(false)} style={{background:"#333",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",color:"#aaa",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:"0 4px"}}>
              {menu.options.map((opt,i)=>(
                <div key={i}>
                  {i>0 && <div style={{height:1,background:"#2a2a2a",margin:"0 16px"}}/>}
                  <div onClick={()=>{ setOpen(false); onSelect(opt); }}
                    style={{padding:"14px 20px",cursor:"pointer",transition:"background .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#252525"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{color:"white",fontSize:15,fontWeight:500}}>{opt.title}</div>
                    {opt.desc && <div style={{color:"#888",fontSize:12,marginTop:2}}>{opt.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{textAlign:"center",color:"#555",fontSize:12,marginTop:8}}>Tap an item to select it</div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseMessage(raw) {
  const menuMatch = raw.match(/<MENU>([\s\S]*?)<\/MENU>/);
  const text = raw.replace(/<MENU>[\s\S]*?<\/MENU>/g, "").trim();
  let menu = null;
  if (menuMatch) {
    try { menu = JSON.parse(menuMatch[1]); } catch {}
  }
  return { text, menu };
}

export default function App() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("en");
//   const [key, setKey] = useState("");
//   const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const bottomRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,busy]);

  const isHindi = t => /[\u0900-\u097F]/.test(t);

//   function saveKey() {
//     if (key.trim().length < 10) { setErr("Enter a valid Groq API key"); return; }
//     setSaved(true); setErr("");
//   }

  async function send(text) {
    if (!text.trim() || busy) return;
    // if (!saved) { setErr("Enter your Groq API key first ↑"); return; }
    const userMsg = text.trim();
    setInput(""); setErr("");
    if (isHindi(userMsg)) setLang("hi"); else setLang("en");

    const rawHistory = [...msgs.map(m=>({role:m.role, content:m.rawContent||m.content})), {role:"user",content:userMsg}];
    const displayHistory = [...msgs, {role:"user",content:userMsg,rawContent:userMsg}];
    setMsgs(displayHistory);
    setBusy(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json",
         "Authorization": `Bearer ${process.env.REACT_APP_GROQ_KEY}`
        },
        body: JSON.stringify({
          model:"llama-3.1-8b-instant",
          max_tokens:500,
          temperature:0.7,
          messages:[{role:"system",content:SYSTEM_PROMPT}, ...rawHistory.slice(-10)]
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message||"Unknown error";
        setErr(res.status===429 ? "⏳ Rate limit — wait 5 sec and retry." : res.status===401 ? "❌ Invalid key." : `❌ ${msg}`);
        setMsgs(displayHistory.slice(0,-1));
        setBusy(false); return;
      }

      const raw = data?.choices?.[0]?.message?.content || "Sorry 🙏";
      const {text:displayText, menu} = parseMessage(raw);
      setMsgs([...displayHistory, {role:"assistant", content:displayText, menu, rawContent:raw}]);

    } catch {
      setErr("❌ Network error");
      setMsgs(displayHistory.slice(0,-1));
    }
    setBusy(false);
  }

  const timeStr = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const quickReplies = lang==="hi" ? QUICK_HI : QUICK_EN;

  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"linear-gradient(135deg,#fff8e1,#ffe0b2)",fontFamily:"'Segoe UI',sans-serif",padding:16}}>
      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .msg{animation:fadeIn .25s ease}
        .qbtn:hover{background:#fff3e0!important;border-color:#FF9800!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}
      `}</style>

      <div style={{width:"100%",maxWidth:430,background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",maxHeight:"95vh"}}>

        {/* Header */}
        <div style={{background:"#FF6F00",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:"#FFB300",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🛍️</div>
          <div style={{flex:1}}>
            <div style={{color:"white",fontWeight:700,fontSize:15}}>PhasalBazaar — मेरी दुकान</div>
            {/* <div style={{color:"#ffe082",fontSize:12}}>🟢 Groq · Llama 3.1 · Interactive Menus</div> */}
          </div>
         <div style={{color:"#a5d6a7",fontSize:11}}>🔑 Ready ✓</div>
        </div>


        {/* Chat */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 12px",background:"#ECE5DD",display:"flex",flexDirection:"column",gap:6,minHeight:320,maxHeight:480}}>

          {msgs.length===0  && (
            <div style={{textAlign:"center",margin:"8px 0 12px"}}>
              <div style={{display:"inline-block",background:"rgba(255,255,255,.9)",borderRadius:12,padding:"10px 16px",fontSize:12,color:"#555",boxShadow:"0 1px 3px rgba(0,0,0,.1)"}}>
                🇮🇳 Bilingual + Interactive Menus<br/>
                <span style={{color:"#888"}}>Try "Hi 👋" to see the menu ↓</span>
              </div>
            </div>
          )}

          {msgs.length===0  && (
            <div style={{textAlign:"center",margin:"20px 0",color:"#bbb",fontSize:13}}>↑ Enter your Groq API key above to start</div>
          )}

          {msgs.map((m,i)=>{
            const isBot = m.role==="assistant";
            return (
              <div key={i} className="msg" style={{display:"flex",justifyContent:isBot?"flex-start":"flex-end"}}>
                <div style={{maxWidth:"82%"}}>
                  <div style={{
                    background:isBot?"white":"#DCF8C6",
                    borderRadius:isBot?"18px 18px 18px 4px":"18px 18px 4px 18px",
                    padding:"8px 12px 20px",boxShadow:"0 1px 2px rgba(0,0,0,.1)",position:"relative"
                  }}>
                    <div style={{fontSize:14,lineHeight:1.6,color:"#111",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.content}</div>
                    <div style={{position:"absolute",bottom:4,right:10,fontSize:10,color:"#999",display:"flex",alignItems:"center",gap:2}}>
                      {timeStr}{!isBot&&<span style={{color:"#4FC3F7"}}>✓✓</span>}
                    </div>
                  </div>
                  {isBot && m.menu && (
                    <InteractiveMenu menu={m.menu} onSelect={opt=>send(opt.title)}/>
                  )}
                </div>
              </div>
            );
          })}

          {busy && <div className="msg" style={{display:"flex",justifyContent:"flex-start"}}><TypingDots/></div>}
          {err  && (
            <div style={{textAlign:"center"}}>
              <div style={{display:"inline-block",background:"#ffebee",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#c62828",maxWidth:"90%"}}>{err}</div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick replies */}
        <div style={{background:"#f5f5f5",padding:"8px 10px",display:"flex",gap:6,overflowX:"auto",borderTop:"1px solid #e0e0e0"}}>
          {quickReplies.map((q,i)=>(
            <button key={i} className="qbtn" onClick={()=>send(q)} style={{background:"white",border:"1.5px solid #ddd",borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",color:"#333",transition:"all .15s",fontFamily:"inherit"}}>{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{padding:"8px 10px",background:"#f5f5f5",display:"flex",gap:8,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send(input)}
            placeholder={lang==="hi"?"संदेश लिखें...":"Type a message..."}
            style={{flex:1,borderRadius:24,border:"none",padding:"10px 16px",fontSize:14,outline:"none",background:"white",boxShadow:"0 1px 3px rgba(0,0,0,.08)",fontFamily:"inherit"}}/>
          <button onClick={()=>send(input)} disabled={busy||!input.trim()}
            style={{width:42,height:42,borderRadius:"50%",border:"none",background:"#25D366",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,opacity:(busy||!input.trim())?.5:1,flexShrink:0}}>➤</button>
        </div>
      </div>
    </div>
  );
}