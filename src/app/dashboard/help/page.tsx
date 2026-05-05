import Link from "next/link";

import { WorkspaceHero, workspaceCardClass, workspaceInsetClass, workspaceSoftInsetClass } from "@/components/workspace-theme";

// ─── Shared SVG primitives ─────────────────────────────────────────────────────

const F = "system-ui,-apple-system,sans-serif";

function Field({ x, y, w, label, value }: { x: number; y: number; w: number; label?: string; value: string }) {
  return (
    <g>
      {label && <text x={x + 10} y={y - 4} fontSize="8" fill="#a09890" fontFamily={F}>{label}</text>}
      <rect x={x} y={y} width={w} height={24} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={x + 10} y={y + 15} fontSize="9.5" fill="#6b6560" fontFamily={F}>{value}</text>
    </g>
  );
}

function Btn({ x, y, w, label, variant = "dark" }: { x: number; y: number; w: number; label: string; variant?: "dark" | "outline" }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={26} rx="13" fill={variant === "dark" ? "#1d1f24" : "white"} stroke={variant === "dark" ? "#1d1f24" : "#ddd8d0"} />
      <text x={x + w / 2} y={y + 17} fontSize="9.5" fill={variant === "dark" ? "white" : "#4a4540"} fontFamily={F} textAnchor="middle" fontWeight="500">{label}</text>
    </g>
  );
}

function Card({ x, y, w, h, title }: { x: number; y: number; w: number; h: number; title?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill="white" stroke="#e8e2d9" />
      {title && <text x={x + 14} y={y + 20} fontSize="10" fontWeight="700" fill="#1d1f24" fontFamily={F}>{title}</text>}
    </g>
  );
}

function Badge({ x, y, label, color = "#f5f3ef", textColor = "#6b6560", borderColor = "#e0dbd3" }: { x: number; y: number; label: string; color?: string; textColor?: string; borderColor?: string }) {
  const w = label.length * 5.8 + 14;
  return (
    <g>
      <rect x={x} y={y} width={w} height={16} rx="8" fill={color} stroke={borderColor} />
      <text x={x + w / 2} y={y + 11} fontSize="8" fill={textColor} fontFamily={F} textAnchor="middle">{label}</text>
    </g>
  );
}

// ─── Step illustrations ────────────────────────────────────────────────────────

function IllustrationCampaignSetup() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />
      {/* Template card */}
      <Card x={12} y={12} w={172} h={234} title="Create template" />
      <Field x={24} y={38} w={148} label="Template name" value="Restaurants – QR menu" />
      <Field x={24} y={78} w={148} label="Niche" value="restaurants" />
      <Field x={24} y={118} w={148} label="Subject guidance" value="Quick question about your…" />
      <rect x={24} y={158} width={148} height={50} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={34} y={173} fontSize="8" fill="#a09890" fontFamily={F}>Body guidance</text>
      <text x={34} y={187} fontSize="9" fill="#6b6560" fontFamily={F}>Hi [name], I noticed your menu</text>
      <text x={34} y={199} fontSize="9" fill="#6b6560" fontFamily={F}>is still a PDF — here's how…</text>
      <Btn x={24} y={222} w={148} label="Save template" />

      {/* Campaign card */}
      <Card x={196} y={12} w={172} h={234} title="Create campaign" />
      <Field x={208} y={38} w={148} label="Campaign name" value="Glasgow Restaurants May 26" />
      <Field x={208} y={78} w={148} label="Niche" value="restaurants" />
      <Field x={208} y={118} w={148} label="Location" value="Glasgow" />
      <Field x={208} y={158} w={148} label="Status" value="draft" />
      <Btn x={208} y={222} w={148} label="Create campaign" />
    </svg>
  );
}

function IllustrationSearchLeads() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />
      {/* Search form */}
      <rect x={12} y={12} width={356} height={62} rx="12" fill="white" stroke="#e8e2d9" />
      <text x={24} y={28} fontSize="8" fill="#a09890" fontFamily={F}>NICHE</text>
      <rect x={24} y={32} width={150} height={24} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={34} y={48} fontSize="9.5" fill="#1d1f24" fontFamily={F}>restaurants</text>
      <text x={186} y={28} fontSize="8" fill="#a09890" fontFamily={F}>LOCATION</text>
      <rect x={186} y={32} width={120} height={24} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={196} y={48} fontSize="9.5" fill="#1d1f24" fontFamily={F}>Glasgow</text>
      <Btn x={316} y={32} w={44} label="Search" />

      {/* Result rows */}
      <text x={24} y={96} fontSize="9" fill="#a09890" fontFamily={F}>12 results for "restaurants" in Glasgow — select to add</text>

      {[
        { name: "The Roost Glasgow", url: "theroostglasgow.co.uk", checked: true },
        { name: "Café Andaluz", url: "cafeandaluz.com", checked: true },
        { name: "Ubiquitous Chip", url: "ubiquitouschip.co.uk", checked: false },
        { name: "Stravaigin Restaurant", url: "stravaigin.co.uk", checked: false },
      ].map(({ name, url, checked }, i) => (
        <g key={name}>
          <rect x={12} y={104 + i * 36} width={356} height={30} rx="8" fill="white" stroke="#e8e2d9" />
          <text x={28} y={123 + i * 36} fontSize="10" fontWeight="600" fill="#1d1f24" fontFamily={F}>{name}</text>
          <text x={28} y={133 + i * 36} fontSize="8.5" fill="#a09890" fontFamily={F}>{url}</text>
          {/* Checkbox */}
          <rect x={346} y={112 + i * 36} width={14} height={14} rx="4"
            fill={checked ? "#1d1f24" : "white"}
            stroke={checked ? "#1d1f24" : "#d4cfc8"} />
          {checked && (
            <path d={`M349 ${119 + i * 36} l3 3 5-5`} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </g>
      ))}

      <Btn x={280} y={252} w={88} label="Done — add 2" />
    </svg>
  );
}

function IllustrationQualifyLead() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      {/* Company header */}
      <text x={20} y={28} fontSize="8" fill="#a09890" fontFamily={F} letterSpacing="1">LEAD PROFILE</text>
      <text x={20} y={46} fontSize="15" fontWeight="700" fill="#1d1f24" fontFamily={F}>The Roost Glasgow</text>
      <text x={20} y={62} fontSize="9" fill="#a09890" fontFamily={F}>Glasgow, Scotland · new</text>

      {/* Action buttons */}
      <Btn x={20} y={76} w={108} label="Analyze website" variant="outline" />
      <Btn x={136} y={76} w={96} label="Score with AI" variant="outline" />
      <Btn x={240} y={76} w={120} label="Generate demo QR" />

      {/* Score panel */}
      <Card x={20} y={116} w={162} h={132} title="Latest AI score" />
      <text x={36} y={156} fontSize="38" fontWeight="700" fill="#1d1f24" fontFamily={F}>84</text>
      <text x={36} y={172} fontSize="9" fill="#a09890" fontFamily={F}>Restaurant · confidence 0.88</text>
      <text x={36} y={190} fontSize="9" fill="#4a4540" fontFamily={F}>QR use case: digital menu</text>
      <text x={36} y={204} fontSize="8.5" fill="#7a7570" fontFamily={F}>Menu still a PDF. Strong fit for</text>
      <text x={36} y={216} fontSize="8.5" fill="#7a7570" fontFamily={F}>table QR → mobile menu upgrade.</text>
      <Badge x={36} y={228} label="qualified" color="#dcfce7" textColor="#16a34a" borderColor="#bbf7d0" />

      {/* Demo panel */}
      <Card x={196} y={116} w={164} h={132} title="Latest demo" />
      {/* QR code mockup */}
      <rect x={210} y={136} width={44} height={44} rx="6" fill="#f8f6f2" stroke="#e8e2d9" />
      {/* QR grid pattern */}
      {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => {
        const on = (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3) || (r === 3 && c === 3) || (r === 5 && c === 5) || (r === 4 && c === 2) || (r === 2 && c === 4) || (r === 6 && c === 1) || (r === 1 && c === 6);
        return on ? <rect key={`${r}-${c}`} x={213 + c * 5.5} y={139 + r * 5.5} width={4.5} height={4.5} rx="0.5" fill="#1d1f24" opacity="0.7" /> : null;
      }))}
      <text x={262} y={152} fontSize="9" fontWeight="600" fill="#1d1f24" fontFamily={F}>Demo QR</text>
      <text x={262} y={164} fontSize="8.5" fill="#7a7570" fontFamily={F}>Mobile menu</text>
      <text x={262} y={176} fontSize="8" fill="#a09890" fontFamily={F}>roost-demo.stirling.qr</text>
      <text x={210} y={198} fontSize="8.5" fill="#2f5bea" fontFamily={F}>Open demo →</text>
      <text x={210} y={212} fontSize="8" fill="#a09890" fontFamily={F}>Generated 5 May 2026</text>
    </svg>
  );
}

function IllustrationAddContacts() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      <Card x={12} y={12} w={356} h={150} title="Add contact" />

      {/* Row 1 */}
      <Field x={24} y={36} w={162} label="Contact name" value="Sarah Macleod" />
      <Field x={198} y={36} w={158} label="Role" value="Manager" />
      {/* Row 2 */}
      <Field x={24} y={76} w={162} label="Email" value="info@theroostglasgow.co.uk" />
      <Field x={198} y={76} w={158} label="Contact type" value="general" />
      {/* Row 3 */}
      <Field x={24} y={116} w={162} label="Consent basis" value="legitimate interest" />
      <Btn x={198} y={120} w={158} label="Add contact" />

      {/* Saved contact card */}
      <text x={24} y={180} fontSize="8.5" fontWeight="600" fill="#a09890" fontFamily={F} letterSpacing="0.5">CONTACTS</text>
      <rect x={12} y={188} width={356} height={60} rx="12" fill="white" stroke="#e8e2d9" />
      {/* Avatar */}
      <circle cx={44} cy={218} r={18} fill="#ede8df" />
      <circle cx={44} cy={212} r={6} fill="#c8c0b4" />
      <path d="M26 230 Q44 222 62 230" stroke="#c8c0b4" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Details */}
      <text x={72} y={210} fontSize="10.5" fontWeight="600" fill="#1d1f24" fontFamily={F}>Sarah Macleod</text>
      <text x={72} y={224} fontSize="9" fill="#7a7570" fontFamily={F}>Manager  ·  info@theroostglasgow.co.uk</text>
      <Badge x={72} y={230} label="general" />
      <text x={332} y={222} fontSize="9" fill="#a09890" fontFamily={F}>Edit</text>
    </svg>
  );
}

function IllustrationGenerateDraft() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      <Card x={12} y={12} w={356} h={244} title="Generate outreach draft" />

      {/* Selectors */}
      <text x={24} y={44} fontSize="8" fill="#a09890" fontFamily={F}>CONTACT</text>
      <rect x={24} y={48} width={160} height={26} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={34} y={65} fontSize="9.5" fill="#1d1f24" fontFamily={F}>Sarah Macleod — info@theroost…</text>
      {/* dropdown chevron */}
      <path d="M172 59 l4 4 4-4" stroke="#a09890" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      <text x={200} y={44} fontSize="8" fill="#a09890" fontFamily={F}>CAMPAIGN</text>
      <rect x={200} y={48} width={156} height={26} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={210} y={65} fontSize="9.5" fill="#1d1f24" fontFamily={F}>Glasgow Restaurants May 26</text>
      <path d="M344 59 l4 4 4-4" stroke="#a09890" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      <text x={24} y={94} fontSize="8" fill="#a09890" fontFamily={F}>TEMPLATE (OPTIONAL)</text>
      <rect x={24} y={98} width={332} height={26} rx="7" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={34} y={115} fontSize="9.5" fill="#1d1f24" fontFamily={F}>Restaurants – QR menu pitch</text>
      <path d="M344 109 l4 4 4-4" stroke="#a09890" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      <Btn x={24} y={138} w={332} label="Generate outreach draft" />

      {/* Generated draft preview */}
      <rect x={24} y={180} width={332} height={64} rx="10" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={36} y={196} fontSize="8" fill="#a09890" fontFamily={F}>GENERATED DRAFT  ·  needs_review</text>
      <text x={36} y={211} fontSize="9.5" fontWeight="600" fill="#1d1f24" fontFamily={F}>Quick question about your menu, Sarah</text>
      <text x={36} y={225} fontSize="9" fill="#6b6560" fontFamily={F}>Hi Sarah, I was browsing The Roost's website and noticed</text>
      <text x={36} y={237} fontSize="9" fill="#6b6560" fontFamily={F}>your menu is a PDF — here's a 30-second demo for you…</text>
    </svg>
  );
}

function IllustrationReviewApprove() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      {/* Editor card */}
      <Card x={12} y={12} w={232} h={236} title="Edit draft" />
      <text x={24} y={44} fontSize="8" fill="#a09890" fontFamily={F}>SUBJECT</text>
      <rect x={24} y={48} width={208} height={22} rx="6" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={34} y={63} fontSize="9.5" fill="#1d1f24" fontFamily={F}>Quick question about your menu</text>
      <text x={24} y={86} fontSize="8" fill="#a09890" fontFamily={F}>BODY</text>
      <rect x={24} y={90} width={208} height={116} rx="8" fill="#f8f6f2" stroke="#e8e2d9" />
      <text x={34} y={108} fontSize="9" fill="#4a4540" fontFamily={F}>Hi Sarah,</text>
      <text x={34} y={122} fontSize="9" fill="#4a4540" fontFamily={F}>I was looking at The Roost</text>
      <text x={34} y={136} fontSize="9" fill="#4a4540" fontFamily={F}>Glasgow's website and noticed</text>
      <text x={34} y={150} fontSize="9" fill="#4a4540" fontFamily={F}>the menu is still a PDF. I've put</text>
      <text x={34} y={164} fontSize="9" fill="#4a4540" fontFamily={F}>together a quick demo that</text>
      <text x={34} y={178} fontSize="9" fill="#4a4540" fontFamily={F}>shows what a QR menu could</text>
      <text x={34} y={192} fontSize="9" fill="#4a4540" fontFamily={F}>look like for you: [demo link]</text>
      <Btn x={24} y={222} w={96} label="Approve draft" />
      <Btn x={128} y={222} w={104} label="Save edits" variant="outline" />

      {/* Status card */}
      <Card x={256} y={12} w={112} h={236} title="Status" />
      <text x={268} y={54} fontSize="8" fill="#a09890" fontFamily={F}>DRAFT STATUS</text>
      <Badge x={268} y={60} label="needs_review" color="#fef9c3" textColor="#a16207" borderColor="#fde68a" />
      <text x={268} y={100} fontSize="8" fill="#a09890" fontFamily={F}>APPROVED</text>
      <text x={268} y={114} fontSize="9.5" fill="#4a4540" fontFamily={F}>No</text>
      <text x={268} y={134} fontSize="8" fill="#a09890" fontFamily={F}>COMPANY</text>
      <text x={268} y={148} fontSize="9.5" fill="#4a4540" fontFamily={F}>The Roost</text>
      <text x={268} y={168} fontSize="8" fill="#a09890" fontFamily={F}>RECIPIENT</text>
      <text x={268} y={182} fontSize="8.5" fill="#4a4540" fontFamily={F}>info@theroost</text>
      <text x={268} y={194} fontSize="8.5" fill="#4a4540" fontFamily={F}>glasgow.co.uk</text>

      {/* After approval indicator */}
      <rect x={256} y={216} width={112} height={32} rx="8" fill="#dcfce7" stroke="#bbf7d0" />
      <text x={312} y={229} fontSize="8" fill="#16a34a" fontFamily={F} textAnchor="middle">After approving:</text>
      <text x={312} y={241} fontSize="8" fontWeight="600" fill="#16a34a" fontFamily={F} textAnchor="middle">status → approved</text>
    </svg>
  );
}

function IllustrationSend() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      {/* Draft status strip */}
      <rect x={12} y={12} width={356} height={50} rx="12" fill="white" stroke="#e8e2d9" />
      <text x={24} y={30} fontSize="10" fontWeight="600" fill="#1d1f24" fontFamily={F}>Quick question about your menu</text>
      <text x={24} y={46} fontSize="9" fill="#7a7570" fontFamily={F}>The Roost Glasgow  ·  info@theroostglasgow.co.uk</text>
      <Badge x={280} y={22} label="approved" color="#dcfce7" textColor="#16a34a" borderColor="#bbf7d0" />

      {/* Send button — prominent */}
      <rect x={12} y={76} width={356} height={48} rx="14" fill="#1d1f24" />
      {/* paper plane */}
      <path d="M40 100 l16-8 -16-8 m16 8 l-40 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x={210} y={104} fontSize="13" fontWeight="600" fill="white" fontFamily={F} textAnchor="middle">Send approved draft</text>

      <Btn x={12} y={138} w={172} label="Save edits" variant="outline" />

      {/* After send — log card */}
      <rect x={12} y={176} width={356} height={72} rx="12" fill="white" stroke="#e8e2d9" />
      <text x={24} y={196} fontSize="8.5" fontWeight="700" fill="#a09890" fontFamily={F} letterSpacing="0.8">AFTER SENDING</text>
      <text x={24} y={212} fontSize="9.5" fill="#4a4540" fontFamily={F}>✓  Send record logged against draft &amp; company</text>
      <text x={24} y={228} fontSize="9.5" fill="#4a4540" fontFamily={F}>✓  Draft status → sent</text>
      <text x={24} y={242} fontSize="9" fill="#a09890" fontFamily={F}>Daily limit enforced via DAILY_SEND_LIMIT env var</text>
    </svg>
  );
}

function IllustrationTracking() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      <text x={20} y={22} fontSize="9" fontWeight="700" fill="#a09890" fontFamily={F} letterSpacing="0.8">TRACKING — mark engagement manually after checking inbox</text>

      {/* Four event buttons */}
      <Btn x={12} y={30} w={82} label="Mark opened" variant="outline" />
      <Btn x={102} y={30} w={82} label="Mark clicked" variant="outline" />
      <Btn x={192} y={30} w={82} label="Mark replied" />
      <Btn x={282} y={30} w={86} label="Mark bounced" variant="outline" />

      {/* Timeline */}
      <line x1={34} y1={74} x2={34} y2={250} stroke="#e8e2d9" strokeWidth="2" strokeDasharray="4 3" />

      {[
        { y: 76, dot: "#e8e2d9", label: "Email sent", detail: "5 May 2026, 09:14" },
        { y: 118, dot: "#fde68a", label: "Opened", detail: "5 May 2026, 14:32 — marked manually" },
        { y: 160, dot: "#bfdbfe", label: "Clicked demo link", detail: "5 May 2026, 14:35 — marked manually" },
        { y: 202, dot: "#bbf7d0", label: "Replied", detail: "6 May 2026, 10:08 — marked manually" },
      ].map(({ y, dot, label, detail }) => (
        <g key={y}>
          <circle cx={34} cy={y + 14} r={8} fill={dot} stroke="#e8e2d9" strokeWidth="1" />
          <rect x={54} y={y} width={314} height={32} rx="8" fill="white" stroke="#e8e2d9" />
          <text x={66} y={y + 14} fontSize="10" fontWeight="600" fill="#1d1f24" fontFamily={F}>{label}</text>
          <text x={66} y={y + 26} fontSize="8.5" fill="#a09890" fontFamily={F}>{detail}</text>
        </g>
      ))}
    </svg>
  );
}

function IllustrationAnalytics() {
  return (
    <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="380" height="260" rx="16" fill="#faf9f6" />

      {/* Top metric strip */}
      {[
        { label: "Total leads", value: "38" },
        { label: "Emails sent", value: "24" },
        { label: "Replies", value: "7" },
        { label: "Conversion", value: "29%" },
      ].map(({ label, value }, i) => (
        <g key={label}>
          <rect x={12 + i * 90} y={12} width={82} height={46} rx="10" fill="white" stroke="#e8e2d9" />
          <text x={23 + i * 90} y={30} fontSize="8" fill="#a09890" fontFamily={F}>{label}</text>
          <text x={23 + i * 90} y={48} fontSize="18" fontWeight="700" fill="#1d1f24" fontFamily={F}>{value}</text>
        </g>
      ))}

      {/* Sector table header */}
      <text x={20} y={82} fontSize="8" fill="#a09890" fontFamily={F} letterSpacing="0.8">SECTOR</text>
      <text x={160} y={82} fontSize="8" fill="#a09890" fontFamily={F} letterSpacing="0.8">LEADS</text>
      <text x={204} y={82} fontSize="8" fill="#a09890" fontFamily={F} letterSpacing="0.8">SENDS</text>
      <text x={250} y={82} fontSize="8" fill="#a09890" fontFamily={F} letterSpacing="0.8">REPLIES</text>
      <text x={306} y={82} fontSize="8" fill="#a09890" fontFamily={F} letterSpacing="0.8">CONV %</text>
      <line x1={12} y1={86} x2={368} y2={86} stroke="#e8e2d9" />

      {[
        { sector: "Restaurants", leads: 18, sends: 14, replies: 5, conv: "35%", highlight: true },
        { sector: "Hotels", leads: 12, sends: 6, replies: 1, conv: "16%", highlight: false },
        { sector: "Estate agents", leads: 8, sends: 4, replies: 1, conv: "25%", highlight: false },
      ].map(({ sector, leads, sends, replies, conv, highlight }, i) => (
        <g key={sector}>
          <rect x={12} y={90 + i * 44} width={356} height={38} rx="10"
            fill={highlight ? "white" : "#faf9f6"} stroke="#e8e2d9" />
          <text x={24} y={112 + i * 44} fontSize="10" fontWeight={highlight ? "600" : "400"} fill="#1d1f24" fontFamily={F}>{sector}</text>
          {highlight && <Badge x={24} y={118 + i * 44} label="best performer" color="#dcfce7" textColor="#16a34a" borderColor="#bbf7d0" />}
          <text x={166} y={113 + i * 44} fontSize="10" fill="#4a4540" fontFamily={F}>{leads}</text>
          <text x={210} y={113 + i * 44} fontSize="10" fill="#4a4540" fontFamily={F}>{sends}</text>
          <text x={256} y={113 + i * 44} fontSize="10" fill="#4a4540" fontFamily={F}>{replies}</text>
          {/* Conv bar */}
          <rect x={302} y={101 + i * 44} width={52} height={14} rx="4" fill="#f0ede8" />
          <rect x={302} y={101 + i * 44} width={conv === "35%" ? 18 : conv === "16%" ? 8 : 13} height={14} rx="4" fill={highlight ? "#1d1f24" : "#c8c0b4"} />
          <text x={360} y={113 + i * 44} fontSize="9" fill="#1d1f24" fontFamily={F}>{conv}</text>
        </g>
      ))}

      <text x={24} y={232} fontSize="8.5" fill="#a09890" fontFamily={F}>Tip: sectors with 0 sends haven't been contacted yet — don't write them off.</text>
    </svg>
  );
}

// ─── Step data ─────────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Set up your campaign shell",
    location: "Outreach → Create template & Create campaign",
    description:
      "Before touching any leads, build the two structures that hold a campaign together. First, create an email template — give it a name, subject guidance, and body positioning notes (these are hints to the AI, not the final email). Then create a campaign named by niche and location, e.g. \"Glasgow Restaurants May 2026\". Leave the status as draft. Every draft you generate later will be filed under this campaign, and performance will roll up against it in analytics.",
    tip: "One template per niche keeps your AI drafts consistent. You can reuse the same campaign for multiple search rounds.",
    Illustration: IllustrationCampaignSetup,
    href: "/dashboard/outreach",
  },
  {
    number: "02",
    title: "Build your lead list",
    location: "Dashboard → Search leads",
    description:
      "Enter a niche (e.g. restaurants) and a location (e.g. Glasgow) and run a search. The app calls Google via SerpAPI, strips out aggregator and booking sites automatically, and shows you the surviving results one by one. Tick the companies you want, click Done — they land in your directory with website, country, and industry already filled in. Run multiple searches to cover different niches or areas within the same campaign. You can also manually add warm leads you already know about using the Add company card on the dashboard.",
    tip: "Aggregator filtering is automatic but not perfect — glance at the URLs before selecting. If a result looks like a review site, skip it.",
    Illustration: IllustrationSearchLeads,
    href: "/dashboard/search",
  },
  {
    number: "03",
    title: "Qualify each lead",
    location: "Company profile → Analysis and scoring",
    description:
      "Click into any company. Hit Analyze website — the app crawls the site, finds emails, identifies menu, booking, event, and product pages, and saves everything as evidence. Then hit Score with AI (this requires evidence to exist first). The AI returns a score from 0–100, a confidence level, the best QR use case for this specific business, and a recommended pitch angle. Companies scoring 75+ are flagged as qualified in analytics. Finally, Generate demo QR creates a personalised landing page demo you can drop into outreach to make it tangible.",
    tip: "Run Analyze website before Score with AI — scoring reads the saved evidence. If analysis finds no email, check the Website evidence panel for a contact page URL.",
    Illustration: IllustrationQualifyLead,
    href: "/dashboard",
  },
  {
    number: "04",
    title: "Add contacts",
    location: "Company profile → Contacts",
    description:
      "Every lead that will receive an email needs at least one contact with an email address saved — this is a hard requirement before drafts can be generated. The website analysis step often surfaces the email automatically in the Website evidence panel. Copy it into the Contacts form, fill in name, role, and contact type (owner, general, or manager), and note the consent basis. You can have multiple contacts per company — a general inbox and an owner, for example — and choose between them when generating drafts.",
    tip: "Set consent basis to the legal basis you're relying on (e.g. \"legitimate interest — B2B outreach\"). This keeps GDPR hygiene clean.",
    Illustration: IllustrationAddContacts,
    href: "/dashboard",
  },
  {
    number: "05",
    title: "Generate outreach drafts",
    location: "Company profile → Outreach",
    description:
      "With a contact and evidence in place, open the Outreach section of the company profile. Select the contact you want to email, pick the campaign you created in step 1, and optionally attach a template. Hit Generate outreach draft. The AI reads the company's website evidence, lead score, QR use case, and your template hints to produce a personalised email. Each draft starts with status needs_review. Repeat for every qualified lead in the campaign — drafts accumulate in the Outreach review queue.",
    tip: "Attaching a template nudges the AI toward your preferred positioning. Without one the draft is still personalised but less on-brand.",
    Illustration: IllustrationGenerateDraft,
    href: "/dashboard",
  },
  {
    number: "06",
    title: "Review and approve",
    location: "Outreach → Draft review queue",
    description:
      "Open each draft in the review queue. Edit the subject line and body directly in the editor — tighten the opening, add the demo QR link, adjust tone. When it reads right, click Approve draft. The status moves to approved. Nothing sends until you explicitly trigger it, so you can batch-approve a full queue and then send in one sitting. The status panel on the right shows whether it's been approved and who the recipient is.",
    tip: "Paste the demo QR URL from the company profile into the email body here. A live demo link consistently improves reply rates.",
    Illustration: IllustrationReviewApprove,
    href: "/dashboard/outreach",
  },
  {
    number: "07",
    title: "Send",
    location: "Draft detail → Send approved draft",
    description:
      "Once a draft is approved, click Send approved draft. The app fires the email via Resend, logs a send record against the draft and company, and marks the status as sent. A daily send limit (controlled by the DAILY_SEND_LIMIT environment variable) prevents bulk sending that could harm deliverability. If you hit the limit, the UI tells you — try again the next day or raise the cap in your environment config.",
    tip: "Stagger your sends across a few days rather than blasting everything at once. Lower daily volume improves inbox placement.",
    Illustration: IllustrationSend,
    href: "/dashboard/outreach",
  },
  {
    number: "08",
    title: "Log engagement",
    location: "Draft detail → Tracking",
    description:
      "After sending, check your inbox and come back to each draft to log what happened. The Tracking panel shows four buttons — Mark opened, Mark clicked, Mark replied, Mark bounced. These are manual updates for now. Logging a reply on a draft is what makes the company appear in the Responded emails panel on Analytics and increments your campaign reply count. If a recipient asks to opt out, send them to the /unsubscribe page — their contact is suppressed automatically from future sends.",
    tip: "Log replies as soon as you get them. Analytics only shows traction when the data is kept current — stale tracking means you can't trust the conversion rates.",
    Illustration: IllustrationTracking,
    href: "/dashboard/outreach",
  },
  {
    number: "09",
    title: "Analyse and iterate",
    location: "Analytics",
    description:
      "The Analytics page breaks performance down by business sector — leads, qualified count, average AI score, emails sent, replies, and conversion rate per industry. Use this to see which niches are actually responding. The Responded emails panel lists every lead that replied with name, sector, and timing. Cross-reference this with the sectors where your AI scores are highest. If restaurants are replying at 35% but hotels are at 16%, run more restaurant searches next round and rework the hotel template.",
    tip: "Conversion rate is replies ÷ sends. A zero-send row means you haven't reached out yet — not that the sector is bad. Don't write off a niche until you've sent at least 10–15 emails into it.",
    Illustration: IllustrationAnalytics,
    href: "/dashboard/analytics",
  },
];

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Why is Score with AI greyed out or returning an error?",
    a: "Scoring requires website evidence to exist first. Open the company profile, run Analyze website, and wait for it to complete. Once evidence appears in the Website evidence panel, scoring will work. If analysis itself fails, check that the company has a valid website URL saved.",
  },
  {
    q: "The search returned no results — what do I do?",
    a: "First check that SERPAPI_KEY is set in your environment variables. If it is, try broadening your niche term (\"food\" instead of \"fine dining\") or check that the location is spelled clearly. SerpAPI sometimes returns fewer organic results for very specific queries.",
  },
  {
    q: "I can't generate a draft — the contact dropdown is empty.",
    a: "A contact with an email address must be saved before drafts can be generated. Go to the Contacts section on the company profile, add a contact, and make sure the email field is filled in. Contacts without an email are excluded from the dropdown.",
  },
  {
    q: "Send approved draft is blocked — what does \"draft not approved\" mean?",
    a: "You need to click Approve draft on the draft detail page before sending. This is a deliberate two-step safety check. Open the draft, review it, click Approve draft, then Send approved draft will become active.",
  },
  {
    q: "What happens when I hit the daily send limit?",
    a: "The app blocks further sends for that calendar day and shows an error message. The limit is set by the DAILY_SEND_LIMIT environment variable. You can either wait until the next day or ask your server admin to raise the cap in your deployment config.",
  },
  {
    q: "A contact unsubscribed — will they get more emails?",
    a: "No. When a contact uses the /unsubscribe page, they are added to the suppression list. Any attempt to send to that contact will be blocked with a \"contact unsubscribed\" error.",
  },
  {
    q: "How is the AI lead score calculated?",
    a: "The score (0–100) is generated by the AI model using the website evidence collected during analysis — page types found (menu, booking, events), email presence, business description, and how well the business maps to known QR use cases. A score of 75+ is treated as qualified in the analytics view.",
  },
  {
    q: "What does the demo QR do?",
    a: "Generating a demo QR creates a personalised landing page scoped to the specific company — it shows what their QR experience could look like. The demo URL and a QR code image are saved to the company profile. You can paste the URL directly into your outreach email to give the prospect something concrete to look at.",
  },
  {
    q: "Can I add a company that's already in my directory?",
    a: "The search results page shows an \"In directory\" badge on companies whose website URL already matches a saved record. You can still add them again, but it creates a duplicate. Check the badge before selecting results.",
  },
  {
    q: "How do I clear my workspace and start fresh?",
    a: "Go to Dashboard → Manage list → Clear company list. Type CLEAR in the confirmation field and submit. This deletes all companies, contacts, notes, evidence, drafts, sends, and demos for your account. It cannot be undone.",
  },
  {
    q: "What environment variables do I need for everything to work?",
    a: "Four variables are required: SERPAPI_KEY (lead search), OPENAI_API_KEY (AI scoring and draft generation), RESEND_API_KEY (email sending), and RESEND_FROM_EMAIL (the from address). The app will tell you in the UI which one is missing when you try to use that feature.",
  },
  {
    q: "Why do some analytics sectors show zero conversion even after sending?",
    a: "Conversion rate is calculated from logged engagement — specifically replies. If you haven't manually marked any emails as replied on the draft detail page, the rate stays at zero even if real replies arrived in your inbox. Keep the tracking panel up to date after each send batch.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <main className="space-y-10">
      <WorkspaceHero
        eyebrow="Help & guidance"
        title="How to run a campaign"
        description="A step-by-step walkthrough of the full workflow — from first search to replied email — with answers to the most common questions."
        tone="lavender"
      />

      {/* Flowline strip */}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-0">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#ece7de] bg-white text-xs font-bold text-slate-700 shadow-sm">
                  {step.number}
                </div>
                <span className="max-w-[80px] text-center text-[10px] leading-tight text-slate-500">{step.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-1 mt-[-18px] h-[2px] w-8 bg-gradient-to-r from-[#ddd9d3] to-[#e8e4de]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <section className="space-y-8">
        {steps.map((step, i) => {
          const isEven = i % 2 === 0;
          return (
            <div key={step.number} className={`${workspaceCardClass} overflow-hidden`}>
              <div className={`grid gap-0 lg:grid-cols-[1fr_1fr] ${isEven ? "" : "lg:[&>*:first-child]:order-last"}`}>
                {/* Illustration panel */}
                <div className="flex items-center justify-center bg-[linear-gradient(135deg,rgba(249,247,243,0.98),rgba(244,241,236,0.95))] p-6 md:p-8 lg:min-h-[630px]">
                  <div className="aspect-[19/13] w-full max-w-[630px]">
                    <step.Illustration />
                  </div>
                </div>

                {/* Text panel */}
                <div className="flex flex-col justify-center gap-5 p-8 lg:p-12">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1d1f24] font-[family:var(--font-display)] text-lg font-bold text-white">
                      {step.number}
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">{step.location}</p>
                      <h2 className="font-[family:var(--font-display)] text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                        {step.title}
                      </h2>
                    </div>
                  </div>

                  <p className="text-[15px] leading-7 text-slate-600">{step.description}</p>

                  <div className={`rounded-[1.25rem] border border-[#e8e3da] bg-[#faf8f4] p-4 text-sm leading-6 text-slate-600 ${workspaceSoftInsetClass}`}>
                    <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Tip</span>
                    {step.tip}
                  </div>

                  <div>
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-2 rounded-full border border-[#e7e1d8] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#d9d1c5] hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Open this page
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-50">
                        <path d="M2.5 7h9m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* FAQ */}
      <section className={`${workspaceCardClass} p-8 lg:p-12`}>
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">FAQ</p>
          <h2 className="mt-3 font-[family:var(--font-display)] text-3xl font-semibold tracking-[-0.05em] text-slate-900">
            Common questions
          </h2>
          <p className="mt-2 text-[15px] text-slate-500">
            Answers to the questions that come up most during a live campaign.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group cursor-pointer rounded-[1.5rem] border border-[#efe9e1] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,250,247,0.96))] transition open:border-[#e0dbd3] open:shadow-sm"
            >
              <summary className="flex list-none items-start justify-between gap-4 p-5 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                <span className="leading-snug">{faq.q}</span>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#e7e1d8] bg-white text-slate-400 transition group-open:rotate-45">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-[#efe9e1] px-5 pb-5 pt-4 text-[14px] leading-7 text-slate-600">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom nav shortcuts */}
      <section className={`${workspaceInsetClass} p-6`}>
        <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-slate-400">Quick navigation</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Directory", href: "/dashboard/directory" },
            { label: "Outreach", href: "/dashboard/outreach" },
            { label: "Analytics", href: "/dashboard/analytics" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center rounded-full border border-[#e7e1d8] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#d9d1c5] hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
