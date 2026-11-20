/* Toki – animierte Design-Hintergründe */
const FX = (() => {
  'use strict';
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, cleanup = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  const BALL = `<svg viewBox="0 0 64 64"><defs><radialGradient id="bg" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd6e4"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(#bg)" stroke="#1d2433" stroke-width="2"/><path d="M32 21l10.5 7.6-4 12.4h-13l-4-12.4z" fill="#1d2433"/><path d="M32 2.5V21M42.5 28.6l17.6-5.3M38.5 41l10.8 15.3M25.5 41L14.7 56.3M21.5 28.6L3.9 23.3" stroke="#1d2433" stroke-width="2.2" fill="none"/><path d="M26 3.2l6 4 6-4M58 19l-1 7 4 5M53 52l-7 1-3 6M11 52l7 1 3 6M6 19l1 7-4 5" fill="#1d2433"/></svg>`;

  const STADIUM = `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" style="position:absolute;left:0;right:0;bottom:0;width:100%;height:46vh">
    <defs>
      <linearGradient id="st1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2233a"/><stop offset="1" stop-color="#6d0b1a"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#ff3b4f" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b4f" stop-opacity="0"/></radialGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <pattern id="rows" width="12" height="9" patternUnits="userSpaceOnUse"><rect width="12" height="9" fill="none"/><path d="M0 8h12" stroke="#ffffff" stroke-opacity=".18"/></pattern>
    </defs>
    <ellipse cx="600" cy="330" rx="640" ry="190" fill="url(#glow)"/>
    <g opacity=".9"><path d="M150 60 L330 300" stroke="url(#beam)" stroke-width="60" opacity=".25"/><path d="M1050 60 L870 300" stroke="url(#beam)" stroke-width="60" opacity=".25"/></g>
    <g fill="#1b2236"><rect x="142" y="60" width="8" height="250"/><rect x="1050" y="60" width="8" height="250"/></g>
    <g fill="#fffbe6"><rect x="120" y="40" width="52" height="24" rx="3"/><rect x="1028" y="40" width="52" height="24" rx="3"/></g>
    <g fill="#fff" opacity=".9"><circle cx="130" cy="47" r="3"/><circle cx="142" cy="47" r="3"/><circle cx="154" cy="47" r="3"/><circle cx="130" cy="57" r="3"/><circle cx="142" cy="57" r="3"/><circle cx="154" cy="57" r="3"/><circle cx="1038" cy="47" r="3"/><circle cx="1050" cy="47" r="3"/><circle cx="1062" cy="47" r="3"/><circle cx="1038" cy="57" r="3"/><circle cx="1050" cy="57" r="3"/><circle cx="1062" cy="57" r="3"/></g>
    <path d="M60 420 C60 250 300 190 600 190 C900 190 1140 250 1140 420Z" fill="url(#st1)"/>
    <path d="M60 420 C60 250 300 190 600 190 C900 190 1140 250 1140 420Z" fill="url(#rows)"/>
    <path d="M60 300 C200 245 400 228 600 228 C800 228 1000 245 1140 300" stroke="#fff" stroke-opacity=".7" stroke-width="5" fill="none"/>
    <ellipse cx="600" cy="370" rx="420" ry="80" fill="#0d3d22"/>
    <g opacity=".35" stroke="#fff" fill="none" stroke-width="2"><ellipse cx="600" cy="370" rx="400" ry="70"/><path d="M600 300v140"/><ellipse cx="600" cy="370" rx="60" ry="14"/></g>
    <g fill="#fff" font-family="Bebas Neue,Impact,sans-serif" font-size="34" text-anchor="middle" opacity=".92"><text x="600" y="268" letter-spacing="10">ROT · WEISS · ARENA</text></g>
  </svg>`;

  const SANTA = `<svg viewBox="0 0 260 90" width="230"><g fill="#6b4226"><path d="M10 40c6-6 14-8 22-6l10-10 4 3-8 9c4 3 6 8 4 13l-6 1-2 14h-4l-1-12-8-2-3 13h-4l1-15c-4-2-6-5-5-8z"/><path d="M62 40c6-6 14-8 22-6l10-10 4 3-8 9c4 3 6 8 4 13l-6 1-2 14h-4l-1-12-8-2-3 13h-4l1-15c-4-2-6-5-5-8z"/></g><path d="M24 22l-4-8M27 21l2-9M76 22l-4-8M79 21l2-9" stroke="#6b4226" stroke-width="2.5"/><circle cx="12" cy="40" r="3" fill="#e0242f"/><path d="M40 46 Q100 52 130 50" stroke="#c9a227" stroke-width="2" fill="none"/><path d="M125 34h70c10 0 14 10 10 20l-6 12h-74c-8 0-10-6-8-12z" fill="#c4122f"/><path d="M118 70h92" stroke="#c9a227" stroke-width="4" stroke-linecap="round"/><path d="M210 70c8 0 10-8 6-12" stroke="#c9a227" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="180" y="20" width="22" height="20" rx="3" fill="#2f8f4e"/><path d="M191 20v20M180 30h22" stroke="#f2d16b" stroke-width="3"/><circle cx="160" cy="22" r="13" fill="#c4122f"/><circle cx="158" cy="12" r="7" fill="#f6d3b8"/><path d="M151 14c0 8 4 12 7 12s7-4 7-12c-2 3-12 3-14 0z" fill="#fff"/><path d="M150 8c2-9 14-11 18-2l7 4-3 3z" fill="#c4122f"/><circle cx="176" cy="12" r="3" fill="#fff"/><path d="M150 8h17" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
  const ELF = (c, d) => `<svg viewBox="0 0 50 70" width="34" style="animation-delay:${d}s"><path d="M10 26 L30 0 L40 26z" fill="${c}"/><circle cx="30" cy="1" r="3.5" fill="#f2d16b"/><rect x="8" y="24" width="34" height="6" rx="3" fill="#fff"/><ellipse cx="25" cy="38" rx="13" ry="12" fill="#f6d3b8"/><path d="M11 37l-6-5 2 8zM39 37l6-5-2 8z" fill="#f6d3b8"/><circle cx="20" cy="37" r="1.8" fill="#222"/><circle cx="30" cy="37" r="1.8" fill="#222"/><path d="M20 43q5 4 10 0" stroke="#a5452f" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="16" cy="42" r="2.5" fill="#f2a0a0" opacity=".7"/><circle cx="34" cy="42" r="2.5" fill="#f2a0a0" opacity=".7"/><path d="M12 50h26l3 20H9z" fill="${c}"/><path d="M12 56h26" stroke="#c9a227" stroke-width="3"/></svg>`;
  const TREE = `<svg viewBox="0 0 120 160" width="110"><path d="M60 8 20 70h18L12 110h22L4 150h112L86 110h22L82 70h18z" fill="#1f6b3a"/><rect x="52" y="148" width="16" height="12" fill="#6b4226"/><path d="M60 0l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#f2d16b"/><g><circle cx="45" cy="62" r="4" fill="#e0242f"/><circle cx="72" cy="80" r="4" fill="#f2d16b"/><circle cx="40" cy="100" r="4" fill="#4da3ff"/><circle cx="80" cy="118" r="4" fill="#e0242f"/><circle cx="55" cy="130" r="4" fill="#f2d16b"/><circle cx="66" cy="45" r="3.5" fill="#4da3ff"/></g><path d="M30 92q30 12 58-6M22 132q40 14 78-8" stroke="#f2d16b" stroke-width="2" fill="none" opacity=".8"/></svg>`;

  const FRYER = (accent = '#ff8a2a') => `<svg viewBox="0 0 80 96" width="100%"><rect x="6" y="6" width="68" height="84" rx="20" fill="#26272c"/><rect x="6" y="6" width="68" height="84" rx="20" fill="url(#fg)" opacity=".5"/><defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect x="20" y="14" width="40" height="18" rx="6" fill="#0d0e10"/><text x="40" y="28" font-family="monospace" font-size="11" fill="${accent}" text-anchor="middle" font-weight="700">200°</text><circle cx="26" cy="38" r="2" fill="${accent}"/><circle cx="54" cy="38" r="2" fill="#5fd38d"/><rect x="12" y="44" width="56" height="38" rx="10" fill="#34363c"/><rect x="28" y="56" width="24" height="9" rx="4.5" fill="#15161a"/><path d="M14 92h10M56 92h10" stroke="#111" stroke-width="4" stroke-linecap="round"/></svg>`;
  const FRIES = `<svg viewBox="0 0 70 90" width="100%"><g stroke="#c98a14" stroke-width="1"><rect x="14" y="8" width="8" height="44" rx="2" fill="#ffd34d" transform="rotate(-12 18 30)"/><rect x="24" y="2" width="8" height="48" rx="2" fill="#ffcb3a" transform="rotate(-4 28 26)"/><rect x="34" y="4" width="8" height="46" rx="2" fill="#ffd34d" transform="rotate(5 38 26)"/><rect x="44" y="10" width="8" height="42" rx="2" fill="#ffc52e" transform="rotate(14 48 30)"/><rect x="29" y="12" width="8" height="40" rx="2" fill="#ffe07a"/></g><path d="M8 36h54l-7 50H15z" fill="#e3262f"/><path d="M8 36h54l-2 12H10z" fill="#c21a24"/><circle cx="35" cy="64" r="11" fill="#fff"/><path d="M31 58v12M35 58v12M39 58v12" stroke="#e3262f" stroke-width="2.4"/></svg>`;
  const HENDL = `<svg viewBox="0 0 110 80" width="100%"><ellipse cx="55" cy="72" rx="48" ry="7" fill="#e9e2d0"/><path d="M14 46c0-20 20-34 42-34s40 12 40 30c0 14-14 26-40 26S14 62 14 46z" fill="#c8741f"/><path d="M22 40c4-14 18-22 34-22" stroke="#e8a64a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/><path d="M80 30c10-8 20-6 22 0 2 5-4 10-12 8z" fill="#b5651a"/><circle cx="101" cy="28" r="5" fill="#fff6e8"/><circle cx="104" cy="33" r="4.5" fill="#fff6e8"/><path d="M76 52c12 4 20 10 20 14 0 4-6 4-10 1z" fill="#b5651a"/><circle cx="94" cy="68" r="4.5" fill="#fff6e8"/><path d="M30 60c6 2 12 2 18 0" stroke="#8f4a10" stroke-width="2" fill="none" opacity=".6"/><g fill="#4caf50"><path d="M10 66c4-6 10-6 12 0-4 3-8 3-12 0z"/><path d="M86 70c4-6 10-6 12 0-4 3-8 3-12 0z"/></g><g fill="#fff" opacity=".7"><circle cx="40" cy="30" r="1.5"/><circle cx="58" cy="26" r="1.5"/><circle cx="48" cy="40" r="1.5"/></g></svg>`;
  const STEAM = `<svg viewBox="0 0 30 50" width="100%"><path d="M10 48c-8-10 8-14 0-24S8 6 14 2M20 48c-8-10 8-14 0-24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></svg>`;

  const css = `
  .fx-bulb{animation:fx-bulb 2.2s ease-in-out infinite alternate;filter:drop-shadow(0 0 6px currentColor)}
  @keyframes fx-bulb{from{opacity:.35}to{opacity:1}}
  .fx-bokeh{position:absolute;--w:auto;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#ffe19a,rgb(212 175 95/0) 70%);animation:fx-glim 5s ease-in-out infinite alternate}
  @keyframes fx-glim{from{transform:scale(.7);filter:blur(1px)}to{transform:scale(1.15);filter:blur(2px)}}
  .fx-hang{position:absolute;top:0;width:46px;transform-origin:50% 0;animation:fx-swing 4.5s ease-in-out infinite alternate}
  .fx-hang span{display:block;width:1.5px;height:var(--len);margin:0 auto;background:linear-gradient(#c9a14a,#7a5d24)}
  .fx-hang svg{display:block;width:46px;margin-top:-4px;filter:drop-shadow(0 6px 8px rgb(0 0 0/.5))}
  @keyframes fx-swing{from{rotate:-5deg}to{rotate:5deg}}
  @media (prefers-reduced-motion:reduce){.fx-bulb,.fx-bokeh,.fx-hang{animation:none}}
  .fx-pop{position:absolute;animation:fx-bob 7s ease-in-out infinite alternate}
  @keyframes fx-bob{from{translate:0 0;rotate:0deg}to{translate:0 14px;rotate:var(--r,6deg)}}
  .fx-buddy{animation:fx-hop 3.2s ease-in-out infinite}
  @keyframes fx-hop{0%,70%,100%{transform:translateY(0) rotate(0)}80%{transform:translateY(-8px) rotate(-4deg)}90%{transform:translateY(0) rotate(3deg)}}
  .fx-wave{transform-origin:18px 80px;animation:fx-wave 1.6s ease-in-out infinite alternate}
  @keyframes fx-wave{from{transform:rotate(0)}to{transform:rotate(-18deg)}}
  @media (prefers-reduced-motion:reduce){.fx-pop,.fx-buddy,.fx-wave{animation:none}}
  .fx-ball{position:absolute;width:var(--s);height:var(--s);left:-80px;top:var(--y);animation:fx-fly var(--d) linear var(--dl) infinite;filter:drop-shadow(0 6px 6px rgb(0 0 0/.35))}
  .fx-ball svg{width:100%;height:100%;animation:fx-spin calc(var(--d)/3) linear infinite}
  @keyframes fx-fly{0%{transform:translate(0,0)}25%{transform:translate(28vw,-14vh)}50%{transform:translate(56vw,-4vh)}75%{transform:translate(84vw,-16vh)}100%{transform:translate(calc(100vw + 160px),2vh)}}
  @keyframes fx-spin{to{transform:rotate(360deg)}}
  .fx-star{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:fx-tw 3s ease-in-out infinite}
  @keyframes fx-tw{50%{opacity:.2}}
  .fx-santa{position:absolute;top:9vh;left:-260px;animation:fx-santa 26s linear 2s infinite;filter:drop-shadow(0 4px 8px rgb(0 0 0/.3))}
  @keyframes fx-santa{0%{transform:translate(0,0) rotate(-3deg)}50%{transform:translate(60vw,-4vh) rotate(2deg)}100%{transform:translate(calc(100vw + 520px),2vh) rotate(-3deg)}}
  .fx-elf{position:absolute;bottom:0}
  .fx-elf svg{display:block;animation:fx-hop 2.4s ease-in-out infinite;transform-origin:bottom center}
  @keyframes fx-hop{0%,60%,100%{transform:translateY(0)}70%{transform:translateY(-12px) rotate(-4deg)}80%{transform:translateY(0)}}
  .fx-float{position:absolute;width:var(--s);top:110vh;left:var(--x);animation:fx-up var(--d) linear var(--dl) infinite;opacity:.95;filter:drop-shadow(0 8px 10px rgb(90 40 0/.22))}
  .fx-float>div{animation:fx-wob 4s ease-in-out infinite alternate}
  @keyframes fx-up{to{transform:translateY(-135vh) rotate(var(--r))}}
  @keyframes fx-wob{from{transform:translateX(-12px) rotate(-6deg)}to{transform:translateX(12px) rotate(6deg)}}

  .fx-floor{position:absolute;left:-50%;right:-50%;bottom:0;height:30vh;background:linear-gradient(#2a0a46,#12062b);overflow:hidden}
  .fx-floor::before{content:'';position:absolute;inset:-100% 0 0;background-image:linear-gradient(#ff4fd8 2px,transparent 2px),linear-gradient(90deg,#ff4fd8 2px,transparent 2px);background-size:60px 40px;transform:perspective(260px) rotateX(62deg);transform-origin:50% 100%;animation:fx-grid 1.6s linear infinite;opacity:.75;filter:drop-shadow(0 0 3px #ff4fd8)}
  @keyframes fx-grid{to{background-position:0 40px}}
  .fx-sun{position:absolute;left:50%;bottom:calc(30vh - 60px);width:min(70vw,420px);aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:linear-gradient(#ffe36a,#ff9a3d 45%,#ff3d9a 80%);-webkit-mask:linear-gradient(#000 52%,transparent 52% 55%,#000 55% 63%,transparent 63% 67%,#000 67% 74%,transparent 74% 79%,#000 79% 85%,transparent 85% 91%,#000 91%);mask:linear-gradient(#000 52%,transparent 52% 55%,#000 55% 63%,transparent 63% 67%,#000 67% 74%,transparent 74% 79%,#000 79% 85%,transparent 85% 91%,#000 91%);filter:drop-shadow(0 0 40px #ff5ab4)}
  .fx-streak{position:absolute;height:3px;width:90px;border-radius:3px;bottom:calc(30vh + 2px);left:-120px;animation:fx-drive var(--d) linear var(--dl) infinite}
  @keyframes fx-drive{to{transform:translateX(calc(100vw + 240px))}}
  .fx-cloud{position:absolute;width:var(--s);top:var(--y);left:-160px;animation:fx-drift var(--d) linear var(--dl) infinite}
  @keyframes fx-drift{to{transform:translateX(calc(100vw + 320px))}}
  .fx-head{transform-origin:110px 50px;animation:fx-nod 6s ease-in-out infinite}
  @keyframes fx-nod{0%,100%{transform:rotate(4deg) translateY(2px)}50%{transform:rotate(-2deg) translateY(3px)}}
  .fx-leaf{position:absolute;top:-30px;width:16px;height:10px;border-radius:0 10px;background:#c98a2a;animation:fx-fall var(--d) linear var(--dl) infinite}
  @keyframes fx-fall{to{transform:translate(var(--x2),110vh) rotate(720deg)}}

  .fx-lamp{position:absolute;top:12vh;width:120px;height:46vh;margin-left:-60px;background:linear-gradient(rgb(255 244 210/.22),transparent 80%);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)}
  .fx-lamp::before{content:'';position:absolute;left:44%;top:0;width:12%;height:8px;border-radius:0 0 6px 6px;background:#fff6d8;box-shadow:0 0 18px 6px rgb(255 244 210/.6)}
  .fx-crane{position:absolute;left:0;right:0;top:12vh;height:30vh}
  .fx-rail{position:absolute;left:0;right:0;top:0;height:10px;background:repeating-linear-gradient(90deg,#f2c200 0 30px,#1b1b1b 30px 60px)}
  .fx-trolley{position:absolute;top:6px;left:0;animation:fx-crane 26s ease-in-out infinite alternate}
  @keyframes fx-crane{from{transform:translateX(5vw)}to{transform:translateX(calc(100vw - 140px))}}
  .fx-hazard{position:absolute;left:0;right:0;bottom:calc(22vh - 8px);height:8px;background:repeating-linear-gradient(-45deg,#f2c200 0 14px,#1b1b1b 14px 28px)}
  .fx-floorlines{position:absolute;left:0;right:0;bottom:0;height:22vh;background:repeating-linear-gradient(90deg,transparent 0 118px,rgb(255 255 255/.05) 118px 120px),linear-gradient(transparent 46%,rgb(242 194 0/.55) 46% 48%,transparent 48%)}
  .fx-spark{position:absolute;bottom:calc(22vh + 13vh);width:3px;height:3px;border-radius:50%;background:#ffd36b;box-shadow:0 0 6px 2px #ffb000;animation:fx-spark 1.4s ease-out infinite;opacity:0}
  @keyframes fx-spark{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) * -1 + 40px))}}
  .fx-blink{animation:fx-tw 1.6s steps(2) infinite}
  .fx-spindle{animation:fx-spin-y 5s ease-in-out infinite alternate}
  @keyframes fx-spin-y{from{transform:translateY(-6px)}to{transform:translateY(10px)}}
  .fx-led{animation:fx-led 1.2s steps(2,jump-none) infinite}
  @keyframes fx-led{0%{opacity:1}50%{opacity:.25}}
  .fx-flow{animation:fx-flow 2.4s linear infinite}
  @keyframes fx-flow{to{stroke-dashoffset:-92}}
  .fx-pult{position:absolute;left:0;right:0;bottom:calc(70px + env(safe-area-inset-bottom));height:120px;filter:drop-shadow(0 -6px 14px rgb(0 0 0/.25))}
  .fx-pult::after{content:'';position:absolute;left:0;right:0;top:100%;height:200px;background:#2c3136}
  .fx-knob{transform-origin:0 0;animation:fx-knob 6s ease-in-out infinite}
  @keyframes fx-knob{0%,40%{transform:rotate(-35deg)}50%,90%{transform:rotate(35deg)}}
  @media (prefers-reduced-motion: reduce){#fx *,#fxf *{animation:none!important}}`;


  const PALM = (flip) => `<svg viewBox="0 0 120 260" width="100%" style="${flip ? 'transform:scaleX(-1)' : ''}"><path d="M58 260 C62 200 66 150 60 90" stroke="#140726" stroke-width="9" fill="none" stroke-linecap="round"/><g fill="#140726"><path d="M60 92 C40 70 14 70 0 84 C20 76 40 80 60 92Z"/><path d="M60 92 C46 60 22 50 6 54 C28 56 46 70 60 92Z"/><path d="M60 92 C70 60 96 50 116 58 C94 58 76 70 60 92Z"/><path d="M60 92 C82 72 108 74 120 90 C102 82 82 82 60 92Z"/><path d="M60 92 C58 62 64 40 76 28 C68 46 64 66 60 92Z"/></g></svg>`;
  const SKYLINE = () => {
    let r = '', x = 0;
    const cols = ['#ff4fd8', '#41e8ff', '#ffd25a'];
    while (x < 1200) {
      const w = 30 + Math.random() * 60, h = 60 + Math.random() * 170;
      r += `<rect x="${x}" y="${260 - h}" width="${w}" height="${h}" fill="#1a0833"/>`;
      for (let wy = 260 - h + 10; wy < 250; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (Math.random() < 0.28) r += `<rect x="${wx}" y="${wy}" width="5" height="7" fill="${cols[(wx + wy) % 3 | 0]}" opacity="${0.5 + Math.random() * 0.5}"/>`;
      x += w + 4;
    }
    return `<svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" style="position:absolute;left:0;right:0;bottom:30vh;width:100%;height:30vh">${r}<text x="600" y="70" text-anchor="middle" font-family="Bebas Neue,Impact,sans-serif" font-size="46" fill="#ff4fd8" style="filter:drop-shadow(0 0 6px #ff4fd8)" letter-spacing="8">NEON CITY</text></svg>`;
  };
  const BENCH = `<svg viewBox="0 0 220 150" width="100%">
    <ellipse cx="110" cy="142" rx="105" ry="7" fill="#000" opacity=".15"/>
    <g fill="#8a5a2b"><rect x="8" y="38" width="204" height="11" rx="3"/><rect x="8" y="54" width="204" height="11" rx="3"/><rect x="2" y="90" width="216" height="12" rx="3"/></g>
    <g fill="#5d3b1a"><rect x="20" y="38" width="7" height="104"/><rect x="193" y="38" width="7" height="104"/><rect x="14" y="100" width="7" height="42"/><rect x="199" y="100" width="7" height="42"/></g>
    <g class="fx-sad">
      <path d="M91 34 C84 58 86 84 92 100 L128 100 C134 84 136 58 129 34 Z" fill="#e9c35a"/>
      <rect x="93" y="55" width="34" height="38" rx="9" fill="#d0202e"/><rect x="93" y="70" width="34" height="6" fill="#fff"/><rect x="108" y="55" width="4" height="38" fill="#1f3f8f" opacity=".6"/>
      <path d="M96 60 C86 72 92 92 100 104" stroke="#f3cfb3" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M124 60 C134 72 128 92 120 104" stroke="#f3cfb3" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="95" y="92" width="13" height="16" rx="3" fill="#1f3f8f"/><rect x="112" y="92" width="13" height="16" rx="3" fill="#1f3f8f"/>
      <rect x="97" y="106" width="9" height="26" fill="#f3cfb3"/><rect x="114" y="106" width="9" height="26" fill="#f3cfb3"/>
      <rect x="96" y="118" width="11" height="14" fill="#d0202e"/><rect x="113" y="118" width="11" height="14" fill="#d0202e"/>
      <path d="M93 132h16v6H90z M111 132h16l3 6h-19z" fill="#222"/>
      <g class="fx-head"><circle cx="110" cy="40" r="13" fill="#f3cfb3"/>
      <path d="M97 40 C97 24 123 24 123 40 C119 31 101 31 97 40Z" fill="#f1cf6b"/>
      <path d="M97 38 C93 50 94 62 96 70 M123 38 C127 50 126 62 124 70" stroke="#f1cf6b" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M104 43 q2 1.5 4 0 M112 43 q2 1.5 4 0" stroke="#6b4a2f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M106 50 q4 -2.5 8 0" stroke="#a5452f" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
    </g>
    <g transform="translate(176 118)"><circle r="12" fill="#fff" stroke="#333" stroke-width="1.5"/><path d="M0 -5l5 3.5-2 6h-6l-2-6z" fill="#333"/></g>
  </svg>`;
  const CLOUD = `<svg viewBox="0 0 120 50" width="100%"><path d="M20 45h80c12 0 18-8 16-16s-10-12-18-10C96 8 86 2 74 6 66-2 48 0 44 12 36 6 24 10 22 20 10 20 4 28 6 36s8 9 14 9z" fill="#fff" opacity=".95"/></svg>`;

  function ensureStyle() {
    if (document.getElementById('fx-css')) return;
    const s = document.createElement('style'); s.id = 'fx-css'; s.textContent = css; document.head.appendChild(s);
  }
  function layers() {
    let back = document.getElementById('fx');
    let front = document.getElementById('fxf');
    if (!front) { front = document.createElement('div'); front.id = 'fxf'; front.style.cssText = 'position:fixed;inset:0;z-index:25;pointer-events:none;overflow:hidden'; document.body.appendChild(front); }
    return { back, front };
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; cleanup.forEach((f) => f()); cleanup = []; }

  function arena(back, front) {
    back.style.background = 'radial-gradient(120% 70% at 50% 0%, #2a3a72 0%, #121a3a 55%, #0a0f24 100%)';
    let html = '';
    for (let i = 0; i < 40; i++) html += `<i class="fx-star" style="left:${rnd(0, 100)}%;top:${rnd(0, 45)}%;animation-delay:${rnd(0, 3)}s;opacity:${rnd(.3, 1)}"></i>`;
    html += STADIUM;
    for (let i = 0; i < 7; i++) html += `<div class="fx-ball" style="--s:${rnd(26, 58)}px;--y:${rnd(8, 70)}vh;--d:${rnd(9, 17)}s;--dl:${-rnd(0, 17)}s">${BALL}</div>`;
    back.innerHTML = html;
    front.innerHTML = `<div class="fx-ball" style="--s:46px;--y:30vh;--d:13s;--dl:4s;opacity:.95">${BALL}</div>`;
  }

  function fryer(back) {
    back.style.background = 'radial-gradient(circle at 20% 10%, #fff3d6 0, transparent 40%), radial-gradient(circle at 90% 80%, #ffe2b8 0, transparent 45%), repeating-linear-gradient(0deg, #f8e2b5 0 38px, #f1d49c 38px 40px), repeating-linear-gradient(90deg, transparent 0 38px, #f1d49c 38px 40px)';
    const items = [];
    for (let i = 0; i < 18; i++) {
      const k = i % 6;
      const svg = k === 0 || k === 3 ? FRYER(['#ff8a2a', '#5fd38d', '#4da3ff'][i % 3]) : k === 1 || k === 4 ? FRIES : k === 2 ? HENDL : STEAM;
      const s = k === 2 ? rnd(80, 120) : k === 5 ? 28 : rnd(52, 86);
      items.push(`<div class="fx-float" style="--s:${s}px;--x:${(i * 37) % 96}vw;--d:${rnd(16, 30)}s;--dl:${-rnd(0, 30)}s;--r:${rnd(-40, 40)}deg"><div style="animation-delay:${-rnd(0, 4)}s">${svg}</div></div>`);
    }
    back.innerHTML = items.join('');
  }

  function xmas(back, front) {
    back.style.background = 'linear-gradient(#0e1a3d 0%, #1d3263 55%, #3c5a8f 100%)';
    let html = '';
    for (let i = 0; i < 50; i++) html += `<i class="fx-star" style="left:${rnd(0, 100)}%;top:${rnd(0, 50)}%;animation-delay:${rnd(0, 3)}s;opacity:${rnd(.3, 1)}"></i>`;
    html += `<div style="position:absolute;right:8vw;top:6vh;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fffbe6,#f3e3a6);box-shadow:0 0 60px 10px rgb(255 244 200/.35)"></div>`;
    html += `<svg viewBox="0 0 1200 300" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:100%;height:28vh"><path d="M0 120 Q200 40 420 110 T820 90 T1200 110 V300 H0Z" fill="#e8f0fb"/><path d="M0 190 Q260 120 560 180 T1200 170 V300 H0Z" fill="#fff"/></svg>`;
    html += `<div style="position:absolute;left:2vw;bottom:10vh">${TREE}</div><div style="position:absolute;right:3vw;bottom:12vh;transform:scale(.75);transform-origin:bottom right">${TREE}</div>`;
    back.innerHTML = html;
    front.innerHTML = `<canvas id="snow" style="position:absolute;inset:0;width:100%;height:100%"></canvas><div class="fx-santa">${SANTA}</div><div id="elves"></div>`;
    const cv = front.querySelector('#snow'), ctx = cv.getContext('2d');
    const elves = front.querySelector('#elves');
    let W, H, dpr, ground, cols, base, flakes;
    const STEP = 3, MAXH = 16;
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nav = document.querySelector('nav.tabs .in');
      const r = nav ? nav.getBoundingClientRect() : null;
      base = { y: r ? r.top + 1 : H, x0: r ? r.left + 8 : 0, x1: r ? r.right - 8 : W };
      cols = Math.ceil(W / STEP);
      const old = ground; ground = new Float32Array(cols); if (old) ground.set(old.subarray(0, Math.min(old.length, cols)));
      const n = Math.min(170, Math.round((W * H) / 7000));
      flakes = Array.from({ length: n }, () => mk(true));
      elves.innerHTML = r ? `<div class="fx-elf" style="left:${r.left + 4}px;top:${r.top - 47}px">${ELF("#2f8f4e", 0)}</div><div class="fx-elf" style="left:${r.right - 40}px;top:${r.top - 47}px">${ELF('#c4122f', 1.1)}</div>` : '';
    }
    const mk = (any) => ({ x: rnd(0, W), y: any ? rnd(-H, H) : rnd(-40, -5), r: rnd(1, 3.4), vy: rnd(.5, 1.5), ph: rnd(0, 6.28), sw: rnd(.3, 1) });
    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      for (const f of flakes) {
        f.y += f.vy * (0.6 + f.r / 3); f.ph += 0.02; f.x += Math.sin(f.ph) * f.sw * 0.6;
        const c = Math.floor(f.x / STEP);
        const onNav = f.x > base.x0 && f.x < base.x1;
        const gy = onNav ? base.y - (ground[c] || 0) : H + 10;
        if (f.y + f.r >= gy) {
          if (onNav) for (let k = -2; k <= 2; k++) { const i = c + k; if (i >= 0 && i < cols) ground[i] = Math.min(MAXH, ground[i] + f.r * (0.22 - Math.abs(k) * 0.05)); }
          Object.assign(f, mk(false));
          continue;
        }
        ctx.globalAlpha = 0.55 + f.r / 8;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Schneedecke auf der Navigationsleiste
      if (Math.random() < 0.05) for (let i = 1; i < cols - 1; i++) ground[i] = (ground[i - 1] + ground[i] * 2 + ground[i + 1]) / 4;
      ctx.beginPath(); ctx.moveTo(base.x0, base.y + 2);
      for (let x = base.x0; x <= base.x1; x += STEP) ctx.lineTo(x, base.y - (ground[Math.floor(x / STEP)] || 0));
      ctx.lineTo(base.x1, base.y + 2); ctx.closePath();
      ctx.shadowColor = 'rgba(80,110,160,.35)'; ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }
    size();
    const onR = () => size();
    window.addEventListener('resize', onR);
    cleanup.push(() => window.removeEventListener('resize', onR));
    if (!reduce()) raf = requestAnimationFrame(frame);
  }


  function neon(back) {
    back.style.background = 'linear-gradient(#0d0322 0%, #2a0b52 35%, #8a1f7a 62%, #ff7a3d 70%, #2a0a46 70.2%)';
    let html = '';
    for (let i = 0; i < 40; i++) html += `<i class="fx-star" style="left:${rnd(0, 100)}%;top:${rnd(0, 35)}%;animation-delay:${rnd(0, 3)}s;opacity:${rnd(.3, 1)}"></i>`;
    html += '<div class="fx-sun"></div>' + SKYLINE() + '<div class="fx-floor"></div>';
    html += `<div style="position:absolute;left:-2vw;bottom:22vh;width:min(28vw,170px)">${PALM(false)}</div><div style="position:absolute;right:-3vw;bottom:20vh;width:min(32vw,200px)">${PALM(true)}</div>`;
    for (let i = 0; i < 5; i++) html += `<div class="fx-streak" style="--d:${rnd(2.5, 5)}s;--dl:${-rnd(0, 5)}s;background:linear-gradient(90deg,transparent,${i % 2 ? '#ff3355' : '#fff6d0'});box-shadow:0 0 10px ${i % 2 ? '#ff3355' : '#fff6d0'}"></div>`;
    back.innerHTML = html;
  }
  function dorf(back) {
    back.style.background = 'linear-gradient(#7fc8ff 0%, #bfe6ff 52%, #6db35f 52.2%, #3f9b4b 100%)';
    let html = `<div style="position:absolute;right:10vw;top:7vh;width:64px;height:64px;border-radius:50%;background:#ffe27a;box-shadow:0 0 50px 12px rgb(255 226 122/.6)"></div>`;
    for (let i = 0; i < 5; i++) html += `<div class="fx-cloud" style="--s:${rnd(90, 170)}px;--y:${rnd(3, 30)}vh;--d:${rnd(50, 90)}s;--dl:${-rnd(0, 90)}s">${CLOUD}</div>`;
    html += `<svg viewBox="0 0 1200 120" preserveAspectRatio="none" style="position:absolute;left:0;right:0;top:44vh;width:100%;height:9vh"><path d="M0 120 C200 40 360 60 520 90 S880 30 1200 80 V120Z" fill="#8cc779"/></svg>`;
    html += `<div style="position:absolute;inset:52vh 0 0;background:repeating-linear-gradient(90deg,transparent 0 60px,rgb(255 255 255/.07) 60px 120px)"></div>`;
    html += `<svg viewBox="0 0 1200 300" preserveAspectRatio="none" style="position:absolute;left:0;right:0;bottom:0;width:100%;height:48vh"><g fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3"><path d="M40 20 H1160 L1200 300 H0Z"/><path d="M600 20 V300"/><ellipse cx="600" cy="150" rx="110" ry="50"/><path d="M40 90 h140 l-10 120 H30"/></g></svg>`;
    html += `<svg viewBox="0 0 160 70" style="position:absolute;left:4vw;top:47vh;width:min(34vw,200px)"><path d="M10 68 V8 H150 V68" stroke="#fff" stroke-width="5" fill="none"/><path d="M10 8 L30 20 H130 L150 8 M30 20 V68 M130 20 V68" stroke="#fff" stroke-opacity=".5" fill="none"/><g stroke="#fff" stroke-opacity=".35"><path d="M30 30 H130 M30 40 H130 M30 50 H130 M30 60 H130 M50 20 V68 M70 20 V68 M90 20 V68 M110 20 V68"/></g></svg>`;
    let flags = '';
    for (let i = 0; i < 24; i++) flags += `<path d="M${i * 50 + 5} ${16 + Math.sin(i) * 2} l20 0 l-10 22z" fill="${['#d0202e', '#ffffff', '#1f3f8f'][i % 3]}"/>`;
    html += `<svg viewBox="0 0 1200 50" preserveAspectRatio="none" style="position:absolute;left:0;right:0;top:0;width:100%;height:6vh"><path d="M0 14 Q300 26 600 14 T1200 14" stroke="#555" fill="none"/>${flags}</svg>`;

    for (let i = 0; i < 4; i++) html += `<i class="fx-leaf" style="left:${rnd(5, 95)}vw;--d:${rnd(12, 20)}s;--dl:${-rnd(0, 20)}s;--x2:${rnd(-80, 80)}px"></i>`;
    back.innerHTML = html;
  }

  // ---------- Werkhalle ----------
  function werkhalle(back) {
    back.style.background = 'linear-gradient(#1b222c 0%, #2a3442 45%, #39434f 72%, #2b313a 72.3%, #20252c 100%)';
    let truss = '';
    for (let x = 0; x < 1200; x += 120) truss += `<path d="M${x} 0 L${x + 60} 70 L${x + 120} 0" stroke="#4a5666" stroke-width="5" fill="none"/><path d="M${x + 60} 70 V0" stroke="#3d4855" stroke-width="3"/>`;
    let html = `<svg viewBox="0 0 1200 90" preserveAspectRatio="none" style="position:absolute;left:0;right:0;top:0;width:100%;height:12vh"><rect width="1200" height="8" fill="#556273"/>${truss}<rect y="70" width="1200" height="8" fill="#556273"/></svg>`;
    for (let i = 0; i < 4; i++) html += `<div class="fx-lamp" style="left:${12 + i * 25}%"></div>`;
    html += `<div class="fx-crane"><div class="fx-rail"></div><div class="fx-trolley"><svg viewBox="0 0 120 200" width="120"><rect x="10" y="0" width="100" height="26" rx="4" fill="#f2c200"/><path d="M10 6h100M10 20h100" stroke="#1b1b1b" stroke-width="3" stroke-dasharray="10 10"/><path d="M58 26V150M62 26V150" stroke="#9aa3ad" stroke-width="2"/><path d="M48 150h24l-6 14h-12z" fill="#f2c200"/><path d="M60 164v10a8 8 0 1 1-8-8" stroke="#c9ced4" stroke-width="5" fill="none"/></svg></div></div>`;
    const mc = (x, w, h, glow) => `<g transform="translate(${x} ${300 - h})"><rect width="${w}" height="${h}" rx="8" fill="#d9dde2"/><rect width="${w}" height="${h}" rx="8" fill="url(#mg)"/><rect x="${w * 0.1}" y="${h * 0.14}" width="${w * 0.55}" height="${h * 0.5}" rx="5" fill="#0d141c"/><rect x="${w * 0.1}" y="${h * 0.14}" width="${w * 0.55}" height="${h * 0.5}" rx="5" fill="url(#gl)" opacity=".5"/><g class="${glow ? 'fx-spindle' : ''}"><rect x="${w * 0.33}" y="${h * 0.18}" width="${w * 0.08}" height="${h * 0.26}" fill="#8b96a3"/><circle cx="${w * 0.37}" cy="${h * 0.47}" r="${w * 0.03}" fill="#ffd36b"/></g><rect x="${w * 0.72}" y="${h * 0.16}" width="${w * 0.2}" height="${h * 0.18}" rx="3" fill="#1d2630"/><rect x="${w * 0.74}" y="${h * 0.18}" width="${w * 0.16}" height="${h * 0.1}" rx="2" fill="#3fa9f5" opacity=".8"/><circle cx="${w * 0.77}" cy="${h * 0.42}" r="5" fill="#2ecc71" class="fx-blink"/><circle cx="${w * 0.84}" cy="${h * 0.42}" r="5" fill="#f2c200"/><rect y="${h - 14}" width="${w}" height="14" fill="#5d6874"/><rect x="${w * 0.88}" y="-60" width="10" height="60" fill="#5d6874"/><circle cx="${w * 0.88 + 5}" cy="-66" r="7" fill="#2ecc71" class="fx-blink"/></g>`;
    html += `<svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" style="position:absolute;left:0;right:0;bottom:22vh;width:100%;height:34vh"><defs><linearGradient id="mg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient><radialGradient id="gl" cx="45%" cy="75%" r="60%"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>${mc(40, 260, 210, true)}${mc(360, 230, 190, false)}${mc(650, 280, 220, true)}${mc(990, 220, 180, false)}</svg>`;
    html += '<div class="fx-hazard"></div><div class="fx-floorlines"></div>';
    for (let i = 0; i < 14; i++) html += `<i class="fx-spark" style="left:${[13, 13.5, 14, 64, 64.5, 65][i % 6]}%;--dx:${rnd(-60, 60)}px;--dy:${rnd(-90, -30)}px;animation-delay:${rnd(0, 2)}s"></i>`;
    back.innerHTML = html;
  }

  // ---------- Schaltschrank ----------
  function schaltschrank(back) {
    back.style.background = '#cfd2cf';
    const W = 1200, H = 900;
    let g = '';
    // Kabelkanäle
    const duct = (x, y, w, h) => { let sl = ''; const horiz = w > h; for (let i = 8; i < (horiz ? w : h) - 8; i += 16) sl += horiz ? `<rect x="${x + i}" y="${y}" width="8" height="${h * 0.32}" fill="#9ea39e"/><rect x="${x + i}" y="${y + h * 0.68}" width="8" height="${h * 0.32}" fill="#9ea39e"/>` : `<rect x="${x}" y="${y + i}" width="${w * 0.32}" height="8" fill="#9ea39e"/><rect x="${x + w * 0.68}" y="${y + i}" width="${w * 0.32}" height="8" fill="#9ea39e"/>`; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#b9bdb8" stroke="#8f948f"/>${sl}<rect x="${x + (horiz ? 0 : w * 0.3)}" y="${y + (horiz ? h * 0.3 : 0)}" width="${horiz ? w : w * 0.4}" height="${horiz ? h * 0.4 : h}" fill="#c7cbc6"/>`; };
    g += duct(20, 20, W - 40, 50) + duct(20, 300, W - 40, 50) + duct(20, 580, W - 40, 50) + duct(20, 20, 50, 860) + duct(W - 70, 20, 50, 860);
    // Hutschienen + Klemmen
    const rail = (y) => { let r = `<rect x="80" y="${y}" width="${W - 160}" height="14" fill="#d8dcdf" stroke="#9aa0a6"/>`; const cols = ['#8c9196', '#8c9196', '#8c9196', '#3c6fd1', '#e6c229', '#8c9196', '#8c9196']; for (let x = 100; x < 520; x += 18) { const c = cols[(x / 18) % cols.length | 0]; r += `<rect x="${x}" y="${y - 40}" width="16" height="94" rx="2" fill="${c}"/><rect x="${x + 3}" y="${y - 34}" width="10" height="8" rx="1" fill="#ffffffaa"/>${c === '#e6c229' ? `<path d="M${x} ${y - 40}l16 30M${x} ${y - 10}l16 30M${x} ${y + 20}l16 30" stroke="#2f9e44" stroke-width="5"/>` : ''}`; } return r; };
    g += rail(170) + rail(450) + rail(730);
    // SPS mit LEDs
    g += `<g transform="translate(560 100)"><rect width="300" height="150" rx="6" fill="#2e3338"/><rect x="10" y="10" width="70" height="130" rx="4" fill="#3f464d"/><text x="45" y="34" fill="#9aa3ad" font-size="12" text-anchor="middle" font-family="monospace">CPU</text>${Array.from({ length: 6 }, (_, i) => `<rect x="${90 + i * 34}" y="10" width="30" height="130" rx="3" fill="#3a4148"/>${Array.from({ length: 8 }, (_, j) => `<circle cx="${100 + i * 34}" cy="${26 + j * 14}" r="4" fill="${['#2ecc71', '#f1c40f', '#2ecc71', '#e74c3c'][(i + j) % 4]}" class="fx-led" style="animation-delay:${((i * 7 + j * 3) % 10) / 5}s;animation-duration:${0.8 + ((i + j) % 5) * 0.35}s"/>`).join('')}`).join('')}<rect x="18" y="50" width="54" height="30" rx="3" fill="#0e3b1f"/><text x="45" y="70" fill="#42f58d" font-size="13" text-anchor="middle" font-family="monospace" class="fx-led" style="animation-duration:2s">RUN</text></g>`;
    // Schütze / Sicherungen
    for (let i = 0; i < 6; i++) g += `<g transform="translate(${600 + i * 90} 395)"><rect width="70" height="110" rx="6" fill="#e9ece9" stroke="#a7aca7"/><rect x="10" y="12" width="50" height="22" rx="3" fill="#596068"/><rect x="24" y="48" width="22" height="30" rx="3" fill="${i % 2 ? '#3c6fd1' : '#596068'}"/><circle cx="35" cy="92" r="6" fill="${i === 2 ? '#e74c3c' : '#2ecc71'}" class="${i === 2 ? '' : 'fx-led'}" style="animation-duration:${1.4 + i * 0.3}s"/></g>`;
    for (let i = 0; i < 10; i++) g += `<g transform="translate(${100 + i * 46} 655)"><rect width="40" height="100" rx="5" fill="#f3f4f2" stroke="#a7aca7"/><rect x="12" y="30" width="16" height="30" rx="3" fill="${i % 3 ? '#2b2f33' : '#c0392b'}"/><rect x="8" y="76" width="24" height="10" fill="#d0d4d0"/></g>`;
    // Leitungen mit "Stromfluss"
    const wires = [['#1f1f1f', 'M140 214 C140 280 420 260 640 250'], ['#3c6fd1', 'M300 214 C300 300 700 280 760 250'], ['#c0392b', 'M200 494 C260 560 640 540 700 505'], ['#2f9e44', 'M420 774 C480 700 860 620 900 505'], ['#7a4a2a', 'M500 494 C560 400 900 420 1000 250']];
    for (const [c, d] of wires) g += `<path d="${d}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="6 40" class="fx-flow" opacity=".75"/>`;
    // Klemmenbeschriftung
    g += `<text x="100" y="125" font-family="monospace" font-size="16" fill="#5b615b">-X1</text><text x="100" y="405" font-family="monospace" font-size="16" fill="#5b615b">-X2</text><text x="560" y="90" font-family="monospace" font-size="16" fill="#5b615b">-A1 SPS</text><text x="600" y="385" font-family="monospace" font-size="16" fill="#5b615b">-K1 … -K6</text><text x="100" y="645" font-family="monospace" font-size="16" fill="#5b615b">-F1 … -F10</text>`;
    let html = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%"><defs><pattern id="perf" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#d6d9d5"/><rect x="8" y="5" width="6" height="12" rx="3" fill="#b8bcb7"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#perf)"/>${g}</svg>`;
    // Bedienpult unten
    html += `<div class="fx-pult"><svg viewBox="0 0 600 120" preserveAspectRatio="xMidYMax meet" width="100%" height="100%">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5258"/><stop offset="1" stop-color="#2c3136"/></linearGradient></defs>
      <path d="M0 30 L600 30 L600 120 L0 120Z" fill="url(#pg)"/><rect y="26" width="600" height="6" fill="#6b737a"/>
      <g transform="translate(60 76)"><circle r="30" fill="#f2c200"/><circle r="22" fill="#c4161c"/><circle r="22" fill="url(#pg)" opacity=".15"/><text y="48" fill="#d6d9dd" font-size="10" text-anchor="middle" font-family="sans-serif">NOT-HALT</text></g>
      <g transform="translate(150 76)"><circle r="17" fill="#1c1f22"/><circle r="13" fill="#2ecc71" class="fx-led" style="animation-duration:1.6s"/><text y="34" fill="#d6d9dd" font-size="10" text-anchor="middle" font-family="sans-serif">START</text></g>
      <g transform="translate(205 76)"><circle r="17" fill="#1c1f22"/><circle r="13" fill="#e74c3c"/><text y="34" fill="#d6d9dd" font-size="10" text-anchor="middle" font-family="sans-serif">STOP</text></g>
      <g transform="translate(270 76)"><circle r="17" fill="#1c1f22"/><rect x="-4" y="-15" width="8" height="30" rx="3" fill="#cfd3d6" class="fx-knob"/><text y="34" fill="#d6d9dd" font-size="10" text-anchor="middle" font-family="sans-serif">AUTO</text></g>
      <g transform="translate(340 60)"><rect x="-10" y="-10" width="150" height="58" rx="6" fill="#0d1a12"/><text x="65" y="16" fill="#42f58d" font-size="16" text-anchor="middle" font-family="monospace">TOKI 07:00</text><text x="65" y="38" fill="#42f58d" font-size="13" text-anchor="middle" font-family="monospace" class="fx-led" style="animation-duration:1s">● BEREIT</text></g>
      <g transform="translate(530 60)">${['#2ecc71', '#f1c40f', '#3fa9f5'].map((c, i) => `<circle cx="${i * 22}" cy="0" r="8" fill="${c}" class="fx-led" style="animation-duration:${1.2 + i * 0.5}s"/>`).join('')}<text x="22" y="34" fill="#d6d9dd" font-size="10" text-anchor="middle" font-family="sans-serif">MELDUNG</text></g>
    </svg></div>`;
    back.innerHTML = html;
  }

  // ---------- Bold Pop: knallige geometrische Formen ----------
  function pop(back) {
    back.style.background = '#fff1cf';
    back.innerHTML = `
      <div style="position:absolute;inset:0;background-image:radial-gradient(#121212 1.4px,transparent 1.6px);background-size:22px 22px;opacity:.13"></div>
      <div class="fx-pop" style="right:-90px;top:-70px;width:260px;height:260px;border-radius:50%;background:#ff2e88;border:4px solid #121212;--r:8deg"></div>
      <div class="fx-pop" style="left:-60px;top:38vh;width:150px;height:150px;background:#2d5bff;border:4px solid #121212;transform:rotate(18deg);--r:-10deg;animation-duration:9s"></div>
      <div class="fx-pop" style="right:-30px;bottom:18vh;width:0;height:0;border-left:90px solid transparent;border-right:90px solid transparent;border-bottom:150px solid #ffe36e;filter:drop-shadow(4px 4px 0 #121212);--r:12deg;animation-duration:11s"></div>
      <div class="fx-pop" style="left:8vw;bottom:-60px;width:180px;height:180px;border-radius:50%;background:#00d1a0;border:4px solid #121212;--r:-6deg;animation-duration:13s"></div>
      <svg viewBox="0 0 300 60" style="position:absolute;left:-10px;top:22vh;width:min(70vw,360px);opacity:.9"><path d="M5 30 Q30 5 55 30 T105 30 T155 30 T205 30 T255 30 T305 30" fill="none" stroke="#121212" stroke-width="7" stroke-linecap="round"/></svg>
      <svg viewBox="0 0 100 100" style="position:absolute;right:12vw;top:52vh;width:64px"><path d="M50 4l10 32 34 2-27 20 10 33-27-19-27 19 10-33L6 38l34-2z" fill="#ff7a00" stroke="#121212" stroke-width="5" stroke-linejoin="round"/></svg>`;
  }

  // ---------- Doodle: handgezeichnete Kritzeleien & Uhr-Figur ----------
  const INK = 'fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const DOODLES = {
    cup: `<svg viewBox="0 0 80 80"><path ${INK} d="M14 32h40l-4 34c0 4-4 6-8 6H26c-4 0-8-2-8-6z"/><path ${INK} d="M54 40c10-2 14 4 12 10s-8 8-14 7"/><path ${INK} d="M26 22c-4-5 4-8 0-14M38 22c-4-5 4-8 0-14"/></svg>`,
    sun: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="14" fill="#ffe680" stroke="#2b2b2b" stroke-width="3"/><path ${INK} d="M40 8v10M40 62v10M8 40h10M62 40h10M17 17l7 7M56 56l7 7M63 17l-7 7M24 56l-7 7"/><path ${INK} d="M34 38h1M46 38h1M35 45c3 3 7 3 10 0"/></svg>`,
    plane: `<svg viewBox="0 0 90 60"><path ${INK} d="M4 30L84 6 60 54 44 38z"/><path ${INK} d="M44 38L84 6M44 38l-4 16 10-10"/></svg>`,
    arrow: `<svg viewBox="0 0 120 60"><path ${INK} d="M6 44c20-30 50-38 80-22"/><path ${INK} d="M76 10l12 13-16 6"/></svg>`,
    star: `<svg viewBox="0 0 60 60"><path d="M30 4l7 16 17 2-13 11 4 17-15-9-15 9 4-17L6 22l17-2z" fill="#ffe680" stroke="#2b2b2b" stroke-width="3" stroke-linejoin="round"/></svg>`,
    swirl: `<svg viewBox="0 0 80 80"><path ${INK} d="M40 40c0-4 6-4 6 0 0 8-12 8-12 0 0-12 18-12 18 0 0 16-24 16-24 0 0-20 30-20 30 0"/></svg>`,
  };
  const BUDDY = `<svg viewBox="0 0 120 150">
    <path d="M30 128l-8 16h16M78 128l8 16H70" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 80c-12-6-16-20-8-26" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round" class="fx-wave"/>
    <path d="M92 84c10 6 18 0 20-8" fill="none" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>
    <circle cx="54" cy="84" r="44" fill="#fffef8" stroke="#2b2b2b" stroke-width="4"/>
    <circle cx="54" cy="84" r="36" fill="#fff4c2" stroke="#2b2b2b" stroke-width="2" stroke-dasharray="3 7"/>
    <path d="M38 22h32M54 22v18" stroke="#2b2b2b" stroke-width="4" stroke-linecap="round"/>
    <circle cx="42" cy="78" r="5" fill="#2b2b2b"/><circle cx="66" cy="78" r="5" fill="#2b2b2b"/><circle cx="44" cy="76" r="1.6" fill="#fff"/><circle cx="68" cy="76" r="1.6" fill="#fff"/>
    <path d="M42 96c6 8 18 8 24 0" fill="#e0453a" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round"/>
    <circle cx="33" cy="92" r="5" fill="#f3b6b0" opacity=".8"/><circle cx="75" cy="92" r="5" fill="#f3b6b0" opacity=".8"/>
    <path d="M54 58v10M54 58l8 -6" stroke="#2f5bd3" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
  const SPRUECHE = ['Kaffee? ☕', 'Gleich Feierabend!', 'Läuft bei dir!', 'Stempeln nicht vergessen!', 'Pause ist auch Arbeit 😉'];
  function doodle(back, front) {
    back.style.background = '#fbf8ef';
    const pos = [['cup', 'left:4vw;top:16vh;width:56px;transform:rotate(-8deg)'], ['sun', 'right:5vw;top:24vh;width:62px'], ['plane', 'left:6vw;top:58vh;width:70px;transform:rotate(-12deg)'], ['arrow', 'right:8vw;top:72vh;width:90px;transform:rotate(10deg)'], ['star', 'left:46vw;top:8vh;width:30px'], ['swirl', 'right:20vw;top:44vh;width:44px'], ['star', 'left:30vw;top:86vh;width:24px']];
    back.innerHTML = `<svg width="0" height="0" style="position:absolute"><filter id="tk-wobble"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></svg>` +
      pos.map(([k, st]) => `<div style="position:absolute;opacity:.32;${st}">${DOODLES[k]}</div>`).join('');
    const say = SPRUECHE[Math.floor(Math.random() * SPRUECHE.length)];
    front.innerHTML = `<div class="fx-buddy" style="position:absolute;right:max(6px,calc(50vw - 250px));bottom:calc(env(safe-area-inset-bottom) + 74px);width:50px">
      <div class="fx-say" style="position:absolute;right:40px;bottom:58px;transform-origin:right bottom;white-space:nowrap;background:#fffef8;border:2px solid #2b2b2b;border-radius:16px 16px 4px 16px;padding:3px 9px;font:16px 'Toki Patrick','Comic Sans MS',cursive;color:#2b2b2b;box-shadow:1px 2px 0 #2b2b2b">${say}</div>${BUDDY}</div>`;
  }

  // ---------- Natur & Eco: weiche Blätter-Flächen ----------
  function eco(back) {
    back.style.background = '#ebe2ce';
    back.innerHTML = `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">
      <path d="M240 -20C330 10 420 40 420 140S360 260 300 230 220 120 240 -20Z" fill="#a9b99a" opacity=".75"/>
      <path d="M-40 560C40 520 140 560 150 650S90 820 -40 820Z" fill="#7b5d43" opacity=".85"/>
      <path d="M330 640C380 610 430 650 430 720S380 820 300 820 290 680 330 640Z" fill="#8fa383" opacity=".7"/>
      <path d="M-30 120C30 100 80 150 60 210S-20 260 -40 230Z" fill="#c9b994" opacity=".6"/>
    </svg>`;
  }
  // ---------- Premium Gold: feiner Glanz ----------
  function gold(back) {
    back.style.background = 'radial-gradient(120% 60% at 80% -10%,rgb(212 175 95/.14),transparent 60%),radial-gradient(90% 50% at -10% 110%,rgb(212 175 95/.08),transparent 60%),#0b0b0c';
  }

  // ---------- Goldene Weihnacht: dunkel, edel, verspielt ----------
  const BAUBLE = (c1, c2, id) => `<svg viewBox="0 0 60 80"><defs><radialGradient id="bb${id}" cx="35%" cy="55%" r="65%"><stop offset="0" stop-color="${c2}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="#1a0a06"/></radialGradient></defs>
    <rect x="23" y="10" width="14" height="9" rx="2" fill="#c9a14a"/><path d="M27 10 Q30 2 33 10" fill="none" stroke="#c9a14a" stroke-width="2"/>
    <circle cx="30" cy="46" r="27" fill="url(#bb${id})"/><path d="M8 42 Q30 52 52 42" fill="none" stroke="#e6c97f" stroke-width="2" opacity=".8"/><path d="M6 50 Q30 60 54 50" fill="none" stroke="#e6c97f" stroke-width="1.2" stroke-dasharray="2 3" opacity=".7"/>
    <ellipse cx="21" cy="36" rx="6" ry="9" fill="#fff" opacity=".22" transform="rotate(25 21 36)"/></svg>`;
  function noel(back, front) {
    back.style.background = 'radial-gradient(120% 70% at 50% -10%,rgb(212 175 95/.16),transparent 55%),radial-gradient(80% 50% at 100% 100%,rgb(150 25 35/.22),transparent 60%),linear-gradient(#071a12,#04100b 60%,#030b08)';
    let html = '';
    // Lichterkette oben
    const W = 1000, bulbs = [];
    for (let i = 0; i <= 24; i++) { const x = (i / 24) * W, y = 26 + Math.sin((i / 24) * Math.PI * 3) * 12 + (i % 2 ? 6 : 0); bulbs.push([x, y]); }
    const cols = ['#ffd36e', '#ff4b4b', '#7dff9a', '#fff4d6', '#ffb347'];
    html += `<svg viewBox="0 0 ${W} 70" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:58px"><path d="M0 18 ${bulbs.map(([x, y]) => `L${x} ${y - 6}`).join(' ')}" fill="none" stroke="#2b3a2f" stroke-width="2"/>${bulbs.map(([x, y], i) => `<ellipse class="fx-bulb" cx="${x}" cy="${y + 4}" rx="6" ry="9" fill="${cols[i % cols.length]}" style="animation-delay:${(i % 5) * 0.4}s;color:${cols[i % cols.length]}"/>`).join('')}</svg>`;
    // Goldener Bokeh-Schimmer
    for (let i = 0; i < 26; i++) html += `<i class="fx-bokeh" style="left:${rnd(0, 100)}%;top:${rnd(8, 92)}%;width:${rnd(6, 26)}px;height:var(--w);animation-delay:${rnd(0, 6)}s;opacity:${rnd(.15, .45)}"></i>`;
    // Hängende Kugeln
    html += `<div class="fx-hang" style="left:4vw;--len:72px;animation-delay:-1s"><span></span>${BAUBLE('#9e1b2a', '#ff6b6b', 'a')}</div>`;
    html += `<div class="fx-hang" style="right:6vw;--len:120px;animation-delay:-2.4s"><span></span>${BAUBLE('#a07a2c', '#ffe19a', 'b')}</div>`;
    html += `<div class="fx-hang" style="right:26vw;--len:44px;animation-delay:-.6s;transform:scale(.7)"><span></span>${BAUBLE('#1f6b45', '#7dd6a0', 'c')}</div>`;
    // Tannenzweige unten
    html += `<svg viewBox="0 0 400 120" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:100%;height:16vh;opacity:.9"><path d="M0 120 L0 60 Q30 40 60 70 Q80 30 120 66 Q150 44 180 76 Q200 50 230 80 Q260 46 300 72 Q330 40 360 70 Q385 52 400 64 L400 120Z" fill="#0b2a1b"/><path d="M0 120 L0 86 Q40 66 80 92 Q120 70 160 96 Q200 74 240 98 Q280 72 320 96 Q360 76 400 92 L400 120Z" fill="#06180f"/>
      ${[40, 120, 210, 300, 370].map((x, i) => `<circle cx="${x}" cy="${78 + (i % 2) * 8}" r="5" fill="${['#c9a14a', '#b3202f', '#e6c97f', '#b3202f', '#c9a14a'][i]}"/>`).join('')}</svg>`;
    back.innerHTML = html;
    // sanfter Schnee
    front.innerHTML = '<canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>';
    const cv = front.querySelector('canvas'), ctx = cv.getContext('2d');
    let Wd, Hd, flakes;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1); Wd = window.innerWidth; Hd = window.innerHeight;
      cv.width = Wd * dpr; cv.height = Hd * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.min(90, Math.round((Wd * Hd) / 11000)) }, () => ({ x: rnd(0, Wd), y: rnd(-Hd, Hd), r: rnd(.8, 2.6), vy: rnd(.3, .9), ph: rnd(0, 6.28) }));
    };
    const frame = () => {
      ctx.clearRect(0, 0, Wd, Hd);
      for (const f of flakes) {
        f.y += f.vy; f.ph += 0.015; f.x += Math.sin(f.ph) * 0.35;
        if (f.y > Hd + 5) { f.y = -5; f.x = rnd(0, Wd); }
        ctx.globalAlpha = 0.55 + f.r / 7; ctx.fillStyle = f.r > 2.2 ? '#f3e2b0' : '#fff';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    size();
    const onR = () => size();
    window.addEventListener('resize', onR);
    cleanup.push(() => window.removeEventListener('resize', onR));
    if (!reduce()) raf = requestAnimationFrame(frame);
  }
  function set(theme) {
    ensureStyle();
    stop();
    const { back, front } = layers();
    back.innerHTML = ''; back.style.background = ''; front.innerHTML = '';
    if (theme === 'arena') arena(back, front);
    else if (theme === 'xmas') xmas(back, front);
    else if (theme === 'noel') noel(back, front);
    else if (theme === 'fryer') fryer(back);
    else if (theme === 'neon') neon(back);
    else if (theme === 'pop') pop(back);
    else if (theme === 'eco') eco(back);
    else if (theme === 'gold') gold(back);
    else if (theme === 'doodle') doodle(back, front);
    else if (theme === 'werk') werkhalle(back);
    else if (theme === 'schrank') schaltschrank(back);
    else if (theme === 'dorf') { dorf(back); front.innerHTML = `<div style="position:absolute;right:max(14px,calc(50vw - 230px));bottom:calc(env(safe-area-inset-bottom) + 70px);width:150px">${BENCH}</div>`; }
  }
  const preview = (id) => ({
    arena: `<div style="position:absolute;right:8px;top:8px;width:26px">${BALL}</div>`,
    xmas: `<div style="position:absolute;right:6px;bottom:-4px;width:34px">${TREE}</div><div style="position:absolute;inset:0;background:radial-gradient(2px 2px at 20% 30%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 50% 60%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 35% 80%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 70% 20%,#fff 50%,transparent 51%)"></div>`,
    fryer: `<div style="position:absolute;left:8px;top:6px;width:34px">${FRYER()}</div><div style="position:absolute;right:8px;top:8px;width:34px">${FRIES}</div>`,
    neon: `<div style="position:absolute;left:4px;bottom:0;width:22px">${PALM(false)}</div><div style="position:absolute;right:4px;bottom:0;width:22px">${PALM(true)}</div>`,
    dorf: `<div style="position:absolute;right:6px;bottom:2px;width:64px">${BENCH}</div>`,
    werk: '<div style="position:absolute;left:0;right:0;top:0;height:6px;background:repeating-linear-gradient(90deg,#f2c200 0 8px,#1b1b1b 8px 16px)"></div><div style="position:absolute;left:10px;bottom:6px;width:46px;height:30px;border-radius:4px;background:#d9dde2"><div style="margin:5px;width:22px;height:16px;border-radius:2px;background:#0d141c;box-shadow:inset 0 -6px 10px #ffd36b88"></div></div>',
    schrank: '<div style="position:absolute;inset:6px 8px auto;height:8px;background:#b9bdb8;border-radius:2px"></div><div style="position:absolute;left:10px;top:20px;display:flex;gap:2px">' + ['#8c9196', '#8c9196', '#3c6fd1', '#e6c229', '#8c9196'].map((c) => `<i style="display:block;width:7px;height:22px;border-radius:1px;background:${c}"></i>`).join('') + '</div><div style="position:absolute;right:10px;bottom:6px;width:22px;height:22px;border-radius:50%;background:#f2c200;display:grid;place-items:center"><i style="display:block;width:14px;height:14px;border-radius:50%;background:#c4161c"></i></div>',
    pop: '<div style="position:absolute;right:-14px;top:-14px;width:46px;height:46px;border-radius:50%;background:#ff2e88;border:3px solid #121212"></div><div style="position:absolute;left:10px;bottom:-8px;width:30px;height:30px;background:#2d5bff;border:3px solid #121212;transform:rotate(18deg)"></div><div style="position:absolute;left:12px;top:10px;font:22px \'Toki Archivo\',Impact,sans-serif;color:#121212;background:linear-gradient(transparent 55%,#ffe36e 55%)">POP!</div>',
    noel: `<div style="position:absolute;left:14px;top:-2px;width:26px">${BAUBLE('#9e1b2a', '#ff6b6b', 'pa')}</div><div style="position:absolute;right:16px;top:6px;width:20px">${BAUBLE('#a07a2c', '#ffe19a', 'pb')}</div><div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;font:italic 600 19px 'Toki PlayfairI',Georgia,serif;color:#e6c97f">Frohe Weihnacht</div>`,
    doodle: `<div style="position:absolute;right:6px;bottom:-6px;width:40px">${BUDDY}</div><div style="position:absolute;left:10px;top:8px;width:26px;opacity:.7">${DOODLES.sun}</div>`,
    dark: '<div style="position:absolute;left:10px;top:12px;right:40%;height:8px;border-radius:4px;background:#3a3c42"></div><div style="position:absolute;left:10px;top:26px;right:55%;height:8px;border-radius:4px;background:#8fd1c1"></div>',
  }[id] || '');
  return { set, preview };
})();
