/**
 * ChatBotService - Réponses simulées pour l'assistant IA
 * Premiers secours, RCP, urgences médicales
 * Croissant Rouge Tunisien
 */

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

// ──────────────────────────────────────────────────────────────────────────────
// BASE DE CONNAISSANCES PREMIERS SECOURS
// ──────────────────────────────────────────────────────────────────────────────
const KB = [
    // RCP / Réanimation Cardio-Pulmonaire
    {
        patterns: ['rcp', 'reanima', 'massage cardiaque', 'compressions', 'cardiac', 'cœur', 'coeur', 'arret cardiaque', 'arrêt'],
        response: `**🫀 Réanimation Cardio-Pulmonaire (RCP)**

Suivez ces étapes en cas d'arrêt cardiaque :

1. **Vérifiez** la sécurité de la scène
2. **Évaluez** la victime : secouer les épaules, appeler "Ça va ?"
3. **Alertez** le 190 (Tunisie) ou demandez à quelqu'un de le faire
4. **Commencez les compressions** :
   - Mains au centre du thorax
   - Bras tendus, épaules à la verticale
   - Déprimez de **5–6 cm** à une fréquence de **100–120/min**
5. **Bouche-à-bouche** : 30 compressions → 2 insufflations
6. **DEA** : Utilisez le défibrillateur dès qu'il est disponible

⚠️ Ne jamais s'arrêter avant l'arrivée des secours sauf épuisement.`,
    },

    // Hémorragie
    {
        patterns: ['hémorragie', 'hemorragie', 'saignement', 'saigne', 'sang', 'blessure', 'plaie'],
        response: `**🩹 Contrôle d'une Hémorragie**

Pour arrêter un saignement important :

1. **Protégez-vous** : portez des gants si possible
2. **Compression directe** : appuyez FORT sur la plaie avec un tissu propre ou un pansement
3. **Maintenez la pression** sans relâcher pendant 10–15 minutes
4. **Ne retirez pas** le pansement imbibé — ajoutez en par-dessus
5. **Allongez** la victime si possible
6. **Surveillez** les signes de choc : pâleur, sueurs, confusion

🚨 **Garrot** uniquement si hémorragie de membre incontrôlable :
- Posez-le à 5 cm au-dessus de la plaie
- Marquez l'heure de pose sur le garrot
- N'enlevez jamais le garrot vous-même

Appelez le **190** immédiatement !`,
    },

    // Étouffement
    {
        patterns: ['etouffement', 'étouffement', 'manœuvre', 'heimlich', 'obstruction', 'avale', 'objet'],
        response: `**🫁 Étouffement (Corps étranger sur les voies aériennes)**

**Si la victime tousse :** Encouragez-la à tousser, ne faites rien.

**Si elle ne peut plus tousser ou respirer :**

👤 **Adulte/Enfant > 1 an :**
1. Penchez-la en avant
2. Donnez 5 **claques dans le dos** (fermes, entre les omoplates)
3. Alternez avec 5 **compressions abdominales** (Heimlich) :
   - Serrez les mains au-dessus du nombril
   - Poussez en dedans et vers le haut

👶 **Nourrisson < 1 an :**
- 5 claques dos → 5 compressions thoraciques
- Ne jamais faire Heimlich sur nourrisson

🚨 Si inconscient : commencez la RCP et appelez le **190**.`,
    },

    // Brûlure
    {
        patterns: ['brûlure', 'brulure', 'brûlé', 'brule', 'feu', 'chaleur', 'vapeur'],
        response: `**🔥 Brûlures — Conduite à Tenir**

**1ère étape — REFROIDIR IMMÉDIATEMENT :**
- Eau froide (15–18°C) pendant **15–20 minutes minimum**
- Commencez DANS les 3 minutes si possible
- Ne pas utiliser glace, beurre, dentifrice !

**Évaluation :**
- 1er degré : rougeur → pas urgent
- 2ème degré : cloques → consultation médicale
- 3ème degré : peau blanche/noire insensible → urgence absolue

**Ce qu'il ne faut PAS faire :**
❌ Percer les cloques
❌ Mettre corps gras ou pâte dentifrice
❌ Arracher les vêtements collés
❌ Couvrir avec un tissu peluché

✅ Couvrez avec film alimentaire ou compresse humide propre.

Appelez le **190** si brûlure étendue ou profonde.`,
    },

    // Choc anaphylactique
    {
        patterns: ['anaphyla', 'allergie', 'allergique', 'adrenaline', 'adrénaline', 'piqure', 'piqûre', 'choc allergique'],
        response: `**💉 Choc Anaphylactique (Réaction Allergique Sévère)**

**Signes :** Urticaire généralisée, gonflement lèvres/gorge, difficultés respiratoires, chute tension, perte connaissance.

**Actions immédiates :**

1. **Appelez le 190 en urgence**
2. **Injectez l'adrénaline** si disponible (auto-injecteur) :
   - Face externe de la cuisse
   - Même à travers les vêtements
3. **Allongez** la victime, jambes surélevées
4. **Si difficultés respiratoires :** position semi-assise
5. **Surveillez** la respiration en continu
6. **Deuxième injection** si pas d'amélioration après 5–15 min

⚠️ Ne jamais lever debout une victime en état de choc.
Ne jamais donner à manger ou à boire.

Hospitalization OBLIGATOIRE même après amélioration.`,
    },

    // Fracture
    {
        patterns: ['fractur', 'os', 'entorse', 'luxation', 'cheville', 'poignet', 'jambe', 'bras cassé'],
        response: `**🦴 Fractures et Traumatismes**

**Signes évocateurs :**
- Douleur intense, gonflement, déformation, impotence fonctionnelle

**À faire :**
1. Ne pas mobiliser inutilement
2. **Immobilisez** le membre dans la position trouvée
3. En cas de plaie ouverte : couvrez avec compresse propre (ne pas réduire)
4. Appliquez froid indirectement (tissu entre la peau et la glace)
5. **Fracture du rachis** : ne bougez PAS la victime sauf danger

**Fracture du bassin/membres inférieurs :**
- Aidez à rester en position confortable
- Attendez les secours

**Entorse :**
- RICE : Repos, Glace, Compression, Élévation

🚨 Fracture ouverte ou rachis → Appelez le **190**.`,
    },

    // Malaise / Perte de connaissance
    {
        patterns: ['malaise', 'perte', 'inconscient', 'évanoui', 'évanouie', 'syncope', 'perd connaissance', 'tombe'],
        response: `**😵 Malaise / Perte de Connaissance**

**Victime inconsciente qui respire :**
1. Allongez sur le dos, vérifiez la bouche (corps étranger)
2. Inclinez la tête en arrière, soulevez le menton
3. Vérifiez la respiration 10 sec max
4. Si elle respire → **Position Latérale de Sécurité (PLS)**
5. Couvrez, surveillez jusqu'aux secours

**Victime inconsciente qui NE respire PAS → RCP**

**Malaise avec conscience conservée :**
- Installez confortablement
- Diabète ? → sucre si conscient
- Douleur thoracique ? → Aspirine si pas allergie
- Ne laissez pas seule

📞 Appelez le **190** et décrivez précisément.`,
    },

    // Noyade
    {
        patterns: ['noyade', 'noye', 'noyé', 'eau', 'se noie'],
        response: `**🌊 Noyade**

**Ne sautez PAS dans l'eau si vous n'êtes pas formé !**

**Depuis la rive :**
1. Criez pour alerter
2. Lancez une bouée, une corde, un objet flottant
3. Appelez le **197** (Protection Civile) ou **190**

**Une fois la victime sur la rive :**
1. Allongez sur dos, penchée lat. pour évacuer l'eau
2. Vérifiez si elle respire
3. Si elle ne respire pas : **RCP immédiat**
   - Commencez par 5 insufflations initiales
   - Puis 30 compressions / 2 insufflations
4. Si hypothermie : couvrez, protégez du sol froid

⚠️ Une victime de noyade doit TOUJOURS être hospitalisée même si elle semble rétablie (noyade secondaire).`,
    },

    // Crise d'épilepsie
    {
        patterns: ['épilepsie', 'epilepsie', 'crise', 'convulsion', 'convulse'],
        response: `**🧠 Crise d'Épilepsie (Convulsions)**

**Pendant la crise :**
1. **Ne retenez pas** la victime — ne vous blessez pas
2. **Écartez** les objets dangereux autour
3. Protégez la tête (coussin, vêtement)
4. **Ne rien mettre dans la bouche** — mythe dangereux !
5. Chronométrez la durée de la crise

**Après la crise :**
1. Mettez en PLS (position latérale de sécurité)
2. Restez avec elle jusqu'au retour à la conscience
3. Rassurez à son retour (somnolence normale)

**Appelez le 190 si :**
- Crise > 5 minutes
- Plusieurs crises successives
- Pas de retour à la conscience
- Blessure pendant la crise
- Première crise jamais observée`,
    },

    // PSE1 / PSE2
    {
        patterns: ['pse1', 'pse2', 'pse', 'brevet', 'formation', 'diplome', 'diplôme', 'secouriste', 'certif'],
        response: `**📚 Formations PSE — Premiers Secours**

**PSE1 — Premiers Secours en Équipe niveau 1 :**
- Durée : 35h (pratique)
- Contenu : obstruction VA, RCP, DEA, hémorragies, traumatismes
- Pré-requis : aucun (à partir de 16 ans)
- Valide 4 ans puis recyclage

**PSE2 — Premiers Secours en Équipe niveau 2 :**
- Durée : 70h (après PSE1)
- Contenu : bilans, monitoring, soins avancés, gestion de scène
- Pré-requis : PSE1 valide
- Permet d'être secouriste en équipe opérationnelle

**NDRT — National Disaster Response Team :**
- Formation avancée FICR/Croissant-Rouge
- Gestion catastrophes, crises humanitaires
- Modules : camp, eau/assainissement, logistique

📍 Pour vous inscrire, contactez votre délégation CRT locale.`,
    },

    // Coup de chaleur
    {
        patterns: ['chaleur', 'insolation', 'coup de soleil', 'hyperthermie', 'chaud', 'hypertherm'],
        response: `**☀️ Coup de Chaleur / Insolation**

**Signes :** Peau chaude et sèche (pas de sueur !), température > 40°C, confusion, maux de tête, pouls rapide.

**C'est UNE urgence vitale !**

**Actions immédiates :**
1. Appelez le **190**
2. Mettez à l'ombre / lieu frais immédiatement
3. Refroidissez rapidement :
   - Aspergez d'eau froide le corps entier
   - Ventillez activement
   - Glaçons sur nuque, aisselles, plis de l'aine
4. Allongez, jambes légèrement surélevées
5. Si conscient : eau fraîche à boire par petites gorgées

⚠️ Insolation ≠ Coup de chaleur :
- Insolation : tête exposée au soleil, signes modérés
- Coup de chaleur : atteinte neurologique grave

Ne jamais laisser quelqu'un seul avec un coup de chaleur.`,
    },

    // DEA / Défibrillateur
    {
        patterns: ['dea', 'defibrillateur', 'défibrillateur', 'choc electrique', 'choc électrique', 'dae'],
        response: `**⚡ Défibrillateur Automatisé Externe (DEA/DAE)**

**Quand l'utiliser ?**
Dès qu'une victime est inconsciente et ne respire pas normalement.

**Étapes d'utilisation :**
1. **Allumez** le DEA (bouton vert ou ouvrez le couvercle)
2. **Placez les électrodes** selon les schémas illustrés :
   - Sous la clavicule droite
   - Flanc gauche (dessous aisselle gauche)
3. **Branchez** le câble (sur certains modèles)
4. **Laissez analyser** — ne touchez pas la victime
5. Si choc conseillé : **écartez tout le monde** et appuyez sur le bouton choc
6. **Reprenez la RCP immédiatement** après le choc
7. Suivez les instructions vocales du DEA

📍 Les DEA sont signalés par un panneau vert avec un cœur et un éclair ⚡

✅ Le DEA est sûr : il n'envoie de choc que si nécessaire.`,
    },

    // Greeting / Salutations
    {
        patterns: ['bonjour', 'bonsoir', 'salut', 'hello', 'salam', 'مرحبا', 'السلام'],
        response: `**Bonjour ! 👋**

Je suis votre assistant Croissant Rouge Tunisien.

Je peux vous aider sur :
- 🫀 Réanimation (RCP, DEA)
- 🩹 Hémorragies et plaies
- 🔥 Brûlures
- 🦴 Fractures et traumatismes
- 😵 Malaise et perte de connaissance
- 🌊 Noyade
- 💉 Choc anaphylactique
- ☀️ Coup de chaleur
- 📚 Formations PSE1/PSE2/NDRT

Posez-moi **n'importe quelle question** sur les premiers secours !`,
    },

    // Urgence / appel
    {
        patterns: ['numéro urgence', 'numero urgence', 'appeler', 'appel', '190', '197', 'samu', 'secours'],
        response: `**📞 Numéros d'Urgence en Tunisie**

| Service | Numéro |
|---------|--------|
| 🚑 SAMU (Urgences médicales) | **190** |
| 🚒 Protection Civile | **198** |
| 👮 Police Nationale | **197** |
| 🏥 Polyclinique urgences | **193** |

**Que dire quand vous appelez le 190 :**
1. "J'ai besoin d'une ambulance"
2. **Localisation précise** : adresse, point de repère
3. **Nature du problème** : "Victime inconsciente" / "Blessé grave" / etc.
4. **Nombre de victimes**
5. **Votre nom et numéro de téléphone**

⚠️ **Ne raccrochez pas** tant que l'opérateur ne vous y invite pas.`,
    },
];

// ──────────────────────────────────────────────────────────────────────────────
// RÉPONSE PAR DÉFAUT
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_RESPONSES = [
    `Je n'ai pas de réponse précise à cette question dans ma base de connaissances.

Pour une urgence, appelez le **190** immédiatement.

Vous pouvez me poser des questions sur :
• RCP et défibrillateur
• Hémorragies et plaies
• Brûlures, fractures
• Choc anaphylactique
• Noyade, coup de chaleur
• Formations PSE1/PSE2`,
    `Cette situation dépasse ma base de connaissances actuelle.

En cas d'urgence réelle → **Appelez le 190 sans attendre.**

Je reste disponible pour toute question sur les gestes de premiers secours : RCP, hémorragie, brûlure, étouffement, etc.`,
];

// ──────────────────────────────────────────────────────────────────────────────
// LOGIQUE DE CORRESPONDANCE
// ──────────────────────────────────────────────────────────────────────────────
function findBestResponse(question) {
    const q = question.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['']/g, "'");

    // Recherche par mots-clés
    for (const entry of KB) {
        if (entry.patterns.some((p) => q.includes(p))) {
            return entry.response;
        }
    }

    // Réponse par défaut aléatoire
    return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
}

// ──────────────────────────────────────────────────────────────────────────────
// SERVICE EXPORT
// ──────────────────────────────────────────────────────────────────────────────
export const chatBotService = {
    /**
     * Envoie une question à l'assistant
     * @param {string} question - Question posée par l'utilisateur
     * @returns {Promise<string>} - Réponse de l'assistant
     */
    async ask(question) {
        // Simuler un délai de "réflexion" réaliste
        const thinkTime = 800 + Math.random() * 1200;
        await delay(thinkTime);

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return 'Pouvez-vous reformuler votre question ? Je suis là pour vous aider.';
        }

        return findBestResponse(question.trim());
    },

    /**
     * Suggestions de questions par catégorie
     */
    getSuggestedQuestions() {
        return [
            { label: 'Comment faire une RCP ?', icon: '🫀' },
            { label: 'Victime inconsciente que faire ?', icon: '😵' },
            { label: 'Comment gérer une hémorragie ?', icon: '🩹' },
            { label: 'Brûlure grave, premiers gestes ?', icon: '🔥' },
            { label: 'Quelqu\'un s\'étouffe, que faire ?', icon: '🫁' },
            { label: 'Comment utiliser un DEA ?', icon: '⚡' },
            { label: 'Différence PSE1 et PSE2 ?', icon: '📚' },
            { label: 'Numéros d\'urgence Tunisie', icon: '📞' },
        ];
    },
};
