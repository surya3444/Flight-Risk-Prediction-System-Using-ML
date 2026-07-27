import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================================
   ONLY LOGIC — v4  ·  Light editorial theme
   We build websites, apps, AI automations & internal tools — around your logic.
   Design pattern: warm white canvas, ink-blue primary + coral accent,
   "ruled/bordered" structural language (hairlines, framed boxes, ledger rows)
   instead of floating shadow-cards. Conversion-led copy throughout.
   Pages: Home · What we build · AI & Automation · Results · How it works
          · Pricing · About · Book
   ========================================================================== */

const T = {
  paper: "#FCFBF8",     // warm white canvas
  panel: "#FFFFFF",     // raised
  wash: "#F4F2EC",      // soft fill
  ink: "#13182B",       // near-navy text
  ink70: "#3A4257",
  mute: "#6B7283",
  faint: "#9AA0AD",
  line: "#E5E2D9",      // warm hairline
  line2: "#D7D3C7",
  blue: "#2B41E0",      // primary ink-blue
  blueSoft: "#5468F0",
  blueWash: "#EDEFFF",
  coral: "#FF5C49",     // accent
  coralWash: "#FFEDE9",
  green: "#0F9D6B",
};

function useGlobalStyles() {
  useEffect(() => {
    if (!document.getElementById("ol4-fonts")) {
      const l = document.createElement("link");
      l.id = "ol4-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
    if (document.getElementById("ol4-css")) return;
    const s = document.createElement("style");
    s.id = "ol4-css";
    s.textContent = `
      *{box-sizing:border-box;}
      html{scroll-behavior:smooth;}
      body{margin:0;}
      .ol-root{font-family:'Poppins',system-ui,sans-serif;color:${T.ink};background:${T.paper};-webkit-font-smoothing:antialiased;overflow-x:hidden;}
      .ol-root ::selection{background:${T.coral};color:#fff;}
      .ol-mono{font-family:'JetBrains Mono',monospace;}
      a{color:inherit;text-decoration:none;} button{font-family:inherit;cursor:pointer;}

      @keyframes ol-up{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
      @keyframes ol-fade{from{opacity:0;}to{opacity:1;}}
      @keyframes ol-blink{0%,100%{opacity:1;}50%{opacity:0;}}
      @keyframes ol-marq{from{transform:translateX(0);}to{transform:translateX(-50%);}}
      @keyframes ol-pop{0%{transform:scale(.92);opacity:0;}100%{transform:scale(1);opacity:1;}}
      @keyframes ol-rot{0%{opacity:0;transform:translateY(70%);}11%,89%{opacity:1;transform:translateY(0);}100%{opacity:0;transform:translateY(-70%);}}
      @keyframes ol-glow{0%,100%{opacity:.5;}50%{opacity:1;}}

      .ol-reveal{opacity:0;}
      .ol-reveal.is-in{animation:ol-up .75s cubic-bezier(.2,.7,.2,1) forwards;}
      .ol-btn{transition:transform .22s cubic-bezier(.2,.7,.2,1),box-shadow .25s,background .25s,color .25s,opacity .2s,border-color .25s;}
      .ol-btn:hover{transform:translateY(-2px);}
      .ol-btn:active{transform:translateY(0);}
      .ol-mag{transition:transform .2s ease;}
      .ol-frame{transition:border-color .3s,background .3s,transform .3s;}
      .ol-uline{position:relative;}
      .ol-uline::after{content:'';position:absolute;left:0;bottom:-4px;height:2px;width:100%;background:${T.coral};transform:scaleX(0);transform-origin:right;transition:transform .35s cubic-bezier(.2,.7,.2,1);}
      .ol-uline:hover::after{transform:scaleX(1);transform-origin:left;}

      @media (prefers-reduced-motion: reduce){
        *{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important;}
        .ol-reveal{opacity:1 !important;}
      }
    `;
    document.head.appendChild(s);
  }, []);
}

/* ----------------------------- hooks ------------------------------------- */
function useRoute() {
  const get = () => window.location.hash.replace("#", "") || "/";
  const [r, setR] = useState(get());
  useEffect(() => {
    const on = () => { setR(get()); window.scrollTo({ top: 0 }); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return [r, useCallback((to) => { window.location.hash = to; }, [])];
}
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".ol-reveal:not(.is-in)"));
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((en) => en.forEach((x) => {
      if (x.isIntersecting) { x.target.style.animationDelay = `${x.target.getAttribute("data-delay") || 0}ms`; x.target.classList.add("is-in"); io.unobserve(x.target); }
    }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}
function Magnetic({ children, strength = 12, block, style }) {
  const ref = useRef(null);
  const move = (e) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); el.style.transform = `translate(${((e.clientX - (r.left + r.width / 2)) / r.width) * strength}px,${((e.clientY - (r.top + r.height / 2)) / r.height) * strength}px)`; };
  const reset = () => { if (ref.current) ref.current.style.transform = "translate(0,0)"; };
  return <span ref={ref} className="ol-mag" onMouseMove={move} onMouseLeave={reset} style={{ display: block ? "block" : "inline-block", ...style }}>{children}</span>;
}

/* ----------------------------- atoms ------------------------------------- */
const Container = ({ children, style }) => <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>;

function Eyebrow({ children, color = T.blue }) {
  return <span className="ol-mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color, fontWeight: 500 }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: "ol-glow 2.4s ease-in-out infinite" }} />{children}
  </span>;
}
const ArrowR = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = ({ c = T.green, s = 17 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Btn({ children, onClick, variant = "primary", style, disabled }) {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "15px 28px", borderRadius: 12, fontWeight: 600, fontSize: 15, border: "1px solid transparent", fontFamily: "'Poppins',sans-serif", whiteSpace: "nowrap" };
  const v = {
    primary: { background: T.ink, color: "#fff", boxShadow: "0 14px 30px -14px rgba(19,24,43,.55)" },
    coral: { background: T.coral, color: "#fff", boxShadow: `0 14px 32px -12px ${T.coral}88` },
    ghost: { background: T.panel, color: T.ink, border: `1px solid ${T.line2}` },
  };
  return <Magnetic><button className="ol-btn" onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...(disabled ? { opacity: .45, cursor: "not-allowed" } : {}), ...style }}>{children}</button></Magnetic>;
}

function CountUp({ to, suffix = "", dur = 1500 }) {
  const [n, setN] = useState(0); const ref = useRef(null); const done = useRef(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true; const t0 = performance.now();
        const tick = (t) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: .5 });
    if (ref.current) io.observe(ref.current); return () => io.disconnect();
  }, [to, dur]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function Rotator({ words, color }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((p) => (p + 1) % words.length), 2100); return () => clearInterval(t); }, [words.length]);
  return <span style={{ position: "relative", display: "inline-grid", verticalAlign: "bottom" }}>
    {words.map((w) => <span key={w} aria-hidden style={{ gridArea: "1/1", visibility: "hidden", fontWeight: 700 }}>{w}</span>)}
    <span style={{ gridArea: "1/1", overflow: "hidden" }}>
      <span key={i} style={{ display: "inline-block", color, fontWeight: 700, animation: "ol-rot 2.1s cubic-bezier(.2,.7,.2,1)" }}>{words[i]}</span>
    </span>
  </span>;
}

/* ----------------------------- nav --------------------------------------- */
const NAV = [
  { to: "/", label: "Home" },
  { to: "/work", label: "What we build" },
  { to: "/ai", label: "AI & Automation" },
  { to: "/results", label: "Results" },
  { to: "/process", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

function Logo({ nav }) {
  return <button onClick={() => nav("/")} style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 10 }}>

    <img style={{ fontWeight: 700, fontSize: 18, width: "140px", }} src="./public/logo.png" />
  </button>;
}

function Navbar({ route, nav }) {
  const [open, setOpen] = useState(false); const [sc, setSc] = useState(false);
  useEffect(() => { const on = () => setSc(window.scrollY > 12); on(); window.addEventListener("scroll", on); return () => window.removeEventListener("scroll", on); }, []);
  useEffect(() => { setOpen(false); }, [route]);
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: sc ? "rgba(252,251,248,.85)" : "transparent", backdropFilter: sc ? "blur(14px)" : "none", borderBottom: `1px solid ${sc ? T.line : "transparent"}`, transition: "all .35s" }}>
      <Container style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <Logo nav={nav} />
        <nav className="ol-dnav" style={{ display: "flex", alignItems: "center", gap: 26 }}>
          {NAV.slice(1).map((n) => { const a = route === n.to; return <button key={n.to} onClick={() => nav(n.to)} className="ol-uline" style={{ background: "none", border: "none", padding: 0, fontSize: 14.5, fontWeight: a ? 600 : 400, color: a ? T.ink : T.mute, fontFamily: "'Poppins',sans-serif" }}>{n.label}</button>; })}
          <Btn variant="coral" onClick={() => nav("/book")} style={{ padding: "11px 20px", fontSize: 14, borderRadius: 10 }}>Book a free call</Btn>
        </nav>
        <button className="ol-burg" onClick={() => setOpen((o) => !o)} aria-label="Menu" style={{ display: "none", background: "none", border: "none", width: 40, height: 40, position: "relative" }}>
          <span style={{ position: "absolute", left: 8, right: 8, height: 2, background: T.ink, top: open ? 19 : 14, transform: open ? "rotate(45deg)" : "none", transition: "all .3s" }} />
          <span style={{ position: "absolute", left: 8, right: 8, height: 2, background: T.ink, top: 19, opacity: open ? 0 : 1, transition: "all .3s" }} />
          <span style={{ position: "absolute", left: 8, right: 8, height: 2, background: T.ink, top: open ? 19 : 24, transform: open ? "rotate(-45deg)" : "none", transition: "all .3s" }} />
        </button>
      </Container>
      <div style={{ overflow: "hidden", maxHeight: open ? 540 : 0, transition: "max-height .42s cubic-bezier(.2,.7,.2,1)", background: "rgba(252,251,248,.98)", backdropFilter: "blur(14px)", borderBottom: open ? `1px solid ${T.line}` : "none" }}>
        <Container style={{ padding: "8px 24px 22px" }}>
          {NAV.map((n, i) => <button key={n.to} onClick={() => nav(n.to)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", borderBottom: `1px solid ${T.line}`, padding: "16px 2px", fontSize: 17, fontWeight: route === n.to ? 600 : 400, color: T.ink, fontFamily: "'Poppins',sans-serif" }}>{n.label}<span className="ol-mono" style={{ fontSize: 12, color: T.faint }}>0{i + 1}</span></button>)}
          <Btn variant="coral" onClick={() => nav("/book")} style={{ marginTop: 18, width: "100%" }}>Book a free call <ArrowR /></Btn>
        </Container>
      </div>
      <style>{`@media(max-width:920px){.ol-dnav{display:none !important;}.ol-burg{display:block !important;}}`}</style>
    </header>
  );
}

function MobileCTA({ nav, route }) {
  if (route === "/book") return null;
  return <div className="ol-mcta" style={{ display: "none", position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: "rgba(252,251,248,.94)", backdropFilter: "blur(14px)", borderTop: `1px solid ${T.line}` }}>
    <Btn variant="coral" onClick={() => nav("/book")} style={{ width: "100%" }}>Book a free call <ArrowR /></Btn>
    <style>{`@media(max-width:920px){.ol-mcta{display:block !important;}}`}</style>
  </div>;
}

/* ----------------------------- footer ------------------------------------ */
function Footer({ nav }) {
  return <footer style={{ background: T.ink, color: "#EDEEF2" }}>
    <Container style={{ padding: "72px 24px 36px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.2fr", gap: 40 }} className="ol-fg">
        <div>
          <img style={{ width: "140px", fontWeight: 700, fontSize: 22, marginBottom: 14, color: "#fff" }} src="./public/logo1.png" />
          <p style={{ color: "#A6ABB8", maxWidth: 330, lineHeight: 1.65, fontSize: 15, margin: 0 }}>We build websites, apps, AI automations and internal tools — around how your business actually works.</p>
          <div className="ol-mono" style={{ marginTop: 20, fontSize: 13, color: T.coral }}>Find the logic. Build the solution.</div>
        </div>
        <div>
          <div className="ol-mono" style={{ fontSize: 12, letterSpacing: ".12em", color: "#71768A", textTransform: "uppercase", marginBottom: 16 }}>Explore</div>
          {[...NAV, { to: "/book", label: "Book a call" }].map((n) => <button key={n.to} onClick={() => nav(n.to)} style={{ display: "block", background: "none", border: "none", color: "#A6ABB8", padding: "7px 0", fontSize: 15, textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A6ABB8")}>{n.label}</button>)}
        </div>
        <div>
          <div className="ol-mono" style={{ fontSize: 12, letterSpacing: ".12em", color: "#71768A", textTransform: "uppercase", marginBottom: 16 }}>Start here</div>
          <p style={{ color: "#A6ABB8", fontSize: 15, lineHeight: 1.6, marginTop: 0 }}>Tell us what's slowing you down. We'll tell you what to build — free, in 30 minutes.</p>
          <Btn variant="coral" onClick={() => nav("/book")} style={{ marginTop: 4 }}>Book a free call <ArrowR /></Btn>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 56, paddingTop: 24, borderTop: "1px solid #2A3047", flexWrap: "wrap", gap: 12 }}>
        <span className="ol-mono" style={{ fontSize: 13, color: "#71768A" }}>© {new Date().getFullYear()} Only Logic — Business Systems Studio</span>
        <span className="ol-mono" style={{ fontSize: 13, color: "#71768A" }}>Built around your logic.</span>
      </div>
    </Container>
    <style>{`@media(max-width:780px){.ol-fg{grid-template-columns:1fr !important;gap:36px !important;}}`}</style>
  </footer>;
}

function SectionHead({ eyebrow, title, sub, align = "left" }) {
  return <div style={{ maxWidth: 720, margin: align === "center" ? "0 auto" : 0, textAlign: align }}>
    <div className="ol-reveal"><Eyebrow>{eyebrow}</Eyebrow></div>
    <h2 className="ol-reveal" data-delay="60" style={{ fontSize: "clamp(28px,4.4vw,46px)", lineHeight: 1.08, fontWeight: 700, letterSpacing: "-.03em", margin: "18px 0 0" }}>{title}</h2>
    {sub && <p className="ol-reveal" data-delay="120" style={{ marginTop: 18, color: T.mute, fontSize: 18, lineHeight: 1.6 }}>{sub}</p>}
  </div>;
}

/* =========================================================================
   HERO
   ========================================================================= */
function Hero({ nav }) {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.line} 1px,transparent 1px),linear-gradient(90deg,${T.line} 1px,transparent 1px)`, backgroundSize: "56px 56px", opacity: .6, maskImage: "radial-gradient(ellipse 70% 60% at 50% 25%,#000 30%,transparent 78%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 25%,#000 30%,transparent 78%)" }} />
      <Container style={{ position: "relative", padding: "52px 24px 64px", textAlign: "center" }}>
        <div className="ol-reveal" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 14px 7px 8px", border: `1px solid ${T.line2}`, borderRadius: 999, background: T.panel, fontSize: 13, color: T.mute, marginBottom: 26 }}>
          <span className="ol-mono" style={{ background: T.coralWash, color: T.coral, borderRadius: 999, padding: "2px 9px", fontWeight: 600, fontSize: 12 }}>NEW</span>
          AI automations that pay for themselves <ArrowR s={13} />
        </div>
        <h1 className="ol-reveal" data-delay="60" style={{ fontSize: "clamp(38px,6.6vw,76px)", lineHeight: 1.02, letterSpacing: "-.04em", fontWeight: 700, margin: "0 auto", maxWidth: 1000 }}>
          We build the <Rotator words={["websites", "apps", "AI automations", "internal tools"]} color={T.coral} />
          <span style={{ display: "block", marginTop: 4 }}>that grow your business.</span>
        </h1>
        <p className="ol-reveal" data-delay="130" style={{ margin: "26px auto 0", fontSize: "clamp(17px,2.2vw,21px)", lineHeight: 1.6, color: T.ink70, maxWidth: 660 }}>
          Most studios take your spec and build it. We do the more useful thing first — understand your business, find what's really slowing it down, then build, automate and scale the fix.
        </p>
        <div className="ol-reveal" data-delay="190" style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap", justifyContent: "center" }}>
          <Btn variant="coral" onClick={() => nav("/book")}>Book a free 30-min call <ArrowR /></Btn>
          <Btn variant="ghost" onClick={() => nav("/results")}>See real results</Btn>
        </div>
        <div className="ol-reveal ol-mono" data-delay="250" style={{ marginTop: 20, fontSize: 13, color: T.faint }}>
          No deck. No obligation. You'll leave knowing exactly what to build next.
        </div>
        <BuildPipeline />
      </Container>
    </section>
  );
}

function BuildPipeline() {
  const stages = [
    { k: "Understand", d: "We learn your business" },
    { k: "Design", d: "We shape the right fix" },
    { k: "Build", d: "Website · app · tool" },
    { k: "Automate", d: "AI does the busywork" },
    { k: "Scale", d: "It grows with you" },
  ];
  return (
    <div className="ol-reveal" data-delay="300" style={{ marginTop: 54, maxWidth: 1000, marginLeft: "auto", marginRight: "auto" }}>
      <div className="ol-pipe" style={{ display: "flex", alignItems: "stretch", background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: 10, overflowX: "auto" }}>
        {stages.map((s, i) => (
          <React.Fragment key={s.k}>
            <div style={{ flex: "1 1 0", minWidth: 130, padding: "16px 16px", textAlign: "left" }}>
              <div className="ol-mono" style={{ fontSize: 11, color: T.coral, marginBottom: 8 }}>0{i + 1}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.k}</div>
              <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>{s.d}</div>
            </div>
            {i < stages.length - 1 && <div aria-hidden style={{ display: "flex", alignItems: "center", color: T.line2 }}><ArrowR s={20} /></div>}
          </React.Fragment>
        ))}
      </div>
      <style>{`@media(max-width:760px){.ol-pipe{justify-content:flex-start;}}`}</style>
    </div>
  );
}

/* ----------------------------- logo / trust marquee ---------------------- */
function Trust() {
  const items = ["Founder-led builds", "Fixed-scope quotes", "You own all the code", "MVP in weeks, not quarters", "No lock-in", "Outcomes, not output"];
  const loop = [...items, ...items];
  return <div style={{ borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, background: T.wash, overflow: "hidden", padding: "15px 0" }}>
    <div style={{ display: "flex", width: "max-content", animation: "ol-marq 32s linear infinite" }}>
      {loop.map((w, i) => <span key={i} style={{ fontSize: 15, fontWeight: 500, color: T.ink70, padding: "0 26px", display: "inline-flex", alignItems: "center", gap: 26, whiteSpace: "nowrap" }}>{w} <span style={{ color: T.coral }}>◆</span></span>)}
    </div>
  </div>;
}

/* =========================================================================
   HOME
   ========================================================================= */
function Home({ nav }) {
  return (
    <main>
      <Hero nav={nav} />
      <Trust />

      {/* PROBLEM → reframe */}
      <section style={{ padding: "90px 0 0" }}>
        <Container>
          <SectionHead eyebrow="Sound familiar?" title="You don't have a tech problem. You have a logic problem." sub="Buying another tool rarely fixes things — it usually just adds a tab. The real fix starts with understanding how the work actually flows." />
          <div className="ol-reveal" data-delay="120" style={{ marginTop: 44, border: `1px solid ${T.line2}`, borderRadius: 20, overflow: "hidden", background: T.panel }}>
            {[
              { p: "“We’ve got ten tools and none of them talk to each other.”", f: "One connected system, not ten disconnected tabs." },
              { p: "“My team spends half the week on copy-paste busywork.”", f: "Automations that do the repetitive work for them." },
              { p: "“I have an idea but no clue what to build first.”", f: "A sharp MVP that proves value before you over-spend." },
              { p: "“Every new customer makes operations messier.”", f: "Systems that add revenue, not friction, as you grow." },
            ].map((row, i) => (
              <div key={i} className="ol-frame" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 20, padding: "22px 26px", borderTop: i ? `1px solid ${T.line}` : "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.wash)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontSize: 16.5, color: T.ink70, fontWeight: 500 }}>{row.p}</div>
                <div style={{ color: T.coral }} className="ol-arrow"><ArrowR s={18} /></div>
                <div style={{ fontSize: 16.5, fontWeight: 600, display: "flex", gap: 10, alignItems: "center" }}><Check />{row.f}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* WHAT WE BUILD */}
      <section style={{ padding: "90px 0 84px" }}>
        <Container>
          <SectionHead eyebrow="What we build" title="Four things, built as one system." sub="Not four vendors stitched together. One team building the website, the app, the automations and the tools so they actually work as a whole." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginTop: 46 }} className="ol-build-grid">
            {BUILDS.map((b, i) => <BuildCard key={b.t} b={b} i={i} onClick={() => nav(b.id === "ai" ? "/ai" : "/work")} />)}
          </div>
        </Container>
      </section>

      {/* WHO IT'S FOR (segment selector) */}
      <WhoFor nav={nav} />

      {/* RESULTS snapshot */}
      <section style={{ padding: "90px 0" }}>
        <Container>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <SectionHead eyebrow="Proof, not promises" title="The kind of change clients feel." />
            <Btn variant="ghost" onClick={() => nav("/results")} style={{ marginBottom: 6 }}>See all results <ArrowR /></Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 44 }} className="ol-stat-grid">
            {[
              { n: 70, s: "%", t: "less manual work", d: "once a weekly process became an automation." },
              { n: 3, s: "×", t: "faster to launch", d: "with a focused MVP instead of a bloated v1." },
              { n: 1, s: "", t: "place for everything", d: "one system replacing the tab-juggling." },
            ].map((c, i) => (
              <div key={i} className="ol-frame ol-reveal" data-delay={i * 80} style={{ background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: "30px 26px" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.coral)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line2)}>
                <div style={{ fontSize: 54, fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1, color: T.blue }}><CountUp to={c.n} suffix={c.s} /></div>
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 12 }}>{c.t}</div>
                <p style={{ margin: "8px 0 0", color: T.mute, fontSize: 14.5, lineHeight: 1.55 }}>{c.d}</p>
              </div>
            ))}
          </div>
          <p className="ol-mono" style={{ fontSize: 12, color: T.faint, marginTop: 18 }}>* Typical of our engagements. Your numbers get scoped on the call.</p>
        </Container>
      </section>

      {/* TESTIMONIALS */}
      <Testimonials />

      {/* COMPARISON */}
      <section style={{ padding: "90px 0" }}>
        <Container>
          <div style={{ maxWidth: 720 }}>
            <Eyebrow>The difference</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,4.4vw,46px)", lineHeight: 1.1, fontWeight: 700, letterSpacing: "-.03em", margin: "18px 0 0" }}>Most studios build what you ask for. We build what you actually need.</h2>
          </div>
          <div className="ol-reveal" data-delay="100" style={{ marginTop: 44, border: `1px solid ${T.line2}`, borderRadius: 20, overflow: "hidden", background: T.panel }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr" }}>
              {["", "A typical agency", "Only Logic"].map((h, i) => (
                <div key={i} style={{ padding: "18px 22px", borderBottom: `1px solid ${T.line2}`, background: i === 2 ? T.blueWash : "transparent", fontWeight: 600, fontSize: 14, color: i === 2 ? T.blue : T.mute, borderLeft: i ? `1px solid ${T.line}` : "none" }} className="ol-mono">{h}</div>
              ))}
              {[
                ["Starts with", "Your spec", "Your problem"],
                ["Delivers", "Features off a list", "Systems that work together"],
                ["Bills for", "Hours logged", "A fixed outcome"],
                ["After launch", "Hands off & gone", "Iterates, scales, stays"],
                ["You end up with", "More tools to manage", "Time and clarity back"],
              ].map((row, ri) => (
                <React.Fragment key={ri}>
                  <div style={{ padding: "16px 22px", borderTop: `1px solid ${T.line}`, fontSize: 15, fontWeight: 500 }}>{row[0]}</div>
                  <div style={{ padding: "16px 22px", borderTop: `1px solid ${T.line}`, borderLeft: `1px solid ${T.line}`, fontSize: 15, color: T.mute }}>{row[1]}</div>
                  <div style={{ padding: "16px 22px", borderTop: `1px solid ${T.line}`, borderLeft: `1px solid ${T.line}`, fontSize: 15, fontWeight: 600, background: T.blueWash, display: "flex", gap: 9, alignItems: "center" }}><Check c={T.blue} s={16} />{row[2]}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* GUARANTEE strip */}
      {/*<Guarantee nav={nav} />*/}
      <FAQ nav={nav} />
      <FinalCTA nav={nav} />
    </main>
  );
}

/* ----------------------------- who it's for ------------------------------ */
function WhoFor({ nav }) {
  const segs = [
    { id: "founder", label: "Startup founders", head: "Launch the right thing — fast.", d: "You've got the idea and the urgency. We scope a sharp MVP, build it in weeks, and put it in front of real users before you burn the runway.", points: ["Validate before you over-build", "A working MVP, not a slide deck", "A technical partner who gets startups"] },
    { id: "smb", label: "Small & medium businesses", head: "Stop running on duct tape and spreadsheets.", d: "Your team is busy doing work software should be doing. We map the chaos, automate the busywork, and give you one system to run on.", points: ["Automate the repetitive work", "One connected system, not ten tools", "Visibility into what's actually happening"] },
    { id: "growth", label: "Growth-stage companies", head: "Grow without your operations breaking.", d: "Scaling is exposing the cracks. We re-architect the systems and automations so each new customer adds revenue, not friction.", points: ["Systems that scale calmly", "Internal tools your team will love", "Performance you can measure"] },
  ];
  const [active, setActive] = useState("founder");
  const s = segs.find((x) => x.id === active);
  return (
    <section style={{ padding: "0 0 0" }}>
      <Container>
        <div style={{ background: T.wash, border: `1px solid ${T.line2}`, borderRadius: 24, padding: "44px 40px" }}>
          <SectionHead eyebrow="Who it's for" title="Built for where you are right now." align="center" />
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 30 }}>
            {segs.map((seg) => {
              const a = active === seg.id;
              return <button key={seg.id} onClick={() => setActive(seg.id)} className="ol-btn" style={{ padding: "11px 20px", borderRadius: 999, fontSize: 14.5, fontWeight: 600, border: `1px solid ${a ? T.ink : T.line2}`, background: a ? T.ink : T.panel, color: a ? "#fff" : T.ink70 }}>{seg.label}</button>;
            })}
          </div>
          <div key={active} style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 32, alignItems: "center", animation: "ol-fade .4s ease" }} className="ol-who-grid">
            <div>
              <h3 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>{s.head}</h3>
              <p style={{ color: T.mute, fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>{s.d}</p>
              <Btn variant="primary" onClick={() => nav("/book")} style={{ marginTop: 20 }}>Book a free call <ArrowR /></Btn>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {s.points.map((p) => (
                <div key={p} style={{ display: "flex", gap: 12, alignItems: "center", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: "16px 18px", fontSize: 15.5, fontWeight: 500 }}><Check />{p}</div>
              ))}
            </div>
          </div>
        </div>
      </Container>
      <style>{`@media(max-width:820px){.ol-who-grid{grid-template-columns:1fr !important;gap:24px !important;}}`}</style>
    </section>
  );
}

/* ----------------------------- testimonials ------------------------------ */
function Testimonials() {
  const items = [
    { q: "They didn't just build what we asked — they told us what we actually needed, then built it. Saved us months.", n: "Founder, EdTech startup", tag: "Web app + automations" },
    { q: "The reporting that used to eat my Monday now lands in my inbox done. I didn't know that was even possible.", n: "Operations lead, services firm", tag: "AI automation" },
    { q: "One system replaced four tools and a pile of spreadsheets. Onboarding a new client is finally calm.", n: "Director, growth-stage SaaS", tag: "Internal tools" },
  ];
  return (
    <section style={{ padding: "0 0 0" }}>
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="ol-tst-grid">
          {items.map((t, i) => (
            <figure key={i} className="ol-reveal" data-delay={i * 80} style={{ margin: 0, background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: "26px 24px", display: "flex", flexDirection: "column" }}>
              <div aria-hidden style={{ fontSize: 40, lineHeight: 1, color: T.coral, fontWeight: 700, fontFamily: "Georgia,serif" }}>“</div>
              <blockquote style={{ margin: "8px 0 18px", fontSize: 16.5, lineHeight: 1.55, fontWeight: 500, flex: 1 }}>{t.q}</blockquote>
              <figcaption style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13.5, color: T.mute }}>{t.n}</span>
                <span className="ol-mono" style={{ fontSize: 11, color: T.blue, background: T.blueWash, padding: "4px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{t.tag}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="ol-mono" style={{ fontSize: 12, color: T.faint, marginTop: 16, textAlign: "center" }}>Illustrative of the feedback we build for. Real names shared on request.</p>
      </Container>
      <style>{`@media(max-width:820px){.ol-tst-grid{grid-template-columns:1fr !important;}}`}</style>
    </section>
  );
}

/* ----------------------------- guarantee --------------------------------- */
{/*
function Guarantee({ nav }) {
  return (
    <section style={{ padding: "0 0 0" }}>
      <Container>
        <div className="ol-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, border: `1px solid ${T.line2}`, borderRadius: 20, overflow: "hidden", background: T.panel }} >
          {[
            { t: "You own everything", d: "All code, accounts and infrastructure are yours. No lock-in, ever." },
            { t: "Fixed scope, fixed price", d: "Quotes are tied to an outcome — no open-ended hourly surprises." },
            { t: "Start free", d: "The first call costs nothing and you leave with a clear plan." },
          ].map((g, i) => (
            <div key={g.t} style={{ padding: "28px 26px", borderLeft: i ? `1px solid ${T.line}` : "none" }} className="ol-guar">
              <div style={{ width: 38, height: 38, borderRadius: 10, background: T.blueWash, display: "grid", placeItems: "center", marginBottom: 14 }}><Check c={T.blue} s={20} /></div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{g.t}</div>
              <p style={{ margin: "6px 0 0", color: T.mute, fontSize: 14.5, lineHeight: 1.55 }}>{g.d}</p>
            </div>
          ))}
        </div>
      </Container>
      <style>{`@media(max-width:760px){.ol-guar{border-left:none !important;border-top:1px solid ${T.line};}.ol-guar:first-child{border-top:none;}}`}</style>
    </section>
  );
}
  */}

/* ----------------------------- builds data ------------------------------- */
const BUILDS = [
  { id: "web", t: "Websites", icon: "globe", d: "Fast, modern sites that load quick, rank well and turn visitors into customers — not just pretty pages.", tags: ["Marketing sites", "Landing pages", "Web apps", "E-commerce"] },
  { id: "app", t: "Apps", icon: "phone", d: "Web and mobile apps built to ship fast and scale calmly, starting with the MVP that proves it works.", tags: ["iOS & Android", "Web apps", "SaaS platforms", "Customer portals"] },
  { id: "ai", t: "AI automations", icon: "spark", d: "We hand the repetitive, copy-paste work to AI — so your team spends time only on what humans should.", tags: ["Workflow automation", "AI assistants", "Support bots", "Data pipelines"] },
  { id: "tools", t: "Internal tools", icon: "tool", d: "Dashboards and admin tools that replace spreadsheet chaos and show you what's really happening.", tags: ["Dashboards", "CRMs", "Admin panels", "Ops tooling"] },
];
function BuildIcon({ name, c }) {
  const p = { width: 24, height: 24, fill: "none", stroke: c, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const F = React.Fragment;
  const m = {
    globe: <F><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></F>,
    phone: <F><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></F>,
    spark: <F><path d="M12 3v5M12 16v5M3 12h5M16 12h5" /><circle cx="12" cy="12" r="2.5" /></F>,
    tool: <F><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18M8 14h5" /></F>,
  };
  return <svg viewBox="0 0 24 24" {...p}>{m[name]}</svg>;
}
function BuildCard({ b, i, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div className="ol-frame ol-reveal" data-delay={i * 70} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}
      style={{ background: T.panel, border: `1px solid ${h ? T.coral : T.line2}`, borderRadius: 20, padding: "30px 28px", cursor: "pointer", position: "relative", overflow: "hidden", transform: h ? "translateY(-6px)" : "none", boxShadow: h ? `0 26px 50px -32px ${T.coral}44` : "none" }}>
      <div aria-hidden style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: T.coralWash, opacity: h ? 1 : 0, transition: "opacity .4s" }} />
      <div style={{ position: "relative", width: 52, height: 52, borderRadius: 14, background: h ? T.coral : T.wash, display: "grid", placeItems: "center", transition: "background .35s" }}>
        <BuildIcon name={b.icon} c={h ? "#fff" : T.ink} />
      </div>
      <h3 style={{ fontSize: 23, margin: "20px 0 8px", fontWeight: 600, position: "relative" }}>{b.t}</h3>
      <p style={{ margin: 0, color: T.mute, fontSize: 15.5, lineHeight: 1.6, position: "relative" }}>{b.d}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18, position: "relative" }}>
        {b.tags.map((t) => <span key={t} className="ol-mono" style={{ fontSize: 12, color: T.mute, background: T.wash, border: `1px solid ${T.line}`, padding: "5px 11px", borderRadius: 999 }}>{t}</span>)}
      </div>
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, color: T.coral, fontSize: 14, fontWeight: 600, position: "relative" }}>
        Learn more <span style={{ transform: h ? "translateX(4px)" : "none", transition: "transform .3s", display: "inline-flex" }}><ArrowR s={15} /></span>
      </div>
    </div>
  );
}


/* ----------------------------- FAQ --------------------------------------- */

function FAQ({ nav }) {
  const qs = [
    { q: "I'm not even sure what I need built yet. Can you still help?", a: "That's the best place to start. The free call exists to figure out what's worth building — sometimes it's a website, sometimes an automation, sometimes a process fix and no software at all. You'll leave with a clear answer." },
    { q: "Do you build just one thing, or the whole stack?", a: "The whole stack. Website, app, AI automations and internal tools — built by one team so they actually talk to each other instead of becoming four disconnected projects." },
    { q: "How much does it cost?", a: "The first call is free. After it, you get a fixed-scope quote tied to a specific outcome — no open-ended hourly surprises. The Pricing page has starting points." },
    { q: "How fast can we see something real?", a: "We build MVP-first, so most projects put a working version in front of real users in weeks, not quarters. We'd rather ship small and improve than vanish for six months." },
    { q: "Do we own the code?", a: "Completely. You own all the code, accounts and infrastructure. No lock-in, no hostage situations." },
    { q: "What if we already have a team?", a: "We often work alongside in-house teams — handling the systems thinking, architecture and automations while they keep building. We make your team faster, not redundant." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: "90px 0" }}>
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 48, alignItems: "start" }} className="ol-faq-grid">
          <div style={{ position: "sticky", top: 96 }}>
            <SectionHead eyebrow="Before you book" title="Good questions, straight answers." />
            <div className="ol-reveal" data-delay="160" style={{ marginTop: 26 }}><Btn variant="primary" onClick={() => nav("/book")}>Ask us live — book a call <ArrowR /></Btn></div>
          </div>
          <div className="ol-reveal" data-delay="100">
            {qs.map((it, i) => {
              const o = open === i;
              return <div key={i} style={{ borderBottom: `1px solid ${T.line}` }}>
                <button onClick={() => setOpen(o ? -1 : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, background: "none", border: "none", padding: "22px 2px", textAlign: "left", fontSize: 17, fontWeight: 600, color: T.ink, fontFamily: "'Poppins',sans-serif" }}>
                  {it.q}
                  <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${o ? T.coral : T.line2}`, display: "grid", placeItems: "center", background: o ? T.coral : "transparent", transition: "all .3s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ transform: o ? "rotate(45deg)" : "none", transition: "transform .3s" }}><path d="M12 5v14M5 12h14" stroke={o ? "#fff" : T.ink} strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </span>
                </button>
                <div style={{ overflow: "hidden", maxHeight: o ? 260 : 0, transition: "max-height .4s cubic-bezier(.2,.7,.2,1)" }}>
                  <p style={{ margin: "0 2px 22px", color: T.mute, fontSize: 16, lineHeight: 1.65 }}>{it.a}</p>
                </div>
              </div>;
            })}
          </div>
        </div>
      </Container>
      <style>{`@media(max-width:820px){.ol-faq-grid{grid-template-columns:1fr !important;gap:24px !important;}.ol-faq-grid>div:first-child{position:static !important;}}`}</style>
    </section>
  );
}


/* ----------------------------- final CTA --------------------------------- */
function FinalCTA({ nav }) {
  return <section style={{ padding: "0 0 100px" }}>
    <Container>

      <div className="ol-reveal" style={{ position: "relative", overflow: "hidden", borderRadius: 26, background: T.ink, color: "#fff", padding: "62px 48px", marginTop: "80px" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1px)`, backgroundSize: "24px 24px" }} />
        <div aria-hidden style={{ position: "absolute", top: -80, right: -40, width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle,${T.coral}55,transparent 65%)`, filter: "blur(20px)" }} />
        <div style={{ position: "relative", maxWidth: 640 }}>
          <Eyebrow color={T.coral}>One conversation away</Eyebrow>
          <h2 style={{ fontSize: "clamp(30px,4.4vw,48px)", lineHeight: 1.08, fontWeight: 700, letterSpacing: "-.03em", margin: "16px 0 14px" }}>Tell us the problem. We'll tell you what to build.</h2>
          <p style={{ color: "#B8BCC8", fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 520 }}>Thirty minutes, free, no deck needed. You'll leave knowing the fix and roughly what it takes — whether or not you build it with us.</p>
          <div style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Btn variant="coral" onClick={() => nav("/book")}>Book a free call <ArrowR /></Btn>
            <Btn variant="ghost" onClick={() => nav("/pricing")} style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.28)" }}>See pricing</Btn>
          </div>
        </div>
      </div>
    </Container>
  </section>;
}

/* =========================================================================
   WORK
   ========================================================================= */
function Work({ nav }) {
  return (
    <main>
      <PageHero nav={nav} eyebrow="What we build" title={<React.Fragment>Websites, apps, automations<br />and tools — built to work together.</React.Fragment>} sub="Pick the thing you need, or let us figure out the right mix on a call. Either way, it's one team building one connected system." />
      <section style={{ padding: "12px 0 80px" }}>
        <Container>
          {BUILDS.map((b, i) => (
            <div key={b.t} className="ol-reveal" data-delay={i * 60} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 26, padding: "30px 0", borderTop: `1px solid ${T.line2}`, alignItems: "start" }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: T.wash, border: `1px solid ${T.line}`, display: "grid", placeItems: "center", flexShrink: 0 }}><BuildIcon name={b.icon} c={T.coral} /></div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 26, margin: 0, fontWeight: 700, letterSpacing: "-.02em" }}>{b.t}</h3>
                  <span className="ol-mono" style={{ fontSize: 12, color: T.faint }}>0{i + 1}</span>
                </div>
                <p style={{ margin: "10px 0 14px", color: T.mute, fontSize: 17, lineHeight: 1.6, maxWidth: 640 }}>{b.d}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{b.tags.map((t) => <span key={t} className="ol-mono" style={{ fontSize: 12.5, color: T.mute, background: T.wash, border: `1px solid ${T.line}`, padding: "6px 12px", borderRadius: 999 }}>{t}</span>)}</div>
              </div>
            </div>
          ))}
        </Container>
      </section>
      {/*<Guarantee nav={nav} />*/}
      <FinalCTA nav={nav} />
    </main>
  );
}

/* =========================================================================
   AI & AUTOMATION
   ========================================================================= */
function AIPage({ nav }) {
  const ex = [
    { t: "Inbox & lead triage", d: "New leads get read, sorted, replied to and logged in your CRM — before you've had coffee.", save: "~6 hrs/week" },
    { t: "Document & data entry", d: "Invoices, forms and PDFs read and entered automatically. No more copy-paste between tools.", save: "~10 hrs/week" },
    { t: "Customer support assistant", d: "An AI assistant answers the repetitive 80% instantly and hands the rest to a human with full context.", save: "~40% of tickets" },
    { t: "Reports that write themselves", d: "Weekly numbers pulled, summarised and sent — so you read insights instead of building spreadsheets.", save: "~4 hrs/week" },
  ];
  return (
    <main>
      <PageHero nav={nav} eyebrow="AI & Automation" title={<React.Fragment>Put the boring work<br />on autopilot.</React.Fragment>} sub="The repetitive, copy-paste, same-thing-every-day work is exactly what AI and automation do best. We find it, build it, and hand your team their hours back." />
      <section style={{ padding: "12px 0 80px" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }} className="ol-build-grid">
            {ex.map((e, i) => (
              <div key={e.t} className="ol-frame ol-reveal" data-delay={i * 70} style={{ background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: "28px 26px" }}
                onMouseEnter={(ev) => (ev.currentTarget.style.borderColor = T.coral)} onMouseLeave={(ev) => (ev.currentTarget.style.borderColor = T.line2)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <h3 style={{ fontSize: 20, margin: 0, fontWeight: 600 }}>{e.t}</h3>
                  <span className="ol-mono" style={{ fontSize: 12, color: T.green, background: "#E6F6EF", padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap", fontWeight: 600 }}>{e.save}</span>
                </div>
                <p style={{ margin: "12px 0 0", color: T.mute, fontSize: 15.5, lineHeight: 1.6 }}>{e.d}</p>
              </div>
            ))}
          </div>
          <div className="ol-reveal" style={{ marginTop: 32, padding: "24px 26px", border: `1px dashed ${T.line2}`, borderRadius: 16, background: T.wash, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>Not sure what's automatable?</div>
              <div style={{ color: T.mute, fontSize: 15, marginTop: 4 }}>Bring one task you hate doing. We'll tell you on the call if AI can take it off your plate.</div>
            </div>
            <Btn variant="coral" onClick={() => nav("/book")}>Find my automation <ArrowR /></Btn>
          </div>
        </Container>
      </section>
      <FinalCTA nav={nav} />
    </main>
  );
}

/* =========================================================================
   RESULTS (new page)
   ========================================================================= */
function Results({ nav }) {
  const cases = [
    { tag: "Web app + automations", title: "From spreadsheet chaos to one system", who: "EdTech startup", before: "Admissions tracked across 3 spreadsheets and a WhatsApp group.", after: "One dashboard with automated follow-ups and live status.", metric: "70%", metricLabel: "less manual data entry" },
    { tag: "AI automation", title: "Reports that write themselves", who: "Services firm", before: "A full day every week spent assembling client reports by hand.", after: "Reports auto-generated, summarised and emailed on schedule.", metric: "~4 hrs", metricLabel: "saved per week" },
    { tag: "Mobile app", title: "MVP in the market in 6 weeks", who: "Consumer startup", before: "An idea, a deadline, and no technical team.", after: "A live app in users' hands, iterating on real feedback.", metric: "3×", metricLabel: "faster than quoted elsewhere" },
  ];
  return (
    <main>
      <PageHero nav={nav} eyebrow="Results" title={<React.Fragment>Proof beats promises.<br />Here's the kind of change we build.</React.Fragment>} sub="Every project is judged on one thing: did it remove friction the client can feel? These snapshots show the before, the after, and the number that moved." />
      <section style={{ padding: "12px 0 80px" }}>
        <Container>
          <div style={{ display: "grid", gap: 16 }}>
            {cases.map((c, i) => (
              <div key={i} className="ol-frame ol-reveal ol-case" data-delay={i * 70} style={{ background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 20, padding: "30px 30px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 28, alignItems: "center" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.coral)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line2)}>
                <div className="ol-case-main">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                    <span className="ol-mono" style={{ fontSize: 11, color: T.blue, background: T.blueWash, padding: "5px 10px", borderRadius: 999 }}>{c.tag}</span>
                    <span style={{ fontSize: 13, color: T.faint }}>{c.who}</span>
                  </div>
                  <h3 style={{ fontSize: 23, margin: "0 0 16px", fontWeight: 700, letterSpacing: "-.02em" }}>{c.title}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "center" }}>
                    <div style={{ background: T.wash, border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px" }}>
                      <div className="ol-mono" style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: T.faint, marginBottom: 6 }}>Before</div>
                      <div style={{ fontSize: 14, color: T.ink70, lineHeight: 1.5 }}>{c.before}</div>
                    </div>
                    <div style={{ color: T.coral }}><ArrowR s={20} /></div>
                    <div style={{ background: T.blueWash, border: `1px solid ${T.blue}22`, borderRadius: 12, padding: "14px 16px" }}>
                      <div className="ol-mono" style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: T.blue, marginBottom: 6 }}>After</div>
                      <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.5, fontWeight: 500 }}>{c.after}</div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "center", borderLeft: `1px solid ${T.line}`, paddingLeft: 24 }} className="ol-case-metric">
                  <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-.04em", color: T.coral, lineHeight: 1 }}>{c.metric}</div>
                  <div style={{ fontSize: 14.5, color: T.mute, marginTop: 8 }}>{c.metricLabel}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="ol-mono" style={{ fontSize: 12, color: T.faint, marginTop: 18, textAlign: "center" }}>Illustrative engagements. Detailed references shared on request.</p>
        </Container>
      </section>
      <Testimonials />
      <div style={{ height: 40 }} />
      <FinalCTA nav={nav} />
      <style>{`@media(max-width:780px){
        .ol-case{grid-template-columns:1fr !important;}
        .ol-case-metric{border-left:none !important;padding-left:0 !important;border-top:1px solid ${T.line};padding-top:18px;}
      }`}</style>
    </main>
  );
}

/* =========================================================================
   PROCESS
   ========================================================================= */
const PHASES = [
  { k: "Understand", verb: "we map", d: "We learn how your business really runs — the workflows, the leaks, the bottlenecks — before proposing anything.", out: ["Business audit", "Workflow map", "Opportunity list"] },
  { k: "Design", verb: "we shape", d: "We design the fix that fits the real problem: the right website, app, automation or tool — not the flashiest one.", out: ["Solution blueprint", "Architecture", "Roadmap"] },
  { k: "Build", verb: "we ship", d: "We build a working MVP you can put in front of real users in weeks, then improve from what they actually do.", out: ["Working MVP", "Live release", "Docs"] },
  { k: "Automate", verb: "we remove", d: "We strip out the manual, repetitive friction with AI and automation so your team stops doing robot work.", out: ["Automations", "AI workflows", "Integrations"] },
  { k: "Scale", verb: "we compound", d: "We monitor, refine and extend so growth adds revenue instead of breaking your operations.", out: ["Optimisation", "New features", "Ongoing support"] },
];
function Process({ nav }) {
  return (
    <main>
      <PageHero nav={nav} eyebrow="How it works" title={<React.Fragment>From your problem to a<br />working system, in five steps.</React.Fragment>} sub="A loop you can see, not a black box. Every step has one job and ends with something real you can hold." />
      <section style={{ padding: "12px 0 90px" }}>
        <Container>
          <div style={{ position: "relative" }}>
            <div aria-hidden style={{ position: "absolute", left: 27, top: 10, bottom: 10, width: 2, background: `linear-gradient(${T.coral},${T.line2})` }} />
            {PHASES.map((p, i) => (
              <div key={p.k} className="ol-reveal" data-delay={i * 80} style={{ display: "flex", gap: 26, padding: "0 0 36px", position: "relative" }}>
                <div style={{ flexShrink: 0, width: 56, display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.panel, border: `2px solid ${T.coral}`, display: "grid", placeItems: "center", zIndex: 1 }}><span className="ol-mono" style={{ fontSize: 16, fontWeight: 600, color: T.coral }}>{i + 1}</span></div>
                </div>
                <div className="ol-frame" style={{ flex: 1, background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 18, padding: "24px 26px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.coral)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line2)}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 24, margin: 0, fontWeight: 700 }}>{p.k}</h3>
                    <span className="ol-mono" style={{ fontSize: 13, color: T.coral }}>{p.verb}</span>
                  </div>
                  <p style={{ margin: "10px 0 16px", color: T.mute, fontSize: 16, lineHeight: 1.6 }}>{p.d}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{p.out.map((o) => <span key={o} className="ol-mono" style={{ fontSize: 12.5, color: T.mute, background: T.wash, border: `1px solid ${T.line}`, padding: "6px 12px", borderRadius: 999 }}>{o}</span>)}</div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <FinalCTA nav={nav} />
    </main>
  );
}

/* =========================================================================
   PRICING
   ========================================================================= */
function Pricing({ nav }) {
  const tiers = [
    { name: "Clarity Call", price: "Free", unit: "", tag: "Start here", d: "A 30-min call to understand your problem and tell you what's worth building.", feats: ["Your likely root cause", "What to build (or not)", "Rough effort & approach", "No deck, no obligation"], cta: "Book the free call", hot: false },
    { name: "Build Sprint", price: "Fixed quote", unit: "", tag: "Most popular", d: "We design and ship a focused MVP — a website, app, automation or tool — fast.", feats: ["Scoped, fixed-price build", "Working MVP in weeks", "You own all the code", "2 weeks of fixes included"], cta: "Scope my build", hot: true },
    { name: "Systems Partner", price: "Monthly", unit: "/mo", tag: "Ongoing", d: "We become your build team — shipping, automating and scaling, month after month.", feats: ["Continuous build & automation", "Priority turnaround", "Roadmap & growth planning", "Cancel anytime, no lock-in"], cta: "Talk partnership", hot: false },
  ];
  return (
    <main>
      <PageHero nav={nav} eyebrow="Pricing" title={<React.Fragment>Simple, honest pricing.<br />No hourly surprises.</React.Fragment>} sub="Every build is quoted as a fixed scope tied to an outcome, so you always know what you're paying for. It starts with a free call." showCta={false} />
      <section style={{ padding: "12px 0 80px" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }} className="ol-price-grid">
            {tiers.map((t, i) => (
              <div key={t.name} className="ol-frame ol-reveal" data-delay={i * 80} style={{ background: t.hot ? T.ink : T.panel, color: t.hot ? "#fff" : T.ink, border: `1px solid ${t.hot ? T.ink : T.line2}`, borderRadius: 20, padding: "30px 26px", position: "relative", boxShadow: t.hot ? "0 30px 60px -34px rgba(19,24,43,.5)" : "none", transform: t.hot ? "scale(1.02)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{t.name}</span>
                  <span className="ol-mono" style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, background: t.hot ? T.coral : T.wash, color: t.hot ? "#fff" : T.mute, fontWeight: 600 }}>{t.tag}</span>
                </div>
                <div style={{ margin: "18px 0 6px", display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.03em", color: t.hot ? T.coral : T.blue }}>{t.price}</span>
                  <span style={{ color: t.hot ? "#9AA0B2" : T.faint, fontSize: 15 }}>{t.unit}</span>
                </div>
                <p style={{ margin: "0 0 18px", color: t.hot ? "#B8BCC8" : T.mute, fontSize: 15, lineHeight: 1.55, minHeight: 66 }}>{t.d}</p>
                <div style={{ borderTop: `1px solid ${t.hot ? "#2A3047" : T.line}`, paddingTop: 16, marginBottom: 22 }}>
                  {t.feats.map((f) => <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", fontSize: 14.5, color: t.hot ? "#D5D7DE" : T.mute }}><Check c={t.hot ? T.coral : T.green} />{f}</div>)}
                </div>
                <Btn variant={t.hot ? "coral" : "ghost"} onClick={() => nav("/book")} style={{ width: "100%" }}>{t.cta} <ArrowR s={15} /></Btn>
              </div>
            ))}
          </div>
          <p className="ol-mono ol-reveal" style={{ fontSize: 12.5, color: T.faint, marginTop: 22, textAlign: "center" }}>Exact numbers depend on scope — that's what the free call is for. No tier locks you in.</p>
        </Container>
      </section>
      {/* <Guarantee nav={nav} /> */}
      <FAQ nav={nav} />
      <FinalCTA nav={nav} />
    </main>
  );
}

/* =========================================================================
   ABOUT
   ========================================================================= */
function About({ nav }) {
  return (
    <main>
      <PageHero nav={nav} eyebrow="About" title={<React.Fragment>We build with logic,<br />not guesswork.</React.Fragment>} sub="Too many businesses get handed software they didn't need, built off a spec nobody pressure-tested. We do it the other way around." />
      <section style={{ padding: "12px 0 80px" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="ol-about-grid">
            <div className="ol-reveal">
              <p style={{ fontSize: 18, lineHeight: 1.7, color: T.ink70 }}>Only Logic is a Business Systems Studio. We build websites, apps, AI automations and internal tools — but we lead with understanding, not order-taking.</p>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: T.ink70, marginTop: 18 }}>Every project starts the same way: we sit with you, map how the business actually works, and find where the real friction is. Then we build the smallest thing that fixes it, learn from how it's used, and scale what works.</p>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: T.ink70, marginTop: 18 }}>The result is software you'll actually use — because it was built around your logic, not someone else's template.</p>
            </div>
            <div className="ol-reveal" data-delay="100" style={{ display: "grid", gap: 14, alignContent: "start" }}>
              {[
                { t: "Logic first", d: "We understand the business before we touch a keyboard." },
                { t: "MVP-friendly", d: "Ship small, learn fast, scale what proves out." },
                { t: "Outcomes, not output", d: "Judged on impact, not feature count." },
                { t: "Long-term partners", d: "We iterate and grow alongside you." },
              ].map((v, i) => (
                <div key={v.t} className="ol-frame" style={{ background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 16, padding: "20px 22px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.coral)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line2)}>
                  <div className="ol-mono" style={{ fontSize: 11, color: T.coral, marginBottom: 8 }}>value.0{i + 1}</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{v.t}</div>
                  <p style={{ margin: "6px 0 0", color: T.mute, fontSize: 14.5, lineHeight: 1.5 }}>{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
      {/*<Guarantee nav={nav} /> */}
      <FinalCTA nav={nav} />
      <style>{`@media(max-width:820px){.ol-about-grid{grid-template-columns:1fr !important;gap:28px !important;}}`}</style>
    </main>
  );
}

/* =========================================================================
   BOOK
   ========================================================================= */
function Book({ nav }) {
  const [type, setType] = useState("clarity");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ problem: "", name: "", email: "", company: "", stage: "Startup / idea" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const s1 = form.problem.trim().length > 8;
  const s2 = form.name.trim() && /\S+@\S+\.\S+/.test(form.email);
  const calls = {
    clarity: { n: "Clarity Call", price: "Free", time: "30 min", line: "Understand the problem and hear what's worth building.", walk: ["Your likely root cause", "What to build (or not)", "Whether software is even the answer"] },
    technical: { n: "Technical Call", price: "Scope & quote", time: "45 min", line: "Get the stack, the plan and a fixed quote to start.", walk: ["Recommended approach & tech", "Scope, timeline & fixed quote", "A clear path to kickoff"] },
  };
  const c = calls[type];
  return (
    <main>
      <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${T.line}` }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.line} 1px,transparent 1px),linear-gradient(90deg,${T.line} 1px,transparent 1px)`, backgroundSize: "56px 56px", opacity: .5, maskImage: "radial-gradient(ellipse 60% 60% at 30% 18%,#000,transparent 72%)", WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 30% 18%,#000,transparent 72%)" }} />
        <Container style={{ position: "relative", padding: "52px 24px 36px" }}>
          <div className="ol-reveal"><Eyebrow>Book a call</Eyebrow></div>
          <h1 className="ol-reveal" data-delay="70" style={{ fontSize: "clamp(32px,5.2vw,56px)", lineHeight: 1.05, letterSpacing: "-.03em", fontWeight: 700, margin: "18px 0 0", maxWidth: 720 }}>Tell us the problem.<br />We'll tell you what to build.</h1>
          <p className="ol-reveal" data-delay="130" style={{ marginTop: 18, fontSize: 18, color: T.mute, maxWidth: 540, lineHeight: 1.6 }}>Two short conversations. Pick where you are — we'll take it from there. No deck needed.</p>
        </Container>
      </section>
      <section style={{ padding: "20px 0 100px" }}>
        <Container>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 28, alignItems: "start" }} className="ol-book-grid">
            <div style={{ display: "grid", gap: 14 }}>
              {Object.entries(calls).map(([id, o]) => {
                const a = type === id;
                return <button key={id} onClick={() => setType(id)} className="ol-frame" style={{ textAlign: "left", background: a ? T.ink : T.panel, color: a ? "#fff" : T.ink, border: `1.5px solid ${a ? T.ink : T.line2}`, borderRadius: 18, padding: "22px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 21, fontWeight: 700 }}>{o.n}</span>
                    <span style={{ display: "flex", gap: 8 }}>
                      <span className="ol-mono" style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999, background: a ? "rgba(255,255,255,.12)" : T.wash, color: a ? "#fff" : T.mute }}>{o.time}</span>
                      <span className="ol-mono" style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999, background: T.coral, color: "#fff", fontWeight: 600 }}>{o.price}</span>
                    </span>
                  </div>
                  <p style={{ margin: "12px 0 14px", fontSize: 15, lineHeight: 1.5, color: a ? "#C2C5D0" : T.mute }}>{o.line}</p>
                  {o.walk.map((w) => <div key={w} style={{ display: "flex", gap: 9, alignItems: "center", padding: "5px 0", fontSize: 14, color: a ? "#E2E3E8" : T.ink70 }}><span style={{ color: T.coral, fontWeight: 700 }}>→</span>{w}</div>)}
                </button>;
              })}
              <div className="ol-mono" style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.6, padding: "2px 4px" }}>New here? Start with the <span style={{ color: T.coral }}>free Clarity Call</span> — it tells us both whether there's a fit.</div>
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.line2}`, borderRadius: 22, padding: "28px 30px", boxShadow: "0 30px 60px -42px rgba(19,24,43,.25)" }}>
              {sent ? (
                <div style={{ textAlign: "center", padding: "30px 10px", animation: "ol-fade .5s ease" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.green, display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <h3 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>You're booked in.</h3>
                  <p style={{ color: T.mute, fontSize: 16, lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>We'll email you within one business day to lock a time for your <strong style={{ color: T.ink }}>{c.n}</strong>. Bring the problem — we'll bring the logic.</p>
                  <Btn variant="ghost" onClick={() => { setSent(false); setStep(1); setForm({ problem: "", name: "", email: "", company: "", stage: "Startup / idea" }); }} style={{ marginTop: 26 }}>Book another</Btn>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                    {[1, 2].map((s) => <React.Fragment key={s}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, background: step >= s ? T.ink : T.wash, color: step >= s ? "#fff" : T.faint, transition: "all .3s" }}>{s}</div>
                      {s === 1 && <div style={{ flex: 1, height: 2, background: step > 1 ? T.ink : T.line2, transition: "background .3s" }} />}
                    </React.Fragment>)}
                    <span className="ol-mono" style={{ fontSize: 12, color: T.faint, marginLeft: 6 }}>Step {step} of 2</span>
                  </div>
                  {step === 1 ? (
                    <div style={{ animation: "ol-fade .35s ease" }}>
                      <div className="ol-mono" style={{ fontSize: 12, letterSpacing: ".1em", color: T.coral, textTransform: "uppercase" }}>Booking · {c.n}</div>
                      <h3 style={{ fontSize: 23, fontWeight: 700, margin: "10px 0 6px" }}>What's slowing you down?</h3>
                      <p style={{ color: T.mute, fontSize: 14.5, margin: "0 0 16px", lineHeight: 1.5 }}>One or two lines is plenty — it's all we need to make the call useful.</p>
                      <textarea value={form.problem} onChange={set("problem")} rows={5} placeholder="e.g. We waste hours every week copying data between three tools, and leads still slip through the cracks…"
                        style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${T.line2}`, background: T.paper, fontSize: 15, fontFamily: "'Poppins',sans-serif", color: T.ink, resize: "vertical", lineHeight: 1.5 }} />
                      <Btn variant="primary" onClick={() => s1 && setStep(2)} disabled={!s1} style={{ width: "100%", marginTop: 18 }}>Continue <ArrowR /></Btn>
                      <p className="ol-mono" style={{ fontSize: 11.5, color: T.faint, textAlign: "center", marginTop: 12, marginBottom: 0 }}>Under a minute. No obligation.</p>
                    </div>
                  ) : (
                    <div style={{ animation: "ol-fade .35s ease" }}>
                      <div className="ol-mono" style={{ fontSize: 12, letterSpacing: ".1em", color: T.coral, textTransform: "uppercase" }}>Almost there</div>
                      <h3 style={{ fontSize: 23, fontWeight: 700, margin: "10px 0 16px" }}>Where do we send the invite?</h3>
                      <Field label="Your name" v={form.name} onChange={set("name")} ph="Krishna" />
                      <Field label="Work email" v={form.email} onChange={set("email")} ph="you@company.com" type="email" />
                      <Field label="Company / project" v={form.company} onChange={set("company")} ph="Optional" />
                      <div style={{ marginBottom: 18 }}>
                        <label className="ol-mono" style={{ fontSize: 12, color: T.mute, display: "block", marginBottom: 7 }}>Stage</label>
                        <select value={form.stage} onChange={set("stage")} style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: `1px solid ${T.line2}`, background: T.paper, fontSize: 15, fontFamily: "'Poppins',sans-serif", color: T.ink, appearance: "none" }}>
                          {["Startup / idea", "Small / medium business", "Growth-stage company", "Just exploring"].map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <Btn variant="ghost" onClick={() => setStep(1)}>Back</Btn>
                        <Btn variant="primary" onClick={() => s2 && setSent(true)} disabled={!s2} style={{ flex: 1 }}>Book my {c.n} <ArrowR /></Btn>
                      </div>
                      <p className="ol-mono" style={{ fontSize: 11.5, color: T.faint, textAlign: "center", marginTop: 12, marginBottom: 0 }}>No spam, ever. We reply within one business day.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Container>
      </section>
      <style>{`@media(max-width:820px){.ol-book-grid{grid-template-columns:1fr !important;}}`}</style>
    </main>
  );
}

function Field({ label, v, onChange, ph, type = "text" }) {
  const [f, setF] = useState(false);
  return <div style={{ marginBottom: 16 }}>
    <label className="ol-mono" style={{ fontSize: 12, color: T.mute, display: "block", marginBottom: 7 }}>{label}</label>
    <input value={v} onChange={onChange} placeholder={ph} type={type} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: `1px solid ${f ? T.coral : T.line2}`, background: T.paper, fontSize: 15, fontFamily: "'Poppins',sans-serif", color: T.ink, outline: "none", boxShadow: f ? `0 0 0 4px ${T.coralWash}` : "none", transition: "all .2s" }} />
  </div>;
}

function PageHero({ eyebrow, title, sub, nav, showCta = true }) {
  return <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${T.line}` }}>
    <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.line} 1px,transparent 1px),linear-gradient(90deg,${T.line} 1px,transparent 1px)`, backgroundSize: "56px 56px", opacity: .5, maskImage: "radial-gradient(ellipse 60% 70% at 30% 20%,#000,transparent 72%)", WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 30% 20%,#000,transparent 72%)" }} />
    <Container style={{ position: "relative", padding: "56px 24px 52px" }}>
      <div className="ol-reveal"><Eyebrow>{eyebrow}</Eyebrow></div>
      <h1 className="ol-reveal" data-delay="70" style={{ fontSize: "clamp(32px,5.4vw,58px)", lineHeight: 1.05, letterSpacing: "-.03em", fontWeight: 700, margin: "18px 0 0", maxWidth: 820 }}>{title}</h1>
      {sub && <p className="ol-reveal" data-delay="130" style={{ marginTop: 18, fontSize: 18, color: T.mute, maxWidth: 600, lineHeight: 1.6 }}>{sub}</p>}
      {showCta && <div className="ol-reveal" data-delay="190" style={{ marginTop: 28 }}><Btn variant="coral" onClick={() => nav("/book")}>Book a free call <ArrowR /></Btn></div>}
    </Container>
  </section>;
}

/* ----------------------------- root -------------------------------------- */
export default function App() {
  useGlobalStyles();
  const [route, nav] = useRoute();
  useReveal();
  let page;
  switch (route) {
    case "/work": page = <Work nav={nav} />; break;
    case "/ai": page = <AIPage nav={nav} />; break;
    case "/results": page = <Results nav={nav} />; break;
    case "/process": page = <Process nav={nav} />; break;
    case "/pricing": page = <Pricing nav={nav} />; break;
    case "/about": page = <About nav={nav} />; break;
    case "/book": page = <Book nav={nav} />; break;
    default: page = <Home nav={nav} />;
  }
  return (
    <div className="ol-root">
      <Navbar route={route} nav={nav} />
      {page}
      <Footer nav={nav} />
      <MobileCTA nav={nav} route={route} />
      <div className="ol-spacer" style={{ height: 0 }} />
      <style>{`
        @media(max-width:900px){
          .ol-build-grid{grid-template-columns:1fr !important;}
          .ol-vs-grid{grid-template-columns:1fr !important;}
          .ol-stat-grid{grid-template-columns:1fr !important;}
          .ol-price-grid{grid-template-columns:1fr !important;}
          .ol-spacer{height:78px !important;}
        }
      `}</style>
    </div>
  );
}
