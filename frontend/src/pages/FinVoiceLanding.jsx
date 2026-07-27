import React, { useState } from "react";
import {
  Phone, ArrowRight, Sparkles, FileText, Boxes, Check, Users, CreditCard,
  Tag, FileCheck2, BarChart3, BadgePercent, Car, Bike, Scissors, Coffee,
  Dumbbell, Store, Stethoscope, Wrench, Plus, X, Menu, Minus, Mail, MapPin,
} from "lucide-react";

/* ============ design tokens ============ */
const C = {
  bg: "#f4f4f3", card: "#fbfbfa", ink: "#1a1d1b", inkSoft: "#5c615e",
  inkFaint: "#9aa09c", mint: "#a8e6c8", mintDeep: "#1f8f5f", mintBg: "#d6f5e4",
  line: "#e6e7e4", dark: "#16201b",
};
const FONT = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const shadow = "0 1px 2px rgba(20,30,25,0.04), 0 8px 30px -12px rgba(20,30,25,0.10)";
const shadowLg = "0 1px 2px rgba(20,30,25,0.04), 0 24px 60px -20px rgba(20,30,25,0.16)";
const pill = (bg, color) => ({
  display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999,
  background: bg, color, fontWeight: 600, cursor: "pointer", border: "none",
  fontFamily: FONT, transition: "transform .2s ease", textDecoration: "none",
});

/* ============ data ============ */
const NAV = [
  { id: "home", label: "Start Here" },
  { id: "features", label: "Features" },
  { id: "industries", label: "Industries" },
  { id: "pricing", label: "Pricing" },
  { id: "faqs", label: "FAQs" },
];

const features = [
  { Icon: FileText, title: "Smart Invoicing", desc: "Create branded invoices in seconds with taxes, terms and auto-numbering.", big: true },
  { Icon: Boxes, title: "Inventory Management", desc: "Track stock, low-stock alerts and link items straight to your bills." },
  { Icon: Users, title: "Customer Records", desc: "Every customer's history, balance and contact saved automatically." },
  { Icon: CreditCard, title: "Memberships & Loyalty", desc: "Issue digital loyalty cards and reward repeat customers." },
  { Icon: Tag, title: "Discounts & Offers", desc: "Flexible discount rules — flat, percentage, seasonal or member-only." },
  { Icon: FileCheck2, title: "Quotations", desc: "Send professional quotes and convert them to invoices in one tap." },
  { Icon: BarChart3, title: "Audit & Reports", desc: "Reconcile, audit and export clean financial reports anytime.", big: true },
];

const featureBlocks = [
  { tag: "INVOICING", title: "Invoices that close the deal", desc: "Branded, GST-ready invoices generated in seconds. Auto-numbering, payment terms, partial payments and instant share over WhatsApp or email.", points: ["Custom branding & templates", "GST / tax presets", "Recurring invoices", "Payment tracking"], flip: false },
  { tag: "INVENTORY", title: "Stock that stays in sync", desc: "Every item you bill updates your stock automatically. Set reorder points, get low-stock alerts and never oversell a product again.", points: ["Real-time stock levels", "Low-stock alerts", "Batch & variant tracking", "Linked to invoices"], flip: true },
  { tag: "CUSTOMERS & LOYALTY", title: "Relationships, remembered", desc: "A clean profile for every customer — purchase history, balances, memberships and loyalty points. Reward regulars automatically.", points: ["Customer profiles & history", "Digital loyalty cards", "Membership tiers", "Auto member discounts"], flip: false },
  { tag: "QUOTES & AUDIT", title: "From quote to clean books", desc: "Send polished quotations, convert accepted ones to invoices in a tap, and keep an audit-ready trail of every transaction.", points: ["One-tap quote to invoice", "Approval flows", "Exportable reports", "Full audit trail"], flip: true },
];

const industries = [
  { Icon: Car, label: "Car Detailing" }, { Icon: Bike, label: "Bike Stores" },
  { Icon: Scissors, label: "Salons & Spas" }, { Icon: Coffee, label: "Cafés" },
  { Icon: Dumbbell, label: "Gyms" }, { Icon: Stethoscope, label: "Clinics" },
  { Icon: Wrench, label: "Repair Shops" }, { Icon: Store, label: "Retail" },
];

const useCases = [
  { Icon: Car, name: "Car Detailing Studios", desc: "Bill per service package, track coating & consumable stock, and run loyalty cards for repeat washes.", tags: ["Service packages", "Loyalty", "Inventory"] },
  { Icon: Bike, name: "Bike & Auto Stores", desc: "Sell parts and accessories, manage spare-part inventory, and generate quotations for repairs.", tags: ["Spare parts", "Quotations", "Stock alerts"] },
  { Icon: Scissors, name: "Salons & Spas", desc: "Memberships, prepaid packages and product retail — all billed and tracked from one screen.", tags: ["Memberships", "Packages", "Retail"] },
  { Icon: Dumbbell, name: "Gyms & Fitness", desc: "Recurring membership invoices, tier discounts and supplement sales with automatic renewals.", tags: ["Recurring", "Tiers", "Supplements"] },
  { Icon: Stethoscope, name: "Clinics", desc: "Patient-friendly invoices, consumable tracking and clean, audit-ready financial records.", tags: ["Invoicing", "Audit", "Records"] },
  { Icon: Store, name: "Retail & More", desc: "Any counter that bills customers — groceries, boutiques, electronics. Fully customizable.", tags: ["POS-style", "Discounts", "Customizable"] },
];

const plans = [
  { name: "Starter", price: "₹0", period: "/mo", desc: "For solo owners just getting started.", features: ["Unlimited invoices", "50 customers", "Basic inventory", "Email support"], cta: "Start free", hot: false },
  { name: "Growth", price: "₹799", period: "/mo", desc: "For growing shops & studios.", features: ["Everything in Starter", "Unlimited customers", "Memberships & loyalty", "Quotations & discounts", "Audit reports"], cta: "Get an invite", hot: true },
  { name: "Business", price: "Custom", period: "", desc: "For multi-outlet brands.", features: ["Everything in Growth", "Multiple outlets", "Role-based access", "Dedicated manager", "API access"], cta: "Book a call", hot: false },
];

const compareRows = [
  { label: "Branded invoices", s: true, g: true, b: true },
  { label: "Inventory tracking", s: "Basic", g: "Advanced", b: "Advanced" },
  { label: "Customers", s: "50", g: "Unlimited", b: "Unlimited" },
  { label: "Memberships & loyalty", s: false, g: true, b: true },
  { label: "Quotations", s: false, g: true, b: true },
  { label: "Discount rules", s: "1", g: "Unlimited", b: "Unlimited" },
  { label: "Audit & reports", s: false, g: true, b: true },
  { label: "Multiple outlets", s: false, g: false, b: true },
  { label: "Role-based access", s: false, g: false, b: true },
  { label: "API access", s: false, g: false, b: true },
];

const homeFaqs = [
  { q: "Which industries is FinVoice for?", a: "Any business that bills customers — car detailing studios, bike stores, salons, cafés, gyms, clinics, repair shops and retail. FinVoice adapts to your items, taxes and workflow." },
  { q: "Can I manage inventory along with invoicing?", a: "Yes. Track stock levels, get low-stock alerts, and link inventory items directly to invoices and quotations so your numbers always match reality." },
  { q: "Do you support memberships and loyalty cards?", a: "Absolutely. Issue digital loyalty cards, run membership tiers and reward repeat customers with automatic member-only discounts." },
  { q: "Can I send quotations before billing?", a: "Send polished quotations to customers and convert an accepted quote into an invoice with a single tap — no re-entering details." },
  { q: "How does auditing work?", a: "FinVoice keeps a clean trail of every invoice, payment and stock movement, so you can reconcile, audit and export reports whenever you need them." },
];
const allFaqs = [
  ...homeFaqs,
  { q: "Is my data safe and backed up?", a: "Your data is encrypted in transit and at rest, with automatic daily backups. You can export everything anytime — you always own your data." },
  { q: "Can I customize invoice templates with my branding?", a: "Yes. Add your logo, brand colors, terms and tax presets. Every document you send looks unmistakably yours." },
  { q: "Does FinVoice handle GST and taxes?", a: "FinVoice supports GST and configurable tax presets so your invoices stay compliant without manual calculation." },
  { q: "Can I use FinVoice across multiple outlets?", a: "The Business plan supports multiple outlets with role-based access, so each location bills independently while you see the whole picture." },
  { q: "Is there a free plan?", a: "Yes — the Starter plan is free forever with unlimited invoices and up to 50 customers. Upgrade only when you need more." },
];

/* ============ shared bits ============ */
const Eyebrow = ({ children, light }) => (
  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: light ? C.mint : C.mintDeep }}>{children}</span>
);

function PageHeader({ eyebrow, pre, hl, post, subtitle }) {
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 24px", textAlign: "center" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, border: `1px solid ${C.line}`, background: C.card, padding: "6px 16px 6px 12px", fontSize: 12.5, fontWeight: 500, boxShadow: shadow, color: C.inkSoft }}>
        <Sparkles size={14} color={C.mintDeep} /> {eyebrow}
      </span>
      <h1 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,56px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
        {pre}<span style={{ display: "inline-block", borderRadius: 16, background: C.mint, padding: "2px 12px", color: C.dark }}>{hl}</span>{post}
      </h1>
      <p style={{ maxWidth: 560, margin: "20px auto 0", fontSize: 15.5, lineHeight: 1.65, color: C.inkSoft }}>{subtitle}</p>
    </section>
  );
}

const StepCard = ({ children, rotate = 0 }) => (
  <div
    style={{ borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, padding: 20, boxShadow: shadow, transform: `rotate(${rotate}deg)`, transition: "transform .3s ease" }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = `rotate(${rotate}deg) translateY(-6px)`)}
    onMouseLeave={(e) => (e.currentTarget.style.transform = `rotate(${rotate}deg)`)}
  >{children}</div>
);

function FeatureGrid() {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ textAlign: "center" }}>
        <Eyebrow>FEATURES</Eyebrow>
        <h2 style={{ marginTop: 12, fontSize: "clamp(30px,5vw,44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>Here's what FinVoice helps you manage</h2>
        <p style={{ maxWidth: 440, margin: "12px auto 0", fontSize: 15, color: C.inkSoft }}>So you can focus on running your business — not your paperwork.</p>
      </div>
      <div className="fv-feat-grid" style={{ marginTop: 48, display: "grid", gap: 16, gridTemplateColumns: "repeat(3,1fr)" }}>
        {features.map(({ Icon, title, desc, big }) => (
          <div key={title} className="fv-lift" style={{ gridColumn: big ? "span 2" : "span 1", borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, padding: 24, boxShadow: shadow }}>
            <div style={{ height: 44, width: 44, borderRadius: 16, background: C.mintBg, color: C.mintDeep, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} /></div>
            <h3 style={{ marginTop: 16, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h3>
            <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, color: C.inkSoft }}>{desc}</p>
            {big && <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: C.mintDeep }}><BadgePercent size={16} /> Built for every industry</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function IndustriesBlock() {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ borderRadius: 32, border: `1px solid ${C.line}`, background: C.dark, padding: "56px 24px", textAlign: "center" }}>
        <Eyebrow light>ANY INDUSTRY</Eyebrow>
        <h2 style={{ maxWidth: 560, margin: "12px auto 0", fontSize: "clamp(28px,5vw,40px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>One invoicing app. Endless use cases.</h2>
        <p style={{ maxWidth: 440, margin: "12px auto 0", fontSize: 15, color: "rgba(255,255,255,.6)" }}>FinVoice adapts to how you work — whatever you sell, service or stock.</p>
        <div className="fv-ind-grid" style={{ marginTop: 40, display: "grid", gap: 12, gridTemplateColumns: "repeat(4,1fr)" }}>
          {industries.map(({ Icon, label }) => (
            <div key={label} className="fv-lift" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", padding: "24px 0" }}>
              <Icon size={24} color={C.mint} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingBlock({ go }) {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ textAlign: "center" }}>
        <Eyebrow>PRICING</Eyebrow>
        <h2 style={{ marginTop: 12, fontSize: "clamp(30px,5vw,44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>Simple plans that scale</h2>
      </div>
      <div style={{ marginTop: 48, display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        {plans.map((p) => (
          <div key={p.name} style={{ position: "relative", borderRadius: 24, border: `1px solid ${p.hot ? C.mintDeep : C.line}`, background: p.hot ? C.dark : C.card, padding: 28, boxShadow: p.hot ? shadowLg : shadow }}>
            {p.hot && <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", borderRadius: 999, background: C.mint, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: C.dark }}>Most popular</span>}
            <h3 style={{ fontSize: 15, fontWeight: 700, color: p.hot ? "#fff" : C.ink }}>{p.name}</h3>
            <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: p.hot ? "#fff" : C.ink }}>{p.price}</span>
              <span style={{ marginBottom: 8, fontSize: 14, color: p.hot ? "rgba(255,255,255,.5)" : C.inkFaint }}>{p.period}</span>
            </div>
            <p style={{ marginTop: 4, fontSize: 13.5, color: p.hot ? "rgba(255,255,255,.6)" : C.inkSoft }}>{p.desc}</p>
            <button className="fv-hover" onClick={() => go("contact")} style={{ marginTop: 24, width: "100%", borderRadius: 999, padding: "12px 0", fontSize: 14, fontWeight: 600, border: "none", fontFamily: FONT, background: p.hot ? C.mint : C.dark, color: p.hot ? C.dark : "#fff", cursor: "pointer" }}>{p.cta}</button>
            <ul style={{ marginTop: 24, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                  <Check size={16} color={p.hot ? C.mint : C.mintDeep} style={{ flexShrink: 0 }} />
                  <span style={{ color: p.hot ? "rgba(255,255,255,.8)" : C.inkSoft }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqBlock({ faqs, header }) {
  const [open, setOpen] = useState(0);
  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: header ? "48px 24px" : "16px 24px 48px" }}>
      {header && (
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Eyebrow>FAQS</Eyebrow>
          <h2 style={{ marginTop: 12, fontSize: "clamp(30px,5vw,44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>Questions, answered</h2>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {faqs.map((f, i) => (
          <div key={i} style={{ borderRadius: 16, border: `1px solid ${C.line}`, background: C.card, boxShadow: shadow, overflow: "hidden" }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{f.q}</span>
              <span style={{ color: C.mintDeep, flexShrink: 0, marginLeft: 16, transform: open === i ? "rotate(45deg)" : "none", transition: "transform .3s ease" }}>{open === i ? <X size={20} /> : <Plus size={20} />}</span>
            </button>
            {open === i && <p style={{ padding: "0 24px 20px", fontSize: 14, lineHeight: 1.6, color: C.inkSoft, margin: 0 }}>{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function CTABlock({ go }) {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 32, border: `1px solid ${C.line}`, background: C.mint, padding: "64px 24px", textAlign: "center" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 192, height: 192, borderRadius: "50%", background: "rgba(255,255,255,.3)", filter: "blur(40px)" }} />
        <h2 style={{ position: "relative", fontSize: "clamp(32px,5vw,46px)", fontWeight: 800, letterSpacing: "-0.02em", color: C.dark }}>Bill smarter. Stock better.<br />Grow faster.</h2>
        <p style={{ position: "relative", maxWidth: 440, margin: "16px auto 0", fontSize: 15, fontWeight: 500, color: "rgba(22,32,27,.7)" }}>Join businesses running invoicing, inventory and loyalty on one app.</p>
        <div style={{ position: "relative", marginTop: 28, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="fv-hover" onClick={() => go("contact")} style={{ ...pill(C.dark, "#fff"), padding: "14px 24px", fontSize: 14 }}>Get an Invite <ArrowRight size={16} /></button>
          <button className="fv-hover" onClick={() => go("contact")} style={{ ...pill("#fff", C.dark), padding: "14px 20px", fontSize: 14 }}><Phone size={16} color={C.mintDeep} /> Book a Demo</button>
        </div>
      </div>
    </section>
  );
}

/* ============ pages ============ */
function HomePage({ go }) {
  const logos = ["AutoShine", "VeloBikes", "GlowSpa", "MediCare+", "UrbanCafe", "FitZone"];
  return (
    <>
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 32px", textAlign: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, border: `1px solid ${C.line}`, background: C.card, padding: "6px 16px 6px 6px", fontSize: 12.5, fontWeight: 500, boxShadow: shadow, color: C.inkSoft }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 999, background: C.dark, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: C.mint }}><Sparkles size={12} /> New</span>
          Now with smart inventory auditing
          <ArrowRight size={14} color={C.inkFaint} />
        </span>
        <h1 style={{ marginTop: 28, fontSize: "clamp(40px,7vw,64px)", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.03em" }}>
          An invoicing app that<br />works like a{" "}
          <span style={{ display: "inline-block", borderRadius: 16, background: C.mint, padding: "2px 12px", color: C.dark }}>business owner</span>
        </h1>
        <p style={{ maxWidth: 560, margin: "24px auto 0", fontSize: 15.5, lineHeight: 1.65, color: C.inkSoft }}>
          Every business deserves billing that does it all — from invoices and inventory to memberships, loyalty, quotations and audits. One app, any industry.
        </p>
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="fv-hover" onClick={() => go("contact")} style={{ ...pill(C.dark, "#fff"), padding: "14px 24px", fontSize: 14 }}>Get an Invite <ArrowRight size={16} /></button>
          <button className="fv-hover" onClick={() => go("contact")} style={{ ...pill(C.card, C.ink), padding: "14px 20px", fontSize: 14, border: `1px solid ${C.line}`, boxShadow: shadow }}><Phone size={16} color={C.mintDeep} /> Book a Call</button>
        </div>
      </section>

      {/* steps */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          <div>
            <StepCard rotate={-1}>
              <div style={{ borderRadius: 16, background: C.bg, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontSize: 11, fontWeight: 600, color: C.inkFaint }}>New Invoice</span><FileText size={16} color={C.inkFaint} /></div>
                <div style={{ height: 10, width: "75%", borderRadius: 999, background: C.line, marginBottom: 8 }} />
                <div style={{ height: 10, width: "50%", borderRadius: 999, background: C.line }} />
                <div style={{ marginTop: 16, width: "100%", borderRadius: 12, background: C.mint, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.dark }}>Generate Invoice</div>
              </div>
            </StepCard>
            <StepLabel n="01" pre="Set up your " hl="business" post=" in minutes — name it, brand it, billing ready." />
          </div>
          <div style={{ marginTop: 32 }}>
            <StepCard rotate={0.5}>
              <div style={{ borderRadius: 16, background: C.bg, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Boxes size={16} color={C.mintDeep} /><span style={{ fontSize: 11, fontWeight: 600, color: C.inkFaint }}>Inventory & Pricing</span></div>
                {[["Ceramic Coating", "In stock", false], ["Brake Pad Set", "In stock", false], ["Loyalty Discount", "-10%", true]].map(([item, val, hl], i) => (
                  <div key={i} style={{ marginTop: 8, display: "flex", justifyContent: "space-between", borderRadius: 8, background: C.card, padding: "8px 12px", border: `1px solid ${C.line}` }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500 }}>{item}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: hl ? C.mintDeep : C.inkSoft }}>{val}</span>
                  </div>
                ))}
              </div>
            </StepCard>
            <StepLabel n="02" pre="Add inventory, taxes, and " hl="discount rules" post=" like a pro." />
          </div>
          <div>
            <StepCard rotate={1}>
              <div style={{ borderRadius: 16, background: C.bg, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 11, fontWeight: 600, color: C.inkFaint }}>This month</span><span style={{ borderRadius: 999, background: C.mintBg, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: C.mintDeep }}>+18%</span></div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96 }}>
                  {[40, 55, 35, 70, 50, 85, 60, 95].map((h, i) => (<div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "6px 6px 0 0", background: i % 2 ? C.mint : C.line }} />))}
                </div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: C.mintDeep }}><Check size={14} /> 142 invoices paid</div>
              </div>
            </StepCard>
            <StepLabel n="03" pre="Send quotes, get paid, and " hl="audit" post=" your numbers." />
          </div>
        </div>
      </section>

      {/* social */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px", background: `linear-gradient(135deg, ${C.mint}, ${C.mintDeep})`, padding: 2 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.dark }}>R</div>
        </div>
        <Eyebrow>SIMPLE, FLEXIBLE, RELIABLE</Eyebrow>
        <blockquote style={{ maxWidth: 520, margin: "12px auto 0", fontSize: 17, fontWeight: 500, lineHeight: 1.6 }}>“We switched our car detailing studio to FinVoice and now invoicing, inventory and our loyalty cards all live in one dashboard. It just works.”</blockquote>
        <p style={{ marginTop: 12, fontSize: 12.5, color: C.inkFaint }}>Ravi Teja, Owner · AutoShine Detailing</p>
        <div style={{ position: "relative", marginTop: 48, overflow: "hidden" }}>
          <div style={{ display: "flex", width: "max-content", animation: "fv-marquee 24s linear infinite" }}>
            {[...logos, ...logos].map((l, i) => (<span key={i} style={{ margin: "0 28px", whiteSpace: "nowrap", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: C.inkFaint }}>{l}</span>))}
          </div>
        </div>
      </section>

      <FeatureGrid />
      <IndustriesBlock />
      <PricingBlock go={go} />
      <FaqBlock faqs={homeFaqs} header />
      <CTABlock go={go} />
    </>
  );
}

function FeaturesPage({ go }) {
  return (
    <>
      <PageHeader eyebrow="Everything in one app" pre="Powerful features, " hl="zero clutter" post="" subtitle="From the first invoice to your year-end audit, FinVoice handles the busywork so you can run the business." />
      <FeatureGrid />
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 24px 48px", display: "flex", flexDirection: "column", gap: 20 }}>
        {featureBlocks.map((b, i) => (
          <div key={b.tag} className="fv-fblock" style={{ display: "grid", gap: 32, alignItems: "center", borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, padding: 40, boxShadow: shadow, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ order: b.flip ? 2 : 1 }}>
              <Eyebrow>{b.tag}</Eyebrow>
              <h3 style={{ marginTop: 12, fontSize: "clamp(24px,3vw,30px)", fontWeight: 800, letterSpacing: "-0.02em" }}>{b.title}</h3>
              <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: C.inkSoft }}>{b.desc}</p>
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {b.points.map((p) => (<div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500 }}><Check size={16} color={C.mintDeep} style={{ flexShrink: 0 }} /> {p}</div>))}
              </div>
            </div>
            <div style={{ order: b.flip ? 1 : 2, aspectRatio: "4/3", borderRadius: 16, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MiniMock kind={i} />
            </div>
          </div>
        ))}
      </section>
      <CTABlock go={go} />
    </>
  );
}

function IndustriesPage({ go }) {
  return (
    <>
      <PageHeader eyebrow="Built for any business" pre="One app. " hl="Every industry." post="" subtitle="However you sell, service or stock, FinVoice molds to your workflow. Here's how different businesses put it to work." />
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 24px 24px" }}>
        <div className="fv-uc-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3,1fr)" }}>
          {useCases.map(({ Icon, name, desc, tags }) => (
            <div key={name} className="fv-lift" style={{ borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, padding: 24, boxShadow: shadow }}>
              <div style={{ height: 44, width: 44, borderRadius: 16, background: C.mintBg, color: C.mintDeep, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} /></div>
              <h3 style={{ marginTop: 16, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{name}</h3>
              <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, color: C.inkSoft }}>{desc}</p>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tags.map((t) => (<span key={t} style={{ borderRadius: 999, border: `1px solid ${C.line}`, background: C.bg, padding: "4px 10px", fontSize: 11, fontWeight: 500, color: C.inkSoft }}>{t}</span>))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <IndustriesBlock />
      <CTABlock go={go} />
    </>
  );
}

function PricingPage({ go }) {
  const Cell = ({ v }) => v === true ? <Check size={16} color={C.mintDeep} style={{ margin: "0 auto" }} /> : v === false ? <Minus size={16} color={C.inkFaint} style={{ margin: "0 auto" }} /> : <span style={{ fontSize: 12.5, fontWeight: 600 }}>{v}</span>;
  return (
    <>
      <PageHeader eyebrow="No hidden fees" pre="Pricing that " hl="grows with you" post="" subtitle="Start free and upgrade only when your business needs more. Every plan includes unlimited invoices." />
      <PricingBlock go={go} />
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ marginBottom: 32, textAlign: "center", fontSize: "clamp(26px,4vw,32px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Compare plans</h2>
        <div style={{ overflow: "hidden", borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, boxShadow: shadow }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, background: C.bg }}>
                <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 13, fontWeight: 700 }}>Feature</th>
                <th style={{ padding: "16px 12px", fontSize: 13, fontWeight: 700 }}>Starter</th>
                <th style={{ padding: "16px 12px", fontSize: 13, fontWeight: 700, color: C.mintDeep }}>Growth</th>
                <th style={{ padding: "16px 12px", fontSize: 13, fontWeight: 700 }}>Business</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r, i) => (
                <tr key={r.label} style={{ background: i % 2 ? "rgba(244,244,243,.5)" : "transparent" }}>
                  <td style={{ padding: "14px 20px", textAlign: "left", fontSize: 13.5, fontWeight: 500, color: C.inkSoft }}>{r.label}</td>
                  <td style={{ padding: "14px 12px" }}><Cell v={r.s} /></td>
                  <td style={{ padding: "14px 12px" }}><Cell v={r.g} /></td>
                  <td style={{ padding: "14px 12px" }}><Cell v={r.b} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <FaqBlock faqs={homeFaqs} header />
      <CTABlock go={go} />
    </>
  );
}

function FaqsPage({ go }) {
  return (
    <>
      <PageHeader eyebrow="Help center" pre="Everything you " hl="wanted to ask" post="" subtitle="Can't find what you're looking for? Book a demo and we'll walk you through it." />
      <FaqBlock faqs={allFaqs} header={false} />
      <CTABlock go={go} />
    </>
  );
}

function ContactPage() {
  const inds = ["Car Detailing", "Bike Store", "Salon / Spa", "Gym", "Clinic", "Retail", "Other"];
  const [form, setForm] = useState({ name: "", email: "", phone: "", business: "", industry: inds[0], message: "" });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    const err = {};
    if (!form.name.trim()) err.name = true;
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = true;
    if (!form.business.trim()) err.business = true;
    setErrors(err);
    if (!Object.keys(err).length) setSent(true);
  };
  const field = (bad) => ({ width: "100%", borderRadius: 16, border: `1px solid ${bad ? "#f87171" : C.line}`, background: C.bg, padding: "12px 16px", fontSize: 14, outline: "none", fontFamily: FONT, boxSizing: "border-box" });
  const lbl = { display: "block", marginBottom: 6, fontSize: 12.5, fontWeight: 600 };
  return (
    <>
      <PageHeader eyebrow="Talk to us" pre="Book your " hl="FinVoice demo" post="" subtitle="See exactly how FinVoice fits your business. No pressure, no jargon — just a quick walkthrough." />
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 24px 48px" }}>
        <div className="fv-contact" style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1.3fr" }}>
          <div style={{ borderRadius: 24, border: `1px solid ${C.line}`, background: C.dark, padding: 32, color: "#fff", boxShadow: shadow }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Let's get you set up</h3>
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,.6)" }}>Book a quick demo and we'll tailor FinVoice to your business in under 20 minutes.</p>
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
              {[[Mail, "hello@finvoice.app"], [Phone, "+91 98765 43210"], [MapPin, "Visakhapatnam, Andhra Pradesh"]].map(([Ic, t]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ height: 36, width: 36, borderRadius: 12, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={16} color={C.mint} /></div>
                  <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.8)" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, padding: 32, boxShadow: shadow }}>
            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "32px 0" }}>
                <div style={{ height: 56, width: 56, borderRadius: "50%", background: C.mint, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={28} color={C.dark} /></div>
                <h3 style={{ marginTop: 20, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Thanks, {form.name.split(" ")[0]}!</h3>
                <p style={{ marginTop: 8, maxWidth: 280, fontSize: 14, color: C.inkSoft }}>Your demo request is in. We'll reach out at {form.email} within one business day.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="fv-2col" style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                  <div><label style={lbl}>Full name</label><input value={form.name} onChange={set("name")} placeholder="Krishna" style={field(errors.name)} /></div>
                  <div><label style={lbl}>Email</label><input value={form.email} onChange={set("email")} placeholder="you@business.com" style={field(errors.email)} /></div>
                </div>
                <div className="fv-2col" style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
                  <div><label style={lbl}>Phone</label><input value={form.phone} onChange={set("phone")} placeholder="+91 ..." style={field(false)} /></div>
                  <div><label style={lbl}>Business name</label><input value={form.business} onChange={set("business")} placeholder="AutoShine Detailing" style={field(errors.business)} /></div>
                </div>
                <div><label style={lbl}>Industry</label><select value={form.industry} onChange={set("industry")} style={field(false)}>{inds.map((i) => <option key={i}>{i}</option>)}</select></div>
                <div><label style={lbl}>What do you need help with?</label><textarea value={form.message} onChange={set("message")} rows={3} placeholder="Tell us about your billing & inventory needs..." style={{ ...field(false), resize: "none" }} /></div>
                <button onClick={submit} className="fv-hover" style={{ width: "100%", borderRadius: 999, background: C.dark, padding: "14px 0", fontSize: 14, fontWeight: 600, color: "#fff", border: "none", fontFamily: FONT, cursor: "pointer" }}>Book a Demo</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function StepLabel({ n, pre, hl, post }) {
  return (
    <div style={{ marginTop: 20, padding: "0 4px" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: C.mintDeep }}>STEP {n}</span>
      <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.4, color: C.inkSoft }}>{pre}<span style={{ fontWeight: 700, color: C.ink }}>{hl}</span>{post}</p>
    </div>
  );
}

function MiniMock({ kind }) {
  if (kind === 1) return (
    <div style={{ width: "75%", display: "flex", flexDirection: "column", gap: 8 }}>
      {[["Ceramic Coating", "In stock", false], ["Engine Oil 1L", "In stock", false], ["Brake Pads", "Low: 3", true]].map(([x, v, w], i) => (
        <div key={x} style={{ display: "flex", justifyContent: "space-between", borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, padding: "12px 16px" }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{x}</span><span style={{ fontSize: 11, fontWeight: 700, color: w ? "#d97706" : C.mintDeep }}>{v}</span>
        </div>
      ))}
    </div>
  );
  if (kind === 2) return (
    <div style={{ width: "75%", borderRadius: 16, border: `1px solid ${C.line}`, background: C.card, padding: 20, textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto", background: `linear-gradient(135deg, ${C.mint}, ${C.mintDeep})` }} />
      <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700 }}>Priya Sharma</p>
      <span style={{ marginTop: 6, display: "inline-block", borderRadius: 999, background: C.mintBg, padding: "2px 10px", fontSize: 10, fontWeight: 700, color: C.mintDeep }}>Gold Member · 1,240 pts</span>
    </div>
  );
  if (kind === 3) return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: "70%", width: "75%" }}>
      {[50, 70, 45, 85, 60, 95].map((h, i) => (<div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "6px 6px 0 0", background: i % 2 ? C.mint : C.line }} />))}
    </div>
  );
  return (
    <div style={{ width: "75%", borderRadius: 16, border: `1px solid ${C.line}`, background: C.card, padding: 20 }}>
      <div style={{ height: 10, width: "66%", borderRadius: 999, background: C.line }} />
      <div style={{ marginTop: 8, height: 10, width: "50%", borderRadius: 999, background: C.line }} />
      <div style={{ marginTop: 16, borderRadius: 12, background: C.mint, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.dark }}>Send Invoice</div>
    </div>
  );
}

/* ============ root ============ */
export default function FinVoiceApp() {
  const [page, setPage] = useState("home");
  const [menu, setMenu] = useState(false);
  const go = (p) => { setPage(p); setMenu(false); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };

  const Page = { home: HomePage, features: FeaturesPage, industries: IndustriesPage, pricing: PricingPage, faqs: FaqsPage, contact: ContactPage }[page];

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: FONT, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fv-marquee { from {transform:translateX(0)} to {transform:translateX(-50%)} }
        .fv-hover:hover { transform: scale(1.03); }
        .fv-lift { transition: transform .25s ease; }
        .fv-lift:hover { transform: translateY(-4px); }
        @media (max-width: 860px) {
          .fv-nav-links { display: none !important; }
          .fv-nav-cta { display: none !important; }
          .fv-burger { display: flex !important; }
          .fv-feat-grid, .fv-uc-grid, .fv-fblock, .fv-contact { grid-template-columns: 1fr !important; }
          .fv-feat-grid > div { grid-column: span 1 !important; }
          .fv-fblock > div:first-child, .fv-fblock > div:last-child { order: 0 !important; }
          .fv-ind-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* NAV */}
      <header style={{ position: "sticky", top: 16, zIndex: 50, width: "calc(100% - 2rem)", maxWidth: 980, margin: "16px auto 0" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(251,251,250,.85)", backdropFilter: "blur(16px)", padding: "8px 12px 8px 24px", boxShadow: shadow }}>
          <button onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>
            <div style={{ height: 28, width: 28, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>F</span></div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>FinVoice</span>
          </button>
          <ul className="fv-nav-links" style={{ display: "flex", gap: 28, listStyle: "none", margin: 0, padding: 0 }}>
            {NAV.map((l) => {
              const active = page === l.id;
              return (
                <li key={l.id}>
                  <button onClick={() => go(l.id)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 500, color: active ? C.ink : C.inkSoft, padding: 0 }}>
                    {l.label}
                    {active && <span style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", height: 3, width: 4, borderRadius: 999, background: C.mintDeep }} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="fv-nav-cta fv-hover" onClick={() => go("contact")} style={{ ...pill(C.dark, "#fff"), padding: "10px 16px", fontSize: 13 }}><Phone size={14} /> Book a Demo</button>
          <button className="fv-burger" onClick={() => setMenu((v) => !v)} style={{ display: "none", height: 36, width: 36, borderRadius: 999, background: C.dark, color: "#fff", border: "none", cursor: "pointer", alignItems: "center", justifyContent: "center" }}>{menu ? <X size={16} /> : <Menu size={16} />}</button>
        </nav>
        {menu && (
          <div style={{ marginTop: 8, borderRadius: 24, border: `1px solid ${C.line}`, background: C.card, padding: 12, boxShadow: shadow }}>
            {NAV.map((l) => (
              <button key={l.id} onClick={() => go(l.id)} style={{ display: "block", width: "100%", textAlign: "left", borderRadius: 16, padding: "12px 16px", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: FONT, background: page === l.id ? C.mintBg : "transparent", color: page === l.id ? C.ink : C.inkSoft }}>{l.label}</button>
            ))}
            <button onClick={() => go("contact")} style={{ marginTop: 4, display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, background: C.dark, padding: "12px 0", fontSize: 14, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONT }}><Phone size={16} /> Book a Demo</button>
          </div>
        )}
      </header>

      <main>{Page && <Page go={go} />}</main>

      {/* FOOTER */}
      <footer style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 40px" }}>
        <div style={{ borderRadius: 32, border: `1px solid ${C.line}`, background: C.card, padding: 40, boxShadow: shadow }}>
          <div className="fv-foot-grid" style={{ display: "grid", gap: 40, gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
            <div>
              <button onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>
                <div style={{ height: 28, width: 28, borderRadius: 8, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>F</span></div>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>FinVoice</span>
              </button>
              <p style={{ marginTop: 16, maxWidth: 280, fontSize: 13.5, lineHeight: 1.6, color: C.inkSoft }}>The customizable invoicing & inventory app for any industry.</p>
            </div>
            {[
              ["Product", [["Invoicing", "features"], ["Inventory", "features"], ["Memberships", "features"], ["Quotations", "features"], ["Audit", "features"]]],
              ["Industries", [["Car Detailing", "industries"], ["Bike Stores", "industries"], ["Salons", "industries"], ["Retail", "industries"]]],
              ["Company", [["Features", "features"], ["Pricing", "pricing"], ["FAQs", "faqs"], ["Book a Demo", "contact"]]],
            ].map(([h, items]) => (
              <div key={h}>
                <h4 style={{ fontSize: 13, fontWeight: 700 }}>{h}</h4>
                <ul style={{ marginTop: 16, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map(([label, id]) => (<li key={label}><button onClick={() => go(id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, color: C.inkSoft, padding: 0 }}>{label}</button></li>))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12.5, color: C.inkFaint }}>
            <span>© 2026 FinVoice. All rights reserved.</span>
            <span>Made in Visakhapatnam, India 🇮🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
