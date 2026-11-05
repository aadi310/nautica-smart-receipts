"use client";

/**
 * NAUTICA x RDEP: Smart receipt v3
 *
 * A different language from the Next receipt, same sections and the same Nautica information.
 * Navy and sail white with sand, sea-foam and one pinch of signal red. Serif headlines with an italic accent word,
 * wave edges between chapters, portholes for actions, a torn-edge receipt, signal-flag pennants for coupons and
 * a "route" running down the left edge with one waypoint per chapter.
 * Opened IN STORE right after billing, so nothing sends the shopper online.
 *
 * COPY: headings use plain words plus Nautica's own phrases ("reimagined nautical style", "where the city meets
 * the sea", "We are Nautica", "Nautica Rewards"). No invented ocean-themed labels. The nautical feel comes from the
 * visuals (waves, bunting, compass, portholes), not from the wording.
 *
 * FLOW
 *   Boarding pass  Welcome, total paid, QR plaque, invoice / date / payment, quick links
 *   Watch          Inside Nautica video (before the purchase details)
 *   Receipt        Your cargo: items, totals, payment, History / Email / Download
 *   Rate           How was your voyage
 *   Profile        Your logbook (collapsible, open by default)
 *   Points         Nautica Club card
 *   Coupons        Tabs: Expiring soon / All / Member perks / New. Pennant coupons, "Use in store" opens a barcode sheet
 *   Save more      Shop more, save more: tide gauge + slider
 *   Refer          One link: copy or share
 *   Gift card      Pick an amount, pay at the counter
 *   Store          Directions, exchange policy, contact, tax info
 *
 * NAVIGATION (one thumb)
 *   1. A compact "pager" pill floats at the bottom once you scroll past the hero: previous / next section
 *      arrows, with the current section and a progress ring in the middle.
 *   2. Tap the middle of the pager to open "Jump to": every section as a tile, grouped, current one highlighted.
 *   3. The route on the left shows where you are: the active waypoint lights up as you scroll.
 *   4. Hero quick links jump straight to Coupons / Save more / Refer / Gift.
 *
 * Phone first: designed at 400px wide. On phones (<= 520px) it is scaled with CSS `zoom`, on larger screens
 * it stays a centred 400px column. Chapter content fades up as it scrolls in (pure CSS, off for reduced motion).
 *
 * FONT: drop the Nautica font files into /public/fonts as "NauticaSans-Regular.ttf" (400) and "NauticaSans-Bold.ttf" (700).
 *       Until they exist the page falls back to Inter. Headlines use Fraunces (next/font/google); swap `displayFont`
 *       for the brand serif if there is one.
 * ASSETS: /images/design-mode/nautica-logo.png (dark logo on transparent, used inverted on navy),
 *         /images/design-mode/RDEP-logo.png. Both fall back to text if missing.
 *
 * Usage:  app/nautica-receipt/page.tsx
 *   import NauticaReceipt from "@/components/NauticaReceipt";
 *   export default function Page() { return <NauticaReceipt />; }
 *
 * With real data: <NauticaReceipt receipts={[...]} data={currentReceipt} />
 *   Optional on each receipt: `club` (tier, points, coupons), `referral` ({ code, link?, rewardPoints }), `ladder`.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import { Fraunces, Inter } from "next/font/google";

const fallbackFont = Inter({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--font-nt-fallback" });
const displayFont = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-nt-display" });
const BRAND_STACK = `"NauticaSans", var(--font-nt-fallback), Arial, "Helvetica Neue", Helvetica, sans-serif`;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const FONT_FACES = `
@font-face{font-family:"NauticaSans";font-weight:400;font-style:normal;font-display:swap;src:url("/fonts/NauticaSans-Regular.ttf") format("truetype")}
@font-face{font-family:"NauticaSans";font-weight:700;font-style:normal;font-display:swap;src:url("/fonts/NauticaSans-Bold.ttf") format("truetype")}
.nt-root{font-family:${BRAND_STACK}}
.nt-bold{font-family:${BRAND_STACK};font-weight:700}

/* Phone press feedback */
.nt-root a,.nt-root button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.nt-root a,.nt-root button:not(:disabled){transition:transform .14s ease,background-color .2s ease,color .2s ease,border-color .2s ease,opacity .2s ease}
.nt-root a:active,.nt-root button:not(:disabled):active{transform:scale(.96)}

.nt-grain{position:relative}
.nt-grain::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:${GRAIN};opacity:.1;mix-blend-mode:overlay;border-radius:inherit}

@keyframes nt-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.nt-rise{opacity:0;animation:nt-rise .7s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes nt-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-10px,14px) scale(1.06)}}
.nt-float{animation:nt-float 9s ease-in-out infinite}
@keyframes nt-spin{to{transform:rotate(360deg)}}
.nt-spin{animation:nt-spin 16s linear infinite}
@keyframes nt-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nt-marquee{animation:nt-marquee 26s linear infinite}
@keyframes nt-pulse{0%{box-shadow:0 0 0 0 rgba(200,16,46,.7)}100%{box-shadow:0 0 0 8px rgba(200,16,46,0)}}
.nt-pulse{animation:nt-pulse 1.4s ease-out infinite}
@keyframes nt-sheen{0%,55%{left:-60%}100%{left:130%}}
.nt-sheen{position:relative;overflow:hidden}
.nt-sheen::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-18deg);animation:nt-sheen 5s ease-in-out infinite}
@keyframes nt-star-flash{0%,100%{transform:scale(1)}45%{transform:scale(1.22)}}
.nt-star-flash{animation:nt-star-flash 1.6s ease-in-out infinite}
@keyframes nt-pop{from{opacity:0;transform:translateY(24px) scale(.9)}to{opacity:1;transform:none}}
.nt-pop{animation:nt-pop .38s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes nt-tab{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
.nt-tab{animation:nt-tab .35s cubic-bezier(.2,.7,.2,1) both}

.nt-range{-webkit-appearance:none;appearance:none;height:10px;border-radius:999px;outline:none;width:100%}
.nt-range::-webkit-slider-thumb{-webkit-appearance:none;width:32px;height:32px;border-radius:50%;background:#fff;border:7px solid var(--nt-sun);box-shadow:0 6px 16px rgba(0,0,0,.5);cursor:grab}
.nt-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:7px solid var(--nt-sun);box-shadow:0 6px 16px rgba(0,0,0,.5)}

@keyframes nt-reveal{from{opacity:0;transform:translateY(34px) scale(.97)}to{opacity:1;transform:none}}
@supports (animation-timeline:view()){.nt-reveal{animation:nt-reveal linear both;animation-timeline:view();animation-range:entry 0% entry 28%}}

.nt-display{font-family:var(--font-nt-display),"Playfair Display",Georgia,"Times New Roman",serif;font-weight:600;font-optical-sizing:auto;letter-spacing:-0.015em}
.nt-display em{font-weight:400}
@keyframes nt-drift{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nt-wave-a{animation:nt-drift 16s linear infinite}
.nt-wave-b{animation:nt-drift 26s linear infinite reverse}
@keyframes nt-node{0%{box-shadow:0 0 0 0 rgba(19,64,111,.45)}100%{box-shadow:0 0 0 9px rgba(19,64,111,0)}}
.nt-node-on{animation:nt-node 1.8s ease-out infinite}
.nt-compass{animation:nt-spin 90s linear infinite}
.nt-teeth{height:10px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Cpath d='M0 0h16L8 10z' fill='%23fff'/%3E%3C/svg%3E") repeat-x left top}
.nt-pennant{clip-path:polygon(0 0,100% 0,calc(100% - 26px) 50%,100% 100%,0 100%)}

@media (prefers-reduced-motion:reduce){
  .nt-wave-a,.nt-wave-b,.nt-node-on,.nt-compass{animation:none}
  .nt-reveal{animation:none!important}
  .nt-rise{opacity:1;animation:none}
  .nt-float,.nt-spin,.nt-marquee,.nt-pulse,.nt-star-flash,.nt-pop,.nt-tab{animation:none}
  .nt-sheen::after{animation:none;display:none}
  .nt-root a,.nt-root button:not(:disabled){transition:none}
  .nt-root a:active,.nt-root button:not(:disabled):active{transform:none}
}
`;

/* Navy and its shades, sail white, with sand / sea-foam accents. Signal red is for tiny moments only. */
const theme = {
  "--nt-navy": "#13406F",
  "--nt-deep": "#0B2A4A",
  "--nt-abyss": "#071B31",
  "--nt-ink": "#0E1B2A",
  "--nt-gray": "#4A5D72",
  "--nt-mid": "#7F90A3",
  "--nt-fog": "#B9C7D6",
  "--nt-mist": "#E6EDF5",
  "--nt-wash": "#F3F6FA",
  "--nt-line": "rgba(19,64,111,0.18)",
  "--nt-sun": "#F2D9A6",
  "--nt-sand-soft": "#F6EBD3",
  "--nt-foam": "#BFE6F2",
  "--nt-foam-soft": "#DDF0F6",
  "--nt-sea": "#CFEDE3",
  "--nt-signal": "#C8102E",
} as CSSProperties;

/* Type scale */
const CAPS = "text-[11px] uppercase tracking-[0.16em] leading-snug";
const BODY = "text-[14px] leading-snug";
const SMALL = "text-[12px] leading-snug";
const LABEL = "nt-bold text-[14px] leading-snug";
const AMOUNT = "nt-bold text-[16px] leading-snug tabular-nums";

/* Assets + links (override with props) */
const DEFAULT_NAUTICA_LOGO = "/images/design-mode/nautica-logo.png";
const DEFAULT_RDEP_LOGO = "/images/design-mode/RDEP-logo.png";
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/nautica.in/";
const DEFAULT_STORE_LOCATOR_URL = "https://www.robustkommerce.com/stores?brand=nautica";
const MARKETING_VIDEO_ID = "-vYYls9wVts";

/* Club tiers. `foil` is the metallic gradient used on the Club card and the hero chip. */
export type TierName = "Silver" | "Gold" | "Platinum";
const TIERS: { name: TierName; foil: string }[] = [
  { name: "Silver", foil: "linear-gradient(120deg,#FFFFFF 0%,#C9CED6 35%,#8D949E 62%,#EEF0F3 100%)" },
  { name: "Gold", foil: "linear-gradient(120deg,#FFF3C4 0%,#E5BD52 38%,#A67C1A 62%,#F7E08F 100%)" },
  { name: "Platinum", foil: "linear-gradient(120deg,#FFFFFF 0%,#D6E2F2 32%,#93A9C9 62%,#F1F6FD 100%)" },
];

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

export type CouponKind = "offer" | "member" | "birthday";
export interface NauticaCoupon {
  code: string;
  /** Big headline, e.g. "20% OFF" or "₹500 OFF" */
  value: string;
  title: string;
  description: string;
  /** Display text, e.g. "30 Nov 2026" */
  validTill: string;
  /** ISO date (yyyy-mm-dd). Drives the countdown and the "Expiring soon" tab (7 days or less). */
  expiresOn: string;
  kind: CouponKind;
  /** Shows in the "New" tab */
  isNew?: boolean;
}

export interface NauticaClub {
  tier: TierName;
  points: number;
  /** Points still needed for the next tier. null / omitted at the top tier. */
  pointsToNext?: number | null;
  /** Points earned on this bill. If omitted it is worked out as 1 point per ₹10. */
  pointsEarned?: number;
  coupons: NauticaCoupon[];
}

export interface NauticaReferral {
  code: string;
  /** Shareable join link. If omitted a sample link is built from the code. */
  link?: string;
  /** Points the shopper AND the friend each get */
  rewardPoints: number;
}

export interface LadderStep {
  /** Minimum single-bill spend in ₹ */
  spend: number;
  title: string;
  percent: number;
  perk: string;
}
export interface NauticaLadder {
  validTill: string;
  steps: LadderStep[];
}

export interface NauticaReceiptData {
  invoiceNo: string;
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
  ladder?: NauticaLadder;
}

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

export interface GiftCardValues {
  invoiceNo: string;
  amount: number;
  fromName: string;
}

export interface NauticaReceiptProps {
  data?: NauticaReceiptData;
  receipts?: NauticaReceiptData[];
  qrSrc?: string;
  logoSrc?: string;
  rdepLogoSrc?: string;
  instagramUrl?: string;
  storeLocatorUrl?: string;
  onDownload?: (receipt: NauticaReceiptData) => void;
  onSendEmail?: (email: string, receipt: NauticaReceiptData) => void;
  onSaveProfile?: (values: ProfileValues) => void;
  onSubmitFeedback?: (values: FeedbackValues) => void;
  onSelectReceipt?: (invoiceNo: string) => void;
  /** Called when the shopper requests a gift card. Payment is collected at the billing counter. */
  onRequestGiftCard?: (values: GiftCardValues) => void;
  onShareReferral?: (code: string) => void;
}

type IconName =
  | "history" | "mail" | "download" | "phone" | "instagram" | "pin" | "close" | "check" | "arrow" | "chevron"
  | "user" | "tax" | "directions" | "call" | "star" | "ticket" | "qr" | "bag" | "trend" | "users" | "gift"
  | "smile" | "lock" | "share" | "copy" | "clock" | "down" | "anchor" | "compass" | "play";
type ModalId = "history" | "email" | "qr" | "coupon" | "chart" | null;

interface HistoryRow {
  invoiceNo: string;
  date: string;
  storeName: string;
  amount: number;
  items: number;
  current: boolean;
}

/* ------------------------------- helpers ----------------------------------------- */
const inr = (n: number): string => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = (n: number): string => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const trim = (n: number): string => String(Number(n.toFixed(2)));
const pctText = (n: number): string => String(Math.round(n * 10) / 10);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const netOf = (i: NauticaItem): number => round2(i.mrp * i.qty - i.discount);
const emailOk = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function totalsOf(r: NauticaReceiptData) {
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

/** Whole days left until the end of `iso` (yyyy-mm-dd), counted from `now`. */
const daysLeft = (iso: string, now: number): number => Math.ceil((new Date(`${iso}T23:59:59`).getTime() - now) / 86400000);
const leftText = (d: number): string => (d <= 0 ? "Ends today" : d === 1 ? "1 day left" : `${d} days left`);

/** Current time, set after mount so server and client markup match. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* ---------------------------- downloadable receipt ------------------------------- */
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildReceiptHtml(r: NauticaReceiptData, logoSrc: string, rdepLogoSrc: string): string {
  const abs = (p: string) => (/^(https?:|data:)/.test(p) ? p : `${window.location.origin}${encodeURI(p)}`);
  const t = totalsOf(r);
  const rows = r.items
    .map(
      (i) => `<tr>
      <td><div class="n">${esc(i.name)}</div><div class="s">Size ${esc(i.size)} &middot; SKU ${esc(i.sku)} &middot; HSN ${esc(i.hsn)}</div></td>
      <td class="r">${i.qty}</td><td class="r">${inr(i.mrp)}</td><td class="r">&minus;${inr(i.discount)}</td><td class="r b">${inr(netOf(i))}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>NAUTICA Receipt ${esc(r.invoiceNo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,'Helvetica Neue',sans-serif;font-size:14px;color:#5E5E63;background:#F1EEE8;max-width:760px;margin:0 auto;padding:24px}
.bar{display:flex;justify-content:flex-end;margin-bottom:16px}
.bar button{background:#0B0B0C;color:#fff;border:0;border-radius:999px;padding:11px 20px;font:700 12px Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.sheet{background:#fff;border-radius:28px;padding:28px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:16px;border-bottom:3px solid #0B0B0C}
.head img{height:30px;width:auto}
h1{font-size:20px;color:#0B0B0C;text-transform:uppercase;letter-spacing:.14em;margin-top:12px}
.meta{text-align:right;font-size:12px;line-height:1.8}
table{width:100%;border-collapse:collapse;margin-top:20px}
th{text-align:left;font-size:11px;letter-spacing:.14em;padding:8px;background:#F1EEE8;border-bottom:1px solid #0B0B0C}
td{padding:12px 8px;border-bottom:1px solid rgba(7,27,49,.12);vertical-align:top;font-size:13px}
.r{text-align:right}.b{font-weight:700;color:#0B0B0C}.n{text-transform:uppercase;font-weight:700;color:#0B0B0C}.s{font-size:11px;margin-top:3px}
.sum{margin:18px 0 0 auto;width:300px}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.total{display:flex;justify-content:space-between;align-items:baseline;border-top:3px solid #0B0B0C;margin-top:10px;padding-top:12px;color:#0B0B0C;font-weight:700}
.total strong{font-size:26px}
.pay{margin-top:18px;background:#0B0B0C;color:#fff;border-radius:999px;padding:14px 20px;display:flex;justify-content:space-between;font-size:14px}
.store{margin-top:24px;font-size:12px;line-height:1.7;border-top:1px solid rgba(7,27,49,.12);padding-top:14px}
.foot{margin-top:22px;text-align:center;font-size:12px}.foot img{height:20px;vertical-align:middle;margin-left:6px}
@media print{.bar{display:none}body{max-width:none;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="bar"><button onclick="window.print()">Save as PDF</button></div>
<div class="sheet">
<div class="head"><div><img src="${esc(abs(logoSrc))}" alt="NAUTICA" onerror="this.style.display='none'"><h1>Tax invoice</h1></div>
<div class="meta"><div><b>Invoice no:</b> ${esc(r.invoiceNo)}</div><div><b>Date:</b> ${esc(r.date)}</div><div><b>Customer:</b> ${esc(r.customer.name)}</div><div><b>Mobile:</b> ${esc(r.customer.mobile)}</div></div></div>
<table><thead><tr><th style="width:44%">ITEM</th><th class="r">QTY</th><th class="r">UNIT PRICE</th><th class="r">DISCOUNT</th><th class="r">NET AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum">
<div class="row"><span>Subtotal (MRP)</span><b>&#8377;${inr(t.subtotal)}</b></div>
<div class="row"><span>Discount</span><b>&minus;&#8377;${inr(t.discount)}</b></div>
<div class="row"><span>Includes SGST</span><b>&#8377;${inr(r.sgst)}</b></div>
<div class="row"><span>Includes CGST</span><b>&#8377;${inr(r.cgst)}</b></div>
<div class="total"><span>Total paid</span><strong>&#8377;${inr(t.total)}</strong></div></div>
<div class="pay"><span>Payment method &middot; ${esc(r.payment.mode)} &ndash; ${esc(r.payment.ref)}</span><b>&#8377;${inr(t.total)}</b></div>
<div class="store"><b>${esc(r.store.name)}</b><br>${esc(r.store.address)}<br>${esc(r.store.email)} &middot; ${esc(r.store.phone)}${r.store.gstin ? `<br>GSTIN: ${esc(r.store.gstin)}` : ""}<br>Registered office: ${esc(r.registeredOffice)}</div>
<div class="foot">Thank you for shopping at NAUTICA<br><br>Powered by <img src="${esc(abs(rdepLogoSrc))}" alt="rdep" onerror="this.style.display='none'"></div>
</div></body></html>`;
}

function downloadReceipt(r: NauticaReceiptData, logoSrc: string, rdepLogoSrc: string) {
  const blob = new Blob([buildReceiptHtml(r, logoSrc, rdepLogoSrc)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NAUTICA_Receipt_${r.invoiceNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------- Sample Data ----------------------------------- */
const halfTax = (total: number): number => Math.floor(((total - total / 1.18) / 2) * 100) / 100;

/* SAMPLE data. Replace with the real tier, points, coupons, referral and ladder from the Nautica loyalty API. */
const SAMPLE_CLUB: NauticaClub = {
  tier: "Gold",
  points: 3240,
  pointsToNext: 1760,
  coupons: [
    { code: "GOLD500", value: "₹500 OFF", title: "Gold member reward", description: "On any bill above ₹2,999.", validTill: "5 Nov 2026", expiresOn: "2026-11-05", kind: "member" },
    { code: "FESTIVE10", value: "10% OFF", title: "Festive edit", description: "On new arrivals. One use only.", validTill: "7 Nov 2026", expiresOn: "2026-11-07", kind: "offer", isNew: true },
    { code: "WINTER15", value: "15% OFF", title: "Winter wardrobe", description: "On jackets, knits and layering pieces.", validTill: "20 Nov 2026", expiresOn: "2026-11-20", kind: "offer", isNew: true },
    { code: "NAUTICA20", value: "20% OFF", title: "Welcome back offer", description: "On your next purchase of ₹3,999 or more.", validTill: "30 Nov 2026", expiresOn: "2026-11-30", kind: "offer" },
    { code: "GOLDTOTE", value: "FREE TOTE", title: "Gold perk", description: "A Nautica tote on any bill above ₹5,999.", validTill: "31 Dec 2026", expiresOn: "2026-12-31", kind: "member", isNew: true },
  ],
};

const SAMPLE_LADDER: NauticaLadder = {
  validTill: "30 Nov 2026",
  steps: [
    { spend: 4999, title: "Style starter", percent: 5, perk: "+100 bonus points" },
    { spend: 9999, title: "Wardrobe refresh", percent: 10, perk: "+300 bonus points" },
    { spend: 14999, title: "The full look", percent: 15, perk: "Free Nautica tote + 600 bonus points" },
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
  ladder: SAMPLE_LADDER,
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
const STAR_PATH = "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z";
const PHONE_PATH =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z";
const PATHS: Record<IconName, ReactNode> = {
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>),
  download: (<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>),
  phone: <path d={PHONE_PATH} />,
  call: <path d={PHONE_PATH} />,
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  user: (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  tax: (<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 8h10M7 12h10M7 16h6" /></>),
  directions: <path d="M9 18l6-6-6-6" />,
  star: <path d={STAR_PATH} />,
  ticket: (<><path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M9 9h6M9 12h6M9 15h3" /></>),
  qr: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 18v3" /></>),
  bag: (<><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  trend: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>),
  gift: (<><rect x="3" y="8" width="18" height="4" rx="1.5" /><path d="M12 8v13" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5" /></>),
  smile: (<><circle cx="12" cy="12" r="9" /><path d="M8 14a4.5 4.5 0 0 0 8 0" /><path d="M9 9.5h.01M15 9.5h.01" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>),
  copy: (<><rect x="9" y="9" width="12" height="12" rx="3" /><path d="M5 15V6a3 3 0 0 1 3-3h9" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  anchor: (<><circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V22" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><path d="M8 11h8" /></>),
  compass: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>),
  play: (<><circle cx="12" cy="12" r="9" /><path d="m10 8.5 6 3.5-6 3.5z" /></>),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12 5 5 9-10" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ------------------------- placeholder QR + decorative barcode ------------------- */
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
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} fill="#0B0B0C" shapeRendering="crispEdges" role="img" aria-label="QR code" className="h-full w-full">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

/** Decorative barcode (replace with a real one at the till integration). Takes the surrounding text colour. */
function Barcode({ seed, className = "" }: { seed: string; className?: string }) {
  const bars = useMemo(() => {
    const rnd = seeded(seed);
    const out: { x: number; w: number }[] = [];
    let x = 0;
    while (x < 96) {
      const w = rnd() > 0.6 ? 3 : rnd() > 0.4 ? 2 : 1;
      if (rnd() > 0.28) out.push({ x, w });
      x += w + (rnd() > 0.5 ? 2 : 1);
    }
    return out;
  }, [seed]);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" fill="currentColor" aria-hidden="true" className={className}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="30" />
      ))}
    </svg>
  );
}

/* --------------------------------- shared ---------------------------------------- */
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nt-deep)]";
const card = "rounded-[26px] border border-[rgba(19,64,111,0.12)] bg-white shadow-[0_16px_34px_-24px_rgba(7,27,49,0.55)]";
const fieldInput =
  "w-full rounded-2xl border border-[var(--nt-line)] bg-[var(--nt-mist)] px-4 py-3 text-base text-[var(--nt-deep)] outline-none transition-colors [-webkit-appearance:none] [appearance:none] placeholder:text-[var(--nt-mid)] focus:border-[var(--nt-deep)] focus:bg-white";
const fieldLabel = `${CAPS} mb-1.5 block text-[var(--nt-gray)]`;
const solidBtn = `nt-bold flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--nt-deep)] py-4 text-[13px] uppercase tracking-[0.14em] text-white active:bg-[var(--nt-gray)] [@media(hover:hover)]:hover:bg-[var(--nt-gray)] ${focusRing}`;
const glowBtn = `nt-bold flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--nt-sun)] py-4 text-[13px] uppercase tracking-[0.14em] text-[var(--nt-deep)] active:brightness-90 ${focusRing}`;
const ghostBtn = `nt-bold inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--nt-deep)] px-5 py-3 text-[12px] uppercase tracking-[0.12em] text-[var(--nt-deep)] active:bg-[var(--nt-deep)] active:text-white [@media(hover:hover)]:hover:bg-[var(--nt-deep)] [@media(hover:hover)]:hover:text-white ${focusRing}`;

const DESIGN_W = 400;
const PHONE_MAX = 520;
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
const zoomStyle = (scale: number): CSSProperties | undefined => (scale === 1 ? undefined : ({ zoom: scale } as CSSProperties));

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
  const copy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard blocked: ignore */
    }
  }, []);
  return { copied, copy };
}

const jumpTo = (id: string) => document.getElementById(`nt-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

function BrandImage({
  src, alt, width, height, className, fallbackClassName, priority = false,
}: {
  src: string; alt: string; width: number; height: number; className: string; fallbackClassName: string; priority?: boolean;
}) {
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

function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none ${open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"}`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/* Wave shapes ------------------------------------------------------------------- */
const WAVE_PATH = "M0 18Q50 0 100 18T200 18T300 18T400 18T500 18T600 18T700 18T800 18V40H0Z";

/** Wide drifting wave. Place it inside a `relative overflow-hidden` box. `fill` is any CSS colour. */
function WaveBand({ fill, className = "", height = 34 }: { fill: string; className?: string; height?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 800 40" preserveAspectRatio="none" fill={fill} className={`pointer-events-none absolute left-0 w-[200%] ${className}`} style={{ height }}>
      <path d={WAVE_PATH} />
    </svg>
  );
}

/** Static wavy top edge: paints `color` and sits just above its parent. */
function WaveEdge({ color, className = "" }: { color: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 24" preserveAspectRatio="none" fill="currentColor" className={`pointer-events-none absolute left-0 h-[22px] w-full ${className}`} style={{ color }}>
      <path d="M0 24V12Q25 0 50 12T100 12T150 12T200 12T250 12T300 12T350 12T400 12V24Z" />
    </svg>
  );
}

/** Signal-flag bunting that hangs across the top of the hero. */
function Bunting() {
  const flags = Array.from({ length: 13 }, (_, i) => {
    const t = (i + 0.5) / 13;
    const x = 400 * t;
    const y = (1 - t) * (1 - t) * 2 + 2 * (1 - t) * t * 50 + t * t * 2;
    return { x, y, c: ["#FFFFFF", "#F2D9A6", "#C8102E", "#BFE6F2"][i % 4] };
  });
  return (
    <svg aria-hidden="true" viewBox="0 0 400 46" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute left-0 top-0 w-full">
      <path d="M0 2Q200 50 400 2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      {flags.map((f, i) => (
        <path key={i} d={`M${f.x - 9} ${f.y}L${f.x + 9} ${f.y}L${f.x} ${f.y + 17}Z`} fill={f.c} opacity="0.92" />
      ))}
    </svg>
  );
}

type Tone = "wash" | "mist" | "dark" | "foam" | "sand";
const TONE_BG: Record<Tone, string> = {
  wash: "var(--nt-wash)",
  mist: "var(--nt-mist)",
  dark: "var(--nt-deep)",
  foam: "var(--nt-foam-soft)",
  sand: "var(--nt-sand-soft)",
};

/** One chapter of the page: coloured band, wave edge, a dashed "route" on the left and a waypoint that lights up when active. */
function Chapter({ id, label, icon, active, tone, wave = true, children }: { id: string; label: string; icon: IconName; active: boolean; tone: Tone; wave?: boolean; children: ReactNode }) {
  const dark = tone === "dark";
  const node = dark
    ? active
      ? "bg-[var(--nt-sun)] text-[var(--nt-deep)] border-[var(--nt-sun)]"
      : "bg-[var(--nt-deep)] text-white border-[rgba(255,255,255,0.4)]"
    : active
      ? "bg-[var(--nt-navy)] text-white border-[var(--nt-navy)]"
      : "bg-white text-[var(--nt-navy)] border-[rgba(19,64,111,0.35)]";
  return (
    <section id={`nt-${id}`} aria-label={label} style={{ backgroundColor: TONE_BG[tone] }} className="relative scroll-mt-5 px-4 py-6">
      {wave && <WaveEdge color={TONE_BG[tone]} className="-top-[21px] z-[2]" />}
      <div className="nt-reveal">{children}</div>
    </section>
  );
}

/** Chapter heading: small kicker, serif title (wrap one word in <em> for the italic accent), optional sub line. */
function ChapterHead({ kicker, title, sub, dark = false }: { kicker: string; title: ReactNode; sub?: string; dark?: boolean }) {
  return (
    <div>
      <h2 className={`nt-display text-[26px] leading-[1.08] ${dark ? "text-white [&_em]:text-[var(--nt-sun)]" : "text-[var(--nt-deep)] [&_em]:text-[var(--nt-navy)]"} [&_em]:italic`}>{title}</h2>
      {sub && <p className={`mt-1 ${SMALL} ${dark ? "text-white/70" : "text-[var(--nt-gray)]"}`}>{sub}</p>}
    </div>
  );
}

/* Popups: rounded bottom sheets */
function Modal({ title, onClose, scale, children, dark = false }: { title: string; onClose: () => void; scale: number; children: ReactNode; dark?: boolean }) {
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B0B0C]/70 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={theme}
        className={`nt-root nt-pop ${fallbackFont.variable} ${displayFont.variable} max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] outline-none sm:w-[400px] sm:rounded-[28px] ${dark ? "bg-[var(--nt-deep)] text-white" : "bg-white text-[var(--nt-gray)]"}`}
      >
        <div className="w-full sm:w-[400px]" style={zoomStyle(scale)}>
          <div className="p-6 pt-3">
            <span aria-hidden="true" className={`mx-auto mb-4 block h-1.5 w-12 rounded-full ${dark ? "bg-white/25" : "bg-black/15"}`} />
            <div className="flex items-center justify-between gap-4">
              <h2 id={titleId} className={`nt-bold text-[22px] uppercase leading-tight tracking-[-0.01em] ${dark ? "text-white" : "text-[var(--nt-deep)]"}`}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${dark ? "bg-white/10 text-white" : "bg-[var(--nt-mist)] text-[var(--nt-deep)]"} ${focusRing}`}
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ 01 receipt: item row ----------------------------- */
function ItemRow({ item, open, onToggle }: { item: NauticaItem; open: boolean; onToggle: () => void }) {
  const panelId = useId();
  const net = netOf(item);
  const gross = item.mrp * item.qty;
  const pct = gross > 0 ? (item.discount / gross) * 100 : 0;
  const facts: [string, string][] = [
    ["SKU", item.sku],
    ["HSN", item.hsn],
    ["UoM", "Pcs"],
    ["Unit price", `₹${inr(item.mrp)}`],
    ["Discount", `${pctText(pct)}%`],
    ["Amount", `₹${trim(item.discount)}`],
  ];
  return (
    <li className="border-t border-dashed border-black/15 first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 text-left ${focusRing}`}>
        <span aria-label={`Size ${item.size}`} className="nt-bold grid h-10 w-10 place-items-center rounded-full border-[3px] border-[var(--nt-navy)] bg-white text-[13px] text-[var(--nt-navy)] shadow-[inset_0_0_0_3px_#E6EDF5]">
          {item.size}
        </span>
        <span className="min-w-0">
          <span className="nt-bold block text-[14px] uppercase leading-snug tracking-[0.02em] text-[var(--nt-deep)]">{item.name}</span>
          <span className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 ${SMALL} text-[var(--nt-gray)]`}>
            <span>Qty {item.qty}</span>
            {pct > 0 && <span className="nt-bold rounded-md bg-[var(--nt-signal)] px-1.5 py-0.5 text-white">{pctText(pct)}% off</span>}
            <span className="nt-bold flex items-center gap-1 text-[var(--nt-deep)]">
              Details
              <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </span>
          </span>
        </span>
        <span className="text-right">
          <span className={`${AMOUNT} block text-[var(--nt-deep)]`}>₹{inr(net)}</span>
          {item.discount > 0 && <s className={`mt-0.5 block ${SMALL} tabular-nums text-[var(--nt-mid)]`}>₹{inr(gross)}</s>}
        </span>
      </button>
      <Collapse open={open} id={panelId}>
        <dl className="grid grid-cols-3 gap-2 pb-4">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-2xl bg-[var(--nt-mist)] p-3">
              <dt className={`${CAPS} text-[10px] text-[var(--nt-gray)]`}>{k}</dt>
              <dd className="nt-bold mt-1 break-words text-[13px] tabular-nums text-[var(--nt-deep)]">{v}</dd>
            </div>
          ))}
        </dl>
      </Collapse>
    </li>
  );
}

/* ------------------------------ points: club card ------------------------------- */
function ClubCard({ club, mobile, earned, logoSrc }: { club: NauticaClub; mobile: string; earned: number; logoSrc: string }) {
  const idx = Math.max(0, TIERS.findIndex((t) => t.name === club.tier));
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  const toNext = club.pointsToNext ?? null;
  const total = toNext != null ? club.points + toNext : club.points;
  const pct = !next || toNext == null || total <= 0 ? 100 : Math.min(100, Math.round((club.points / total) * 100));
  const TICKS = 30;
  const filled = Math.round((pct / 100) * TICKS);

  return (
    <div className="nt-sheen relative rounded-[28px] p-4 text-[var(--nt-deep)] shadow-[0_28px_44px_-24px_rgba(7,27,49,0.85)]" style={{ backgroundImage: tier.foil }}>
      <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="#071B31" strokeWidth="1" className="nt-compass pointer-events-none absolute -right-16 -top-16 h-56 w-56 opacity-[0.18]">
        <circle cx="100" cy="100" r="92" />
        <circle cx="100" cy="100" r="70" />
        <circle cx="100" cy="100" r="46" />
        <path d="M100 4v192M4 100h192M32 32l136 136M168 32 32 168" />
        <path d="m100 20 10 70 70 10-70 10-10 70-10-70-70-10 70-10z" />
      </svg>
      <div className="relative flex items-center justify-between gap-3">
        <BrandImage src={logoSrc} alt="NAUTICA" width={320} height={80} className="h-5 w-auto object-contain object-left" fallbackClassName="nt-bold text-[16px] uppercase tracking-[0.3em]" />
        <span className="nt-bold rounded-full bg-black/10 px-3 py-1 text-[12px] tabular-nums tracking-[0.14em]">•••• {mobile.slice(-4)}</span>
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <p className={`${CAPS} text-black/65`}>Nautica Club</p>
          <p className="nt-display text-[40px] italic leading-none">{tier.name}</p>
        </div>
        <div className="text-right">
          <p className="nt-display text-[34px] leading-none tabular-nums">{inr0(club.points)}</p>
          <p className={`${SMALL} text-black/65`}>points</p>
        </div>
      </div>
      <div className="relative mt-4">
        <div aria-hidden="true" className="flex h-5 items-end justify-between">
          {Array.from({ length: TICKS }, (_, i) => (
            <span key={i} className="w-[3px] rounded-full" style={{ height: i % 7 === 0 ? "100%" : "60%", background: i < filled ? "#0B2A4A" : "rgba(7,27,49,0.2)" }} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 text-[11px] uppercase tracking-[0.12em]">
          {TIERS.map((t, i) => (
            <span key={t.name} className={`nt-bold ${i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"} ${i === idx ? "text-black" : "text-black/45"}`}>{t.name}</span>
          ))}
        </div>
        <p className={`${BODY} mt-3`}>
          {next && toNext != null ? (
            <>
              <span className="nt-bold tabular-nums">{inr0(toNext)}</span> more points to <span className="nt-bold">{next.name}</span>
            </>
          ) : (
            "You are at the top tier"
          )}
        </p>
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--nt-deep)] px-4 py-2.5 text-white">
        <p className={SMALL}>
          Earned on this bill <span className="nt-bold text-[var(--nt-sun)]">+{inr0(earned)}</span>
        </p>
        <Icon name="anchor" className="h-4 w-4 text-[var(--nt-sun)]" />
      </div>
    </div>
  );
}

/* ------------------------------ coupons: tabs + pennants ------------------------- */
type TabKey = "expiring" | "all" | "member" | "new";
const TABS: { key: TabKey; label: string }[] = [
  { key: "expiring", label: "Expiring soon" },
  { key: "all", label: "All" },
  { key: "member", label: "Member perks" },
  { key: "new", label: "New" },
];

const kindStyle: Record<CouponKind, { bg: string; chip: string }> = {
  offer: { bg: "bg-[var(--nt-sun)]", chip: "Offer" },
  member: { bg: "bg-[var(--nt-foam)]", chip: "Member perk" },
  birthday: { bg: "bg-[var(--nt-sea)]", chip: "Birthday" },
};
const kindStripe: Record<CouponKind, string> = { offer: "#F2D9A6", member: "#BFE6F2", birthday: "#CFEDE3" };

function CouponCard({ c, left, copied, onCopy, onUse }: { c: NauticaCoupon; left: number | null; copied: boolean; onCopy: (code: string) => void; onUse: (c: NauticaCoupon) => void }) {
  const urgent = left != null && left <= 3;
  return (
    <li className="w-[88%] shrink-0 snap-start">
      <div className="nt-pennant relative bg-white text-[var(--nt-deep)]">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3" style={{ background: kindStripe[c.kind] }} />
        <div className="py-4 pl-7 pr-12">
          <div className="flex items-center justify-between gap-2">
            <span className={`nt-bold rounded-md bg-[var(--nt-mist)] px-2 py-1 ${CAPS} text-[10px]`}>{c.isNew ? "New · " : ""}{kindStyle[c.kind].chip}</span>
            <span className={`nt-bold flex items-center gap-1.5 text-[12px] ${urgent ? "text-[var(--nt-signal)]" : "text-[var(--nt-gray)]"}`}>
              {urgent ? <span aria-hidden="true" className="nt-pulse h-2 w-2 rounded-full bg-[var(--nt-signal)]" /> : <Icon name="clock" className="h-3.5 w-3.5" />}
              {left != null ? leftText(left) : c.validTill}
            </span>
          </div>
          <p className="nt-display mt-2 text-[34px] italic leading-none">{c.value}</p>
          <p className="nt-bold mt-2 text-[13px] uppercase tracking-[0.06em]">{c.title}</p>
          <p className={`mt-1 ${SMALL} text-[var(--nt-gray)]`}>{c.description}</p>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-[rgba(19,64,111,0.25)] pt-2.5">
            <p className="nt-bold truncate text-[15px] tracking-[0.12em]">{c.code}</p>
            <p className={`${SMALL} shrink-0 text-[var(--nt-gray)]`}>till {c.validTill}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onUse(c)} className={`nt-bold flex-1 rounded-xl bg-[var(--nt-navy)] py-2.5 text-[12px] uppercase tracking-[0.1em] text-white active:bg-[var(--nt-deep)] ${focusRing}`}>
              Use in store
            </button>
            <button type="button" onClick={() => onCopy(c.code)} aria-label={`Copy code ${c.code}`} aria-live="polite" className={`nt-bold grid min-w-[48px] place-items-center rounded-xl border-2 border-[var(--nt-navy)] px-3 text-[11px] uppercase text-[var(--nt-navy)] ${focusRing}`}>
              {copied ? "Done" : <Icon name="copy" className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function CouponsSection({ coupons, now, onUse }: { coupons: NauticaCoupon[]; now: number | null; onUse: (c: NauticaCoupon) => void }) {
  const { copied, copy } = useCopy();
  const [tab, setTab] = useState<TabKey | null>(null);

  const live = useMemo(
    () =>
      coupons
        .map((c) => ({ c, left: now == null ? null : daysLeft(c.expiresOn, now) }))
        .filter((x) => x.left == null || x.left >= 0)
        .sort((a, b) => a.c.expiresOn.localeCompare(b.c.expiresOn)),
    [coupons, now],
  );
  const pick = (k: TabKey) =>
    live.filter(({ c, left }) => (k === "all" ? true : k === "expiring" ? left != null && left <= 7 : k === "member" ? c.kind !== "offer" : !!c.isNew));
  const counts: Record<TabKey, number> = { expiring: pick("expiring").length, all: pick("all").length, member: pick("member").length, new: pick("new").length };
  const current: TabKey = tab ?? (counts.expiring > 0 ? "expiring" : "all");
  const list = pick(current);

  return (
    <div>
      <div role="tablist" aria-label="Coupon filters" className="-mr-4 flex gap-6 overflow-x-auto border-b border-white/20 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const on = t.key === current;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={`nt-bold relative shrink-0 pb-3 text-[13px] uppercase tracking-[0.08em] ${on ? "text-white" : "text-white/55"} ${focusRing}`}
            >
              {t.label}
              <sup className="ml-1 text-[10px] text-[var(--nt-sun)]">{counts[t.key]}</sup>
              {on && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[var(--nt-sun)]" />}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-white/30 px-6 py-9 text-center text-white">
          <Icon name="anchor" className="h-9 w-9 text-[var(--nt-sun)]" />
          <p className="nt-bold mt-3 text-[15px] uppercase tracking-[0.06em]">Nothing here right now</p>
          <p className={`mt-1 ${SMALL} text-white/65`}>Try another tab.</p>
        </div>
      ) : (
        <ul key={current} className="nt-tab -mr-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {list.map(({ c, left }) => (
            <CouponCard key={c.code} c={c} left={left} copied={copied === c.code} onCopy={copy} onUse={onUse} />
          ))}
        </ul>
      )}
      {list.length > 1 && <p className={`mt-1 ${SMALL} text-white/55`}>Swipe for more →</p>}
    </div>
  );
}

/* ------------------------------ shop more, save more: tide gauge ----------------- */
const LADDER_MIN = 1000;
const LADDER_MAX = 20000;

function SaveMore({ ladder, billed }: { ladder: NauticaLadder; billed: number }) {
  const steps = [...ladder.steps].sort((a, b) => a.spend - b.spend);
  const [spend, setSpend] = useState(() => Math.min(LADDER_MAX, Math.max(LADDER_MIN, Math.round(Math.max(8000, billed * 2) / 500) * 500)));
  const unlocked = [...steps].reverse().find((s) => spend >= s.spend) ?? null;
  const upcoming = steps.find((s) => spend < s.spend) ?? null;
  const saving = unlocked ? Math.round((spend * unlocked.percent) / 100) : 0;
  const fill = ((spend - LADDER_MIN) / (LADDER_MAX - LADDER_MIN)) * 100;
  const posOf = (v: number) => Math.min(100, Math.max(0, ((v - LADDER_MIN) / (LADDER_MAX - LADDER_MIN)) * 100));
  const topPct = steps[steps.length - 1]?.percent ?? 1;
  const level = unlocked ? 24 + (unlocked.percent / topPct) * 60 : 10;

  return (
    <div className="mt-3 space-y-2">
      <div className="nt-grain relative overflow-hidden rounded-[26px] bg-[var(--nt-deep)] p-3.5 text-white">
        <div className="relative flex items-center gap-4">
          <div aria-hidden="true" className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full border-[5px] border-[var(--nt-fog)] bg-[var(--nt-abyss)] shadow-[inset_0_0_0_3px_rgba(7,27,49,0.7)]">
            <div className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out motion-reduce:transition-none" style={{ height: `${level}%`, background: "linear-gradient(180deg,#2E78B8,#13406F)" }}>
              <svg viewBox="0 0 800 40" preserveAspectRatio="none" fill="#2E78B8" className="nt-wave-a absolute -top-[9px] left-0 h-[10px] w-[200%]">
                <path d={WAVE_PATH} />
              </svg>
            </div>
            <div className="absolute inset-0 grid place-items-center text-center">
              <span>
                <span className="nt-display block text-[22px] leading-none">{unlocked ? `${unlocked.percent}%` : "0%"}</span>
                <span className={`block ${CAPS} text-[9px] text-white/80`}>off</span>
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className={`${CAPS} text-white/60`}>If your next bill is</p>
            <p className="nt-display mt-0.5 text-[28px] leading-none tabular-nums">₹{inr0(spend)}</p>
            <p className="nt-bold mt-1 text-[14px] text-[var(--nt-sun)]" aria-live="polite">
              {unlocked ? `You save ₹${inr0(saving)}` : "Not unlocked yet"}
            </p>
          </div>
        </div>

        <div className="relative mt-3 px-1">
          <input
            type="range"
            min={LADDER_MIN}
            max={LADDER_MAX}
            step={500}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            aria-label="Spend on a single bill"
            aria-valuetext={`₹${inr0(spend)}`}
            className="nt-range"
            style={{ background: `linear-gradient(90deg,var(--nt-sun) ${fill}%,rgba(255,255,255,.18) ${fill}%)` }}
          />
          <div aria-hidden="true" className="relative mt-1.5 h-7">
            {steps.map((s) => {
              const on = spend >= s.spend;
              return (
                <span key={s.spend} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${posOf(s.spend)}%` }}>
                  <span className={`mx-auto block h-2 w-0.5 ${on ? "bg-[var(--nt-sun)]" : "bg-white/30"}`} />
                  <span className={`nt-bold mt-1 block text-[12px] ${on ? "text-[var(--nt-sun)]" : "text-white/55"}`}>{s.percent}%</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="relative mt-1 rounded-2xl bg-white p-3 text-[var(--nt-deep)]">
          {unlocked ? (
            <>
              <p className={`${CAPS} text-[var(--nt-gray)]`}>You unlock</p>
              <p className="nt-display mt-0.5 text-[20px] leading-tight">{unlocked.title}</p>
              <p className={`mt-0.5 ${SMALL} text-[var(--nt-gray)]`}>{unlocked.perk}</p>
            </>
          ) : (
            <>
              <p className={`${CAPS} text-[var(--nt-gray)]`}>Not unlocked yet</p>
              <p className="nt-display mt-1 text-[22px] leading-tight">Cross ₹{steps[0] ? inr0(steps[0].spend) : 0} to start saving</p>
            </>
          )}
          {upcoming && (
            <p className={`mt-2 flex items-center gap-2 rounded-xl bg-[var(--nt-mist)] px-3 py-2 ${SMALL}`}>
              <Icon name="trend" className="h-4 w-4 shrink-0" />
              <span>
                Add <span className="nt-bold">₹{inr0(upcoming.spend - spend)}</span> more to unlock <span className="nt-bold">{upcoming.percent}% off</span>
              </span>
            </p>
          )}
        </div>
      </div>
      <p className="px-1 text-[11px] leading-snug text-[var(--nt-gray)]">
        Single bill, any Nautica store, till {ladder.validTill}. Share your mobile number at billing.
      </p>
    </div>
  );
}

/* ------------------------------ refer a friend ----------------------------------- */
function ReferSection({ referral, onShare }: { referral: NauticaReferral; onShare: (code: string) => void }) {
  const { copied, copy } = useCopy();
  // SAMPLE link. Replace with the real join link from the Nautica loyalty API (`referral.link`).
  const link = referral.link ?? `https://nautica.link/${referral.code}`;
  const pts = inr0(referral.rewardPoints);

  const share = async () => {
    const text = `Join Nautica with my link and we both get ${pts} points on your first purchase.`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) await navigator.share({ title: "Nautica", text, url: link });
      else await copy(link);
      onShare(referral.code);
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <div className="mt-3 rounded-[26px] bg-white p-3.5 shadow-[0_18px_34px_-26px_rgba(7,27,49,0.6)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--nt-navy)] text-[var(--nt-navy)] shadow-[inset_0_0_0_3px_#DDF0F6]">
          <Icon name="users" className="h-5 w-5" />
        </span>
        <p className={`${BODY} text-[var(--nt-gray)]`}>
          Your friend joins and shops in store. You both earn <span className="nt-bold text-[var(--nt-deep)]">{pts} points</span>.
        </p>
      </div>

      <button
        type="button"
        onClick={() => copy(link)}
        aria-label={`Copy referral link ${link}`}
        className={`mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-[rgba(19,64,111,0.3)] bg-[var(--nt-wash)] py-2 pl-4 pr-2 text-left ${focusRing}`}
      >
        <span className="nt-bold truncate text-[14px] tracking-[0.02em] text-[var(--nt-deep)]">{link.replace(/^https?:\/\//, "")}</span>
        <span aria-live="polite" className="nt-bold flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--nt-navy)] px-3.5 py-2.5 text-[11px] uppercase tracking-[0.1em] text-white">
          {copied === link ? (<><Icon name="check" className="h-3.5 w-3.5" />Copied</>) : (<><Icon name="copy" className="h-3.5 w-3.5" />Copy</>)}
        </span>
      </button>

      <button type="button" onClick={share} className={`${solidBtn} mt-2.5 !py-3`}>
        <Icon name="share" className="h-4 w-4" />
        Share with a friend
      </button>
    </div>
  );
}

/* ------------------------------ gift a Nautica card ------------------------------ */
const GIFT_AMOUNTS = [500, 1000, 2000, 5000];

function GiftSection({ data, onRequest }: { data: NauticaReceiptData; onRequest?: (v: GiftCardValues) => void }) {
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [otherOpen, setOtherOpen] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<GiftCardValues | null>(null);
  const otherId = useId();

  const finalAmount = custom ? Number(custom) : amount;
  const valid = Number.isFinite(finalAmount) && finalAmount >= 500 && finalAmount <= 25000;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setOtherOpen(true);
      setErr("Pick an amount between ₹500 and ₹25,000.");
      return;
    }
    setErr("");
    const values: GiftCardValues = { invoiceNo: data.invoiceNo, amount: finalAmount, fromName: data.customer.name };
    onRequest?.(values);
    setSent(values);
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="nt-sheen nt-grain relative aspect-[2.9] w-full rounded-[22px] p-3.5 text-white shadow-[0_28px_44px_-22px_rgba(7,27,49,0.8)]" style={{ background: "linear-gradient(135deg,#071B31 0%,#13406F 100%)" }}>
        <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="1" className="nt-compass pointer-events-none absolute -right-10 -top-10 h-44 w-44 opacity-[0.16]">
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="62" />
          <path d="M100 4v192M4 100h192M32 32l136 136M168 32 32 168" />
        </svg>
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="nt-bold text-[16px] uppercase tracking-[0.34em]">NAUTICA</span>
            <Icon name="anchor" className="h-5 w-5 text-[var(--nt-sun)]" />
          </div>
          <div className="flex items-end justify-between">
            <p className={`${CAPS} text-white/65`}>Gift card</p>
            <p className="nt-display text-[32px] leading-none tabular-nums text-[var(--nt-sun)]">₹{valid ? inr0(finalAmount) : "0"}</p>
          </div>
        </div>
      </div>

      {sent ? (
        <div className="rounded-[26px] bg-white p-5" aria-live="polite">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--nt-sea)] text-[var(--nt-deep)]">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <p className="nt-display mt-4 text-[26px] leading-tight text-[var(--nt-deep)]">₹{inr0(sent.amount)} gift card</p>
          <p className={`mt-2 ${BODY}`}>
            Show this screen to <span className="nt-bold text-[var(--nt-deep)]">{data.store.associate}</span> at the billing counter. Pay ₹{inr0(sent.amount)} and they will issue the card on the spot.
          </p>
          <button type="button" onClick={() => setSent(null)} className={`nt-bold mt-4 underline underline-offset-4 ${SMALL} text-[var(--nt-deep)]`}>
            Change amount
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="rounded-[22px] bg-white p-3.5">
          <div role="group" aria-label="Gift card amount" className="grid grid-cols-4 gap-2">
            {GIFT_AMOUNTS.map((a) => {
              const on = !custom && amount === a;
              return (
                <button key={a} type="button" aria-pressed={on} onClick={() => { setCustom(""); setErr(""); setAmount(a); }} className={`nt-bold rounded-xl py-2.5 text-[14px] tabular-nums ${on ? "bg-[var(--nt-navy)] text-white" : "bg-[var(--nt-mist)] text-[var(--nt-deep)]"} ${focusRing}`}>
                  ₹{inr0(a)}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setOtherOpen((o) => !o)} aria-expanded={otherOpen} aria-controls={otherId} className={`mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-[var(--nt-mist)] py-1.5 pl-4 pr-1.5 text-left ${focusRing}`}>
            <span className={`${LABEL} text-[var(--nt-deep)]`}>{custom ? `Other amount: ₹${inr0(Number(custom))}` : "Other amount"}</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--nt-navy)] text-white">
              <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${otherOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          <Collapse open={otherOpen} id={otherId}>
            <div className="p-1 pt-3">
              <input inputMode="numeric" value={custom} onChange={(e) => { setErr(""); setCustom(e.target.value.replace(/\D/g, "").slice(0, 5)); }} placeholder="₹500 to ₹25,000" aria-label="Custom amount" className={fieldInput} />
            </div>
          </Collapse>

          {err && <p role="alert" className="nt-bold mt-3 rounded-xl bg-[rgba(200,16,46,0.1)] px-4 py-3 text-[13px] text-[var(--nt-deep)]">{err}</p>}
          <button type="submit" className={`${solidBtn} mt-2.5 !py-3`}>
            <Icon name="gift" className="h-4 w-4" />
            Gift ₹{valid ? inr0(finalAmount) : "0"}
          </button>
          <p className="mt-2 text-center text-[11px] leading-snug text-[var(--nt-gray)]">Pay at billing. The associate issues the card on the spot.</p>
        </form>
      )}
    </div>
  );
}

/* ------------------------------ video -------------------------------------------- */
function VideoBlock() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const near = useInView(sectionRef, "300px 0px", 0);
  const visible = useInView(sectionRef, "0px", 0.5);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  const command = useCallback((func: string) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: "" }), "*");
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const func = visible ? "playVideo" : "pauseVideo";
    const timers = [0, 600, 1500].map((ms) => window.setTimeout(() => command(func), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [loaded, visible, command]);

  const src = mounted
    ? `https://www.youtube-nocookie.com/embed/${MARKETING_VIDEO_ID}?enablejsapi=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${MARKETING_VIDEO_ID}&origin=${encodeURIComponent(window.location.origin)}`
    : "";

  return (
    <section ref={sectionRef} aria-label="Nautica video" className="overflow-hidden rounded-[24px] bg-[var(--nt-deep)] p-1.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-[19px] bg-[var(--nt-deep)] bg-cover bg-center" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${MARKETING_VIDEO_ID}/hqdefault.jpg)` }}>
        {mounted && (
          <iframe ref={frameRef} src={src} title="NAUTICA video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" onLoad={() => setLoaded(true)} className="absolute inset-0 h-full w-full border-0" />
        )}
      </div>
    </section>
  );
}

/* ------------------------------ 07 rate ------------------------------------------ */
const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
const FEEDBACK_CATEGORIES = [
  { key: "service", label: "Service quality" },
  { key: "product", label: "Product offering" },
  { key: "sizes", label: "Sizes availability" },
  { key: "value", label: "Value for money" },
] as const;

function FeedbackCard({ data, onSubmit }: { data: NauticaReceiptData; onSubmit?: (v: FeedbackValues) => void }) {
  const [overall, setOverall] = useState(0);
  const [hover, setHover] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [cats, setCats] = useState({ service: 0, product: 0, sizes: 0, value: 0 });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const commentId = useId();
  const detailId = useId();
  const shown = hover || overall;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.({ invoiceNo: data.invoiceNo, overall, categories: cats, comment: comment.trim() });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-start gap-3.5 rounded-[28px] bg-[var(--nt-deep)] p-5 text-white" aria-live="polite">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--nt-sun)] text-black">
          <Icon name="check" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="nt-bold text-[18px] uppercase">Thanks for rating</p>
          <p className={`mt-1 ${SMALL} text-white/70`}>
            You gave {overall} {overall === 1 ? "star" : "stars"} ({RATING_WORDS[overall - 1].toLowerCase()}).
          </p>
          <button type="button" onClick={() => { setSubmitted(false); setExpanded(false); setOverall(0); }} className={`nt-bold mt-2 underline underline-offset-4 ${SMALL}`}>
            Edit rating
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Overall rating" className="flex justify-between gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= shown;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={overall === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${RATING_WORDS[n - 1]}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => { setOverall(n); setExpanded(true); }}
              className={`grid h-[52px] flex-1 place-items-center rounded-full ${on ? "bg-[var(--nt-deep)]" : "bg-[var(--nt-mist)]"} ${focusRing}`}
            >
              <svg viewBox="0 0 24 24" strokeWidth="1.5" strokeLinejoin="round" className={`h-7 w-7 ${on ? "fill-[var(--nt-sun)] stroke-[var(--nt-sun)]" : "fill-transparent stroke-[var(--nt-deep)]"} ${!overall && !hover ? "nt-star-flash" : ""}`} style={!overall && !hover ? { animationDelay: `${(n - 1) * 0.18}s` } : undefined}>
                <path d={STAR_PATH} />
              </svg>
            </button>
          );
        })}
      </div>
      <p className={`nt-bold mt-3 text-center ${CAPS} text-[var(--nt-deep)]`}>{overall ? `${RATING_WORDS[overall - 1]}, ${overall} of 5` : "Tap a star"}</p>

      <Collapse open={expanded} id={detailId}>
        <form onSubmit={submit} noValidate className="space-y-4 pt-5">
          <div className="space-y-2">
            {FEEDBACK_CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-full bg-[var(--nt-mist)] py-1 pl-4 pr-2">
                <span className={`${SMALL} text-[var(--nt-deep)]`}>{c.label}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setCats((p) => ({ ...p, [c.key]: star }))} className="p-1.5" aria-label={`${star} stars for ${c.label}`}>
                      <svg viewBox="0 0 24 24" strokeWidth="1.5" className={`h-[18px] w-[18px] stroke-[var(--nt-deep)] ${star <= cats[c.key] ? "fill-[var(--nt-deep)]" : "fill-transparent"}`}>
                        <path d={STAR_PATH} />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label htmlFor={commentId} className={fieldLabel}>Anything else? (optional)</label>
            <textarea id={commentId} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us what you liked or how we can improve" className={`${fieldInput} resize-none`} />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className={`${solidBtn} flex-1`}>Send rating</button>
            <button type="button" onClick={() => setExpanded(false)} className={ghostBtn}>Cancel</button>
          </div>
        </form>
      </Collapse>
    </div>
  );
}

/* ------------------------------- 08 profile -------------------------------------- */
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function Toggle({ checked, onChange, disabled = false, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange?.(!checked)} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--nt-deep)]" : "bg-black/15"} ${disabled ? "opacity-60" : ""} ${focusRing}`}>
      <span aria-hidden="true" className={`absolute top-1 h-6 w-6 rounded-full transition-all ${checked ? "left-7 bg-[var(--nt-sun)]" : "left-1 bg-white"}`} />
    </button>
  );
}

function ProfileCard({ data, onSave }: { data: NauticaReceiptData; onSave?: (v: ProfileValues) => void }) {
  const [form, setForm] = useState<ProfileValues>({ name: data.customer.name, email: data.customer.email, gender: "", birthday: "", anniversary: "", offers: false });
  const [saved, setSaved] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const upd = <K extends keyof ProfileValues>(k: K, v: ProfileValues[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.email && !emailOk(form.email)) {
      setEmailErr("Enter a valid email address, like name@example.com.");
      return;
    }
    setEmailErr("");
    onSave?.(form);
    setSaved(true);
  };

  return (
    <div className={`${card} mt-3 overflow-hidden`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId} className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left ${focusRing}`}>
        <span>
          <span className="nt-bold block text-[16px] uppercase leading-tight text-[var(--nt-deep)]">Your details</span>
          <span className={`mt-0.5 block ${SMALL}`}>{saved ? "Saved. Thank you!" : "Takes about 30 seconds"}</span>
        </span>
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--nt-deep)] text-white">
          <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <Collapse open={open} id={panelId}>
    <form onSubmit={submit} noValidate className="space-y-2.5 px-4 pb-4">
      <div className="grid grid-cols-2 gap-x-3">
        <div className="min-w-0">
          <span className={fieldLabel}>Mobile</span>
          <p className={`${fieldInput} nt-bold truncate tabular-nums`}>{data.customer.mobile}</p>
        </div>
        <label className="block min-w-0">
          <span className={fieldLabel}>Full name</span>
          <input className={fieldInput} value={form.name} onChange={(e) => upd("name", e.target.value)} autoComplete="name" />
        </label>
      </div>
      <label className="block">
        <span className={fieldLabel}>Email address</span>
        <input type="email" className={fieldInput} value={form.email} onChange={(e) => { setEmailErr(""); upd("email", e.target.value); }} autoComplete="email" aria-invalid={!!emailErr} />
        {emailErr && <span role="alert" className="nt-bold mt-1.5 block text-[13px] text-[var(--nt-signal)]">{emailErr}</span>}
      </label>
      <fieldset>
        <legend className={fieldLabel}>Gender</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => {
            const on = form.gender === g;
            return (
              <button key={g} type="button" aria-pressed={on} onClick={() => upd("gender", on ? "" : g)} className={`rounded-full px-3 py-1.5 text-[13px] ${on ? "nt-bold bg-[var(--nt-deep)] text-white" : "bg-[var(--nt-mist)] text-[var(--nt-gray)]"} ${focusRing}`}>
                {g}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-x-3">
        <label className="block min-w-0">
          <span className={fieldLabel}>Birthday (for offers)</span>
          <input type="date" className={fieldInput} value={form.birthday} onChange={(e) => upd("birthday", e.target.value)} autoComplete="bday" />
        </label>
        <label className="block min-w-0">
          <span className={fieldLabel}>Anniversary (optional)</span>
          <input type="date" className={fieldInput} value={form.anniversary} onChange={(e) => upd("anniversary", e.target.value)} />
        </label>
      </div>
      <fieldset>
        <legend className={fieldLabel}>Communication preferences</legend>
        <ul className="space-y-1.5">
          <li className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--nt-mist)] px-3.5 py-2.5">
            <div>
              <p className={`${LABEL} text-[var(--nt-deep)]`}>Purchase and order updates</p>
              <p className={`${SMALL}`}>Always on</p>
            </div>
            <Toggle checked disabled label="Purchase and order updates, always on" />
          </li>
          <li className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--nt-mist)] px-3.5 py-2.5">
            <div>
              <p className={`${LABEL} text-[var(--nt-deep)]`}>New arrivals and offers</p>
              <p className={`${SMALL}`}>Collections and member offers</p>
            </div>
            <Toggle checked={form.offers} onChange={(v) => upd("offers", v)} label="New arrivals and offers" />
          </li>
        </ul>
      </fieldset>
      <div>
        <button type="submit" className={`${solidBtn} !py-3`}>
          {saved ? (<><Icon name="check" className="h-4 w-4" /> Details saved</>) : "Save details"}
        </button>
        <p className={`mt-2 text-center text-[11px] leading-snug text-[var(--nt-gray)]`}>Used only for purchase communication and personalisation. Never shared with third parties.</p>
        <span className="sr-only" aria-live="polite">{saved ? "Details saved" : ""}</span>
      </div>
    </form>
      </Collapse>
    </div>
  );
}

/* ------------------------------ receipt view ------------------------------------- */
interface ReceiptViewProps extends Omit<NauticaReceiptProps, "data" | "receipts" | "onSelectReceipt"> {
  data: NauticaReceiptData;
  history: HistoryRow[];
  onSelect: (invoiceNo: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
}
const mk = (id: string, label: string, hint: string, icon: IconName): NavItem => ({ id, label, hint, icon });

function ReceiptView({
  data, history, onSelect, qrSrc,
  logoSrc = DEFAULT_NAUTICA_LOGO,
  rdepLogoSrc = DEFAULT_RDEP_LOGO,
  instagramUrl = DEFAULT_INSTAGRAM_URL,
  storeLocatorUrl = DEFAULT_STORE_LOCATOR_URL,
  onDownload, onSendEmail, onSaveProfile, onSubmitFeedback, onRequestGiftCard, onShareReferral,
}: ReceiptViewProps) {
  const [openItem, setOpenItem] = useState(-1);
  const [modal, setModal] = useState<ModalId>(null);
  const [couponSheet, setCouponSheet] = useState<NauticaCoupon | null>(null);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [active, setActive] = useState("watch");
  const [progress, setProgress] = useState(0);
  const [passed, setPassed] = useState(false);
  const closeModal = useCallback(() => setModal(null), []);
  const exchangeId = useId();
  const contactId = useId();
  const heroRef = useRef<HTMLElement>(null);
  const scale = useFitScale();
  const now = useNow();

  const { store, exchange, club } = data;
  const referral: NauticaReferral = data.referral ?? { code: `${data.customer.name.trim().split(/\s+/)[0].toUpperCase()}-NAUT500`, rewardPoints: 500 };
  const ladder = data.ladder ?? SAMPLE_LADDER;
  const t = useMemo(() => totalsOf(data), [data]);
  const firstName = data.customer.name.trim().split(/\s+/)[0] || data.customer.name;
  const nameSize = Math.min(46, Math.max(28, Math.floor(280 / (0.6 * firstName.length))));
  const tier = club ? TIERS.find((x) => x.name === club.tier) ?? TIERS[0] : null;
  const earned = club?.pointsEarned ?? Math.floor(t.total / 10);
  const handleDownload = () => (onDownload ? onDownload(data) : downloadReceipt(data, logoSrc, rdepLogoSrc));
  const { copied: couponCopied, copy: copyCode } = useCopy();
  const [date, time] = data.date.split(" ");

  const nav = useMemo<NavItem[]>(
    () => [
      mk("watch", "Watch", "Inside Nautica", "play"),
      mk("receipt", "Receipt", "Items and payment", "bag"),
      mk("rate", "Rate", "How was your visit?", "smile"),
      mk("profile", "Profile", "Complete your details", "user"),
      ...(club ? [mk("points", "Points", `${club.tier} member`, "star"), mk("coupons", "Coupons", `${club.coupons.length} offers waiting`, "ticket")] : []),
      mk("save", "Save more", "Spend more, save more", "trend"),
      mk("refer", "Refer", "Share your link", "users"),
      mk("gift", "Gift card", "Pick an amount", "gift"),
      mk("store", "Store", "Directions and exchange", "pin"),
    ],
    [club],
  );
  const activeIdx = Math.max(0, nav.findIndex((n) => n.id === active));
  const current = nav[activeIdx];
  const sheetGroups = useMemo(
    () =>
      [
        { title: "Your visit", ids: ["watch", "receipt", "rate", "profile"] },
        { title: "Rewards", ids: ["points", "coupons"] },
        { title: "Offers", ids: ["save", "refer", "gift"] },
        { title: "Help", ids: ["store"] },
      ]
        .map((g) => ({ title: g.title, items: nav.filter((n) => g.ids.includes(n.id)) }))
        .filter((g) => g.items.length > 0),
    [nav],
  );

  /* scroll-spy: the chapter crossing the upper part of the screen is the active one */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = nav.map((n) => document.getElementById(`nt-${n.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id.replace("nt-", ""))),
      { rootMargin: "-18% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [nav]);

  /* page progress */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* the pager appears once the hero has scrolled away */
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPassed(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
    } catch {
      /* haptics unavailable */
    }
    jumpTo(id);
  };
  const openSection = (id: string) => {
    closeModal();
    window.setTimeout(() => go(id), 120);
  };

  const isActive = (id: string) => active === id;

  return (
    <div
      style={theme}
      onTouchStart={() => {}}
      className={`nt-root ${fallbackFont.variable} ${displayFont.variable} min-h-screen overflow-x-clip bg-[#C9D5E3] text-[var(--nt-gray)] antialiased [-webkit-text-size-adjust:100%] sm:py-8`}
    >
      <style>{FONT_FACES}</style>

      <main style={zoomStyle(scale)} className="mx-auto w-[400px] overflow-x-clip bg-[var(--nt-wash)] sm:shadow-[0_30px_70px_-28px_rgba(7,27,49,0.6)]">
        {/* =============================== BOARDING PASS (hero) =============================== */}
        <header ref={heroRef} className="nt-grain relative overflow-hidden bg-[var(--nt-navy)] px-5 pb-11 pt-[44px] text-white">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 60% at 90% 0%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg,#0B2A4A 0%,#13406F 100%)" }} />
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]">
            <defs>
              <pattern id="nt-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="#fff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#nt-grid)" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="1" className="nt-compass pointer-events-none absolute -right-24 top-16 h-72 w-72 opacity-[0.1]">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="70" />
            <circle cx="100" cy="100" r="46" />
            <path d="M100 4v192M4 100h192M32 32l136 136M168 32 32 168" />
            <path d="m100 20 10 70 70 10-70 10-10 70-10-70-70-10 70-10z" />
          </svg>
          <Bunting />

          <div className="nt-rise relative flex items-center justify-between gap-4">
            <BrandImage src={logoSrc} alt="NAUTICA" width={320} height={80} priority className="h-6 w-auto max-w-[46%] shrink-0 object-contain object-left brightness-0 invert" fallbackClassName="nt-bold inline-block text-[22px] uppercase leading-none tracking-[0.3em] text-white" />
            {club && tier && (
              <button type="button" onClick={() => jumpTo("points")} aria-label={`${club.tier} member. View points`} className="nt-bold inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] uppercase tracking-[0.14em] text-[var(--nt-deep)]" style={{ background: tier.foil }}>
                <Icon name="star" className="h-3.5 w-3.5" />
                {club.tier}
              </button>
            )}
          </div>

          <div className="nt-rise relative mt-3 flex items-end justify-between gap-3" style={{ animationDelay: "0.08s" }}>
            <div className="min-w-0">
              <p className={`${CAPS} text-white/70`}>Thank you,</p>
              <h1 className="nt-display mt-1 italic leading-[0.95] [overflow-wrap:anywhere]" style={{ fontSize: nameSize }}>
                {firstName}
              </h1>
            </div>
            <button type="button" onClick={() => jumpTo("points")} aria-label={`${inr0(earned)} points earned today. View points`} className="shrink-0 rounded-2xl bg-white/12 px-3.5 py-2 text-right">
              <span className="nt-display block text-[26px] leading-none tabular-nums text-[var(--nt-sun)]">+{inr0(earned)}</span>
              <span className={`mt-1 block ${CAPS} text-[10px] text-white/80`}>points earned</span>
            </button>
          </div>

          <div className="nt-rise relative mt-4 rounded-[26px] bg-white text-[var(--nt-deep)] shadow-[0_26px_40px_-22px_rgba(3,14,26,0.85)]" style={{ animationDelay: "0.16s" }}>
            <div className="flex items-center justify-between gap-3 p-3.5 pb-2.5">
              <div className="min-w-0">
                <p className={`${CAPS} text-[var(--nt-gray)]`}>Total paid</p>
                <p className="nt-display mt-1 text-[30px] leading-none tabular-nums tracking-[-0.02em]">₹{inr(t.total)}</p>
                {t.discount > 0 && <p className="nt-bold mt-1.5 inline-block rounded-md bg-[var(--nt-signal)] px-2 py-1 text-[12px] text-white">You saved ₹{inr(t.discount)}</p>}
              </div>
              <button type="button" onClick={() => setModal("qr")} aria-label="View QR code" className="h-[64px] w-[64px] shrink-0 rounded-[16px] border-[4px] border-[var(--nt-navy)] bg-white p-1.5 shadow-[inset_0_0_0_3px_#E6EDF5]">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
                ) : (
                  <PlaceholderQR seed={data.invoiceNo} />
                )}
              </button>
            </div>
            <div className="relative">
              <span aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#10355C]" />
              <span aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#10355C]" />
              <div className="mx-4 border-t-2 border-dashed border-[rgba(19,64,111,0.22)]" />
            </div>
            <dl className="grid grid-cols-[1.35fr_1fr_0.7fr] gap-2 p-3.5 pt-2.5">
              <div className="min-w-0">
                <dt className={`${CAPS} text-[10px] text-[var(--nt-gray)]`}>Invoice</dt>
                <dd className="nt-bold mt-1 break-all text-[12px] tabular-nums">{data.invoiceNo}</dd>
              </div>
              <div>
                <dt className={`${CAPS} text-[10px] text-[var(--nt-gray)]`}>Date</dt>
                <dd className="nt-bold mt-1 text-[12px] tabular-nums">{date}</dd>
                <dd className="text-[11px] tabular-nums text-[var(--nt-gray)]">{time}</dd>
              </div>
              <div>
                <dt className={`${CAPS} text-[10px] text-[var(--nt-gray)]`}>Paid by</dt>
                <dd className="nt-bold mt-1 text-[12px]">{data.payment.mode}</dd>
              </div>
            </dl>
          </div>

          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[36px] overflow-hidden">
            <WaveBand fill="rgba(255,255,255,0.22)" className="nt-wave-b bottom-0" height={40} />
            <WaveBand fill="#F3F6FA" className="nt-wave-a bottom-0" height={32} />
          </div>
        </header>

        {/* =============================== WATCH =============================== */}
        <Chapter id="watch" label="Watch" icon="play" active={isActive("watch")} tone="wash" wave={false}>
          <div>
            <VideoBlock />
          </div>
        </Chapter>

        {/* =============================== RECEIPT =============================== */}
        <Chapter id="receipt" label="Your receipt" icon="bag" active={isActive("receipt")} tone="mist">
          <div>
            <div className="rounded-t-[26px] bg-white p-3.5 shadow-[0_18px_30px_-24px_rgba(7,27,49,0.5)]">
              <div className="flex items-center justify-between gap-3">
                <p className={`${CAPS} text-[var(--nt-gray)]`}>{store.name}</p>
                <span className="nt-bold rounded-full bg-[var(--nt-mist)] px-3 py-1.5 text-[12px] text-[var(--nt-deep)]">
                  {t.pieces} {t.pieces === 1 ? "item" : "items"}
                </span>
              </div>
              <ul aria-label="Items purchased" className="mt-2">
                {data.items.map((item, i) => (
                  <ItemRow key={`${item.sku}-${i}`} item={item} open={openItem === i} onToggle={() => setOpenItem(openItem === i ? -1 : i)} />
                ))}
              </ul>

              <dl className="mt-1 space-y-1 border-t border-dashed border-[rgba(19,64,111,0.25)] py-2.5">
                {([
                  ["Subtotal (MRP)", `₹${inr(t.subtotal)}`],
                  ["Discount", `− ₹${inr(t.discount)}`],
                  ["SGST", `₹${inr(data.sgst)}`],
                  ["CGST", `₹${inr(data.cgst)}`],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className={`${SMALL} text-[var(--nt-gray)]`}>{k}</dt>
                    <dd className={`${AMOUNT} text-[var(--nt-deep)]`}>{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="nt-grain relative overflow-hidden rounded-2xl bg-[var(--nt-deep)] p-3.5 text-white">
                <div className="relative flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${CAPS} text-white/65`}>Total paid</p>
                    <p className="nt-display mt-0.5 text-[26px] leading-none tabular-nums text-[var(--nt-sun)]">₹{inr(t.total)}</p>
                  </div>
                  <Barcode seed={data.invoiceNo} className="h-8 w-[96px] shrink-0 text-white" />
                </div>
                <p className={`relative mt-2.5 border-t border-dashed border-white/30 pt-2 ${SMALL} text-white/80`}>
                  Paid by <span className="nt-bold text-white">{data.payment.mode} &ndash; {data.payment.ref}</span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {([
                  { icon: "history", label: "History", onClick: () => setModal("history") },
                  { icon: "mail", label: "Email", onClick: () => setModal("email") },
                  { icon: "download", label: "Download", onClick: handleDownload },
                ] as { icon: IconName; label: string; onClick: () => void }[]).map((a) => (
                  <button key={a.label} type="button" onClick={a.onClick} className={`nt-bold flex items-center justify-center gap-1.5 rounded-full border-2 border-[var(--nt-navy)] px-1 py-2.5 text-[11px] uppercase tracking-[0.02em] text-[var(--nt-deep)] active:bg-[var(--nt-navy)] active:text-white ${focusRing}`}>
                    <Icon name={a.icon} className="h-3.5 w-3.5 shrink-0" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div aria-hidden="true" className="nt-teeth" />
          </div>
        </Chapter>

        {/* =============================== RATE =============================== */}
        <Chapter id="rate" label="Rate your visit" icon="smile" active={isActive("rate")} tone="wash">
          <ChapterHead kicker="Rate" title={<>How was your <em>visit?</em></>} />
            <div className={`${card} mt-3 p-3.5`}>
              <FeedbackCard data={data} onSubmit={onSubmitFeedback} />
            </div>
        </Chapter>

        {/* =============================== PROFILE =============================== */}
        <Chapter id="profile" label="Your profile" icon="user" active={isActive("profile")} tone="mist">
          <ChapterHead kicker="Profile" title={<>Your <em>profile</em></>} />
          <ProfileCard data={data} onSave={onSaveProfile} />
        </Chapter>

        {/* =============================== POINTS =============================== */}
        {club && (
          <Chapter id="points" label="Club points" icon="star" active={isActive("points")} tone="dark">
            <ChapterHead dark kicker="Points" title={<>Your <em>rewards</em></>} sub="Points sit on your mobile number. Ask the associate to redeem at billing." />
            <div className="mt-3">
              <ClubCard club={club} mobile={data.customer.mobile} earned={earned} logoSrc={logoSrc} />
            </div>
          </Chapter>
        )}

        {/* =============================== COUPONS =============================== */}
        {club && (
          <Chapter id="coupons" label="Coupons" icon="ticket" active={isActive("coupons")} tone="dark" wave={false}>
            <ChapterHead dark kicker="Coupons" title={<>Your <em>coupons</em></>} sub="Show a code at the billing counter." />
            <div className="mt-3">
              <CouponsSection coupons={club.coupons} now={now} onUse={(c) => { setCouponSheet(c); setModal("coupon"); }} />
            </div>
          </Chapter>
        )}

        {/* =============================== SAVE MORE =============================== */}
        <Chapter id="save" label="Shop more, save more" icon="trend" active={isActive("save")} tone="wash">
          <ChapterHead kicker="Save more" title={<>Shop more, <em>save more</em></>} sub="The bigger your next bill, the bigger the reward." />
          <SaveMore ladder={ladder} billed={t.total} />
        </Chapter>

        {/* =============================== REFER =============================== */}
        <Chapter id="refer" label="Refer a friend" icon="users" active={isActive("refer")} tone="foam">
          <ChapterHead kicker="Refer" title={<>Refer a <em>friend</em></>} />
          <ReferSection referral={referral} onShare={(c) => onShareReferral?.(c)} />
        </Chapter>

        {/* =============================== GIFT =============================== */}
        <Chapter id="gift" label="Gift a Nautica card" icon="gift" active={isActive("gift")} tone="sand">
          <ChapterHead kicker="Gift card" title={<>Gift a <em>Nautica</em> card</>} />
          <GiftSection data={data} onRequest={onRequestGiftCard} />
        </Chapter>

        {/* =============================== STORE =============================== */}
        <Chapter id="store" label="Store and help" icon="pin" active={isActive("store")} tone="wash">
          <ChapterHead kicker="Store" title={<>Need a <em>hand?</em></>} />

            <div className={`${card} mt-3 p-3.5 text-[var(--nt-deep)]`}>
              <p className={`${CAPS} text-[var(--nt-gray)]`}>You shopped at</p>
              <p className="nt-bold mt-0.5 text-[18px] uppercase leading-tight tracking-[-0.01em]">{store.name}</p>
              <p className={`mt-1.5 flex items-start gap-2.5 ${SMALL} text-[var(--nt-gray)]`}>
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--nt-deep)]" />
                {store.address}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name}, ${store.address}`)}`} target="_blank" rel="noopener noreferrer" className={`${solidBtn} !py-3`}>
                  <Icon name="directions" className="h-4 w-4" />
                  Directions
                </a>
                <a href={`tel:${store.phone}`} className={`${ghostBtn} !py-3`}>
                  <Icon name="call" className="h-4 w-4" />
                  Call store
                </a>
              </div>

              <button type="button" onClick={() => setContactOpen((o) => !o)} aria-expanded={contactOpen} aria-controls={contactId} className={`mt-3 flex w-full items-center justify-between gap-2 rounded-full bg-[var(--nt-mist)] py-1.5 pl-5 pr-1.5 text-left ${focusRing}`}>
                <span className={LABEL}>{contactOpen ? "Hide contact and tax info" : "Contact and tax info"}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--nt-deep)] text-white">
                  <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${contactOpen ? "rotate-180" : ""}`} />
                </span>
              </button>
              <Collapse open={contactOpen} id={contactId}>
                <div className="mt-3 space-y-2">
                  <a href={`mailto:${store.email}`} className="flex items-center gap-3 rounded-3xl bg-[var(--nt-mist)] p-3.5">
                    <Icon name="mail" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className={`block ${SMALL} text-[var(--nt-gray)]`}>Email support</span>
                      <span className={`${LABEL} block truncate`}>{store.email}</span>
                    </span>
                  </a>
                  <a href={`tel:${store.phone}`} className="flex items-center gap-3 rounded-3xl bg-[var(--nt-mist)] p-3.5">
                    <Icon name="phone" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className={`block ${SMALL} text-[var(--nt-gray)]`}>Store phone</span>
                      <span className={`${LABEL} block truncate tabular-nums`}>{store.phone}</span>
                    </span>
                  </a>
                  <div className={`grid gap-2 ${store.gstin ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="rounded-3xl bg-[var(--nt-mist)] p-3.5">
                      <p className={`flex items-center gap-1.5 ${SMALL} text-[var(--nt-gray)]`}><Icon name="user" className="h-3.5 w-3.5" /> Sales associate</p>
                      <p className={`${LABEL} mt-1`}>{store.associate}</p>
                    </div>
                    {store.gstin && (
                      <div className="min-w-0 rounded-3xl bg-[var(--nt-mist)] p-3.5">
                        <p className={`flex items-center gap-1.5 ${SMALL} text-[var(--nt-gray)]`}><Icon name="tax" className="h-3.5 w-3.5" /> GSTIN</p>
                        <p className={`${LABEL} mt-1 truncate tabular-nums`} title={store.gstin}>{store.gstin}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Collapse>
            </div>

            <div className={`${card} mt-3 overflow-hidden text-[var(--nt-deep)]`}>
              <h3>
                <button type="button" onClick={() => setExchangeOpen((o) => !o)} aria-expanded={exchangeOpen} aria-controls={exchangeId} className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left ${focusRing}`}>
                  <span>
                    <span className="nt-bold block text-[16px] uppercase leading-tight tracking-[-0.01em]">Exchange policy</span>
                    <span className={`block ${SMALL} text-[var(--nt-gray)]`}>{exchange.days} days to change your mind</span>
                  </span>
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--nt-deep)] text-white">
                    <Icon name="chevron" className={`h-4 w-4 transition-transform duration-300 ${exchangeOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
              </h3>
              <Collapse open={exchangeOpen} id={exchangeId}>
                <ol className="space-y-2 px-5 pb-5">
                  {exchange.points.map((p, i) => (
                    <li key={p} className={`flex items-start gap-3 rounded-3xl bg-[var(--nt-mist)] p-4 ${BODY} text-[var(--nt-gray)]`}>
                      <span className="nt-bold grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--nt-deep)] text-[12px] tabular-nums text-white">{i + 1}</span>
                      {p}
                    </li>
                  ))}
                </ol>
              </Collapse>
            </div>

            <div className={`${card} mt-2 p-3.5`}>
              <p className={`${CAPS} text-[var(--nt-gray)]`}>Get in touch</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  { icon: "instagram", label: "Instagram", href: instagramUrl, ext: true },
                  { icon: "phone", label: "Call us", href: `tel:${data.callTo}`, ext: false },
                  { icon: "mail", label: "Email us", href: `mailto:${data.emailTo}`, ext: false },
                ] as { icon: IconName; label: string; href: string; ext: boolean }[]).map((l) => (
                  <a key={l.label} href={l.href} {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : null)} className={`nt-bold flex flex-col items-center gap-1.5 rounded-[18px] bg-[var(--nt-mist)] py-3 text-center text-[11px] uppercase tracking-[0.1em] text-[var(--nt-deep)] active:bg-[var(--nt-sun)] ${focusRing}`}>
                    <Icon name={l.icon} className="h-5 w-5" />
                    {l.label}
                  </a>
                ))}
              </div>
              <a href={storeLocatorUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-between gap-4 rounded-full bg-[var(--nt-deep)] py-2 pl-5 pr-2 text-white">
                <span>
                  <span className="nt-bold block text-[14px] uppercase tracking-[0.04em]">Find another NAUTICA store</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--nt-sun)] text-black">
                  <Icon name="arrow" className="h-4 w-4" />
                </span>
              </a>
            </div>
        </Chapter>

        {/* =============================== CLOSING =============================== */}
        <footer className="relative">
          <WaveEdge color="var(--nt-abyss)" className="-top-[21px] z-[2]" />
          <div className="nt-grain relative overflow-hidden bg-[var(--nt-abyss)] px-5 pt-6 text-white">
            <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="1" className="nt-compass pointer-events-none absolute -right-20 -top-10 h-72 w-72 opacity-[0.08]">
              <circle cx="100" cy="100" r="92" />
              <circle cx="100" cy="100" r="62" />
              <path d="M100 4v192M4 100h192M32 32l136 136M168 32 32 168" />
            </svg>
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <BrandImage src={logoSrc} alt="NAUTICA" width={320} height={80} className="h-6 w-auto max-w-[50%] object-contain object-left brightness-0 invert" fallbackClassName="nt-bold inline-block text-[22px] uppercase leading-none tracking-[0.3em] text-white" />
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" className={`nt-bold flex items-center gap-1.5 rounded-full bg-[var(--nt-sun)] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--nt-deep)] ${focusRing}`}>
                  Top <Icon name="arrow" className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
              <p className="nt-display mt-3 text-[24px] leading-[1.05] [&_em]:italic [&_em]:text-[var(--nt-sun)]">We are <em>Nautica.</em></p>
              <p className={`mt-1 ${SMALL} text-white/70`}>Thank you for shopping with us. See you in store soon.</p>
              <div className="mt-3 rounded-2xl bg-white/10 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className={`${CAPS} text-[10px] text-white/55`}>Invoice no</p>
                    <p className="nt-bold mt-0.5 break-all text-[12px] tabular-nums">{data.invoiceNo}</p>
                  </div>
                  <div>
                    <p className={`${CAPS} text-[10px] text-white/55`}>Date</p>
                    <p className="nt-bold mt-0.5 text-[12px] tabular-nums">{data.date}</p>
                  </div>
                </div>
                <p className={`mt-2.5 border-t border-white/15 pt-2 text-[11px] leading-snug text-white/65`}>
                  <span className="nt-bold text-white">Registered office. </span>
                  {data.registeredOffice}
                </p>
              </div>
            </div>
            <div aria-hidden="true" className="relative -mx-5 mt-3 h-[34px] overflow-hidden">
              <WaveBand fill="rgba(255,255,255,0.14)" className="nt-wave-b bottom-0" height={32} />
              <WaveBand fill="#FFFFFF" className="nt-wave-a bottom-0" height={24} />
            </div>
          </div>
          <div className={`flex items-center justify-center gap-2.5 bg-white px-5 pb-2 ${CAPS} text-[var(--nt-gray)]`}>
            <span>Powered by</span>
            <BrandImage src={rdepLogoSrc} alt="rdep" width={240} height={80} className="h-6 w-auto" fallbackClassName="text-lg font-bold tracking-tight text-[var(--nt-deep)]" />
          </div>
          <div aria-hidden="true" className="h-20 bg-white" />
        </footer>
      </main>

      {/* ---------------------------- Progress line ---------------------------- */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]">
        <div className="h-full rounded-r-full bg-[var(--nt-signal)]" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* ---------------------------- Pager ---------------------------- */}
      {passed && !modal && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
          <div style={zoomStyle(scale)} className="flex w-[400px] justify-center px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
            <div className="nt-pop pointer-events-auto flex items-center gap-1 rounded-full bg-[rgba(7,27,49,0.94)] p-1.5 text-white shadow-[0_20px_36px_-12px_rgba(7,27,49,0.85)] backdrop-blur-md">
              <button type="button" onClick={() => go(nav[Math.max(0, activeIdx - 1)].id)} disabled={activeIdx === 0} aria-label="Previous section" className={`grid h-11 w-11 place-items-center rounded-full active:bg-white/15 disabled:opacity-30 ${focusRing}`}>
                <Icon name="down" className="h-4 w-4 rotate-180" />
              </button>
              <button type="button" onClick={() => setModal("chart")} aria-haspopup="dialog" className={`flex items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-1.5 pr-5 ${focusRing}`}>
                <span className="relative grid h-10 w-10 place-items-center">
                  <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 -rotate-90">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="17" fill="none" stroke="#F2D9A6" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${progress * 106.8} 106.8`} />
                  </svg>
                  <Icon name="compass" className="h-4 w-4" />
                </span>
                <span className="min-w-[86px] text-left">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-white/55">You are at</span>
                  <span className="nt-bold block text-[14px] leading-tight">{current.label}</span>
                </span>
              </button>
              <button type="button" onClick={() => go(nav[Math.min(nav.length - 1, activeIdx + 1)].id)} disabled={activeIdx === nav.length - 1} aria-label="Next section" className={`grid h-11 w-11 place-items-center rounded-full active:bg-white/15 disabled:opacity-30 ${focusRing}`}>
                <Icon name="down" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------- Jump to sheet ---------------------------- */}
      {modal === "chart" && (
        <Modal title="Jump to" onClose={closeModal} scale={scale} dark>
          <div className="space-y-5">
            {sheetGroups.map((g) => (
              <div key={g.title}>
                <p className={`${CAPS} mb-2 text-white/55`}>{g.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((i) => {
                    const on = i.id === active;
                    return (
                      <button key={i.id} type="button" onClick={() => openSection(i.id)} aria-current={on ? "true" : undefined} className={`flex items-center gap-3 rounded-2xl p-3 text-left ${on ? "bg-[var(--nt-sun)] text-[var(--nt-deep)]" : "bg-white/10 text-white"} ${focusRing}`}>
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${on ? "border-[var(--nt-deep)]" : "border-white/40"}`}>
                          <Icon name={i.icon} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="nt-bold block text-[14px] leading-tight">{i.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-tight opacity-70">{i.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ---------------------------- Coupon: use in store ---------------------------- */}
      {modal === "coupon" && couponSheet && (
        <Modal title="Show at billing" onClose={() => { closeModal(); setCouponSheet(null); }} scale={scale} dark>
          <div className="overflow-hidden rounded-[26px] bg-white text-[var(--nt-deep)]">
            <div className={`p-5 ${kindStyle[couponSheet.kind].bg}`}>
              <p className="nt-bold text-[44px] uppercase leading-[0.9] tracking-[-0.03em]">{couponSheet.value}</p>
              <p className="nt-bold mt-3 text-[14px] uppercase">{couponSheet.title}</p>
              <p className={`mt-1 ${SMALL} text-black/70`}>{couponSheet.description}</p>
            </div>
            <div className="relative">
              <span aria-hidden="true" className="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full bg-[var(--nt-deep)]" />
              <span aria-hidden="true" className="absolute -right-3.5 -top-3.5 h-7 w-7 rounded-full bg-[var(--nt-deep)]" />
              <div className="border-t-2 border-dashed border-black/20" />
            </div>
            <div className="p-5 text-center">
              <Barcode seed={couponSheet.code} className="mx-auto h-24 w-full max-w-[280px]" />
              <p className="nt-bold mt-3 text-[26px] tracking-[0.18em]">{couponSheet.code}</p>
              <p className={`mt-1 ${SMALL} text-[var(--nt-gray)]`}>Valid till {couponSheet.validTill}</p>
            </div>
          </div>
          <p className={`mt-4 text-center ${BODY} text-white/70`}>Hand your phone to the associate. They will apply it to your next bill.</p>
          <button type="button" onClick={() => copyCode(couponSheet.code)} aria-live="polite" className={`${glowBtn} mt-4`}>
            <Icon name="copy" className="h-4 w-4" />
            {couponCopied === couponSheet.code ? "Code copied" : "Copy code"}
          </button>
        </Modal>
      )}

      {/* ---------------------------- Transaction History ---------------------------- */}
      {modal === "history" && (
        <Modal title="Transaction history" onClose={closeModal} scale={scale}>
          <div className="mb-4 flex items-center justify-between rounded-3xl bg-[var(--nt-mist)] p-4">
            <div>
              <p className={`${CAPS} text-[var(--nt-gray)]`}>Total receipts</p>
              <p className={`${LABEL} mt-1 text-[var(--nt-deep)]`}>{history.length} recorded</p>
            </div>
            <div className="text-right">
              <p className={`${CAPS} text-[var(--nt-gray)]`}>Viewing</p>
              <p className={`${LABEL} mt-1 tabular-nums text-[var(--nt-deep)]`}>#{data.invoiceNo.slice(-4)}</p>
            </div>
          </div>
          <ol className="space-y-2.5">
            {history.map((h) => (
              <li key={h.invoiceNo}>
                <div className={`flex items-center justify-between gap-3 rounded-[26px] p-4 ${h.current ? "bg-[var(--nt-deep)] text-white" : "bg-[var(--nt-mist)] text-[var(--nt-deep)]"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`${LABEL} tabular-nums`}>No. {h.invoiceNo}</span>
                      {h.current && <span className="nt-bold rounded-full bg-[var(--nt-sun)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-black">Current</span>}
                    </div>
                    <p className={`mt-1 truncate ${SMALL} ${h.current ? "text-white/70" : "text-[var(--nt-gray)]"}`}>{h.date} &middot; {h.storeName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <span className={`${AMOUNT} block`}>₹{inr(h.amount)}</span>
                      <span className={`block ${SMALL} ${h.current ? "text-white/65" : "text-[var(--nt-gray)]"}`}>{h.items} {h.items === 1 ? "piece" : "pieces"}</span>
                    </div>
                    {!h.current && (
                      <button type="button" onClick={() => { closeModal(); onSelect(h.invoiceNo); }} aria-label={`Open receipt ${h.invoiceNo}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--nt-deep)] text-white">
                        <Icon name="arrow" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Modal>
      )}

      {/* ---------------------------- QR popup ---------------------------- */}
      {modal === "qr" && (
        <Modal title="Receipt QR code" onClose={closeModal} scale={scale}>
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-5 h-56 w-56 rounded-[26px] border-4 border-[var(--nt-deep)] bg-white p-4">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Receipt QR code" className="h-full w-full object-contain" />
              ) : (
                <PlaceholderQR seed={data.invoiceNo} />
              )}
            </div>
            <p className={`${LABEL} tabular-nums text-[var(--nt-deep)]`}>Invoice #{data.invoiceNo}</p>
            <p className={`mt-1 max-w-[280px] ${BODY}`}>Scan this code at the store counter for instant returns or inquiries.</p>
          </div>
        </Modal>
      )}

      {/* ---------------------------- Email popup ---------------------------- */}
      {modal === "email" && (
        <Modal title="Email this receipt" onClose={closeModal} scale={scale}>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!emailOk(email)) {
                setEmailErr("Enter a valid email address, like name@example.com.");
                return;
              }
              setEmailErr("");
              onSendEmail?.(email, data);
              setSentTo(email);
            }}
          >
            <label className="block">
              <span className={fieldLabel}>Email address</span>
              <input type="email" value={email} onChange={(e) => { setSentTo(""); setEmailErr(""); setEmail(e.target.value); }} className={fieldInput} autoComplete="email" aria-invalid={!!emailErr} />
              {emailErr && <span role="alert" className="nt-bold mt-1.5 block text-[13px] text-[var(--nt-signal)]">{emailErr}</span>}
            </label>
            <button type="submit" className={solidBtn}>Send receipt</button>
            <p aria-live="polite" className={sentTo ? `${LABEL} flex items-center justify-center gap-1.5 text-[var(--nt-deep)]` : "sr-only"}>
              {sentTo && (<><Icon name="check" className="h-4 w-4" /> Receipt sent to {sentTo}</>)}
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------- main ------------------------------------------ */
export default function NauticaReceipt({ data, receipts, onSelectReceipt, ...rest }: NauticaReceiptProps) {
  const list = useMemo(() => {
    const base = receipts ?? (data ? [data] : sampleNauticaReceipts);
    const merged = data && !base.some((r) => r.invoiceNo === data.invoiceNo) ? [data, ...base] : base;
    return [...merged].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [data, receipts]);

  const [currentId, setCurrentId] = useState(data?.invoiceNo ?? list[0].invoiceNo);
  const current = list.find((r) => r.invoiceNo === currentId) ?? list[0];

  const history = useMemo<HistoryRow[]>(
    () =>
      list.map((r) => {
        const t = totalsOf(r);
        return { invoiceNo: r.invoiceNo, date: r.date.split(" ")[0], storeName: r.store.name, amount: t.total, items: t.pieces, current: r.invoiceNo === current.invoiceNo };
      }),
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
