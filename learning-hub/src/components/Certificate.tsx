/**
 * Certificate of completion (DESIGN_SYSTEM.md → Certificates), drawn after the Saigon Technology paper
 * certificate: white A4-landscape sheet, double teal frame, teal + gold waves, seal top-left, logo, title,
 * recipient in script, course, date, number, signer. Pure markup (no hooks) → usable in server pages.
 * Every size is in container-query units (cqw), so the same component renders as a thumbnail or full page
 * and prints 1:1 on A4.
 */
import { Bitter, Great_Vibes, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import dayjs from "dayjs";
import { ST_MARK } from "@/lib/brand";

const script = Great_Vibes({ subsets: ["latin", "vietnamese"], weight: "400", variable: "--cert-script", display: "swap" });
const slab = Bitter({ subsets: ["latin", "vietnamese"], weight: ["700"], variable: "--cert-slab", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "vietnamese"], weight: ["400", "700"], variable: "--cert-serif", display: "swap" });
const sans = Source_Sans_3({ subsets: ["latin", "vietnamese"], weight: ["400", "600", "700"], variable: "--cert-sans", display: "swap" });

export type CertificateData = {
  number: string;
  recipientName: string;
  courseTitle: string;
  completedAt: Date | string;
  signerName: string;
  signerTitle: string;
  sealCode: string;
  sealLabel: string;
  sealRing: string;
};

const INK = "#1d4a44";
const GOLD_TEXT = "#c9973b";

function Seal({ code, label, ring }: { code: string; label: string; ring: string }) {
  const cx = 170;
  const pts = Array.from({ length: 32 }, (_, i) => {
    const r = i % 2 === 0 ? 168 : 146;
    const a = (Math.PI * 2 * i) / 32 - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cx + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  const ringR = 124;
  // full circle as two half arcs, starting bottom-left and running clockwise (up the left side, over the top)
  const pt = (deg: number) => `${(cx + ringR * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(cx + ringR * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
  const ringPath = `M ${pt(110)} A ${ringR} ${ringR} 0 0 1 ${pt(290)} A ${ringR} ${ringR} 0 0 1 ${pt(110)}`;
  const labelWords = label.split(" ");
  const half = Math.ceil(labelWords.length / 2);
  return (
    <svg viewBox="0 0 340 340" width="100%" height="100%" aria-hidden>
      <defs>
        <path id="cert-ring" d={ringPath} />
      </defs>
      <polygon points={pts} fill={INK} />
      <circle cx={cx} cy={cx} r={138} fill="#fff" />
      <circle cx={cx} cy={cx} r={110} fill={INK} />
      <text fill={INK} fontFamily="var(--cert-sans)" fontWeight={600} fontSize={17} letterSpacing={1}>
        <textPath href="#cert-ring" textLength={2 * Math.PI * ringR * 0.8} lengthAdjust="spacing">
          {ring.toUpperCase()}
        </textPath>
      </text>
      {[0, 1, 2, 3].map((i) => {
        const a = ((56 + i * 12) * Math.PI) / 180;
        return (
          <text key={i} x={cx + ringR * Math.cos(a)} y={cx + ringR * Math.sin(a) + 6} fill={INK} fontSize={16} textAnchor="middle">
            ★
          </text>
        );
      })}
      <text x={cx} y={122} fill="#fff" textAnchor="middle" fontFamily="var(--cert-sans)" fontWeight={700} fontSize={15}>
        SAIGON TECHNOLOGY
      </text>
      <text x={cx - 64} y={182} fill="#fff" fontFamily="var(--cert-sans)" fontWeight={700} fontSize={46}>
        {code}
      </text>
      <text x={cx - 62} y={214} fill="#fff" fontFamily="var(--cert-sans)" fontWeight={700} fontSize={11.5}>
        {labelWords.slice(0, half).join(" ")}
      </text>
      <text x={cx - 62} y={229} fill="#fff" fontFamily="var(--cert-sans)" fontWeight={700} fontSize={11.5}>
        {labelWords.slice(half).join(" ")}
      </text>
    </svg>
  );
}

/** Frames + teal/gold waves, drawn in the sheet's own 2000 × 1414 coordinate space. */
function Decor() {
  return (
    <svg viewBox="0 0 2000 1414" preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden>
      <defs>
        <linearGradient id="cert-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#11867c" />
          <stop offset="0.5" stopColor="#0c5a5a" />
          <stop offset="1" stopColor="#0a2d36" />
        </linearGradient>
        <linearGradient id="cert-teal-2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0a3940" />
          <stop offset="0.55" stopColor="#0e6f69" />
          <stop offset="1" stopColor="#0a2b33" />
        </linearGradient>
        <linearGradient id="cert-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3d97a" />
          <stop offset="0.18" stopColor="#fbe89a" />
          <stop offset="0.38" stopColor="#c48a22" />
          <stop offset="0.6" stopColor="#f5dc80" />
          <stop offset="0.8" stopColor="#d6a23c" />
          <stop offset="1" stopColor="#fbe9a0" />
        </linearGradient>
        <linearGradient id="cert-gold-v" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e08a" />
          <stop offset="0.45" stopColor="#c58a1e" />
          <stop offset="0.75" stopColor="#f9e79a" />
          <stop offset="1" stopColor="#d8a43c" />
        </linearGradient>
        <pattern id="cert-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="13" cy="13" r="5" fill="#0a3a3c" />
        </pattern>
        <radialGradient id="cert-dots-fade" cx="1" cy="0" r="0.9">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="cert-dots-mask">
          <rect x="1640" y="0" width="360" height="300" fill="url(#cert-dots-fade)" />
        </mask>
      </defs>

      {/* double frame */}
      <rect x="73" y="58" width="1855" height="1297" fill="none" stroke={INK} strokeWidth="2" />
      <rect x="88" y="72" width="1824" height="1268" fill="none" stroke={INK} strokeWidth="7" />

      {/* top-right swoosh: grey shadow, teal, gold ribbon, dots */}
      <path d="M1250,-10 C1600,30 1870,210 2010,560" fill="none" stroke="#d4d4d4" strokeWidth="30" />
      <path d="M1360,-10 C1660,30 1900,210 2010,480 L2010,-10 Z" fill="url(#cert-teal)" />
      <path d="M1310,-10 C1630,30 1890,215 2010,500" fill="none" stroke="url(#cert-gold-v)" strokeWidth="26" />
      <path d="M1360,-10 C1660,30 1900,210 2010,480 L2010,-10 Z" fill="url(#cert-dots)" mask="url(#cert-dots-mask)" opacity="0.8" />

      {/* bottom-left wave: teal body, darker band, gold ribbon, deep teal base, gold hairlines */}
      <path d="M-10,520 C150,880 520,1150 1000,1235 C1400,1305 1750,1180 2010,1030 L2010,1424 L-10,1424 Z" fill="url(#cert-teal)" />
      <path d="M-10,760 C260,1060 700,1250 1150,1265 C1500,1278 1800,1170 2010,1090 L2010,1424 L-10,1424 Z" fill="#0b3d42" opacity="0.9" />
      <path d="M-10,1180 C380,1310 880,1350 1260,1250 C1560,1170 1820,1060 2010,1012 L2010,1052 C1830,1095 1580,1200 1270,1290 C880,1400 380,1380 -10,1272 Z" fill="url(#cert-gold)" />
      <path d="M-10,1272 C380,1380 880,1400 1270,1290 C1580,1200 1830,1095 2010,1052 L2010,1424 L-10,1424 Z" fill="url(#cert-teal-2)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${1330 + i * 95},1424 C${1560 + i * 70},${1310 - i * 28} ${1820 + i * 20},${1205 - i * 22} 2010,${1150 - i * 26}`}
          fill="none"
          stroke="url(#cert-gold-v)"
          strokeWidth="6"
        />
      ))}
    </svg>
  );
}

export default function Certificate({ data }: { data: CertificateData }) {
  const held = dayjs(data.completedAt).locale("en").format("DD MMMM, YYYY");
  return (
    <div className={`lh-cert ${script.variable} ${slab.variable} ${serif.variable} ${sans.variable}`} role="img" aria-label={`Certificate ${data.number}: ${data.recipientName}, ${data.courseTitle}`}>
      <Decor />

      <div className="lh-cert__seal">
        <Seal code={data.sealCode} label={data.sealLabel} ring={data.sealRing} />
      </div>

      <div className="lh-cert__body">
        <div className="lh-cert__logo">
          <svg viewBox={`0 0 ${ST_MARK.width} ${ST_MARK.height}`} className="lh-cert__mark" aria-hidden>
            <path d={ST_MARK.ink} fill="#111" />
            <path d={ST_MARK.accent} fill="#8dc63f" />
          </svg>
          <div>
            <div className="lh-cert__brand">
              SAIGON <span style={{ color: "#8dc63f" }}>TECHNOLOGY</span>
            </div>
            <div className="lh-cert__tagline">YOUR SUCCESS IS OUR MISSION</div>
          </div>
        </div>

        <div className="lh-cert__title">CERTIFICATE</div>
        <div className="lh-cert__subtitle">of successful completion</div>
        <div className="lh-cert__name">{data.recipientName}</div>
        <div className="lh-cert__rule" />
        <div className="lh-cert__text">has successfully completed and actively participated in the</div>
        <div className="lh-cert__course">{data.courseTitle}</div>
        <div className="lh-cert__held">Held on {held}</div>
        <div className="lh-cert__number" style={{ color: GOLD_TEXT }}>Certificate number: {data.number}</div>
      </div>

      <div className="lh-cert__signer">
        <div className="lh-cert__signer-name">{data.signerName}</div>
        <div className="lh-cert__signer-title">{data.signerTitle}</div>
      </div>
    </div>
  );
}
