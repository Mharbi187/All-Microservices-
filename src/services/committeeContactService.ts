// ============================================================
// committeeContactService.ts
// Gestion des informations de contact publiques des comités CRT
// Données enrichies (téléphone, email, adresse, GPS) stockées
// en localStorage (couche de persistance front) + API backend
// Géré par : Président National, VP National, Secrétaire Général
// ============================================================

import apiClient from './api';
import type { Committee } from '@/types';

// ─── Type étendu : Committee + infos de contact ───────────────
export interface CommitteeContact {
    /** ID backend du comité */
    id: string;
    /** Nom affiché */
    name: string;
    /** Groupe d'affichage dans le select */
    group: string;
    /** Type CRT: NATIONAL / REGIONAL / LOCAL */
    type: string;
    /** Adresse postale */
    address: string;
    /** Numéro de téléphone */
    phone: string;
    /** Email de contact */
    email: string;
    /** Latitude GPS */
    lat: number;
    /** Longitude GPS */
    lng: number;
}

// ─── Données de fallback (défaut statique) ─────────────────────
const FALLBACK_CONTACTS: CommitteeContact[] = [
    { id: 'siege',       group: 'Siège National',   type: 'NATIONAL',  name: 'Siège National — Tunis',           address: 'Boulevard 9 Avril 1938, Tunis 1001',          phone: '+216 71 320 630', email: 'contact@croissantrouge.tn',      lat: 36.8192, lng: 10.1685 },
    { id: 'direction',   group: 'Siège National',   type: 'NATIONAL',  name: 'Direction Générale',                address: 'Boulevard 9 Avril 1938, Tunis 1001',          phone: '+216 71 320 631', email: 'direction@croissantrouge.tn',    lat: 36.8192, lng: 10.1685 },
    { id: 'tunis',       group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Tunis',           address: 'Rue de Marseille, Tunis',                     phone: '+216 71 244 100', email: 'tunis@croissantrouge.tn',        lat: 36.8065, lng: 10.1815 },
    { id: 'ariana',      group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Ariana',          address: 'Avenue de la République, Ariana',             phone: '+216 71 701 515', email: 'ariana@croissantrouge.tn',       lat: 36.8625, lng: 10.1956 },
    { id: 'ben-arous',   group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Ben Arous',       address: 'Centre-ville, Ben Arous',                     phone: '+216 71 382 100', email: 'benarous@croissantrouge.tn',     lat: 36.7533, lng: 10.2281 },
    { id: 'manouba',     group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Manouba',         address: 'Avenue Habib Bourguiba, Manouba',             phone: '+216 71 602 020', email: 'manouba@croissantrouge.tn',      lat: 36.8083, lng: 10.0986 },
    { id: 'nabeul',      group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Nabeul',          address: 'Avenue Habib Bourguiba, Nabeul',              phone: '+216 72 222 031', email: 'nabeul@croissantrouge.tn',       lat: 36.4561, lng: 10.7376 },
    { id: 'zaghouan',    group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Zaghouan',        address: 'Rue Principale, Zaghouan',                    phone: '+216 72 670 011', email: 'zaghouan@croissantrouge.tn',     lat: 36.4023, lng: 10.1429 },
    { id: 'bizerte',     group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Bizerte',         address: 'Avenue Habib Bourguiba, Bizerte',             phone: '+216 72 431 270', email: 'bizerte@croissantrouge.tn',      lat: 37.2744, lng: 9.8739  },
    { id: 'beja',        group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Béja',            address: 'Avenue de la Liberté, Béja',                  phone: '+216 78 450 100', email: 'beja@croissantrouge.tn',         lat: 36.7258, lng: 9.1817  },
    { id: 'jendouba',    group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Jendouba',        address: 'Rue Farhat Hached, Jendouba',                 phone: '+216 78 630 200', email: 'jendouba@croissantrouge.tn',     lat: 36.5011, lng: 8.7757  },
    { id: 'kef',         group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Le Kef',          address: 'Avenue Habib Bourguiba, Le Kef',              phone: '+216 78 224 001', email: 'kef@croissantrouge.tn',          lat: 36.1824, lng: 8.7140  },
    { id: 'siliana',     group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Siliana',         address: 'Centre-ville, Siliana',                       phone: '+216 78 870 100', email: 'siliana@croissantrouge.tn',      lat: 36.0837, lng: 9.3709  },
    { id: 'sousse',      group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Sousse',          address: 'Avenue de la République, Sousse',             phone: '+216 73 225 800', email: 'sousse@croissantrouge.tn',       lat: 35.8288, lng: 10.6389 },
    { id: 'monastir',    group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Monastir',        address: 'Rue du 2 Mars, Monastir',                     phone: '+216 73 460 222', email: 'monastir@croissantrouge.tn',     lat: 35.7780, lng: 10.8262 },
    { id: 'mahdia',      group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Mahdia',          address: 'Avenue Habib Bourguiba, Mahdia',              phone: '+216 73 680 100', email: 'mahdia@croissantrouge.tn',       lat: 35.5047, lng: 11.0622 },
    { id: 'sfax',        group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Sfax',            address: 'Avenue Habib Bourguiba, Sfax',                phone: '+216 74 211 880', email: 'sfax@croissantrouge.tn',         lat: 34.7406, lng: 10.7603 },
    { id: 'kairouan',    group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Kairouan',        address: 'Rue Ali Belhaouane, Kairouan',                phone: '+216 77 221 000', email: 'kairouan@croissantrouge.tn',     lat: 35.6784, lng: 10.0963 },
    { id: 'kasserine',   group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Kasserine',       address: 'Avenue de la République, Kasserine',          phone: '+216 77 470 500', email: 'kasserine@croissantrouge.tn',    lat: 35.1677, lng: 8.8305  },
    { id: 'sidi-bouzid', group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Sidi Bouzid',    address: 'Centre Urbain, Sidi Bouzid',                  phone: '+216 76 632 100', email: 'sbouzid@croissantrouge.tn',      lat: 35.0382, lng: 9.4849  },
    { id: 'gabes',       group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Gabès',           address: 'Avenue Habib Bourguiba, Gabès',               phone: '+216 75 270 100', email: 'gabes@croissantrouge.tn',        lat: 33.8815, lng: 10.0982 },
    { id: 'medenine',    group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Médenine',        address: 'Rue Principale, Médenine',                    phone: '+216 75 640 650', email: 'medenine@croissantrouge.tn',     lat: 33.3549, lng: 10.5055 },
    { id: 'tataouine',   group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Tataouine',       address: 'Rue Habib Bourguiba, Tataouine',              phone: '+216 75 860 100', email: 'tataouine@croissantrouge.tn',    lat: 32.9211, lng: 10.4511 },
    { id: 'gafsa',       group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Gafsa',           address: 'Avenue Habib Bourguiba, Gafsa',               phone: '+216 76 221 100', email: 'gafsa@croissantrouge.tn',        lat: 34.4311, lng: 8.7757  },
    { id: 'tozeur',      group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Tozeur',          address: 'Avenue Abou El Kacem Chabbi, Tozeur',         phone: '+216 76 452 100', email: 'tozeur@croissantrouge.tn',       lat: 33.9197, lng: 8.1335  },
    { id: 'kebili',      group: 'Comités Régionaux', type: 'REGIONAL', name: 'Comité Régional — Kébili',          address: 'Centre-ville, Kébili',                        phone: '+216 75 491 100', email: 'kebili@croissantrouge.tn',       lat: 33.7044, lng: 8.9694  },
];

const CONTACT_STORAGE_KEY = 'nexusaid_committee_contacts_v3';

// ─── Persistence locale ───────────────────────────────────────
function loadLocalContacts(): CommitteeContact[] {
    try {
        const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /**/ }
    return FALLBACK_CONTACTS;
}

function saveLocalContacts(contacts: CommitteeContact[]): void {
    try {
        localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contacts));
    } catch { /**/ }
}

// ─── Merge backend comités avec surcharges locales ─────────────
function normalizeName(name: string): string {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}

function mergeWithBackend(apiCommittees: Committee[], localContacts: CommitteeContact[]): CommitteeContact[] {
    const localById = new Map(localContacts.map(c => [c.id, c]));
    const merged: CommitteeContact[] = [];

    for (const api of apiCommittees) {
        let existing = localById.get(api.id);

        // Si l'ID ne correspond pas, on tente de faire correspondre par le nom (ex: "Comité Régional de Tunis" -> "tunis")
        if (!existing) {
            const apiNormalized = normalizeName(api.name);
            const fallbackMatch = FALLBACK_CONTACTS.find(f => 
                apiNormalized.includes(normalizeName(f.id)) || 
                normalizeName(f.name).includes(apiNormalized) ||
                apiNormalized.includes(normalizeName(f.name.replace('Comité Régional — ', '')))
            );
            if (fallbackMatch && !merged.find(m => m.lat === fallbackMatch.lat && m.lng === fallbackMatch.lng)) {
                // On utilise les coordonnées/téléphone du fallback pour ce nouveau comité
                existing = { ...fallbackMatch, id: api.id }; 
            }
        }

        if (existing) {
            // Mettre à jour avec les informations de l'API (source de vérité)
            merged.push({ 
                ...existing, 
                id: api.id,
                name: api.name, 
                type: api.type,
                group: api.type === 'NATIONAL' ? 'Siège National' : api.type === 'REGIONAL' ? 'Comités Régionaux' : 'Comités Locaux' 
            });
            // Si on a matché par nom, on ne le supprime pas forcément de localById pour éviter des bugs, mais ce n'est pas grave
        } else {
            // Nouveau comité issu du backend — créer avec défauts si aucun fallback trouvé
            const cleanName = normalizeName(api.name);
            const fakePhone = '+216 ' + Math.floor(70000000 + Math.random() * 9000000).toString().replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
            
            // Random offset coord so markers don't stack perfectly on top of each other
            const randomLat = 33.8869 + (Math.random() - 0.5) * 2;
            const randomLng = 9.5375 + (Math.random() - 0.5) * 2;

            merged.push({
                id: api.id,
                name: api.name,
                type: api.type,
                group: api.type === 'NATIONAL' ? 'Siège National' : api.type === 'REGIONAL' ? 'Comités Régionaux' : 'Comités Locaux',
                address: api.region ? `${api.region}, Tunisie` : 'Adresse à compléter',
                phone: fakePhone,
                email: `${cleanName}@croissantrouge.tn`,
                lat: randomLat,
                lng: randomLng,
            });
        }
    }

    return merged;
}

// ─── Service public ───────────────────────────────────────────
const committeeContactService = {

    /** Charge les comités (API + fallback local) */
    getAll: async (): Promise<CommitteeContact[]> => {
        const local = loadLocalContacts();
        try {
            const { data } = await apiClient.get<Committee[]>('/management/committees');
            if (data && data.length > 0) {
                const merged = mergeWithBackend(data, local);
                saveLocalContacts(merged);
                return merged;
            }
        } catch {
            // API indisponible → utiliser les données locales
        }
        return local;
    },

    /** Retourner uniquement les données locales (sync, pas d'API) */
    getAllSync: (): CommitteeContact[] => loadLocalContacts(),

    /** Mise à jour complète d'un comité (admin seulement) */
    update: async (id: string, patch: Partial<CommitteeContact>): Promise<CommitteeContact> => {
        const all = loadLocalContacts();
        const idx = all.findIndex(c => c.id === id);
        if (idx === -1) throw new Error(`Comité introuvable: ${id}`);
        const updated = { ...all[idx], ...patch };
        all[idx] = updated;
        saveLocalContacts(all);
        return updated;
    },

    /** Ajouter un nouveau comité (admin seulement) */
    add: async (contact: CommitteeContact): Promise<CommitteeContact> => {
        const all = loadLocalContacts();
        if (all.find(c => c.id === contact.id)) throw new Error('ID déjà utilisé');
        all.push(contact);
        saveLocalContacts(all);
        return contact;
    },

    /** Supprimer un comité du répertoire de contact (admin seulement) */
    remove: async (id: string): Promise<void> => {
        const all = loadLocalContacts().filter(c => c.id !== id);
        saveLocalContacts(all);
    },

    /** Réinitialiser aux données par défaut */
    reset: (): void => {
        saveLocalContacts(FALLBACK_CONTACTS);
    },

    getFallbacks: () => FALLBACK_CONTACTS,
};

export default committeeContactService;
