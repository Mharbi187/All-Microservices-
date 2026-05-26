// ============================================================
// ContactSection — Premium SaaS/Humanitarian design
// SVG bg pattern · Info cards 2×2 · Real Leaflet map (committee-aware)
// Données comités : API backend + localStorage (service dynamique)
// Admin: Président National · VP National · Secrétaire Général
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import committeeContactService, { type CommitteeContact } from '@/services/committeeContactService';
import 'leaflet/dist/leaflet.css';

/* ─────────────────── TYPE LOCAL (alias) ─────────────────── */
// CommitteeContact importé depuis le service — pas de re-déclaration

/* ─────────────────── CONTRÔLE D'ACCÈS ─────────────────── */

function useCanManageContacts(): boolean {
    const user = useAuthStore(s => s.user);
    if (!user) return false;

    // Si l'utilisateur est un ADMIN global, on lui donne l'accès directement
    if (user.type === 'ADMIN' || user.role === 'admin' || user.roles?.includes('ADMIN' as any)) {
        return true;
    }

    const roles: string[] = (user.roles as string[]) ?? [];
    const rawRoles: { committeeType?: string; role?: string }[] = (user as any).rawRoles ?? [];
    const isNational = rawRoles.some(r => ['NATIONAL', 'national'].includes(r.committeeType ?? ''));
    return isNational && (
        roles.includes('PRESIDENT') ||
        roles.includes('VICE_PRESIDENT') ||
        roles.includes('SECRETAIRE_GENERAL')
    );
}

/* ─────────────────── PANNEAU ADMIN ÉDITION ─────────────────── */

const AdminContactEditor: React.FC<{
    contacts: CommitteeContact[];
    dark: boolean;
    onClose: () => void;
    onSaved: (contacts: CommitteeContact[]) => void;
}> = ({ contacts, dark, onClose, onSaved }) => {
    const [list, setList] = useState<CommitteeContact[]>(contacts.map(c => ({ ...c })));
    const [editIdx, setEditIdx] = useState(0);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [search, setSearch] = useState('');

    const bg = dark ? '#1E1E22' : '#FFFFFF';
    const fg = dark ? '#F4F4F5' : '#1A1A1A';
    const sub = dark ? '#A1A1AA' : '#595959';
    const borderCol = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '8px 11px', borderRadius: 8,
        border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.15)'}`,
        background: dark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
        color: fg, fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
    };

    const field = (label: string, key: keyof CommitteeContact) => (
        <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: sub, marginBottom: 4 }}>{label}</label>
            <input
                value={(list[editIdx] as any)[key] ?? ''}
                onChange={e => setList(prev => prev.map((c, i) => i === editIdx ? { ...c, [key]: key === 'lat' || key === 'lng' ? parseFloat(e.target.value) || 0 : e.target.value } : c))}
                style={inputStyle}
                type={key === 'lat' || key === 'lng' ? 'number' : 'text'}
                step={key === 'lat' || key === 'lng' ? '0.0001' : undefined}
            />
        </div>
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const c of list) {
                await committeeContactService.update(c.id, c);
            }
            setSuccess(true);
            setTimeout(() => { setSuccess(false); onSaved(list); onClose(); }, 1200);
        } catch { /**/ } finally { setSaving(false); }
    };

    const handleReset = () => {
        committeeContactService.reset();
        const fresh = committeeContactService.getAllSync();
        setList(fresh.map(c => ({ ...c })));
    };

    const filtered = list.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.group.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }}
        >
            {/* Backdrop */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

            {/* Drawer */}
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0,
                    width: 480, background: bg, zIndex: 1,
                    boxShadow: '-12px 0 50px rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    border: `1px solid ${borderCol}`,
                }}
            >
                {/* Header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: fg }}>🏛️ Gestion des Comités</div>
                        <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>Président · VP · Secrétaire Général — Comité National</div>
                    </div>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${borderCol}`, background: 'transparent', cursor: 'pointer', fontSize: 15, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Two-panel layout: left list + right form */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* Left: comité list */}
                    <div style={{ width: 180, borderRight: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${borderCol}` }}>
                            <input
                                value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher..."
                                style={{ ...inputStyle, fontSize: 11.5, padding: '6px 9px' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {filtered.map((c) => {
                                const realIdx = list.findIndex(x => x.id === c.id);
                                return (
                                    <button key={c.id} onClick={() => setEditIdx(realIdx)}
                                        style={{
                                            width: '100%', textAlign: 'left', padding: '10px 12px',
                                            border: 'none', background: editIdx === realIdx ? 'rgba(200,16,46,0.1)' : 'transparent',
                                            borderLeft: editIdx === realIdx ? '3px solid #C8102E' : '3px solid transparent',
                                            cursor: 'pointer', fontSize: 11.5, color: editIdx === realIdx ? '#C8102E' : fg,
                                            fontWeight: editIdx === realIdx ? 700 : 400,
                                            lineHeight: 1.3, transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 11 }}>{c.name.replace('Comité Régional — ', '').replace('Siège ', '').replace(' National', ' Nat.')}</div>
                                        <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{c.group}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: edit form */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                        {list[editIdx] && (
                            <>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#C8102E', marginBottom: 14 }}>
                                    ✏️ {list[editIdx].name}
                                </div>
                                {field('Nom affiché', 'name')}
                                {field('Groupe (Siège National / Comités Régionaux)', 'group')}
                                {field('Adresse postale', 'address')}
                                {field('Téléphone', 'phone')}
                                {field('Email de contact', 'email')}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div>
                                        {field('Latitude GPS', 'lat')}
                                    </div>
                                    <div>
                                        {field('Longitude GPS', 'lng')}
                                    </div>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${list[editIdx].lat},${list[editIdx].lng}`}
                                    target="_blank" rel="noreferrer"
                                    style={{ fontSize: 11, color: '#C8102E', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 14 }}
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    Vérifier sur Google Maps ↗
                                </a>
                                {field('Type (NATIONAL / REGIONAL / LOCAL)', 'type')}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${borderCol}`, display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={handleReset}
                        style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${borderCol}`, background: 'transparent', fontSize: 11, color: sub, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#C8102E'; e.currentTarget.style.borderColor = '#C8102E'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = sub; e.currentTarget.style.borderColor = borderCol; }}
                    >↺ Réinitialiser</button>
                    <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${borderCol}`, background: 'transparent', fontSize: 13, color: fg, cursor: 'pointer' }}>Annuler</button>
                    <button onClick={handleSave} disabled={saving}
                        style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: success ? '#059669' : '#C8102E', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', boxShadow: '0 3px 12px rgba(200,16,46,0.3)', transition: 'all 0.22s' }}
                    >
                        {success ? '✅ Enregistré !' : saving ? '⏳...' : '✓ Enregistrer tout'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─────────────────── LEAFLET MAP ─────────────────── */

interface LeafletMapProps { committee: any }

const LeafletMap: React.FC<LeafletMapProps> = ({ committee }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<import('leaflet').Map | null>(null);
    const markerRef = useRef<import('leaflet').Marker | null>(null);

    useEffect(() => {
        let L: typeof import('leaflet');

        const init = async () => {
            L = (await import('leaflet')).default;

            // Fix default icon paths in Vite build
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            if (!mapRef.current || mapInstance.current) return;

            mapInstance.current = L.map(mapRef.current, {
                center: [committee.lat, committee.lng],
                zoom: 14,
                zoomControl: false,
                attributionControl: false,
            });

            // Modern, clean SaaS-like map tiles (CartoDB Voyager)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);
            L.control.attribution({ prefix: false }).addTo(mapInstance.current);

            // Custom red marker
            const redIcon = L.divIcon({
                className: '',
                html: `<div style="
                    width:28px;height:36px;position:relative;
                    filter:drop-shadow(0 3px 8px rgba(200,16,46,0.5));
                ">
                    <svg viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z" fill="#C8102E"/>
                        <circle cx="14" cy="14" r="6" fill="white"/>
                        <circle cx="14" cy="14" r="3" fill="#C8102E"/>
                    </svg>
                </div>`,
                iconSize: [28, 36],
                iconAnchor: [14, 36],
                popupAnchor: [0, -36],
            });

            markerRef.current = L.marker([committee.lat, committee.lng], { icon: redIcon })
                .addTo(mapInstance.current)
                .bindPopup(`<b>${committee.name}</b><br>${committee.address}`)
                .openPopup();
        };

        init();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update map view & marker when committee changes
    useEffect(() => {
        if (!mapInstance.current) return;
        (async () => {
            const L = (await import('leaflet')).default;
            mapInstance.current!.flyTo([committee.lat, committee.lng], 14, { duration: 1.2 });
            if (markerRef.current) {
                markerRef.current.setLatLng([committee.lat, committee.lng]);
                markerRef.current.setPopupContent(`<b>${committee.name}</b><br>${committee.address}`);
                markerRef.current.openPopup();
            }

            const redIcon = L.divIcon({
                className: '',
                html: `<div style="width:28px;height:36px;filter:drop-shadow(0 3px 8px rgba(200,16,46,0.5))">
                    <svg viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z" fill="#C8102E"/>
                        <circle cx="14" cy="14" r="6" fill="white"/>
                        <circle cx="14" cy="14" r="3" fill="#C8102E"/>
                    </svg>
                </div>`,
                iconSize: [28, 36],
                iconAnchor: [14, 36],
                popupAnchor: [0, -36],
            });
            if (markerRef.current) markerRef.current.setIcon(redIcon);
        })();
    }, [committee.lat, committee.lng, committee.name, committee.address]);

    return (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 360, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            {/* Floating badge */}
            <div style={{
                position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                borderRadius: 10, padding: '7px 12px',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                border: '1px solid rgba(200,16,46,0.12)',
                pointerEvents: 'none',
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A2E' }}>{committee.name.replace('Comité Régional — ', '').replace('Siège ', '')}, Tunisie</span>
            </div>
        </div>
    );
};

/* ─────────────────── SVG BACKGROUND ─────────────────── */

const SvgBackground: React.FC = () => (
    <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <radialGradient id="crt_bg_grad" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#FCFCFD" />
                <stop offset="100%" stopColor="#EBECEF" />
            </radialGradient>
            <g id="crt_motif">
                <polygon points="20,75 45,30 95,30 120,75 95,120 45,120" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.15" fill="none" />
                <line x1="20" y1="75" x2="0" y2="75" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.2" />
                <line x1="45" y1="30" x2="30" y2="5" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.2" />
                <circle cx="30" cy="5" r="3" fill="#C8102E" fillOpacity="0.3" />
                <path d="M65,55 C78,55 85,63 85,75 C85,87 75,95 65,95 C73,95 80,87 80,75 C80,63 73,55 65,55 Z" fill="#C8102E" fillOpacity="0.2" />
            </g>
        </defs>
        <rect width="1440" height="900" fill="url(#crt_bg_grad)" />
        {/* Top-left large */}
        <g transform="translate(-50,-20) scale(2.5)">
            <use href="#crt_motif" />
        </g>
        {/* Bottom-right */}
        <g transform="translate(1250,650) scale(1.5)">
            <use href="#crt_motif" />
        </g>
        {/* Center subtle */}
        <g transform="translate(640,350) scale(1.8)" opacity="0.4">
            <use href="#crt_motif" />
        </g>
        {/* Extra top-right faint */}
        <g transform="translate(1340,10) scale(1.2)" opacity="0.3">
            <use href="#crt_motif" />
        </g>
    </svg>
);

/* ─────────────────── INFO CARD ─────────────────── */

const InfoCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    dark: boolean;
}> = ({ icon, label, value, dark }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px',
                borderRadius: 12,
                background: dark ? '#1E1E22' : '#FFFFFF',
                border: `1px solid ${hovered ? 'rgba(200,16,46,0.25)' : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')}`,
                boxShadow: hovered ? '0 0 0 3px rgba(200,16,46,0.06), 0 6px 18px rgba(200,16,46,0.08)' : '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.28s ease',
                transform: hovered ? 'translateX(3px)' : 'none',
            }}
        >
            {/* Icon badge */}
            <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(200,16,46,0.08)',
                transition: 'background 0.25s',
            }}>
                {icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: dark ? '#A1A1AA' : '#595959', marginBottom: 3 }}>
                    {label}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: dark ? '#F4F4F5' : '#1A1A1A', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────── INPUT HELPER ─────────────────── */

const useInputFocus = (dark: boolean) => {
    const baseStyle: React.CSSProperties = {
        width: '100%', padding: '12px 14px',
        background: dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
        borderRadius: 10,
        color: dark ? '#F4F4F5' : '#1A1A1A',
        fontFamily: 'inherit', fontSize: 14, outline: 'none',
        transition: 'all 0.25s ease',
    };
    const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = '#E30613';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(227,6,19,0.1)';
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';
        e.currentTarget.style.boxShadow = 'none';
    };
    return { baseStyle, onFocus, onBlur };
};

/* ─────────────────── SVG ICONS (inline) ─────────────────── */
const IcoPin = () => <svg width="18" height="18" fill="none" stroke="#C8102E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IcoTel = () => <svg width="18" height="18" fill="none" stroke="#C8102E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.12 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.1a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const IcoMail = () => <svg width="18" height="18" fill="none" stroke="#C8102E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
const IcoClock = () => <svg width="18" height="18" fill="none" stroke="#C8102E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

/* ─────────────────── MAIN SECTION ─────────────────── */

const ContactSection: React.FC = () => {
    const { themeMode } = useUIStore();
    const dark = themeMode === 'dark';
    const canEdit = useCanManageContacts();

    // ── Dynamic committee data from service ──
    const [committees, setCommittees] = useState<CommitteeContact[]>(
        () => committeeContactService.getAllSync()
    );
    const [loading, setLoading] = useState(true);
    const [adminOpen, setAdminOpen] = useState(false);

    useEffect(() => {
        committeeContactService.getAll()
            .then(data => { setCommittees(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const [selectedId, setSelectedId] = useState('siege');
    const [formData, setFormData] = useState({ name: '', email: '', committee: 'siege', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);
    const { baseStyle, onFocus, onBlur } = useInputFocus(dark);

    const committee = committees.find(c => c.id === selectedId) ?? committees[0];

    const handleCommitteeChange = (id: string) => {
        setSelectedId(id);
        setFormData(f => ({ ...f, committee: id }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
        setFormData({ name: '', email: '', committee: 'siege', subject: '', message: '' });
        setSelectedId('siege');
    };

    const sectionBg = dark ? '#121214' : 'transparent';
    const fg = dark ? '#F4F4F5' : '#1A1A1A';
    const sub = dark ? '#A1A1AA' : '#595959';
    const formBg = dark ? '#1E1E22' : '#FFFFFF';
    const formBorder = dark ? 'rgba(255,255,255,0.07)' : 'rgba(227,6,19,0.08)';
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: sub, marginBottom: 6 };
    const groups = [...new Set(committees.map(c => c.group))];

    return (
        <section
            id="contact"
            className="contact-section"
            style={{ padding: '96px 72px', position: 'relative', zIndex: 2, background: sectionBg, overflow: 'hidden' }}
        >
            {/* SVG background (light mode only — dark mode has its own bg) */}
            {!dark && <SvgBackground />}
            {dark && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                        <g transform="translate(-50,-20) scale(2.5)" opacity="0.6"><polygon points="20,75 45,30 95,30 120,75 95,120 45,120" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.12" fill="none" /><line x1="20" y1="75" x2="0" y2="75" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.15" /><circle cx="30" cy="5" r="3" fill="#C8102E" fillOpacity="0.2" /><path d="M65,55 C78,55 85,63 85,75 C85,87 75,95 65,95 C73,95 80,87 80,75 C80,63 73,55 65,55 Z" fill="#C8102E" fillOpacity="0.1" /></g>
                        <g transform="translate(1250,650) scale(1.5)" opacity="0.5"><polygon points="20,75 45,30 95,30 120,75 95,120 45,120" stroke="#C8102E" strokeWidth="1" strokeOpacity="0.12" fill="none" /><circle cx="30" cy="5" r="3" fill="#C8102E" fillOpacity="0.2" /></g>
                    </svg>
                </div>
            )}

            {/* ── Section Header ── */}
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ position: 'relative', zIndex: 1, marginBottom: 52, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#E30613', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
                        Nous contacter
                    </div>
                    <h2 className="font-display" style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 800, lineHeight: 1.1, color: fg, marginBottom: 10, letterSpacing: '-0.02em' }}>
                        Restons en Contact
                    </h2>
                    <p style={{ fontSize: 16, color: sub, fontWeight: 400 }}>
                        Une question ? Un partenariat ? Contactez-nous !
                    </p>
                </div>

                {/* Admin button — national committee managers only */}
                {canEdit && (
                    <button
                        onClick={() => setAdminOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '9px 18px', borderRadius: 100,
                            border: '1.5px solid rgba(200,16,46,0.3)',
                            background: dark ? 'rgba(30,30,34,0.9)' : 'rgba(255,255,255,0.92)',
                            color: '#C8102E', fontSize: 12.5, fontWeight: 600,
                            cursor: 'pointer', backdropFilter: 'blur(10px)',
                            boxShadow: '0 2px 12px rgba(200,16,46,0.12)',
                            transition: 'all 0.22s ease', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(30,30,34,0.9)' : 'rgba(255,255,255,0.92)'; e.currentTarget.style.color = '#C8102E'; }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {loading ? 'Chargement...' : `Gérer les comités (${committees.length})`}
                    </button>
                )}
            </motion.div>

            {/* ── Two-column layout ── */}
            <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '45fr 55fr', gap: 36, position: 'relative', zIndex: 1, alignItems: 'start' }}>

                {/* ══ LEFT: Info Cards + Map ══ */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.65 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
                >
                    {/* 2×2 Info cards grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <InfoCard dark={dark} icon={<IcoPin />} label="Adresse" value={committee.address} />
                        <InfoCard dark={dark} icon={<IcoTel />} label="Téléphone" value={committee.phone} />
                        <InfoCard dark={dark} icon={<IcoMail />} label="Email" value={committee.email} />
                        <InfoCard dark={dark} icon={<IcoClock />} label="Horaires" value="Lun — Ven : 08:00 — 17:00" />
                    </div>

                    {/* Real Leaflet map */}
                    {committee && !loading && <LeafletMap committee={committee} />}
                    {loading && (
                        <div style={{ borderRadius: 14, height: 360, background: dark ? '#1E1E22' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: 12, color: sub }}>Chargement de la carte...</div>
                        </div>
                    )}
                </motion.div>

                {/* ══ RIGHT: Contact Form ══ */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.15 }}
                >
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            background: formBg,
                            borderRadius: 20,
                            padding: '32px 30px',
                            border: `1px solid ${formBorder}`,
                            boxShadow: dark
                                ? 'none'
                                : '0 10px 25px -5px rgba(227,6,19,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
                        }}
                    >
                        {/* Row 1: Nom + Email */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={labelStyle}>Nom Complet</label>
                                <input type="text" placeholder="Votre nom" required
                                    style={baseStyle} value={formData.name}
                                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                    onFocus={onFocus} onBlur={onBlur} />
                            </div>
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input type="email" placeholder="email@example.tn" required
                                    style={baseStyle} value={formData.email}
                                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                                    onFocus={onFocus} onBlur={onBlur} />
                            </div>
                        </div>

                        {/* Row 2: Comité à contacter → drives the map */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Comité à contacter</label>
                            <select required
                                style={{ ...baseStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23595959' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: 36 }}
                                value={formData.committee}
                                onChange={e => handleCommitteeChange(e.target.value)}
                                onFocus={onFocus} onBlur={onBlur}
                            >
                                <option value="" disabled>Sélectionnez un comité</option>
                                {groups.map(g => (
                                    <optgroup key={g} label={g}>
                                        {committees.filter(c => c.group === g).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Row 3: Sujet */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Sujet</label>
                            <input type="text" placeholder="Objet de votre message" required
                                style={baseStyle} value={formData.subject}
                                onChange={e => setFormData(f => ({ ...f, subject: e.target.value }))}
                                onFocus={onFocus} onBlur={onBlur} />
                        </div>

                        {/* Row 4: Message */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={labelStyle}>Message</label>
                            <textarea placeholder="Décrivez votre demande..." rows={5} required
                                style={{ ...baseStyle, resize: 'vertical', minHeight: 120 }}
                                value={formData.message}
                                onChange={e => setFormData(f => ({ ...f, message: e.target.value }))}
                                onFocus={onFocus as any} onBlur={onBlur as any} />
                        </div>

                        {/* Submit — pill full-width red */}
                        <button type="submit"
                            style={{
                                width: '100%', padding: '15px',
                                borderRadius: 100,   /* pill */
                                border: 'none',
                                background: '#E30613',
                                color: '#fff',
                                fontSize: 15, fontWeight: 700,
                                letterSpacing: '0.04em',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(227,6,19,0.38)',
                                transition: 'all 0.28s ease',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#B90010'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(227,6,19,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#E30613'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(227,6,19,0.38)'; }}
                        >
                            {submitted ? '✅ Message envoyé !' : 'Envoyer le message'}
                        </button>

                        {/* Success message */}
                        <AnimatePresence>
                            {submitted && (
                                <motion.p
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    style={{ textAlign: 'center', marginTop: 14, fontSize: 13.5, color: '#059669', fontWeight: 500 }}
                                >
                                    Votre message a été envoyé. Nous vous répondrons sous 48h.
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </form>
                </motion.div>
            </div>

            {/* ══ Admin Editor Panel ══ */}
            <AnimatePresence>
                {adminOpen && canEdit && (
                    <AdminContactEditor
                        key="admin-editor"
                        contacts={committees}
                        dark={dark}
                        onClose={() => setAdminOpen(false)}
                        onSaved={(updated) => {
                            setCommittees(updated);
                            // Refresh current committee if it changed
                            const refreshed = updated.find(c => c.id === selectedId);
                            if (!refreshed) setSelectedId(updated[0]?.id ?? 'siege');
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Responsive ── */}
            <style>{`
                @media (max-width: 1024px) {
                    .contact-section { padding: 72px 40px !important; }
                    .contact-grid    { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 640px) {
                    .contact-section { padding: 56px 20px !important; }
                    .contact-grid > div:first-child > div:first-child {
                        grid-template-columns: 1fr !important;
                    }
                }
                /* Leaflet popup style override */
                .leaflet-popup-content-wrapper {
                    border-radius: 10px !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
                    font-family: inherit !important;
                    font-size: 13px !important;
                }
                .leaflet-popup-tip { background: white !important; }
            `}</style>
        </section>
    );
};

export default ContactSection;

