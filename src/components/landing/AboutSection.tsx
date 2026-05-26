import React, { useState } from 'react';

type TabKey = 'histoire' | 'organisation' | 'principes' | 'reglements' | 'volontariat';

const AboutSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('histoire');

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
    };

    return (
        <section id="about" className="crt-about">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

                .crt-about {
                  --red: #C8102E; --red2: #E8112F; --red-glow: rgba(200,16,46,0.18);
                  --bg: #F8F5F0; --bg2: #FDFCFA;
                  --ink: #1A0A0D; --ink2: #4A2A30; --ink3: #8A6A70;
                  --glass: rgba(255,255,255,0.62); --glass-b: rgba(200,16,46,0.10);
                  --card-br: 22px;
                  --ff-display: 'Playfair Display', Georgia, serif;
                  --ff-body: 'DM Sans', system-ui, sans-serif;
                  --ff-mono: 'DM Mono', monospace;
                  
                  font-family: var(--ff-body);
                  background: var(--bg);
                  color: var(--ink);
                  position: relative;
                  overflow: hidden;
                }
                
                /* ── BACKGROUND ── */
                .crt-about .bg-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
                .crt-about .bg-canvas svg { width: 100%; height: 100%; }

                /* ── ANIMATED ORBS ── */
                .crt-about .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.18; pointer-events: none; z-index: 0; animation: drift 18s ease-in-out infinite alternate; }
                .crt-about .orb1 { width: 600px; height: 600px; background: radial-gradient(circle, #C8102E, transparent 70%); top: -150px; right: -100px; animation-delay: 0s; }
                .crt-about .orb2 { width: 400px; height: 400px; background: radial-gradient(circle, #E8112F, transparent 70%); bottom: -100px; left: -80px; animation-delay: -9s; }
                .crt-about .orb3 { width: 300px; height: 300px; background: radial-gradient(circle, #C8102E, transparent 70%); top: 40%; left: 50%; animation-delay: -4s; opacity: 0.08; }
                @keyframes drift { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(30px,40px) scale(1.06); } }

                /* ── LAYOUT ── */
                .crt-about .wrapper { position: relative; z-index: 2; max-width: 1180px; margin: 0 auto; padding: 80px 40px 120px; }

                /* ── HEADER ── */
                .crt-about .header { text-align: center; margin-bottom: 64px; animation: fadeUp 0.8s ease both; }
                .crt-about .eyebrow { font-size: 11px; font-weight: 600; color: var(--red); text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 12px; }
                .crt-about .eyebrow::before, .crt-about .eyebrow::after { content: ''; display: block; height: 1px; width: 48px; background: linear-gradient(to right, transparent, var(--red)); }
                .crt-about .eyebrow::after { background: linear-gradient(to left, transparent, var(--red)); }
                .crt-about h1.title { font-family: var(--ff-display); font-size: clamp(38px, 5vw, 72px); font-weight: 900; line-height: 1.05; color: var(--ink); letter-spacing: -0.02em; margin: 0; }
                .crt-about h1.title span { color: var(--red); }
                .crt-about .subtitle { font-size: 15px; color: var(--ink3); margin-top: 16px; max-width: 580px; margin-left: auto; margin-right: auto; line-height: 1.7; }

                /* ── CRESCENT EMBLEM ── */
                .crt-about .emblem-wrap { display: flex; justify-content: center; margin-bottom: 48px; animation: fadeUp 0.9s ease 0.15s both; }
                .crt-about .emblem { width: 90px; height: 90px; position: relative; }
                .crt-about .emblem svg { width: 100%; height: 100%; }

                /* ── STATS ── */
                .crt-about .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 64px; animation: fadeUp 0.8s ease 0.2s both; }
                .crt-about .stat-card { background: var(--glass); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--glass-b); border-radius: var(--card-br); padding: 28px 20px; text-align: center; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); cursor: default; position: relative; overflow: hidden; }
                .crt-about .stat-card::before { content: ''; position: absolute; inset: 0; border-radius: var(--card-br); background: radial-gradient(circle at 50% 0%, rgba(200,16,46,0.06), transparent 70%); opacity: 0; transition: opacity 0.4s; }
                .crt-about .stat-card:hover { transform: translateY(-6px); border-color: rgba(200,16,46,0.35); box-shadow: 0 20px 60px var(--red-glow); }
                .crt-about .stat-card:hover::before { opacity: 1; }
                .crt-about .stat-val { font-family: var(--ff-display); font-size: 32px; font-weight: 900; color: var(--red); line-height: 1; }
                .crt-about .stat-lbl { font-size: 10px; color: var(--ink3); margin-top: 8px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500; }

                /* ── TABS ── */
                .crt-about .tabs { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; animation: fadeUp 0.8s ease 0.3s both; }
                .crt-about .tab { padding: 11px 26px; border-radius: 100px; font-size: 13px; font-weight: 600; font-family: var(--ff-body); cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 9px; border: 1.5px solid rgba(200,16,46,0.18); background: var(--glass); backdrop-filter: blur(8px); color: var(--ink2); outline: none; }
                .crt-about .tab:hover { border-color: rgba(200,16,46,0.4); color: var(--red); }
                .crt-about .tab.active { border-color: var(--red); background: rgba(200,16,46,0.09); color: var(--red); }
                .crt-about .tab svg { flex-shrink: 0; }

                /* ── PANEL ── */
                .crt-about .panel { display: none; animation: panelIn 0.45s ease both; }
                .crt-about .panel.active { display: block; }
                @keyframes panelIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

                /* ── GLASS CARD ── */
                .crt-about .glass-card { background: var(--glass); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--glass-b); border-radius: var(--card-br); transition: all 0.4s cubic-bezier(.22,.68,0,1.4); }
                .crt-about .glass-card:hover { border-color: rgba(200,16,46,0.35); transform: translateY(-4px); box-shadow: 0 16px 52px var(--red-glow); }
                .crt-about .section-heading { font-family: var(--ff-display); font-size: 22px; font-weight: 700; color: var(--ink); margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
                .crt-about .section-heading svg { color: var(--red); }

                /* ── TIMELINE ── */
                .crt-about .timeline { position: relative; padding-left: 52px; }
                .crt-about .tl-line { position: absolute; left: 20px; top: 16px; bottom: 16px; width: 2px; background: linear-gradient(to bottom, var(--red), rgba(200,16,46,0.1)); border-radius: 2px; }
                .crt-about .tl-item { position: relative; margin-bottom: 24px; }
                .crt-about .tl-dot { position: absolute; left: -40px; top: 18px; width: 18px; height: 18px; border-radius: 50%; background: var(--bg2); border: 3px solid var(--red); box-shadow: 0 0 0 5px rgba(200,16,46,0.12), 0 0 16px rgba(200,16,46,0.2); z-index: 2; animation: pulseDot 3s ease-in-out infinite; }
                @keyframes pulseDot { 0%, 100% { box-shadow: 0 0 0 5px rgba(200,16,46,0.12), 0 0 16px rgba(200,16,46,0.2); } 50% { box-shadow: 0 0 0 9px rgba(200,16,46,0.06), 0 0 24px rgba(200,16,46,0.3); } }
                .crt-about .tl-connector { position: absolute; left: -20px; top: 23px; width: 20px; height: 2px; background: rgba(200,16,46,0.25); }
                .crt-about .tl-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: 18px; padding: 18px 26px; display: flex; align-items: center; gap: 20px; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); }
                .crt-about .tl-card:hover { border-color: rgba(200,16,46,0.35); transform: translateX(6px); box-shadow: 0 12px 40px var(--red-glow); }
                .crt-about .tl-year { font-family: var(--ff-display); font-size: 30px; font-weight: 900; color: var(--red); line-height: 1; min-width: 56px; text-align: center; }
                .crt-about .tl-month { font-size: 10px; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
                .crt-about .tl-sep { width: 1px; height: 40px; background: rgba(200,16,46,0.18); flex-shrink: 0; }
                .crt-about .tl-evt { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
                .crt-about .tl-detail { font-size: 12px; color: var(--ink3); line-height: 1.5; }

                /* ── ORG TREE ── */
                .crt-about .org-root-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 48px; }
                .crt-about .org-root { background: var(--glass); backdrop-filter: blur(16px); border: 1px solid var(--glass-b); border-top: 3px solid var(--red); border-radius: var(--card-br); padding: 28px 40px; text-align: center; max-width: 420px; width: 100%; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); }
                .crt-about .org-root:hover { transform: translateY(-5px); box-shadow: 0 20px 60px var(--red-glow); }
                .crt-about .org-icon-wrap { width: 56px; height: 56px; border-radius: 18px; background: rgba(200,16,46,0.1); border: 1px solid rgba(200,16,46,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: var(--red); }
                .crt-about .org-role { font-size: 10px; font-weight: 600; color: var(--red); text-transform: uppercase; letter-spacing: 0.12em; }
                .crt-about .org-name { font-family: var(--ff-display); font-size: 20px; font-weight: 700; color: var(--ink); margin-top: 4px; }
                .crt-about .org-desc { font-size: 12px; color: var(--ink3); margin-top: 8px; line-height: 1.55; }
                .crt-about .org-vline { width: 2px; height: 32px; background: linear-gradient(to bottom, var(--red), rgba(200,16,46,0.2)); }
                .crt-about .org-hbar { position: relative; width: 80%; max-width: 680px; height: 2px; background: rgba(200,16,46,0.2); }
                .crt-about .org-hbar-dot { position: absolute; top: -4px; width: 10px; height: 10px; border-radius: 50%; background: var(--red); }
                .crt-about .org-branches { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 840px; margin-top: 0; }
                .crt-about .org-branch { display: flex; flex-direction: column; align-items: center; }
                .crt-about .org-bvline { width: 2px; height: 28px; }
                .crt-about .org-bcard { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: 20px; padding: 22px 20px; text-align: center; width: 100%; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); }
                .crt-about .org-bcard:hover { transform: translateY(-4px); box-shadow: 0 14px 44px var(--red-glow); }
                .crt-about .org-bicon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }

                /* ── PYRAMID ── */
                .crt-about .pyramid { display: flex; flex-direction: column; gap: 14px; align-items: center; }
                .crt-about .pyr-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-left: 4px solid var(--red); border-radius: 0 20px 20px 0; padding: 20px 32px; display: flex; align-items: center; gap: 20px; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); text-align: left; }
                .crt-about .pyr-card:hover { transform: translateX(8px); box-shadow: 0 12px 40px var(--red-glow); border-left-width: 6px; }
                .crt-about .pyr-icon-wrap { width: 50px; height: 50px; border-radius: 14px; background: rgba(200,16,46,0.08); border: 1px solid rgba(200,16,46,0.16); display: flex; align-items: center; justify-content: center; color: var(--red); flex-shrink: 0; }
                .crt-about .pyr-lbl { font-family: var(--ff-display); font-size: 16px; font-weight: 700; color: var(--ink); }
                .crt-about .pyr-desc { font-size: 12px; color: var(--ink3); margin-top: 3px; line-height: 1.5; }
                .crt-about .pyr-count { font-family: var(--ff-mono); font-size: 14px; font-weight: 600; color: var(--red); text-align: right; }
                .crt-about .pyr-loc { font-size: 10px; color: var(--ink3); }

                /* ── PRINCIPLES GRID ── */
                .crt-about .principles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
                .crt-about .principle-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: var(--card-br); padding: 24px; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); position: relative; overflow: hidden; text-align: left; }
                .crt-about .principle-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 3px 3px 0 0; }
                .crt-about .principle-card:hover { transform: translateY(-5px); box-shadow: 0 16px 52px var(--red-glow); }
                .crt-about .pc-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
                .crt-about .pc-name { font-family: var(--ff-display); font-size: 16px; font-weight: 700; color: var(--red); margin-bottom: 6px; }
                .crt-about .pc-desc { font-size: 12px; color: var(--ink3); line-height: 1.65; }

                /* ── MOVEMENT ── */
                .crt-about .movement-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 28px; }
                .crt-about .mov-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: var(--card-br); padding: 24px; text-align: center; transition: all 0.4s; }
                .crt-about .mov-card:hover { transform: translateY(-4px); box-shadow: 0 14px 44px var(--red-glow); }
                .crt-about .mov-icon { width: 46px; height: 46px; border-radius: 14px; background: rgba(200,16,46,0.08); border: 1px solid rgba(200,16,46,0.16); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: var(--red); }
                .crt-about .mov-name { font-family: var(--ff-display); font-size: 16px; font-weight: 700; color: var(--ink); }
                .crt-about .mov-ref { font-size: 10px; font-weight: 600; color: var(--red); text-transform: uppercase; letter-spacing: 0.08em; margin: 3px 0 6px; }
                .crt-about .mov-desc { font-size: 12px; color: var(--ink3); line-height: 1.5; }

                /* ── REGLEMENTS ── */
                .crt-about .step-list { display: flex; flex-direction: column; gap: 14px; }
                .crt-about .step-item { display: flex; gap: 18px; align-items: flex-start; padding: 16px 22px; border-radius: 16px; background: rgba(255,255,255,0.45); border: 1px solid rgba(200,16,46,0.1); transition: all 0.3s; cursor: default; }
                .crt-about .step-item:hover { border-color: rgba(200,16,46,0.3); background: rgba(200,16,46,0.04); transform: translateX(4px); }
                .crt-about .step-num { font-family: var(--ff-mono); font-size: 22px; font-weight: 700; color: var(--red); flex-shrink: 0; width: 36px; text-align: center; line-height: 1; }
                .crt-about .step-title { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
                .crt-about .step-desc { font-size: 12px; color: var(--ink3); line-height: 1.6; }
                .crt-about .info-box { margin-top: 18px; padding: 14px 18px; border-radius: 14px; background: rgba(200,16,46,0.05); border: 1px solid rgba(200,16,46,0.14); font-size: 12px; color: var(--ink2); line-height: 1.6; }
                .crt-about .reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 20px; }
                .crt-about .reg-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: 20px; padding: 26px; }
                .crt-about .reg-card h4 { font-family: var(--ff-display); font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; margin-top: 0; }
                .crt-about .reg-card p { font-size: 12px; color: var(--ink3); line-height: 1.65; margin: 0; }

                /* ── VOLONTARIAT ── */
                .crt-about .vol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 32px; }
                .crt-about .vol-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: var(--card-br); padding: 30px; }
                .crt-about .vol-card h3 { font-family: var(--ff-display); font-size: 20px; font-weight: 700; color: var(--ink); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; margin-top: 0; }
                .crt-about .vol-card p { font-size: 13px; color: var(--ink2); line-height: 1.8; margin: 0; }
                .crt-about .programs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
                .crt-about .prog-card { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: 18px; padding: 18px 14px; text-align: center; transition: all 0.4s cubic-bezier(.22,.68,0,1.4); }
                .crt-about .prog-card:hover { transform: translateY(-5px); box-shadow: 0 14px 44px var(--red-glow); border-color: rgba(200,16,46,0.35); }
                .crt-about .prog-icon-wrap { width: 38px; height: 38px; border-radius: 10px; background: rgba(200,16,46,0.08); border: 1px solid rgba(200,16,46,0.16); display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: var(--red); }
                .crt-about .prog-name { font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 4px; line-height: 1.3; }
                .crt-about .prog-desc { font-size: 10px; color: var(--ink3); line-height: 1.45; margin: 0; }

                /* ── UTILS ── */
                @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
                .crt-about .mt-8 { margin-top: 8px; } .crt-about .mt-16 { margin-top: 16px; } .crt-about .mt-24 { margin-top: 24px; } .crt-about .mt-32 { margin-top: 32px; } .crt-about .mt-40 { margin-top: 40px; }
                .crt-about .mb-16 { margin-bottom: 16px; } .crt-about .mb-24 { margin-bottom: 24px; } .crt-about .mb-28 { margin-bottom: 28px; } .crt-about .mb-32 { margin-bottom: 32px; } .crt-about .mb-40 { margin-bottom: 40px; }
                .crt-about .p-28 { padding: 28px; } .crt-about .p-32 { padding: 32px; } .crt-about .p-36 { padding: 36px; }

                /* ── ANIMATED CRESCENT ICON ── */
                @keyframes rotateCrescent { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .crt-about .spinning-crescent { animation: rotateCrescent 20s linear infinite; transform-origin: center; }

                /* ── STAGGER ANIMATION ── */
                .crt-about .stagger > * { opacity: 0; animation: fadeUp 0.5s ease both; }
                .crt-about .stagger > *:nth-child(1) { animation-delay: 0.05s; }
                .crt-about .stagger > *:nth-child(2) { animation-delay: 0.12s; }
                .crt-about .stagger > *:nth-child(3) { animation-delay: 0.18s; }
                .crt-about .stagger > *:nth-child(4) { animation-delay: 0.24s; }
                .crt-about .stagger > *:nth-child(5) { animation-delay: 0.30s; }
                .crt-about .stagger > *:nth-child(6) { animation-delay: 0.36s; }
                .crt-about .stagger > *:nth-child(7) { animation-delay: 0.42s; }
                .crt-about .stagger > *:nth-child(8) { animation-delay: 0.48s; }

                /* ── HQ BAR ── */
                .crt-about .hq-bar { background: var(--glass); backdrop-filter: blur(14px); border: 1px solid var(--glass-b); border-radius: 16px; padding: 18px 26px; margin-top: 22px; display: flex; align-items: center; gap: 16px; }
                .crt-about .hq-bar-text h4 { font-family: var(--ff-display); font-size: 15px; font-weight: 700; color: var(--ink); margin: 0; }
                .crt-about .hq-bar-text p { font-size: 11px; color: var(--ink3); margin-top: 3px; margin-bottom: 0; }

                /* ── RESPONSIVE ── */
                @media(max-width: 1100px) {
                  .crt-about .programs-grid { grid-template-columns: repeat(2, 1fr) !important; }
                  .crt-about .org-branches { grid-template-columns: 1fr !important; max-width: 380px !important; margin: 0 auto !important; }
                  .crt-about .org-hbar { display: none !important; }
                }
                @media(max-width: 900px) {
                  .crt-about .stats { grid-template-columns: repeat(2, 1fr) !important; }
                  .crt-about .reg-grid, .crt-about .vol-grid, .crt-about .movement-grid { grid-template-columns: 1fr !important; }
                }
                @media(max-width: 640px) {
                  .crt-about .wrapper { padding: 60px 20px 100px; }
                  .crt-about .programs-grid { grid-template-columns: 1fr 1fr !important; }
                  .crt-about .pyr-card { width: 100% !important; }
                  .crt-about .tabs { justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap !important; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
                  .crt-about .tab { flex-shrink: 0; }
                }
            `}</style>

            {/* BG ORBS */}
            <div className="orb orb1"></div>
            <div className="orb orb2"></div>
            <div className="orb orb3"></div>

            {/* BG CANVAS */}
            <div className="bg-canvas">
                <svg width="100%" height="100%" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <radialGradient id="bg_gradient" cx="50%" cy="50%" r="70%">
                            <stop offset="0%" stopColor="#FCFCFD"/>
                            <stop offset="100%" stopColor="#EBECEF"/>
                        </radialGradient>
                        <g id="user_custom_pattern">
                            <polygon points="20,75 45,30 95,30 120,75 95,120 45,120" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.15" fill="none"/>
                            <line x1="20" y1="75" x2="0" y2="75" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.2"/>
                            <line x1="45" y1="30" x2="30" y2="5" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.2"/>
                            <circle cx="30" cy="5" r="3" fill="#C8102E" fillOpacity="0.3"/>
                            <path d="M65,55 C78,55 85,63 85,75 C85,87 75,95 65,95 C73,95 80,87 80,75 C80,63 73,55 65,55 Z" fill="#C8102E" fillOpacity="0.2"/>
                        </g>
                    </defs>
                    <rect width="1440" height="900" fill="url(#bg_gradient)"/>
                    <g transform="translate(-50,-20) scale(2.5)" opacity="0.6"><use href="#user_custom_pattern"/></g>
                    <g transform="translate(1250,650) scale(1.5)" opacity="0.5"><use href="#user_custom_pattern"/></g>
                    <g transform="translate(640,350) scale(1.8)" opacity="0.25"><use href="#user_custom_pattern"/></g>
                    <g transform="translate(100,600) scale(1.2)" opacity="0.35"><use href="#user_custom_pattern"/></g>
                    <g transform="translate(1100,80) scale(1.0)" opacity="0.3"><use href="#user_custom_pattern"/></g>
                </svg>
            </div>

            <div className="wrapper">
                {/* HEADER */}
                <div className="header">
                    <div className="emblem-wrap">
                        <div className="emblem">
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="50" cy="50" r="46" stroke="#C8102E" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" className="spinning-crescent"/>
                                <circle cx="50" cy="50" r="38" fill="rgba(200,16,46,0.06)" stroke="rgba(200,16,46,0.2)" strokeWidth="1"/>
                                <path d="M50 20 C35 20 24 32 24 50 C24 68 35 80 50 80 C42 74 36 63 36 50 C36 37 42 26 50 20 Z" fill="#C8102E" opacity="0.85"/>
                                <polygon points="64,38 66,43 72,43 67,47 69,52 64,49 59,52 61,47 56,43 62,43" fill="#C8102E" opacity="0.85"/>
                                <circle cx="50" cy="8" r="2.5" fill="#C8102E" opacity="0.4"/>
                                <circle cx="50" cy="92" r="2.5" fill="#C8102E" opacity="0.4"/>
                                <circle cx="8" cy="50" r="2.5" fill="#C8102E" opacity="0.4"/>
                                <circle cx="92" cy="50" r="2.5" fill="#C8102E" opacity="0.4"/>
                            </svg>
                        </div>
                    </div>
                    <div className="eyebrow">À Propos du CRT</div>
                    <h1 className="title">Croissant-Rouge<br/><span>Tunisien</span></h1>
                    <p className="subtitle">Fondé le 7 octobre 1956 — Auxiliaire des pouvoirs publics et membre du Mouvement international de la Croix-Rouge et du Croissant-Rouge</p>
                </div>

                {/* STATS */}
                <div className="stats stagger">
                    <div className="stat-card"><div className="stat-val">1956</div><div className="stat-lbl">Fondation</div></div>
                    <div className="stat-card"><div className="stat-val">24</div><div className="stat-lbl">Comités régionaux</div></div>
                    <div className="stat-card"><div className="stat-val">240+</div><div className="stat-lbl">Comités locaux</div></div>
                    <div className="stat-card"><div className="stat-val">~10 000</div><div className="stat-lbl">Volontaires</div></div>
                </div>

                {/* TABS */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'histoire' ? 'active' : ''}`} onClick={() => switchTab('histoire')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Histoire
                    </button>
                    <button className={`tab ${activeTab === 'organisation' ? 'active' : ''}`} onClick={() => switchTab('organisation')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="17" x2="15" y2="17"/></svg> Organisation
                    </button>
                    <button className={`tab ${activeTab === 'principes' ? 'active' : ''}`} onClick={() => switchTab('principes')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M3 7v4a3 3 0 006 0V7"/><path d="M15 7v4a3 3 0 006 0V7"/></svg> Principes
                    </button>
                    <button className={`tab ${activeTab === 'reglements' ? 'active' : ''}`} onClick={() => switchTab('reglements')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v14a2 2 0 002 2z"/><path d="M6 3h12a2 2 0 012 2v12"/></svg> Règlements
                    </button>
                    <button className={`tab ${activeTab === 'volontariat' ? 'active' : ''}`} onClick={() => switchTab('volontariat')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Volontariat
                    </button>
                </div>

                {/* ===== PANEL: HISTOIRE ===== */}
                {activeTab === 'histoire' && (
                    <div className="panel active">
                        <div className="glass-card p-36 mb-40">
                            <h2 className="section-heading">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Ancrage Historique
                            </h2>
                            <p style={{fontSize: '14px', lineHeight: 1.85, color: 'var(--ink2)', marginBottom: '14px'}}>La naissance du mouvement caritatif en Tunisie est liée à la lutte pour l'indépendance. <strong style={{color: 'var(--ink)'}}>Mustapha El Ahmar</strong> (Secrétaire Général), <strong style={{color: 'var(--ink)'}}>Mohamed El Akrebi</strong> (Trésorier), <strong style={{color: 'var(--ink)'}}>Hassouna Zaouali, Taher Boudaya, Ahmed Ben Ghabrane</strong> et <strong style={{color: 'var(--ink)'}}>Ahmed Hannachi</strong> formèrent les premières instances dirigeantes.</p>
                            <p style={{fontSize: '14px', lineHeight: 1.85, color: 'var(--ink2)'}}>Le CRT fonde son action sur les <strong style={{color: 'var(--red)'}}>Conventions de Genève de 1949</strong>, et s'inscrit dans le cadre du <strong style={{color: 'var(--ink)'}}>décret-loi n° 88-2011</strong>.</p>
                        </div>
                        <h3 className="section-heading mb-28">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Dates Clés
                        </h3>
                        <div className="timeline stagger">
                            <div className="tl-line"></div>
                            {[
                                { y: '1956', m: 'Oct', e: 'Création formelle du CRT', d: "Fondé le 7 octobre 1956 au lendemain de l'indépendance" },
                                { y: '1957', m: 'Mai', e: "Reconnu d'utilité publique", d: 'Décret gouvernemental du 6 mai 1957' },
                                { y: '1957', m: 'Sep', e: 'Adhésion internationale', d: 'Intégration au Mouvement international le 13 septembre' },
                                { y: '1965', m: '', e: '7 Principes fondamentaux', d: 'Proclamés lors de la Conférence de Vienne' },
                                { y: '2011', m: 'Sep', e: 'Décret-loi n° 88-2011', d: 'Adaptation au cadre juridique des associations' },
                                { y: '2018', m: '', e: 'Normes IFRC', d: 'Publication des standards pour les Sociétés nationales' },
                            ].map((item, i, arr) => (
                                <div className="tl-item" style={{ marginBottom: i === arr.length - 1 ? 0 : 24 }} key={i}>
                                    <div className="tl-dot"></div>
                                    <div className="tl-connector"></div>
                                    <div className="tl-card">
                                        <div style={{ flexShrink: 0, minWidth: 60, textAlign: 'center' }}><div className="tl-year">{item.y}</div><div className="tl-month">{item.m}</div></div>
                                        <div className="tl-sep"></div>
                                        <div><div className="tl-evt">{item.e}</div><div className="tl-detail">{item.d}</div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== PANEL: ORGANISATION ===== */}
                {activeTab === 'organisation' && (
                    <div className="panel active">
                        <h3 className="section-heading mb-28">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Direction Actuelle
                        </h3>
                        <div className="org-root-wrap">
                            <div className="org-root">
                                <div className="org-icon-wrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                                <div className="org-role">Président • رئيس</div>
                                <div className="org-name">M. Abdelatif Chabbou</div>
                                <p className="org-desc">Premier responsable moral et légal. Représente le CRT devant l'État et le Mouvement international.</p>
                            </div>
                            <div className="org-vline"></div>
                            <div className="org-hbar" style={{ marginBottom: 0 }}>
                                <div className="org-hbar-dot" style={{ left: 0, transform: 'translateX(-50%)' }}></div>
                                <div className="org-hbar-dot" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                                <div className="org-hbar-dot" style={{ right: 0, transform: 'translateX(50%)' }}></div>
                            </div>
                            <div className="org-branches stagger">
                                <div className="org-branch">
                                    <div className="org-bvline" style={{ background: 'linear-gradient(to bottom,#C8102E,rgba(200,16,46,0.2))' }}></div>
                                    <div className="org-bcard" style={{ borderTop: '3px solid #C8102E' }}>
                                        <div className="org-bicon" style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.25)', color: '#C8102E' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v14a2 2 0 002 2z"/><path d="M6 3h12a2 2 0 012 2v12"/></svg>
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secrétaire Général • كاتب عام</div>
                                        <div className="org-name" style={{ fontSize: 15 }}>Secrétaire Général</div>
                                        <p className="org-desc">Gère les registres, coordonne les RH, prépare les PV et assure la tenue des archives.</p>
                                    </div>
                                </div>
                                <div className="org-branch">
                                    <div className="org-bvline" style={{ background: 'linear-gradient(to bottom,#E8112F,rgba(232,17,47,0.2))' }}></div>
                                    <div className="org-bcard" style={{ borderTop: '3px solid #E8112F' }}>
                                        <div className="org-bicon" style={{ background: 'rgba(232,17,47,0.1)', border: '1px solid rgba(232,17,47,0.25)', color: '#E8112F' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M3 7v4a3 3 0 006 0V7"/><path d="M15 7v4a3 3 0 006 0V7"/></svg>
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#E8112F', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trésorier • أمين مال</div>
                                        <div className="org-name" style={{ fontSize: 15 }}>Trésorier National</div>
                                        <p className="org-desc">Budgétisation, cotisations, dons et suivi des dépenses. Trésorerie centralisée.</p>
                                    </div>
                                </div>
                                <div className="org-branch">
                                    <div className="org-bvline" style={{ background: 'linear-gradient(to bottom,#C8102E,rgba(200,16,46,0.2))' }}></div>
                                    <div className="org-bcard" style={{ borderTop: '3px solid #C8102E' }}>
                                        <div className="org-bicon" style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.25)', color: '#C8102E' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Coordinateur • منسق البرامج</div>
                                        <div className="org-name" style={{ fontSize: 15 }}>Coordinateur Programmes</div>
                                        <p className="org-desc">Santé, secourisme, jeunesse, migration, catastrophes.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <h3 className="section-heading mb-28 mt-40">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="17" x2="15" y2="17"/></svg> Architecture Organisationnelle
                        </h3>
                        <div className="pyramid stagger">
                            <div className="pyr-card" style={{ width: '52%' }}>
                                <div className="pyr-icon-wrap"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/></svg></div>
                                <div style={{ flex: 1 }}><div className="pyr-lbl">Comité National</div><p className="pyr-desc">Vision stratégique, diplomatie humanitaire, conformité IFRC.</p></div>
                                <div><div className="pyr-count">1 siège</div><div className="pyr-loc">Tunis</div></div>
                            </div>
                            <div className="pyr-card" style={{ width: '74%' }}>
                                <div className="pyr-icon-wrap"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                                <div style={{ flex: 1 }}><div className="pyr-lbl">Comités Régionaux</div><p className="pyr-desc">Supervision territoriale, coordination provinciale.</p></div>
                                <div><div className="pyr-count">24 branches</div><div className="pyr-loc">24 Gouvernorats</div></div>
                            </div>
                            <div className="pyr-card" style={{ width: '96%' }}>
                                <div className="pyr-icon-wrap"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
                                <div style={{ flex: 1 }}><div className="pyr-lbl">Comités Locaux</div><p className="pyr-desc">Exécution opérationnelle, recrutement, distribution.</p></div>
                                <div><div className="pyr-count">240+ filiales</div><div className="pyr-loc">Délégations</div></div>
                            </div>
                        </div>
                        <div className="hq-bar">
                            <div style={{ color: 'var(--red)', flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            </div>
                            <div className="hq-bar-text">
                                <h4>Siège — 19, Rue d'Angleterre, Tunis</h4>
                                <p>N° Visa : 2581 • MF : 33049Y/P/N/000 • Reconnu d'utilité publique depuis 1957</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== PANEL: PRINCIPES ===== */}
                {activeTab === 'principes' && (
                    <div className="panel active">
                        <div className="glass-card p-32 mb-28" style={{ textAlign: 'center' }}>
                            <h2 className="section-heading" style={{ justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--red)' }}><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M3 7v4a3 3 0 006 0V7"/><path d="M15 7v4a3 3 0 006 0V7"/></svg> Les 7 Principes Fondamentaux
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--ink3)', maxWidth: 520, margin: '0 auto' }}>Proclamés à Vienne en 1965 — norme juridique contraignante pour toutes les Sociétés nationales</p>
                        </div>
                        <div className="principles-grid stagger">
                            {[
                                { name: 'Humanité', desc: 'Prévenir et alléger les souffrances humaines, protéger la vie et la santé.', color: '#C8102E', icon: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/> },
                                { name: 'Impartialité', desc: "Aucune discrimination. L'intervention est dictée par l'urgence uniquement.", color: '#E8112F', icon: <><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M3 7v4a3 3 0 006 0V7"/><path d="M15 7v4a3 3 0 006 0V7"/></> },
                                { name: 'Neutralité', desc: 'Devoir de réserve absolu face aux hostilités et controverses.', color: '#C8102E', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
                                { name: 'Indépendance', desc: 'Autonomie décisionnelle tout en étant auxiliaire des pouvoirs publics.', color: '#E8112F', icon: <rect x="4" y="2" width="16" height="20" rx="2"/> },
                                { name: 'Volontariat', desc: 'Mouvement bénévole sans recherche de gain financier.', color: '#C8102E', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
                                { name: 'Unité', desc: 'Une seule Société nationale, ouverte à tous, couvrant tout le territoire.', color: '#E8112F', icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></> },
                                { name: 'Universalité', desc: "Droits égaux et devoir d'entraide entre toutes les Sociétés nationales.", color: '#C8102E', icon: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></> },
                            ].map((p, i) => (
                                <div key={i} className="principle-card" style={{ borderTop: `3px solid ${p.color}` }}>
                                    <div className="pc-icon" style={{ background: `${p.color}1A`, border: `1px solid ${p.color}33`, color: p.color }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg>
                                    </div>
                                    <div className="pc-name" style={{ color: p.color }}>{p.name}</div>
                                    <p className="pc-desc">{p.desc}</p>
                                </div>
                            ))}
                        </div>
                        <h3 className="section-heading mt-40 mb-24">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> Composantes du Mouvement
                        </h3>
                        <div className="movement-grid stagger">
                            <div className="mov-card">
                                <div className="mov-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                                <div className="mov-name">CICR</div><div className="mov-ref">Art. 5</div>
                                <p className="mov-desc">Gardien du DIH, zones de conflit armé.</p>
                            </div>
                            <div className="mov-card">
                                <div className="mov-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
                                <div className="mov-name">IFRC</div><div className="mov-ref">Art. 6</div>
                                <p className="mov-desc">Coordination mondiale, 191 Sociétés.</p>
                            </div>
                            <div className="mov-card">
                                <div className="mov-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                                <div className="mov-name">Sociétés Nationales</div><div className="mov-ref">Art. 3-4</div>
                                <p className="mov-desc">Organes exécutifs souverains.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== PANEL: REGLEMENTS ===== */}
                {activeTab === 'reglements' && (
                    <div className="panel active">
                        <div className="glass-card p-36 mb-28">
                            <h2 className="section-heading mb-24">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--red)' }}><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v14a2 2 0 002 2z"/><path d="M6 3h12a2 2 0 012 2v12"/></svg> Ouverture d'un Comité
                            </h2>
                            <div className="step-list stagger">
                                <div className="step-item"><div className="step-num">01</div><div><div className="step-title">Correspondance Territoriale</div><p className="step-desc">Inscription dans une circonscription valide. Aucune zone en doublon (principe d'Unité).</p></div></div>
                                <div className="step-item"><div className="step-num">02</div><div><div className="step-title">Mobilisation Citoyenne</div><p className="step-desc">Rassemblement de citoyens souscrivant aux 7 Principes fondamentaux.</p></div></div>
                                <div className="step-item"><div className="step-num">03</div><div><div className="step-title">Processus Électif</div><p className="step-desc">Assemblée constitutive locale avec élection démocratique des responsables.</p></div></div>
                                <div className="step-item"><div className="step-num">04</div><div><div className="step-title">Agrément & Raccordement</div><p className="step-desc">Validation régionale puis approbation finale du Comité Central à Tunis.</p></div></div>
                            </div>
                            <div className="info-box"><strong style={{ color: 'var(--red)' }}>Mandat :</strong> 4 ans, synchronisé avec les cycles de la Conférence internationale.</div>
                        </div>
                        <div className="reg-grid stagger">
                            <div className="reg-card">
                                <h4><span style={{ color: 'var(--red)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span> Discipline & Conformité</h4>
                                <p>Mesures : <strong style={{ color: 'var(--ink)' }}>blâme</strong>, <strong style={{ color: 'var(--ink)' }}>suspension</strong>, <strong style={{ color: 'var(--ink)' }}>exclusion</strong>, ou <strong style={{ color: 'var(--red)' }}>dissolution</strong>. Principe du procès équitable et protection des lanceurs d'alerte.</p>
                            </div>
                            <div className="reg-card">
                                <h4><span style={{ color: 'var(--red)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v14a2 2 0 002 2z"/></svg></span> Protection de l'Emblème</h4>
                                <p>Criminalisé par l'<strong style={{ color: 'var(--ink)' }}>art. 127 du Code de Justice Militaire</strong>. Usage non autorisé = radiation interne + poursuites pénales.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== PANEL: VOLONTARIAT ===== */}
                {activeTab === 'volontariat' && (
                    <div className="panel active">
                        <div className="vol-grid stagger">
                            <div className="vol-card">
                                <h3><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--red)' }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Force Motrice</h3>
                                <p>Les volontaires sont la <strong style={{ color: 'var(--red)' }}>«colonne vertébrale»</strong>. Près de <strong style={{ color: 'var(--ink)' }}>10 000 bénévoles</strong> dont <strong style={{ color: 'var(--ink)' }}>~2 500 actifs</strong> mobilisables. Recrutement inclusif, sans discrimination.</p>
                            </div>
                            <div className="vol-card">
                                <h3><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--red)' }}><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v14a2 2 0 002 2z"/><path d="M6 3h12a2 2 0 012 2v12"/></svg> Cadre Juridique</h3>
                                <p><strong style={{ color: 'var(--ink)' }}>Politique IFRC 2012</strong>. Remboursement des frais de mission. Accords de bénévolat clairs. Protocoles <strong style={{ color: 'var(--ink)' }}>«Stay Safe»</strong>. Certificat officiel délivré.</p>
                            </div>
                        </div>
                        <h3 className="section-heading mb-24">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> 8 Programmes Directeurs
                        </h3>
                        <div className="programs-grid stagger">
                            {[
                                { name: 'Secours & Catastrophes', desc: 'Prévention et réponse rapide', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
                                { name: 'Santé Publique', desc: 'Vaccination, hygiène, collecte de sang', icon: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/> },
                                { name: 'Premier Secours', desc: 'Formations PSE1/PSE2 certifiantes', icon: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/> },
                                { name: 'Action Sociale', desc: 'Aides matérielles, soutien psychologique', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
                                { name: 'Diffusion du DIH', desc: 'Droit International Humanitaire', icon: <><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M3 7v4a3 3 0 006 0V7"/><path d="M15 7v4a3 3 0 006 0V7"/></> },
                                { name: 'Migration & Réfugiés', desc: 'Protection et secours matériel', icon: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></> },
                                { name: 'Jeunesse', desc: 'Encadrement et éducation', icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
                                { name: 'Culture de la Paix', desc: 'Non-violence intercommunautaire', icon: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></> },
                            ].map((p, i) => (
                                <div key={i} className="prog-card">
                                    <div className="prog-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg></div>
                                    <div className="prog-name">{p.name}</div>
                                    <p className="prog-desc">{p.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AboutSection;
