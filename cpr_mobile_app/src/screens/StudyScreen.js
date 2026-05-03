/**
 * StudyScreen - Formations et apprentissage du secourisme
 * PSE1, PSE2, protocoles, quiz interactifs
 * Croissant Rouge Tunisien
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COURSES = [
    {
        id: 'pse1',
        title: 'PSE 1 — Premiers Secours en Équipe',
        level: 'Niveau 1',
        levelColor: '#10B981',
        icon: '🏥',
        duration: '35h',
        description: 'Formation de base : bilan, gestes d\'urgence, RCP, DEA, traumatismes.',
        modules: [
            { id: 'm1', title: 'Sécurité et protection', icon: '🦺', duration: '3h', done: true },
            { id: 'm2', title: 'Bilan de la victime', icon: '🔍', duration: '5h', done: true },
            { id: 'm3', title: 'Arrêt cardio-respiratoire', icon: '🫀', duration: '8h', done: false },
            { id: 'm4', title: 'Obstruction des voies aériennes', icon: '😮‍💨', duration: '3h', done: false },
            { id: 'm5', title: 'Hémorragies', icon: '🩸', duration: '4h', done: false },
            { id: 'm6', title: 'Traumatismes', icon: '🦴', duration: '6h', done: false },
            { id: 'm7', title: 'Malaises et maladies', icon: '🤒', duration: '4h', done: false },
            { id: 'm8', title: 'Relevage et brancardage', icon: '🛻', duration: '4h', done: false },
        ],
    },
    {
        id: 'pse2',
        title: 'PSE 2 — Premiers Secours en Équipe',
        level: 'Niveau 2',
        levelColor: '#3B82F6',
        icon: '⚕️',
        duration: '70h',
        description: 'Perfectionnement : bilans avancés, médications, gestion de scène.',
        modules: [
            { id: 'm1', title: 'Révision PSE 1', icon: '📖', duration: '4h', done: false },
            { id: 'm2', title: 'Bilan complémentaire', icon: '📊', duration: '8h', done: false },
            { id: 'm3', title: 'Bilans spécifiques', icon: '🏥', duration: '10h', done: false },
            { id: 'm4', title: 'Urgences vitales', icon: '🚨', duration: '12h', done: false },
            { id: 'm5', title: 'Gestion de scène', icon: '🗺️', duration: '8h', done: false },
        ],
    },
    {
        id: 'dea',
        title: 'Utilisation du DEA / DAE',
        level: 'Pratique',
        levelColor: '#F59E0B',
        icon: '⚡',
        duration: '4h',
        description: 'Maîtriser l\'utilisation du défibrillateur automatisé externe.',
        modules: [
            { id: 'm1', title: 'Présentation du DEA', icon: '⚡', duration: '1h', done: false },
            { id: 'm2', title: 'Séquence d\'utilisation', icon: '▶️', duration: '2h', done: false },
            { id: 'm3', title: 'Cas pratiques', icon: '🧪', duration: '1h', done: false },
        ],
    },
    {
        id: 'ndrt_training',
        title: 'Formation NDRT/RDRT',
        level: 'Avancé',
        levelColor: '#DC2626',
        icon: '🌍',
        duration: '120h',
        description: 'Intervention en catastrophe, coordination, logistique humanitaire.',
        modules: [
            { id: 'm1', title: 'Gestion des catastrophes', icon: '🌪️', duration: '20h', done: false },
            { id: 'm2', title: 'Coordination d\'équipe', icon: '👥', duration: '15h', done: false },
            { id: 'm3', title: 'Logistique humanitaire', icon: '📦', duration: '20h', done: false },
            { id: 'm4', title: 'Communication de crise', icon: '📡', duration: '10h', done: false },
        ],
    },
];

const QUIZ_QUESTIONS = [
    {
        q: 'Quelle est la fréquence recommandée des compressions thoraciques chez l\'adulte ?',
        options: ['60-80/min', '100-120/min', '80-100/min', '120-140/min'],
        correct: 1,
        explanation: 'Les recommandations internationales (ERC 2021) préconisent 100 à 120 compressions par minute.',
    },
    {
        q: 'Quelle est la profondeur des compressions pour un adulte ?',
        options: ['2-3 cm', '3-4 cm', '5-6 cm', '7-8 cm'],
        correct: 2,
        explanation: 'La profondeur recommandée est de 5 à 6 cm pour garantir une efficacité optimale.',
    },
    {
        q: 'Le ratio compressions/ventilations pour 1 secouriste est :',
        options: ['15:2', '30:2', '30:1', '15:1'],
        correct: 1,
        explanation: '30 compressions suivies de 2 insufflations est le ratio standard pour 1 ou 2 secouristes chez l\'adulte.',
    },
    {
        q: 'Quel est le signe d\'un arrêt cardiaque ?',
        options: ['Pâleur cutanée', 'Absence de pouls + absence de respiration normale', 'Perte de conscience', 'Cyanose des lèvres'],
        correct: 1,
        explanation: 'L\'arrêt cardiaque se définit par l\'absence de pouls carotidien ET l\'absence de respiration normale (ou gasps).',
    },
    {
        q: 'La position latérale de sécurité (PLS) est indiquée pour :',
        options: ['Victime en arrêt cardiaque', 'Victime inconsciente qui respire', 'Victime qui saigne', 'Tout type de victime'],
        correct: 1,
        explanation: 'La PLS maintient les voies aériennes ouvertes chez une victime inconsciente qui respire encore normalement.',
    },
];

export default function StudyScreen({ navigation }) {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [quizMode, setQuizMode] = useState(false);
    const [quizIndex, setQuizIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [quizScore, setQuizScore] = useState(0);
    const [quizDone, setQuizDone] = useState(false);

    const handleAnswerSelect = (idx) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(idx);
        if (idx === QUIZ_QUESTIONS[quizIndex].correct) {
            setQuizScore((s) => s + 1);
        }
    };

    const handleNextQuestion = () => {
        if (quizIndex + 1 >= QUIZ_QUESTIONS.length) {
            setQuizDone(true);
        } else {
            setQuizIndex((i) => i + 1);
            setSelectedAnswer(null);
        }
    };

    const resetQuiz = () => {
        setQuizIndex(0);
        setSelectedAnswer(null);
        setQuizScore(0);
        setQuizDone(false);
    };

    if (quizMode) {
        const q = QUIZ_QUESTIONS[quizIndex];
        return (
            <SafeAreaView style={styles.safe} edges={['bottom']}>
                <View style={styles.quizHeader}>
                    <TouchableOpacity onPress={() => { setQuizMode(false); resetQuiz(); }}>
                        <Text style={styles.quizBack}>← Retour</Text>
                    </TouchableOpacity>
                    <Text style={styles.quizProgress}>
                        {quizDone ? 'Résultats' : `Question ${quizIndex + 1}/${QUIZ_QUESTIONS.length}`}
                    </Text>
                    <Text style={styles.quizScore}>🏅 {quizScore}</Text>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.quizContent}>
                    {quizDone ? (
                        <View style={styles.quizResult}>
                            <Text style={styles.quizResultEmoji}>
                                {quizScore >= 4 ? '🏆' : quizScore >= 3 ? '👍' : '📖'}
                            </Text>
                            <Text style={styles.quizResultScore}>
                                {quizScore} / {QUIZ_QUESTIONS.length}
                            </Text>
                            <Text style={styles.quizResultMsg}>
                                {quizScore >= 4
                                    ? 'Excellent ! Vous maîtrisez ces notions.'
                                    : quizScore >= 3
                                    ? 'Bien ! Continuez à réviser.'
                                    : 'Révisez les modules de formation.'}
                            </Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={resetQuiz}>
                                <Text style={styles.retryBtnText}>🔄  Recommencer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.exitBtn}
                                onPress={() => { setQuizMode(false); resetQuiz(); }}
                            >
                                <Text style={styles.exitBtnText}>← Retour aux formations</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.questionCard}>
                                <Text style={styles.questionText}>{q.q}</Text>
                            </View>
                            {q.options.map((opt, i) => {
                                let bg = '#FFFFFF';
                                let border = '#E5E7EB';
                                let textColor = '#111827';
                                if (selectedAnswer !== null) {
                                    if (i === q.correct) { bg = '#ECFDF5'; border = '#10B981'; textColor = '#065F46'; }
                                    else if (i === selectedAnswer && i !== q.correct) { bg = '#FEF2F2'; border = '#DC2626'; textColor = '#991B1B'; }
                                }
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                                        onPress={() => handleAnswerSelect(i)}
                                        disabled={selectedAnswer !== null}
                                    >
                                        <Text style={[styles.optionText, { color: textColor }]}>
                                            {String.fromCharCode(65 + i)}.  {opt}
                                        </Text>
                                        {selectedAnswer !== null && i === q.correct && (
                                            <Text style={styles.optionCheck}>✓</Text>
                                        )}
                                        {selectedAnswer === i && i !== q.correct && (
                                            <Text style={styles.optionX}>✗</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                            {selectedAnswer !== null && (
                                <View style={styles.explanationCard}>
                                    <Text style={styles.explanationTitle}>💡  Explication</Text>
                                    <Text style={styles.explanationText}>{q.explanation}</Text>
                                    <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuestion}>
                                        <Text style={styles.nextBtnText}>
                                            {quizIndex + 1 >= QUIZ_QUESTIONS.length ? 'Voir les résultats →' : 'Question suivante →'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Quiz rapide */}
                <TouchableOpacity style={styles.quizBanner} onPress={() => setQuizMode(true)}>
                    <Text style={styles.quizBannerIcon}>🧠</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.quizBannerTitle}>Quiz Rapide</Text>
                        <Text style={styles.quizBannerSub}>
                            Testez vos connaissances — {QUIZ_QUESTIONS.length} questions
                        </Text>
                    </View>
                    <Text style={styles.quizBannerArrow}>→</Text>
                </TouchableOpacity>

                {/* Formations */}
                <Text style={styles.sectionTitle}>📚  Formations Disponibles</Text>

                {COURSES.map((course) => {
                    const doneLessons = course.modules.filter((m) => m.done).length;
                    const progress = (doneLessons / course.modules.length) * 100;

                    return (
                        <TouchableOpacity
                            key={course.id}
                            style={styles.courseCard}
                            onPress={() => setSelectedCourse(selectedCourse?.id === course.id ? null : course)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.courseHeader}>
                                <Text style={styles.courseIcon}>{course.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.courseTitleRow}>
                                        <Text style={styles.courseTitle}>{course.title}</Text>
                                        <View style={[styles.levelBadge, { backgroundColor: course.levelColor + '22', borderColor: course.levelColor }]}>
                                            <Text style={[styles.levelText, { color: course.levelColor }]}>
                                                {course.level}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.courseDesc}>{course.description}</Text>
                                    <View style={styles.courseMeta}>
                                        <Text style={styles.courseDuration}>⏱ {course.duration}</Text>
                                        <Text style={styles.courseProgress}>
                                            {doneLessons}/{course.modules.length} modules
                                        </Text>
                                    </View>

                                    {/* Barre de progression */}
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: course.levelColor }]} />
                                    </View>
                                </View>
                                <Text style={styles.courseChevron}>
                                    {selectedCourse?.id === course.id ? '▲' : '▼'}
                                </Text>
                            </View>

                            {/* Modules dépliés */}
                            {selectedCourse?.id === course.id && (
                                <View style={styles.modulesList}>
                                    {course.modules.map((mod) => (
                                        <View key={mod.id} style={[styles.moduleRow, mod.done && styles.moduleRowDone]}>
                                            <Text style={styles.moduleIcon}>{mod.icon}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.moduleTitle, mod.done && styles.moduleTitleDone]}>
                                                    {mod.title}
                                                </Text>
                                                <Text style={styles.moduleDuration}>{mod.duration}</Text>
                                            </View>
                                            <Text style={mod.done ? styles.moduleDoneCheck : styles.moduleUndone}>
                                                {mod.done ? '✓' : '○'}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* Ressources supplémentaires */}
                <Text style={styles.sectionTitle}>🔗  Ressources CRT</Text>
                {[
                    { icon: '📄', title: 'Guide ERC 2021 (PDF)', sub: 'Directives européennes de réanimation' },
                    { icon: '🎬', title: 'Vidéos pédagogiques', sub: 'Démonstrations pratiques PSE' },
                    { icon: '📱', title: 'Fiches mémo', sub: 'Résumés rapides par situation' },
                ].map((r, i) => (
                    <TouchableOpacity key={i} style={styles.resourceRow}>
                        <Text style={styles.resourceIcon}>{r.icon}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.resourceTitle}>{r.title}</Text>
                            <Text style={styles.resourceSub}>{r.sub}</Text>
                        </View>
                        <Text style={styles.resourceArrow}>→</Text>
                    </TouchableOpacity>
                ))}

                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    scroll: { padding: 16 },

    // Quiz banner
    quizBanner: {
        backgroundColor: '#7C3AED',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    quizBannerIcon: { fontSize: 36 },
    quizBannerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    quizBannerSub: { color: '#DDD6FE', fontSize: 12, marginTop: 2 },
    quizBannerArrow: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 12,
        marginTop: 4,
    },

    // Course card
    courseCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    courseHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        gap: 12,
    },
    courseIcon: { fontSize: 32 },
    courseTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    courseTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
    levelBadge: {
        borderRadius: 10,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderWidth: 1,
    },
    levelText: { fontSize: 10, fontWeight: '700' },
    courseDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
    courseMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    courseDuration: { fontSize: 11, color: '#9CA3AF' },
    courseProgress: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    progressBar: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: { height: 4, borderRadius: 2 },
    courseChevron: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

    // Modules list
    modulesList: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        gap: 8,
    },
    moduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
    },
    moduleRowDone: { backgroundColor: '#ECFDF5' },
    moduleIcon: { fontSize: 18 },
    moduleTitle: { fontSize: 13, color: '#374151', fontWeight: '500' },
    moduleTitleDone: { color: '#065F46', textDecorationLine: 'line-through' },
    moduleDuration: { fontSize: 11, color: '#9CA3AF' },
    moduleDoneCheck: { color: '#10B981', fontSize: 16, fontWeight: '700' },
    moduleUndone: { color: '#D1D5DB', fontSize: 16 },

    // Resources
    resourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        gap: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    resourceIcon: { fontSize: 24 },
    resourceTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
    resourceSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    resourceArrow: { color: '#9CA3AF', fontSize: 18 },

    // Quiz screen
    quizHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    quizBack: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    quizProgress: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    quizScore: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    quizContent: { padding: 16 },
    questionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    questionText: { fontSize: 16, fontWeight: '600', color: '#111827', lineHeight: 24 },
    optionBtn: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionText: { fontSize: 14, flex: 1 },
    optionCheck: { color: '#10B981', fontSize: 18, fontWeight: '700' },
    optionX: { color: '#DC2626', fontSize: 18, fontWeight: '700' },
    explanationCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginTop: 4,
    },
    explanationTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginBottom: 6 },
    explanationText: { fontSize: 13, color: '#374151', lineHeight: 20 },
    nextBtn: {
        backgroundColor: '#7C3AED',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    nextBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    quizResult: { alignItems: 'center', padding: 20 },
    quizResultEmoji: { fontSize: 64, marginBottom: 16 },
    quizResultScore: { fontSize: 48, fontWeight: '900', color: '#7C3AED' },
    quizResultMsg: { fontSize: 16, color: '#374151', textAlign: 'center', marginTop: 8, lineHeight: 24 },
    retryBtn: {
        backgroundColor: '#7C3AED',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 32,
        marginTop: 24,
    },
    retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    exitBtn: { marginTop: 12, padding: 10 },
    exitBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 14 },
});
