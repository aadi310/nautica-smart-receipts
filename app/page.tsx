"use client";

/**
 * Nautica x RDEP: smart receipt, "Navy & sail, deeper"
 *
 * Concept: navy and sail white with soft curves. A navy greeting with a wave edge, serif headlines with an
 * italic accent, rounded tab cards with a pointer, a wave-edged receipt, a navy store ticket and a deep-navy stub.
 * Colours: Nautica navy family and white; sand only on the "expiring" strip and the active dot.
 * No ocean wording: the nautical feel comes from shapes only.
 *
 * Content flow (same order for every brand):
 *   1. Greeting + tier chip
 *   2. Video / banner carousel
 *   3. Loyalty tabs: Points | Profile | Coupons
 *   4. The receipt (tax invoice): items, totals, invoice details, payment, History / Email / Download
 *   5. Rate your visit
 *   6. Refer a friend
 *   7. Reach out to us
 *   8. Store
 *   9. Terms and conditions (open by default), barcode, powered by
 *
 * Fixed layout: designed at 400px wide. On phones (<= 520px) the page is scaled with CSS `zoom`
 * to fill the screen, on larger screens it stays a centred 400px column.
 *
 * ASSETS (in /public): images/design-mode/nautica-logo.png (logo), images/design-mode/RDEP-logo.png. Optional: a banner (1920x1080) listed in MARKETING_BANNERS
 * Stack: Next.js (app router) + Tailwind. No other dependencies.
 *
 * Usage:  app/nautica-receipt/page.tsx
 *   import NauticaReceipt from "@/components/NauticaReceipt";
 *   export default function Page() { return <NauticaReceipt />; }
 *
 * With real data: <NauticaReceipt receipts={[...]} data={currentReceipt} />
 *   `club` (tier, points, coupons) is optional on each receipt; without it the Points and Coupons tabs are hidden.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import { Fraunces, Inter } from "next/font/google";

const fallbackFont = Inter({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--font-nt-fallback" });
const displayFont = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-nt-display" });
const BRAND_STACK = `"NauticaSans", var(--font-nt-fallback), Arial, "Helvetica Neue", Helvetica, sans-serif`;

const FONT_FACES = `
@font-face{font-family:"NauticaSans";font-weight:400;font-style:normal;font-display:swap;src:url("/fonts/NauticaSans-Regular.ttf") format("truetype")}
@font-face{font-family:"NauticaSans";font-weight:700;font-style:normal;font-display:swap;src:url("/fonts/NauticaSans-Bold.ttf") format("truetype")}
.nt-root{font-family:${BRAND_STACK}}
.nt-bold{font-family:${BRAND_STACK};font-weight:700}
.nt-display{font-family:var(--font-nt-display),"Playfair Display",Georgia,"Times New Roman",serif;font-weight:600;font-optical-sizing:auto;letter-spacing:-0.015em}
.nt-display em{font-weight:400;font-style:italic}

/* Phone press feedback: every button and link dips slightly while touched */
.nt-root a,.nt-root button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.nt-root a,.nt-root button:not(:disabled){transition:transform .12s ease,background-color .2s ease,color .2s ease,border-color .2s ease}
.nt-root a:active,.nt-root button:not(:disabled):active{transform:scale(.97)}

/* Rating stars flash in a wave until the first tap */
@keyframes nt-star{0%,10%{fill:transparent}24%,64%{fill:currentColor}80%,100%{fill:transparent}}
.nt-star{fill:transparent;animation:nt-star 3.2s ease-in-out infinite}

/* Light sweep across the tier card */
@keyframes nt-sheen{0%,55%{left:-60%}100%{left:130%}}
.nt-sheen{position:relative;overflow:hidden}
.nt-sheen::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.16),transparent);transform:skewX(-18deg);animation:nt-sheen 5s ease-in-out infinite}

@keyframes nt-drift{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nt-wave-a{animation:nt-drift 16s linear infinite}
.nt-wave-b{animation:nt-drift 26s linear infinite reverse}

@media (prefers-reduced-motion:reduce){
  .nt-star{animation:none;fill:currentColor}
  .nt-sheen::after{animation:none;display:none}
  .nt-root a,.nt-root button:not(:disabled){transition:none}
  .nt-root a:active,.nt-root button:not(:disabled):active{transform:none}
  .nt-wave-a,.nt-wave-b{animation:none}
}
`;

/* Brand tokens: Nautica navy family, sail white, a little sand. */
const theme = {
  "--b-ink": "#0E1B2A",
  "--b-acc": "#13406F",
  "--b-acc2": "#0B2A4A",
  "--b-abyss": "#071B31",
  "--b-canvas": "#F4F0E8",
  "--b-page": "#D3D6D8",
  "--b-wash": "#EAEFF5",
  "--b-line": "rgba(19,64,111,0.2)",
  "--b-gray": "#4A5D72",
  "--b-soft": "#F2D9A6",
  "--b-r": "26px",
  "--b-r-s": "12px",
} as CSSProperties;

/* Assets + links (every one can be overridden with a prop) */
const DEFAULT_LOGO = "/images/design-mode/nautica-logo.png";
const DEFAULT_RDEP_LOGO = "/images/design-mode/RDEP-logo.png";
const BRAND = "Nautica";
const PROGRAM = "Nautica Rewards";
const MARKETING_VIDEO_ID = "-vYYls9wVts"; // https://youtu.be/-vYYls9wVts
/* Banner slides that follow the video. Put 1920x1080 images in /public and list them here;
 * leave the array empty and the carousel is just the video. */
const MARKETING_BANNERS: string[] = [];
const MARKETING_IMAGE_MS = 4000;

/* Club tiers, lowest to highest. `foil` is the metallic gradient used on lettering and chips. */
export type TierName = "Silver" | "Gold" | "Platinum";
const TIERS: { name: TierName; foil: string }[] = [
  { name: "Silver", foil: "linear-gradient(120deg,#FFFFFF 0%,#C9CED6 35%,#8D949E 62%,#EEF0F3 100%)" },
  { name: "Gold", foil: "linear-gradient(120deg,#FFF3C4 0%,#E5BD52 38%,#A67C1A 62%,#F7E08F 100%)" },
  { name: "Platinum", foil: "linear-gradient(120deg,#FFFFFF 0%,#D6E2F2 32%,#93A9C9 62%,#F1F6FD 100%)" },
];
const foilText = (foil: string): CSSProperties => ({ backgroundImage: foil, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

/* ------------------------------- types ------------------------------------------- */
export interface NauticaItem {
  name: string;
  size: string;
  sku: string;
  hsn: string;
  qty: number;
  mrp: number;
  discount: number;
}

export interface NauticaCoupon {
  code: string;
  /** Big headline, e.g. "20% OFF" or "₹500 OFF" */
  value: string;
  title: string;
  description: string;
  validTill: string;
}

export interface NauticaClub {
  tier: TierName;
  /** Available points */
  points: number;
  /** Points still needed for the next tier. null / omitted at the top tier. */
  pointsToNext?: number | null;
  /** Points earned on this bill. Defaults to 1 point per ₹10. */
  pointsEarned?: number;
  pointsRedeemed?: number;
  /** Shown as a highlighted strip when present */
  expiring?: { points: number; on: string };
  coupons: NauticaCoupon[];
}

export interface NauticaReferral {
  code: string;
  /** Points both people get once the friend registers */
  rewardPoints: number;
  /** Optional join link added to the share message */
  link?: string;
}

export interface NauticaReceiptData {
  invoiceNo: string;
  /** "DD-MM-YYYY HH:mm:ss" (the date part is used to sort the history) */
  date: string;
  customer: { name: string; mobile: string; email: string };
  items: NauticaItem[];
  sgst: number;
  cgst: number;
  payment: { mode: string; ref: string };
  store: { name: string; address: string; email: string; phone: string; gstin?: string; associate: string };
  registeredOffice: string;
  exchange: { days: number; points: string[] };
  callTo: string;
  emailTo: string;
  club?: NauticaClub;
  referral?: NauticaReferral;
}
type Receipt = NauticaReceiptData;

export interface ProfileValues {
  name: string;
  email: string;
  gender: string;
  birthday: string;
  anniversary: string;
  offers: boolean;
}

export interface FeedbackValues {
  invoiceNo: string;
  overall: number;
  categories: { service: number; product: number; sizes: number; value: number };
  comment: string;
}

export interface NauticaReceiptProps {
  /** Receipt to open first. Defaults to the newest receipt in `receipts`. */
  data?: Receipt;
  /** All receipts of this customer. Drives the history popup. */
  receipts?: Receipt[];
  /** Real QR / barcode image URLs (placeholders are drawn if omitted) */
  qrSrc?: string;
  barcodeSrc?: string;
  logoSrc?: string;
  rdepLogoSrc?: string;
  /** Overrides the built-in download. Receives the receipt currently on screen. */
  onDownload?: (receipt: Receipt) => void;
  onSendEmail?: (email: string, receipt: Receipt) => void;
  onSaveProfile?: (values: ProfileValues) => void;
  onSubmitFeedback?: (values: FeedbackValues) => void;
  onRefer?: (code: string) => void;
  onSelectReceipt?: (invoiceNo: string) => void;
}

type IconName =
  | "history" | "mail" | "download" | "star" | "users" | "trend" | "gift" | "alert" | "phone" | "close"
  | "chevron" | "ticket" | "check" | "arrow" | "pin" | "copy" | "user" | "coins" | "anchor";
type TabId = "points" | "profile" | "coupons";
type ModalId = "history" | "email" | null;

/* ------------------------------- helpers ----------------------------------------- */
const inr = (n: number): string => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = (n: number): string => n.toLocaleString("en-IN");
const trim = (n: number): string => String(Number(n.toFixed(2)));
const round2 = (n: number): number => Math.round(n * 100) / 100;
const netOf = (i: NauticaItem): number => round2(i.mrp * i.qty - i.discount);
const emailOk = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function totalsOf(r: Receipt) {
  const subtotal = round2(r.items.reduce((a, i) => a + i.mrp * i.qty, 0));
  const discount = round2(r.items.reduce((a, i) => a + i.discount, 0));
  return { subtotal, discount, total: round2(subtotal - discount), pieces: r.items.reduce((a, i) => a + i.qty, 0) };
}

function dateValue(d: string): number {
  const [dd, mm, yyyy] = d.split(" ")[0].split("-").map(Number);
  return Date.UTC(yyyy, (mm || 1) - 1, dd || 1);
}

function seeded(seed: string): () => number {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  s = s || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/* ---------------------------- downloadable receipt ------------------------------- */
/** Standalone, print-ready HTML for one receipt. The "Save as PDF" button inside it opens the print dialog. */
function buildReceiptHtml(r: Receipt, logoSrc: string, rdepLogoSrc: string): string {
  const abs = (p: string) => (/^(https?:|data:)/.test(p) ? p : `${window.location.origin}${p}`);
  const t = totalsOf(r);
  const rows = r.items
    .map((i) => {
      const gross = i.mrp * i.qty;
      const pct = gross > 0 ? (i.discount / gross) * 100 : 0;
      return `<tr><td><div class="n">${esc(i.name)}</div><div class="s">SKU ${esc(i.sku)} &middot; HSN ${esc(i.hsn)} &middot; Size ${esc(i.size)}</div></td><td class="r">${i.qty}</td><td class="r">${inr(gross)}</td><td class="r">${trim(pct)}%</td><td class="r b">${inr(netOf(i))}</td></tr>`;
    })
    .join("");
  const terms = r.exchange.points.map((p) => `<li>${esc(p)}</li>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND} receipt ${esc(r.invoiceNo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0E1B2A;background:#fff;max-width:780px;margin:0 auto;padding:24px}
.bar{display:flex;justify-content:flex-end;margin-bottom:16px}.bar button{background:#13406F;color:#fff;border:0;padding:10px 18px;font:700 13px Arial;cursor:pointer}
.head{display:flex;justify-content:space-between;gap:20px;padding-bottom:16px;border-bottom:4px solid #13406F;margin-bottom:20px}.head img{height:44px;width:auto}
.head h1{font-size:24px;text-transform:uppercase;letter-spacing:.5px;margin-top:10px}.meta{text-align:right;font-size:12px;line-height:1.7}
.store{background:#f4f4f4;border-left:4px solid #13406F;padding:12px 14px;margin-bottom:18px;font-size:12px;line-height:1.6}.store h2{font-size:15px}
table{width:100%;border-collapse:collapse}th{background:#0E1B2A;color:#fff;text-align:left;padding:9px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
td{padding:11px 8px;border-bottom:1px solid #ddd;vertical-align:top;font-size:12px}.r{text-align:right}th.r{text-align:right}.b{font-weight:700}.n{font-weight:700;text-transform:uppercase}.s{font-size:11px;color:#666;margin-top:3px}
.sum{margin:20px 0 0 auto;width:300px}.row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}.net{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:12px 14px;background:#13406F;color:#fff}.net strong{font-size:22px}
.terms{margin-top:26px;padding-top:14px;border-top:1px dashed #bbb;font-size:10px;color:#666;line-height:1.6}.terms ol{padding-left:16px;margin:6px 0}
.foot{margin-top:24px;padding-top:16px;border-top:1px dashed #bbb;text-align:center;font-size:12px;color:#666}.foot img{height:20px;vertical-align:middle;margin-left:6px}
@media print{.bar{display:none}body{padding:0;max-width:none}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Save as PDF</button></div>
<div class="head"><div><img src="${esc(abs(logoSrc))}" alt="${BRAND}" onerror="this.style.display='none'"><h1>Tax invoice</h1></div>
<div class="meta"><div><strong>Invoice no:</strong> ${esc(r.invoiceNo)}</div><div><strong>Date:</strong> ${esc(r.date)}</div><div><strong>Associate:</strong> ${esc(r.store.associate)}</div></div></div>
<div class="store"><h2>${esc(r.store.name)}</h2><div>${esc(r.store.address)}</div><div>${esc(r.store.phone)} &middot; ${esc(r.store.email)}${r.store.gstin ? ` &middot; GSTIN ${esc(r.store.gstin)}` : ""}</div></div>
<p style="margin-bottom:16px;font-size:13px"><strong>Customer:</strong> ${esc(r.customer.name)} &middot; ${esc(r.customer.mobile)}</p>
<table><thead><tr><th style="width:46%">Item</th><th class="r">Qty</th><th class="r">MRP</th><th class="r">Disc.</th><th class="r">Net amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum"><div class="row"><span>Subtotal (MRP)</span><strong>${inr(t.subtotal)}</strong></div><div class="row"><span>Discount</span><strong>- ${inr(t.discount)}</strong></div><div class="row"><span>SGST</span><strong>${inr(r.sgst)}</strong></div><div class="row"><span>CGST</span><strong>${inr(r.cgst)}</strong></div>
<div class="net"><span>NET TOTAL</span><strong>&#8377;${inr(t.total)}</strong></div><div class="row" style="margin-top:8px"><span>Paid by</span><strong>${esc(r.payment.mode)} &ndash; ${esc(r.payment.ref)}</strong></div></div>
<div class="terms"><strong>Terms and conditions</strong><ol>${terms}</ol><p>Registered office: ${esc(r.registeredOffice)}</p></div>
<div class="foot">Thank you for shopping at ${BRAND}.<br><br>Powered by <img src="${esc(abs(rdepLogoSrc))}" alt="rdep" onerror="this.style.display='none'"></div>
</body></html>`;
}

function downloadReceipt(r: Receipt, logoSrc: string, rdepLogoSrc: string) {
  const blob = new Blob([buildReceiptHtml(r, logoSrc, rdepLogoSrc)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${BRAND}_Receipt_${r.invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------- Sample Data ----------------------------------- */
const halfTax = (total: number): number => Math.floor(((total - total / 1.18) / 2) * 100) / 100;

/* SAMPLE data. Replace with the real tier, points, coupons and referral from the loyalty API. */
const SAMPLE_CLUB: NauticaClub = {
  tier: "Gold",
  points: 3240,
  pointsToNext: 1760,
  expiring: { points: 640, on: "12 Jan 2027" },
  coupons: [
    { code: "GOLD500", value: "₹500 OFF", title: "Gold member reward", description: "On any bill above ₹2,999.", validTill: "5 Nov 2026" },
    { code: "FESTIVE10", value: "10% OFF", title: "Festive edit", description: "On new arrivals. One use only.", validTill: "7 Nov 2026" },
    { code: "WINTER15", value: "15% OFF", title: "Winter wardrobe", description: "On jackets, knits and layering pieces.", validTill: "20 Nov 2026" },
    { code: "NAUTICA20", value: "20% OFF", title: "Welcome back offer", description: "On your next purchase of ₹3,999 or more.", validTill: "30 Nov 2026" },
    { code: "GOLDTOTE", value: "FREE TOTE", title: "Gold perk", description: "A Nautica tote on any bill above ₹5,999.", validTill: "31 Dec 2026" },
  ],
};

const SAMPLE_COMMON = {
  customer: { name: "Deepak", mobile: "9886082728", email: "deepak.s@proenx.com" },
  store: {
    name: "Nautica",
    address: "62, Upper Ground floor, Phoenix Marketcity, Karnataka",
    email: "rema@proenx.com",
    phone: "9790258564",
    gstin: "29AAOCR0097H1Z4",
    associate: "Virat",
  },
  registeredOffice:
    "1/1, 4th Floor, Cabin 1, Vinayaka Towers, Gandhinagar, K. G. Road, Bangalore, Bangalore North, Karnataka, India, 560009",
  exchange: {
    days: 30,
    points: [
      "Items can be exchanged within 30 days of purchase with this receipt.",
      "Products must be unworn, unwashed and carry all original tags.",
      "Exchange is for the same or a higher value item; any price difference is payable.",
      "Items bought during the end of season sale, innerwear and accessories are not exchangeable.",
    ],
  },
  callTo: "+919790258564",
  emailTo: "rema@proenx.com",
  club: SAMPLE_CLUB,
  referral: { code: "DEEPAK-NAUT500", rewardPoints: 500 } as NauticaReferral,
};

export const sampleNauticaReceipts: NauticaReceiptData[] = [
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20261101000185",
    date: "01-11-2026 12:18:04",
    items: [{ name: "SOCCER CREWNECK PERFORMANCE T-SHIRT", size: "M", sku: "KR6635", hsn: "62032090", qty: 1, mrp: 6617.27, discount: 2644.16 }],
    sgst: halfTax(3973.11),
    cgst: halfTax(3973.11),
    payment: { mode: "CASH", ref: "REF98765" },
  },
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260526000112",
    date: "26-05-2026 18:41:22",
    store: { ...SAMPLE_COMMON.store, name: "Nautica Orion Mall", address: "Orion Mall, Dr Rajkumar Road, Rajajinagar, Bengaluru, Karnataka" },
    items: [
      { name: "CLASSIC FIT OXFORD SHIRT", size: "L", sku: "W41210", hsn: "62052000", qty: 1, mrp: 4999, discount: 1000 },
      { name: "SLIM FIT CHINO", size: "32", sku: "P22318", hsn: "62034200", qty: 1, mrp: 3999, discount: 0 },
    ],
    sgst: halfTax(7998),
    cgst: halfTax(7998),
    payment: { mode: "CARD", ref: "REF40211" },
  },
  {
    ...SAMPLE_COMMON,
    invoiceNo: "20260203000047",
    date: "03-02-2026 14:09:50",
    store: { ...SAMPLE_COMMON.store, name: "Nautica Forum Mall", address: "Forum Mall, Hosur Road, Koramangala, Bengaluru, Karnataka" },
    items: [{ name: "QUILTED PUFFER JACKET", size: "M", sku: "J09877", hsn: "62011390", qty: 1, mrp: 8999, discount: 0 }],
    sgst: halfTax(8999),
    cgst: halfTax(8999),
    payment: { mode: "UPI", ref: "REF77310" },
  },
];

/* -------------------------------- icons ------------------------------------------ */
const PHONE_PATH =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z";
const STAR_PATH = "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z";
const PATHS: Record<IconName, ReactNode> = {
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  download: (<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>),
  star: <path d={STAR_PATH} />,
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>),
  trend: (<><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  gift: (<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9" /><path d="M12 8v13" /><path d="M12 8c-1-3-5-4-5-1.5S10 8 12 8Zm0 0c1-3 5-4 5-1.5S14 8 12 8Z" /></>),
  alert: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M12 13v3M12 18.5h.01" /></>),
  phone: <path d={PHONE_PATH} />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  ticket: (<><path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M9 9h6M9 12h6M9 15h3" /></>),
  check: <path d="m5 12 5 5 9-10" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  pin: (<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  copy: (<><rect x="9" y="9" width="12" height="12" rx="3" /><path d="M5 15V6a3 3 0 0 1 3-3h9" /></>),
  user: (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  coins: (<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>),
  anchor: (<><circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V22" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><path d="M8 11h8" /></>),
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ------------------------- placeholder QR + barcode ------------------------------ */
function PlaceholderQR({ seed }: { seed: string }) {
  const N = 25;
  const cells = useMemo(() => {
    const rnd = seeded(seed);
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    const out: [number, number][] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.5) out.push([x, y]);
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} fill="#111111" shapeRendering="crispEdges" role="img" aria-label="Receipt QR code" className="h-full w-full">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      {cells.map(([x, y]) => (<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

function PlaceholderBarcode({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    const rnd = seeded(seed);
    const out: [number, number][] = [];
    let x = 0;
    while (x < 240) {
      const w = 1 + Math.floor(rnd() * 3);
      out.push([x, w]);
      x += w + 1 + Math.floor(rnd() * 2);
    }
    return out;
  }, [seed]);
  return (
    <svg viewBox="0 0 244 56" fill="#111111" shapeRendering="crispEdges" role="img" aria-label="Receipt barcode" className="h-14 w-full max-w-xs">
      {bars.map(([x, w]) => (<rect key={x} x={x} y="0" width={w} height="56" />))}
    </svg>
  );
}

/* --------------------------------- shared ui ------------------------------------- */
const ROOT_CLASS = `nt-root ${fallbackFont.variable} ${displayFont.variable}`;
const MAIN_CLASS = "mx-auto w-[400px] overflow-x-clip bg-[var(--b-canvas)] pb-0 sm:shadow-[0_30px_70px_-28px_rgba(7,27,49,0.6)]";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--b-acc2)]";
const DISPLAY = "nt-display";
const DISPLAY_NUM = "nt-display";
const MONO = "tabular-nums";
const CARD = "rounded-[26px] border border-[var(--b-line)] bg-white shadow-[0_16px_34px_-24px_rgba(7,27,49,0.55)]";
const FIELD = "w-full rounded-xl border border-[var(--b-line)] bg-[var(--b-canvas)] px-3.5 py-3 text-base text-[var(--b-ink)] outline-none placeholder:text-black/40 focus:border-[var(--b-acc)]";
const FLABEL = "nt-bold mb-1.5 block text-[12px] uppercase tracking-[0.12em] text-[var(--b-gray)]";
const BTN = `nt-bold w-full rounded-2xl bg-[var(--b-acc2)] py-4 text-[13px] uppercase tracking-[0.14em] text-white active:bg-[var(--b-acc)] [@media(hover:hover)]:hover:bg-[var(--b-acc)] ${FOCUS}`;
const BTN_OUT = `nt-bold flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--b-acc2)] bg-white py-4 text-[13px] uppercase tracking-[0.1em] text-[var(--b-acc2)] active:bg-[var(--b-acc2)] active:text-white [@media(hover:hover)]:hover:bg-[var(--b-acc2)] [@media(hover:hover)]:hover:text-white ${FOCUS}`;
const CHIP_BTN = `nt-bold inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--b-acc)] px-3.5 py-2.5 text-[12px] uppercase tracking-[0.08em] text-white active:bg-[var(--b-acc2)] ${FOCUS}`;
const CHIP_ON = "rounded-full bg-[var(--b-acc)] text-white";
const MEDIA_FRAME = "rounded-[26px] shadow-[0_18px_34px_-22px_rgba(7,27,49,0.7)]";
const DOT = "h-2 rounded-full";
const DOT_ON = "w-6 bg-[var(--b-acc)]";
const DOT_OFF = "w-2 bg-[var(--b-acc)]/30";
const MODAL_BODY = "bg-white px-5 pb-7 pt-4 text-[var(--b-ink)] sm:rounded-b-[26px]";
const CLOSE_BTN = `grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--b-acc2)] text-white active:bg-[var(--b-acc)] ${FOCUS}`;
const TIER_CARD = "rounded-[28px] bg-[var(--b-acc2)] p-5 text-white";
const ALERT_CARD = "rounded-[26px] bg-[var(--b-soft)] text-[var(--b-ink)]";
const REFER_CARD = `rounded-[26px] border border-[var(--b-line)] bg-white shadow-[0_16px_34px_-24px_rgba(7,27,49,0.55)] active:bg-[var(--b-wash)] ${FOCUS}`;
const REFER_CODE = "rounded-full bg-[var(--b-wash)] text-[var(--b-acc)]";
const REFER_ARROW = "bg-[var(--b-acc)] text-white";
const PAPER_WRAP = "mx-3 mt-6";
const PAPER_SHADOW = "drop-shadow(0 14px 14px rgba(7,27,49,0.18))";
const PAPER_TOP_FILL = "#0B2A4A";
const PAPER_BODY = "bg-white";
const PAPER_HEAD = "flex items-start justify-between gap-4 bg-[var(--b-acc2)] px-5 pb-5 pt-3 text-white";
const SUM_BOX = "rounded-2xl bg-[var(--b-wash)] p-4";
const TILE = "rounded-2xl bg-[var(--b-wash)]";
const SIZE_BADGE = "rounded-full border-[3px] border-[var(--b-acc)] bg-white text-[var(--b-acc)]";
const DISC_PILL = "rounded-full bg-[var(--b-soft)] text-[var(--b-ink)]";
const NET_LINE = "border-white/30";
const NET_WRAP = "mt-3.5 rounded-2xl bg-[var(--b-acc2)] px-4 py-4 text-white";
const NET_AMT = "text-[34px] text-[var(--b-soft)]";
const ACTION_BTN = `nt-bold flex min-w-0 flex-col items-center gap-2 rounded-2xl border-2 border-[var(--b-acc)] px-1 py-3.5 text-center text-[11px] uppercase leading-tight tracking-[0.06em] text-[var(--b-acc2)] active:bg-[var(--b-acc)] active:text-white [@media(hover:hover)]:hover:bg-[var(--b-acc)] [@media(hover:hover)]:hover:text-white ${FOCUS}`;
const STORE_LINE = "border-black/20";
const STUB_LINE = "border-black/20";

/* ---------- fixed-width scaling ---------- */
const DESIGN_W = 400;
const PHONE_MAX = 520;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** 1 on tablets/desktop (centred 400px column); viewport/400 on phones so the layout is identical. */
function useFitScale(): number {
  const [scale, setScale] = useState(1);
  useIsoLayoutEffect(() => {
    const update = () => {
      const w = document.documentElement.clientWidth;
      setScale(w <= PHONE_MAX ? w / DESIGN_W : 1);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return scale;
}
const zoomStyle = (scale: number): CSSProperties | undefined => (scale === 1 ? undefined : { zoom: scale });

function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin: string, threshold: number): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin, threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold]);
  return inView;
}

function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked: still show the confirmation so the code can be read out */
    }
    setCopied(text);
    window.setTimeout(() => setCopied((c) => (c === text ? "" : c)), 1800);
  }, []);
  return { copied, copy };
}

/** Logo image that falls back to a text wordmark instead of a broken-image icon. */
function BrandImage({ src, alt, width, height, className, fallbackClassName, priority = false }: { src: string; alt: string; width: number; height: number; className: string; fallbackClassName: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={fallbackClassName}>{alt}</span>;
  return (
    <Image
      ref={(img: HTMLImageElement | null) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/** Label ...... value, like a printed receipt line. */
function Leader({ label, value, strong = false, className = "" }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <dt className="flex min-w-0 flex-1 items-baseline gap-2 after:mb-[3px] after:h-0 after:min-w-3 after:flex-1 after:border-b after:border-dotted after:border-current after:opacity-40 after:content-['']">{label}</dt>
      <dd className={`shrink-0 text-right tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}

/** Height-animated disclosure body (respects reduced motion). */
function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div id={id} aria-hidden={!open} className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/* ------------------------------ brand pieces ------------------------------------- */
const WAVE_PATH = "M0 18Q50 0 100 18T200 18T300 18T400 18T500 18T600 18T700 18T800 18V40H0Z";

/** Drifting wave strip. */
function WaveBand({ fill, className = "", height = 34 }: { fill: string; className?: string; height?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 800 40" preserveAspectRatio="none" fill={fill} className={`absolute left-0 w-[200%] ${className}`} style={{ height }}>
      <path d={WAVE_PATH} />
    </svg>
  );
}

/** Wave-edged paper (white crest). */
function PaperEdge({ down = false, fill = "#fff" }: { down?: boolean; fill?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden="true" className="block h-3 w-full">
      <defs>
        <pattern id={id} width="40" height="12" patternUnits="userSpaceOnUse">
          <path d={down ? "M0 0V6Q10 12 20 6T40 6V0Z" : "M0 12V6Q10 0 20 6T40 6V12Z"} fill={fill} />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#${id})`} />
    </svg>
  );
}

/** Navy greeting with a compass watermark, a wave edge and a white summary card riding over it. */
function Hero({ data, logoSrc, chip, total, earned, feedback }: { data: Receipt; logoSrc: string; chip: ReactNode; total: number; earned: number; feedback?: ReactNode }) {
  const first = data.customer.name.split(" ")[0];
  const size = Math.min(64, Math.max(30, Math.floor(330 / (0.58 * first.length + 0.6))));
  return (
    <header className="relative">
      <div className="relative overflow-hidden px-5 pb-24 pt-6 text-white" style={{ background: "linear-gradient(180deg,#071B31 0%,#0B2A4A 45%,#13406F 100%)" }}>
        <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="1" className="pointer-events-none absolute -right-20 top-8 h-80 w-80 opacity-[0.11]">
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="70" />
          <circle cx="100" cy="100" r="46" />
          <path d="M100 4v192M4 100h192M32 32l136 136M168 32 32 168" />
          <path d="m100 20 10 70 70 10-70 10-10 70-10-70-70-10 70-10z" />
        </svg>
        <div className="relative flex items-center justify-between gap-3 border-b border-dashed border-white/25 pb-4">
          <BrandImage src={logoSrc} alt="NAUTICA" width={320} height={80} priority className="h-6 w-auto max-w-[46%] object-contain object-left brightness-0 invert" fallbackClassName="nt-bold text-[22px] uppercase tracking-[0.3em]" />
          {chip}
        </div>
        <p className="relative mt-8 text-[13px] uppercase tracking-[0.32em] text-white/70">Hello,</p>
        <h1 className="nt-display relative mt-1 italic leading-[0.95] [overflow-wrap:anywhere]" style={{ fontSize: size }}>
          {first}
        </h1>
        <div className="relative mt-6 text-[var(--b-ink)]">{feedback}</div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[44px] overflow-hidden">
          <WaveBand fill="rgba(255,255,255,0.22)" className="nt-wave-b bottom-0" height={42} />
          <WaveBand fill="#F4F0E8" className="nt-wave-a bottom-0" height={32} />
        </div>
      </div>
      <div className="relative z-[1] mx-5 -mt-[76px] rounded-[26px] bg-white p-4 shadow-[0_26px_40px_-22px_rgba(7,27,49,0.85)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--b-gray)]">Total paid</p>
            <p className="nt-display mt-1 text-[34px] leading-none tabular-nums tracking-[-0.02em]">₹{inr(total)}</p>
          </div>
          <span className="nt-bold shrink-0 rounded-full bg-[var(--b-acc2)] px-3.5 py-2 text-[13px] text-[var(--b-soft)]">+{inr0(earned)} points</span>
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-3 border-t-2 border-dashed border-[var(--b-line)] pt-3 text-[12px] text-[var(--b-gray)]">
          <span className="truncate">{data.store.name}</span>
          <span className="shrink-0 tabular-nums">{data.date.split(" ")[0]}</span>
        </div>
      </div>
    </header>
  );
}

type TabItem = { id: TabId; label: string; icon: IconName; badge?: number };
/** Three rounded cards; the active one is navy with a small pointer. */
function TabBar({ tabs, tab, onChange }: { tabs: TabItem[]; tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <div role="tablist" aria-label={PROGRAM} className="grid auto-cols-fr grid-flow-col gap-2">
      {tabs.map((t) => {
        const on = tab === t.id;
        return (
          <button key={t.id} role="tab" type="button" id={`tab-${t.id}`} aria-selected={on} aria-controls={`panel-${t.id}`} onClick={() => onChange(t.id)} className={`nt-bold relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-[12px] uppercase tracking-[0.1em] ${FOCUS} ${on ? "bg-[var(--b-acc)] text-white" : "border border-[var(--b-line)] bg-white text-[var(--b-acc)]"}`}>
            <Icon name={t.icon} className="h-5 w-5" />
            {t.label}
            {t.badge ? <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--b-soft)] px-1 text-[11px] text-[var(--b-ink)]">{t.badge}</span> : null}
            {on && <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[var(--b-acc)]" />}
          </button>
        );
      })}
    </div>
  );
}

function Tog({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--b-acc)] text-[var(--b-acc)]">
      <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div>
      <h2 className="nt-display text-[28px] leading-none">{children}</h2>
      <svg aria-hidden="true" viewBox="0 0 60 8" className="mt-2 h-2 w-16 text-[var(--b-acc)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M2 4Q9 0 16 4T30 4T44 4T58 4" />
      </svg>
    </div>
  );
}

/** Navy store ticket with a compass watermark. */
function StoreShell({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Store" className="relative overflow-hidden rounded-[26px] border border-[var(--b-line)] bg-white p-5 text-[var(--b-ink)] shadow-[0_16px_34px_-24px_rgba(7,27,49,0.55)]">
      <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="#13406F" strokeWidth="1" className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 opacity-[0.12]">
        <circle cx="100" cy="100" r="92" />
        <circle cx="100" cy="100" r="62" />
        <path d="M100 4v192M4 100h192M32 32l136 136M168 32 32 168" />
      </svg>
      <div className="relative">{children}</div>
    </section>
  );
}

/** White stub under a navy wave line. */
function StubShell({ children }: { children: ReactNode }) {
  return (
    <footer className="relative mt-10" style={{ filter: "drop-shadow(0 -6px 10px rgba(7,27,49,0.12))" }}>
      <svg aria-hidden="true" viewBox="0 0 800 40" preserveAspectRatio="none" fill="#fff" className="absolute -top-[21px] left-0 h-[22px] w-full">
        <path d={WAVE_PATH} />
      </svg>
      <div className="bg-white px-5 pb-10 pt-4 text-[var(--b-ink)]">{children}</div>
    </footer>
  );
}

/** Tier chip (metallic foil). */
function TierChip({ tier }: { tier: TierName }) {
  const t = TIERS.find((x) => x.name === tier) ?? TIERS[0];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-[#1A1A1A]" style={{ background: t.foil }}>
      <Icon name="star" className="h-3.5 w-3.5" />
      {tier}
    </span>
  );
}

/* ------------------------------ popups -------------------------------------------- */
function Modal({ title, onClose, scale, children }: { title: string; onClose: () => void; scale: number; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      (previous as HTMLElement | null)?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`${ROOT_CLASS} max-h-[88vh] w-full overflow-y-auto outline-none sm:w-[400px]`} style={theme}>
        <div className="w-full sm:w-[400px]" style={zoomStyle(scale)}>
          <PaperEdge />
          <div className={MODAL_BODY}>
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className={`${DISPLAY} text-[26px] leading-none`}>{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className={CLOSE_BTN}>
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ video / banner carousel -------------------------- */
interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number; // 1 = playing
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
interface YtPlayerEvent {
  target: YtPlayer;
  data: number;
}
interface YtNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: YtPlayerEvent) => void; onStateChange?: (e: YtPlayerEvent) => void };
    },
  ) => YtPlayer;
}
declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YtNamespace> | null = null;

/** Loads https://www.youtube.com/iframe_api once and resolves with the YT namespace. */
function loadYouTubeApi(): Promise<YtNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise<YtNamespace>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        ytApiPromise = null;
        reject(new Error("YouTube API failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

/** Video + banners. The video autoplays (muted) while on screen and pauses when it leaves; once it has
 *  played, the carousel stops auto-advancing until someone swipes or taps a dot. The top of the video is
 *  covered by a transparent tap zone so swipes work over the iframe; the bottom strip stays free for
 *  YouTube's own controls. */
function MarketingCarousel() {
  const slides = useMemo(() => ["video", ...MARKETING_BANNERS] as string[], []);
  const count = slides.length;
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);

  const near = useInView(sectionRef, "300px 0px", 0);
  const visible = useInView(sectionRef, "0px", 0.5);
  const onVideo = slides[index] === "video";

  useEffect(() => {
    if (near) setArmed(true);
  }, [near]);

  useEffect(() => {
    const host = hostRef.current;
    if (!armed || !host) return;
    let cancelled = false;
    let player: YtPlayer | null = null;
    const mount = document.createElement("div");
    host.appendChild(mount);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(mount, {
          videoId: MARKETING_VIDEO_ID,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 0, mute: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              playerRef.current = e.target;
              setReady(true);
            },
            onStateChange: (e) => {
              if (e.data === 1) setAutoAdvance(false);
            },
          },
        });
      })
      .catch(() => {
        /* API blocked or offline: the thumbnail stays */
      });
    return () => {
      cancelled = true;
      playerRef.current = null;
      setReady(false);
      try {
        player?.destroy();
      } catch {
        /* already gone */
      }
      mount.remove();
    };
  }, [armed]);

  useEffect(() => {
    const p = playerRef.current;
    if (!ready || !p) return;
    p.getIframe().tabIndex = onVideo ? 0 : -1;
    if (onVideo && visible) p.playVideo();
    else p.pauseVideo();
  }, [ready, onVideo, visible]);

  useEffect(() => {
    if (count < 2 || !autoAdvance || !visible || onVideo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), MARKETING_IMAGE_MS);
    return () => window.clearTimeout(t);
  }, [autoAdvance, visible, onVideo, index, count]);

  const goTo = useCallback(
    (i: number) => {
      setAutoAdvance(true);
      setIndex(((i % count) + count) % count);
    },
    [count],
  );

  const togglePlayback = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === 1) p.pauseVideo();
    else p.playVideo();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (count > 1 && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      goTo(index + (dx < 0 ? 1 : -1));
      return;
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && (e.target as HTMLElement).dataset.tapZone !== undefined) togglePlayback();
  };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") goTo(index - 1);
    else if (e.key === "ArrowRight") goTo(index + 1);
  };

  return (
    <section ref={sectionRef} aria-roledescription="carousel" aria-label={`${BRAND} highlights`} onKeyDown={onKeyDown}>
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startRef.current = null;
        }}
        className={`${MEDIA_FRAME} relative touch-pan-y select-none overflow-hidden bg-black`}
      >
        <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((kind, i) => (
            <div key={`${kind}-${i}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={i !== index} className="relative aspect-video w-full shrink-0">
              {kind !== "video" ? (
                <Image src={kind} alt={`${BRAND} banner`} width={1920} height={1080} sizes="(max-width: 520px) 100vw, 400px" draggable={false} className="pointer-events-none block h-full w-full select-none object-cover" />
              ) : (
                <div className="relative h-full w-full bg-[#111] bg-cover bg-center" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${MARKETING_VIDEO_ID}/hqdefault.jpg)` }}>
                  <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
                  <div data-tap-zone="" aria-hidden="true" className="absolute inset-x-0 bottom-[20%] top-0 cursor-pointer touch-pan-y" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1">
          {slides.map((kind, i) => (
            <button key={`${kind}-${i}`} type="button" aria-label={`Show slide ${i + 1} of ${count}`} aria-current={i === index ? "true" : undefined} onClick={() => goTo(i)} className={`grid h-6 w-8 place-items-center rounded-full ${FOCUS}`}>
              <span className={`${DOT} block transition-all motion-reduce:transition-none ${i === index ? DOT_ON : DOT_OFF}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------ loyalty tabs ------------------------------------- */
function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--b-wash)] text-[var(--b-acc)]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <dd className={`${DISPLAY_NUM} text-[28px] leading-none tabular-nums`}>{value}</dd>
        <dt className="mt-1 text-[13px] text-[var(--b-gray)]">{label}</dt>
      </div>
    </div>
  );
}

function PointsPanel({ club, mobile, earned }: { club: NonNullable<Receipt["club"]>; mobile: string; earned: number }) {
  const idx = Math.max(0, TIERS.findIndex((t) => t.name === club.tier));
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  const toNext = club.pointsToNext ?? null;
  const total = toNext != null ? club.points + toNext : club.points;
  const pct = !next || toNext == null || total <= 0 ? 100 : Math.min(100, Math.round((club.points / total) * 100));
  return (
    <div role="tabpanel" id="panel-points" aria-labelledby="tab-points" className="space-y-3">
      <div className={`nt-sheen ${TIER_CARD}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] uppercase tracking-[0.16em] text-white/65">
            {PROGRAM} <span className="tracking-[0.12em]">· •••• {mobile.slice(-4)}</span>
          </p>
          <span className={`${DISPLAY_NUM} text-[22px] uppercase leading-none`} style={foilText(tier.foil)}>{tier.name}</span>
        </div>
        <p className="mt-5 text-[13px] text-white/65">Available points</p>
        <p className={`${DISPLAY_NUM} mt-1 text-[64px] leading-[0.95] tabular-nums`}>{inr0(club.points)}</p>
        <div className="mt-5">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to next tier" className="h-1.5 w-full overflow-hidden bg-white/20" style={{ borderRadius: 99 }}>
            <div className="h-full" style={{ width: `${pct}%`, background: tier.foil, borderRadius: 99 }} />
          </div>
          <p className="mt-2.5 text-[13px] text-white/75">
            {next && toNext != null ? (
              <>
                <span className="font-bold text-white">{inr0(toNext)}</span> more points to {next.name}
              </>
            ) : (
              "You are at the top tier."
            )}
          </p>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <dl className="grid grid-cols-2 gap-4">
          <Stat icon="trend" value={inr0(earned)} label="Earned today" />
          <Stat icon="gift" value={inr0(club.pointsRedeemed ?? 0)} label="Redeemed" />
        </dl>
      </div>

      {club.expiring && (
        <div className={`${ALERT_CARD} flex items-center gap-4 p-5`}>
          <Icon name="alert" className="h-9 w-9 shrink-0" />
          <p className="text-[15px]">
            <span className={`${DISPLAY_NUM} block text-[26px] leading-none tabular-nums`}>{inr0(club.expiring.points)} points</span>
            <span className="mt-1.5 block">
              Expiring on <span className="font-bold">{club.expiring.on}</span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

const GENDERS = ["Male", "Female", "Other"];

function ProfilePanel({ data, onSave }: { data: Receipt; onSave?: (v: ProfileValues) => void }) {
  const [form, setForm] = useState<ProfileValues>({ name: data.customer.name, email: data.customer.email, gender: "", birthday: "", anniversary: "", offers: false });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const upd = <K extends keyof ProfileValues>(k: K, v: ProfileValues[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const text = (k: "name" | "email" | "birthday" | "anniversary") => (e: ChangeEvent<HTMLInputElement>) => upd(k, e.target.value);

  return (
    <form
      role="tabpanel"
      id="panel-profile"
      aria-labelledby="tab-profile"
      noValidate
      className={`${CARD} space-y-5 p-5`}
      onSubmit={(e) => {
        e.preventDefault();
        if (form.email && !emailOk(form.email)) {
          setErr("Enter a valid email, like name@example.com.");
          return;
        }
        setErr("");
        onSave?.(form);
        setSaved(true);
      }}
    >
      <p className="text-[17px] font-semibold leading-snug">Complete your profile for personalised updates and loyalty benefits.</p>
      <div>
        <span className={FLABEL}>Mobile</span>
        <p className="text-base font-semibold tabular-nums">{data.customer.mobile}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <label className="col-span-2 block">
          <span className={FLABEL}>Full name</span>
          <input className={FIELD} value={form.name} onChange={text("name")} autoComplete="name" />
        </label>
        <label className="col-span-2 block">
          <span className={FLABEL}>Email</span>
          <input type="email" className={FIELD} value={form.email} onChange={(e) => { setErr(""); text("email")(e); }} autoComplete="email" aria-invalid={!!err} />
          {err && <span role="alert" className="mt-1.5 block text-[13px] font-semibold text-[var(--b-acc)]">{err}</span>}
        </label>
        <label className="block min-w-0">
          <span className={FLABEL}>Birthday</span>
          <input type="date" className={FIELD} value={form.birthday} onChange={text("birthday")} autoComplete="bday" />
        </label>
        <label className="block min-w-0">
          <span className={FLABEL}>Anniversary</span>
          <input type="date" className={FIELD} value={form.anniversary} onChange={text("anniversary")} />
        </label>
        <label className="col-span-2 block">
          <span className={FLABEL}>Gender</span>
          <select className={FIELD} value={form.gender} onChange={(e) => upd("gender", e.target.value)}>
            <option value="">Select</option>
            {GENDERS.map((g) => (<option key={g}>{g}</option>))}
          </select>
        </label>
      </div>
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-[15px] font-semibold">New arrivals and offers</span>
          <span className="block text-[13px] text-[var(--b-gray)]">Collections and member offers</span>
        </span>
        <input type="checkbox" checked={form.offers} onChange={(e) => upd("offers", e.target.checked)} className="h-6 w-6 shrink-0 accent-[var(--b-acc)]" />
      </label>
      <button type="submit" className={BTN}>Update</button>
      <p aria-live="polite" className="min-h-5 text-center text-sm font-semibold">{saved ? "Profile updated." : ""}</p>
    </form>
  );
}

function CouponsPanel({ coupons }: { coupons: NauticaCoupon[] }) {
  const { copied, copy } = useCopy();
  if (!coupons.length) {
    return (
      <div role="tabpanel" id="panel-coupons" aria-labelledby="tab-coupons" className="flex flex-col items-center border-2 border-dashed border-black/25 bg-white px-6 py-12 text-center" style={{ borderRadius: "var(--b-r)" }}>
        <Icon name="ticket" className="h-10 w-10 text-[var(--b-acc)]" />
        <p className={`${DISPLAY} mt-3 text-[22px] leading-none`}>No coupons available.</p>
        <p className="mt-2 text-[15px] text-[var(--b-gray)]">Please check this section later.</p>
      </div>
    );
  }
  return (
    <ul role="tabpanel" id="panel-coupons" aria-labelledby="tab-coupons" className="space-y-3">
      {coupons.map((c) => (
        <li key={c.code} className={`${CARD} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`${DISPLAY_NUM} text-[34px] leading-none`}>{c.value}</p>
              <p className="mt-2 text-[15px] font-semibold leading-snug">{c.title}</p>
              <p className="mt-0.5 text-[14px] leading-snug text-[var(--b-gray)]">{c.description}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-black/30 pt-3">
            <div className="min-w-0">
              <p className="text-[12px] text-[var(--b-gray)]">Valid till {c.validTill}</p>
              <p className={`${MONO} text-[15px] font-bold tracking-[0.08em]`}>{c.code}</p>
            </div>
            <button type="button" onClick={() => copy(c.code)} aria-label={`Copy code ${c.code}`} className={CHIP_BTN}>
              <Icon name={copied === c.code ? "check" : "copy"} className="h-4 w-4" />
              {copied === c.code ? "Copied" : "Copy"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LoyaltyTabs({ data, earned, onSaveProfile }: { data: Receipt; earned: number; onSaveProfile?: (v: ProfileValues) => void }) {
  const { club } = data;
  const tabs = useMemo(
    () =>
      [
        ...(club ? [{ id: "points" as TabId, label: "Points", icon: "coins" as IconName }] : []),
        { id: "profile" as TabId, label: "Profile", icon: "user" as IconName },
        ...(club ? [{ id: "coupons" as TabId, label: "Coupons", icon: "ticket" as IconName, badge: club.coupons.length }] : []),
      ] as { id: TabId; label: string; icon: IconName; badge?: number }[],
    [club],
  );
  const [tab, setTab] = useState<TabId>(tabs[0].id);
  return (
    <section aria-label={PROGRAM}>
      <TabBar tabs={tabs} tab={tab} onChange={setTab} />
      <div className="mt-5">
        {tab === "points" && club && <PointsPanel club={club} mobile={data.customer.mobile} earned={earned} />}
        {tab === "profile" && <ProfilePanel data={data} onSave={onSaveProfile} />}
        {tab === "coupons" && club && <CouponsPanel coupons={club.coupons} />}
      </div>
    </section>
  );
}

/* ------------------------------ receipt item row --------------------------------- */
function PaperItem({ item, open, onToggle }: { item: NauticaItem; open: boolean; onToggle: () => void }) {
  const panelId = useId();
  const gross = item.mrp * item.qty;
  const pct = gross > 0 ? (item.discount / gross) * 100 : 0;
  return (
    <li className="border-b border-dashed border-black/25 py-4 last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 text-left ${FOCUS}`}>
        <span aria-label={`Size ${item.size}`} className={`${SIZE_BADGE} grid h-11 w-11 place-items-center text-[15px] font-bold`}>{item.size}</span>
        <span className="min-w-0">
          <span className={`${MONO} block text-[13px] font-semibold uppercase leading-snug`}>{item.name}</span>
          <span className={`${MONO} mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--b-gray)]`}>
            <span>Qty {item.qty}</span>
            {pct > 0 && <span className={`${DISC_PILL} px-2 py-0.5 font-bold`}>{trim(pct)}% off</span>}
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold">
            Details <Tog open={open} />
          </span>
        </span>
        <span className="text-right">
          <span className={`${MONO} block text-[15px] font-bold leading-snug tabular-nums`}>{inr(netOf(item))}</span>
          {item.discount > 0 && <s className={`${MONO} mt-0.5 block text-xs tabular-nums text-[var(--b-gray)]`}>{inr(gross)}</s>}
        </span>
      </button>
      <Collapse open={open} id={panelId}>
        <dl className={`${MONO} mt-3 grid grid-cols-3 gap-2 text-xs`}>
          {([
            ["SKU", item.sku],
            ["HSN", item.hsn],
            ["UoM", "Pcs"],
            ["MRP", inr(item.mrp)],
            ["Discount", `${trim(pct)}%`],
            ["Saved", inr(item.discount)],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className={`${TILE} min-w-0 px-2.5 py-2`}>
              <dt className="text-[var(--b-gray)]">{k}</dt>
              <dd className="mt-0.5 break-words text-[12px] font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Collapse>
    </li>
  );
}

/* ------------------------------ rate your visit ---------------------------------- */
const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
const FEEDBACK_ROWS = [
  { key: "service", label: "Service" },
  { key: "product", label: "Product" },
  { key: "sizes", label: "Sizes" },
  { key: "value", label: "Value" },
] as const;

function Stars({ value, onChange, size = "h-9 w-9", label, spread = false }: { value: number; onChange: (n: number) => void; size?: string; label: string; spread?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={spread ? "flex justify-between px-1" : "flex gap-1.5"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className={`text-[var(--b-acc)] ${FOCUS}`}>
          <svg viewBox="0 0 24 24" strokeWidth="1.6" strokeLinejoin="round" style={{ animationDelay: `${n * 0.2}s` }} className={`${size} stroke-current ${value === 0 ? "nt-star" : n <= value ? "fill-current" : "fill-transparent"}`}>
            {PATHS.star}
          </svg>
        </button>
      ))}
    </div>
  );
}

function FeedbackBox({ data, onSubmit }: { data: Receipt; onSubmit?: (v: FeedbackValues) => void }) {
  const [overall, setOverall] = useState(0);
  const [cats, setCats] = useState({ service: 0, product: 0, sizes: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className={`${CARD} px-5 py-4`} aria-live="polite">
        <span className={`${DISPLAY} block text-[26px] leading-none`}>Thank you</span>
        <p className="mt-2 text-[15px] text-[var(--b-gray)]">Your feedback has been shared with the {data.store.name} team.</p>
      </div>
    );
  }
  return (
    <div className={`${CARD} px-5 pb-4 pt-4`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`${DISPLAY} block text-[22px] leading-none`}>Rate your visit</span>
        <span className="text-[13px] text-[var(--b-gray)]" aria-live="polite">{overall ? RATING_WORDS[overall - 1] : "Tap a star"}</span>
      </div>
      <div className="mt-3.5">
        <Stars value={overall} onChange={setOverall} label="Overall rating" size="h-10 w-10" spread />
      </div>
      <Collapse open={overall > 0} id="feedback-more">
        <form
          className="space-y-4 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.({ invoiceNo: data.invoiceNo, overall, categories: cats, comment });
            setDone(true);
          }}
        >
          <div className="space-y-3">
            {FEEDBACK_ROWS.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3">
                <span className="text-[15px] font-semibold">{r.label}</span>
                <Stars size="h-7 w-7" label={`${r.label} rating`} value={cats[r.key]} onChange={(n) => setCats((c) => ({ ...c, [r.key]: n }))} />
              </div>
            ))}
          </div>
          <label className="block">
            <span className={FLABEL}>Anything else? (optional)</span>
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className={`${FIELD} resize-none`} />
          </label>
          <button type="submit" className={BTN}>Submit feedback</button>
        </form>
      </Collapse>
    </div>
  );
}

/* ------------------------------ receipt view ------------------------------------- */
interface ReceiptViewProps extends Omit<NauticaReceiptProps, "data" | "receipts" | "onSelectReceipt"> {
  data: Receipt;
  history: { invoiceNo: string; date: string; store: string; amount: number; current: boolean }[];
  onSelect: (invoiceNo: string) => void;
}

function ReceiptView({ data, history, onSelect, qrSrc, barcodeSrc, logoSrc = DEFAULT_LOGO, rdepLogoSrc = DEFAULT_RDEP_LOGO, onDownload, onSendEmail, onSaveProfile, onSubmitFeedback, onRefer }: ReceiptViewProps) {
  const [openItem, setOpenItem] = useState(-1);
  const [modal, setModal] = useState<ModalId>(null);
  const [termsOpen, setTermsOpen] = useState(true);
  const [storeOpen, setStoreOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const closeModal = useCallback(() => setModal(null), []);
  const termsId = useId();
  const storeId = useId();
  const scale = useFitScale();

  const { store, club, exchange } = data;
  const t = useMemo(() => totalsOf(data), [data]);
  const earned = club?.pointsEarned ?? Math.floor(t.total / 10);
  const referral = data.referral;
  const shareText = referral
    ? `Hey! Use my referral code ${referral.code} at ${BRAND}${referral.link ? ` (${referral.link})` : ""}. We both earn ${inr0(referral.rewardPoints)} reward points once you register. T&C apply.`
    : "";
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name}, ${store.address}`)}`;
  const handleDownload = () => (onDownload ? onDownload(data) : downloadReceipt(data, logoSrc, rdepLogoSrc));

  return (
    <div style={theme} onTouchStart={() => {}} className={`${ROOT_CLASS} min-h-screen overflow-x-hidden bg-[var(--b-page)] text-[var(--b-ink)] antialiased [-webkit-text-size-adjust:100%] sm:py-8`}>
      <style>{FONT_FACES}</style>

      <main style={zoomStyle(scale)} className={MAIN_CLASS}>
        {/* 1. Greeting */}
        <Hero data={data} logoSrc={logoSrc} chip={club ? <TierChip tier={club.tier} /> : null} total={t.total} earned={earned} feedback={<FeedbackBox data={data} onSubmit={onSubmitFeedback} />} />

        <div className="space-y-4 px-4 pt-4">
          {/* 3. Video / banners */}
          <MarketingCarousel />
          {/* 4. Points | Profile | Coupons */}
          <LoyaltyTabs data={data} earned={earned} onSaveProfile={onSaveProfile} />
        </div>

        {/* 4. The receipt */}
        <section aria-label="Receipt" className={PAPER_WRAP} style={{ filter: PAPER_SHADOW }}>
          <PaperEdge fill={PAPER_TOP_FILL} />
          <div className={PAPER_BODY}>
            {/* header band: what this is, where and when, plus the QR */}
            <div className={PAPER_HEAD}>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] opacity-80">Tax invoice</p>
                <h2 className={`${DISPLAY} mt-1.5 text-[24px] leading-[1.1]`}>{store.name}</h2>
                <p className={`${MONO} mt-2 text-xs opacity-85`}>{data.date}</p>
              </div>
              <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-white p-1">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
                ) : (
                  <PlaceholderQR seed={data.invoiceNo} />
                )}
              </div>
            </div>

            <div className="px-5 pb-6 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`${DISPLAY} text-[18px] leading-none`}>Your items</h3>
                <span className={`${DISC_PILL} px-3 py-1 text-xs font-bold`}>{t.pieces} {t.pieces === 1 ? "piece" : "pieces"}</span>
              </div>
              <ul aria-label="Items purchased" className="mt-1">
                {data.items.map((item, i) => (
                  <PaperItem key={`${item.sku}-${i}`} item={item} open={openItem === i} onToggle={() => setOpenItem(openItem === i ? -1 : i)} />
                ))}
              </ul>

              <dl className={`${MONO} ${SUM_BOX} mt-3 space-y-2.5 text-sm`}>
                <Leader label="Subtotal (MRP)" value={inr(t.subtotal)} strong />
                {t.discount > 0 && <Leader label="You saved" value={`− ${inr(t.discount)}`} strong />}
                <Leader label="SGST" value={`+ ${inr(data.sgst)}`} strong />
                <Leader label="CGST" value={`+ ${inr(data.cgst)}`} strong />
              </dl>

              <div className={NET_WRAP}>
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                  <span className={`${DISPLAY} text-lg leading-none`}>Net total</span>
                  <span className={`${DISPLAY_NUM} ${NET_AMT} leading-none tabular-nums`}>₹{inr(t.total)}</span>
                </div>
                <div className={`${MONO} mt-3.5 flex items-center justify-between gap-3 border-t border-dashed ${NET_LINE} pt-3 text-xs`}>
                  <span className="opacity-75">Paid by</span>
                  <span className="font-bold">{data.payment.mode} · {data.payment.ref}</span>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2">
                {([
                  ["Invoice no", data.invoiceNo],
                  ["Date", data.date.split(" ")[0]],
                  ["Associate", store.associate],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className={`${TILE} min-w-0 p-3 ${k === "Invoice no" ? "col-span-2" : ""}`}>
                    <dt className="text-[11px] uppercase tracking-[0.08em] text-[var(--b-gray)]">{k}</dt>
                    <dd className={`${MONO} mt-1 break-all text-[12px] font-bold leading-snug`}>{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {([
                  { icon: "history", label: "History", onClick: () => setModal("history") },
                  { icon: "mail", label: "Email", onClick: () => setModal("email") },
                  { icon: "download", label: "Download", onClick: handleDownload },
                ] as { icon: IconName; label: string; onClick: () => void }[]).map((a) => (
                  <button key={a.label} type="button" onClick={a.onClick} className={ACTION_BTN}>
                    <Icon name={a.icon} className="h-5 w-5 shrink-0" />
                    <span className="max-w-full truncate">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <PaperEdge down />
        </section>

        <div className="space-y-4 px-4 pt-5">
          {/* 6. Refer a friend */}
          {referral && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => onRefer?.(referral.code)} className={`${REFER_CARD} group flex items-center justify-between gap-4 p-5`}>
              <span>
                <span className={`${DISPLAY} block text-[28px] leading-none`}>Refer a friend</span>
                <span className="mt-2.5 block text-[15px] leading-snug">Refer a friend and both of you earn {inr0(referral.rewardPoints)} points</span>
                <span className={`${MONO} mt-3 inline-block px-2.5 py-1 text-xs font-bold tracking-[0.1em] ${REFER_CODE}`}>{referral.code}</span>
              </span>
              <span className={`${REFER_ARROW} grid h-12 w-12 shrink-0 place-items-center rounded-full`}>
                <Icon name="arrow" className="h-6 w-6" />
              </span>
            </a>
          )}

          {/* 7. Reach out to us */}
          <section aria-label="Reach out to us">
            <SectionTitle>Reach out to us</SectionTitle>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <a href={`tel:${data.callTo}`} className={BTN_OUT}>
                <Icon name="phone" className="h-[18px] w-[18px]" />
                Talk to us
              </a>
              <a href={`mailto:${data.emailTo}`} className={BTN_OUT}>
                <Icon name="mail" className="h-[18px] w-[18px]" />
                Write to us
              </a>
            </div>
          </section>

          {/* 8. Store */}
          <StoreShell>
            <h2 className={`${DISPLAY} text-[24px] leading-none`}>{store.name}</h2>
            <p className="mt-4 flex items-start gap-2.5 text-base font-semibold leading-snug">
              <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0" />
              {store.address}
            </p>
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={`mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.1em] underline underline-offset-4 ${FOCUS}`}>
              Directions <Icon name="arrow" className="h-3.5 w-3.5" />
            </a>
            <button type="button" onClick={() => setStoreOpen((o) => !o)} aria-expanded={storeOpen} aria-controls={storeId} className={`${MONO} mt-4 flex w-full items-center justify-between border-t-2 border-current pt-3 text-left text-sm font-semibold uppercase tracking-wide ${FOCUS}`}>
              <span>Store details</span>
              <span aria-hidden="true" className="font-bold">[{storeOpen ? "−" : "+"}]</span>
            </button>
            <Collapse open={storeOpen} id={storeId}>
              <dl className={`${MONO} space-y-2 pb-1 pt-3 text-sm`}>
                <Leader label="Phone" value={<a href={`tel:${store.phone}`} className="underline underline-offset-4">{store.phone}</a>} strong />
                <Leader label="Email" value={<a href={`mailto:${store.email}`} className="break-all underline underline-offset-4">{store.email}</a>} strong />
                {store.gstin && <Leader label="GSTIN" value={store.gstin} strong />}
                <Leader label="Associate" value={store.associate} strong />
              </dl>
            </Collapse>
            <p className={`mt-3 border-t border-dashed ${STORE_LINE} pt-3 text-xs leading-relaxed opacity-80`}>
              <span className="font-bold">Registered office: </span>
              {data.registeredOffice}
            </p>
          </StoreShell>
        </div>

        {/* 9. Terms, barcode, powered by */}
        <StubShell>
          <h2>
            <button type="button" aria-expanded={termsOpen} aria-controls={termsId} onClick={() => setTermsOpen((o) => !o)} className={`flex w-full items-center justify-between py-2 text-left ${FOCUS}`}>
              <span className={`${DISPLAY} text-[22px] leading-none`}>Terms and conditions</span>
              <span aria-hidden="true" className={`${MONO} text-sm font-bold`}>[{termsOpen ? "−" : "+"}]</span>
            </button>
          </h2>
          <Collapse open={termsOpen} id={termsId}>
            <div className={`${MONO} space-y-3 pb-4 pt-3 text-xs leading-relaxed opacity-80`}>
              <ol className="list-decimal space-y-2.5 pl-5">
                {exchange.points.map((p) => (<li key={p}>{p}</li>))}
              </ol>
              <p>Customer care: {data.callTo} · {data.emailTo}</p>
            </div>
          </Collapse>

          <div className={`mt-5 flex flex-col items-center gap-4 border-t border-dashed ${STUB_LINE} pt-6`}>
            <div className="flex w-full justify-center bg-white px-4 py-3" style={{ borderRadius: "var(--b-r-s)" }}>
              {barcodeSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={barcodeSrc} alt="Receipt barcode" className="h-14 w-full max-w-xs object-contain" />
              ) : (
                <PlaceholderBarcode seed={data.invoiceNo} />
              )}
            </div>
            <p className="text-[13px] opacity-80">Thank you for shopping at {BRAND}.</p>
            <div className="flex items-center gap-3 text-[13px] opacity-80">
              <span>Powered by</span>
              <BrandImage src={rdepLogoSrc} alt="rdep" width={240} height={80} className="h-8 w-auto" fallbackClassName="text-xl font-extrabold tracking-tight" />
            </div>
          </div>
        </StubShell>
      </main>

      {/* Popups */}
      {modal === "history" && (
        <Modal title="Transaction history" onClose={closeModal} scale={scale}>
          <ul className="divide-y divide-black/15">
            {history.map((h) => (
              <li key={h.invoiceNo}>
                <button
                  type="button"
                  disabled={h.current}
                  onClick={() => {
                    closeModal();
                    onSelect(h.invoiceNo);
                  }}
                  className={`flex w-full items-center justify-between gap-3 py-3.5 text-left ${FOCUS} ${h.current ? "cursor-default" : "active:bg-[var(--b-wash)] [@media(hover:hover)]:hover:bg-[var(--b-wash)]"}`}
                >
                  <span className="min-w-0">
                    <span className="block text-base font-semibold">
                      Invoice no: <span className={`${MONO} font-bold`}>{h.invoiceNo}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--b-gray)]">{h.date}, {h.store}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-right">
                      <span className={`${MONO} block text-base font-bold tabular-nums`}>₹{inr(h.amount)}</span>
                      {h.current && <span className={`${CHIP_ON} mt-1 inline-block px-2.5 py-0.5 text-xs font-bold`}>This receipt</span>}
                    </span>
                    {!h.current && <Icon name="arrow" className="h-4 w-4 text-[var(--b-acc)]" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {modal === "email" && (
        <Modal title="Email this receipt" onClose={closeModal} scale={scale}>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              onSendEmail?.(email, data);
              setSentTo(email);
            }}
          >
            <label className="block">
              <span className={FLABEL}>Email address</span>
              <input type="email" required value={email} onChange={(e) => { setSentTo(""); setEmail(e.target.value); }} className={FIELD} autoComplete="email" />
            </label>
            <button type="submit" className={BTN}>Send receipt</button>
            <p aria-live="polite" className="flex min-h-5 items-center justify-center gap-1.5 text-sm font-semibold">
              {sentTo && (<><Icon name="check" className="h-4 w-4 text-[var(--b-acc)]" /> Receipt sent to {sentTo}</>)}
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- main ------------------------------------------ */
/** Holds which receipt is open. Each receipt is a keyed ReceiptView, so switching resets the open item,
 *  popups, tabs and forms instead of carrying them over from the previous receipt. */
export default function NauticaReceipt({ data, receipts, onSelectReceipt, ...rest }: NauticaReceiptProps) {
  const list = useMemo(() => {
    const base = receipts ?? (data ? [data] : sampleNauticaReceipts);
    const merged = data && !base.some((r) => r.invoiceNo === data.invoiceNo) ? [data, ...base] : base;
    return [...merged].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [data, receipts]);

  const [currentId, setCurrentId] = useState(data?.invoiceNo ?? list[0].invoiceNo);
  const current = list.find((r) => r.invoiceNo === currentId) ?? list[0];

  const history = useMemo(
    () =>
      list.map((r) => ({
        invoiceNo: r.invoiceNo,
        date: r.date.split(" ")[0],
        store: r.store.name,
        amount: totalsOf(r).total,
        current: r.invoiceNo === current.invoiceNo,
      })),
    [list, current.invoiceNo],
  );

  const select = useCallback(
    (invoiceNo: string) => {
      setCurrentId(invoiceNo);
      onSelectReceipt?.(invoiceNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [onSelectReceipt],
  );

  return <ReceiptView key={current.invoiceNo} data={current} history={history} onSelect={select} {...rest} />;
}
