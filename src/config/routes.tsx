// ============================================================
// NEXUS-AID — Application Routes
// Centralized route configuration with lazy loading + auth guard
// ============================================================

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import DonorLayout from '@/layouts/DonorLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LandingLayout from '@/layouts/LandingLayout';
import { useAuthStore, useUIStore } from '@/stores';

// ---- Full-screen loading page shown during lazy chunk loading ----
const PageLoader = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        gap: '20px',
    }}>
        {/* Spinner ring */}
        <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: '4px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            animation: 'nexus-spin 0.8s linear infinite',
        }} />
        {/* Brand text */}
        <span style={{
            color: '#e2e8f0',
            fontSize: '15px',
            letterSpacing: '0.08em',
            fontFamily: 'Inter, system-ui, sans-serif',
            opacity: 0.75,
        }}>
            NEXUS-AID — Chargement…
        </span>

        {/* Keyframes injected inline */}
        <style>{`
      @keyframes nexus-spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
    </div>
);

// ---- Helper: wrap any element in Suspense with the loader ----
const withLoader = (element: React.ReactNode) => (
    <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

// ---- Auth Guard: redirect to /login if not authenticated ----
const ProtectedRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    if (user?.type === 'DONOR') {
        return <Navigate to="/donor/dashboard" replace />;
    }
    return <MainLayout />;
};

// ---- Donor Protected Route: redirects donors to /donor/dashboard ----
const DonorProtectedRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    if (user?.type && user.type !== 'DONOR') {
        return <Navigate to="/dashboard" replace />;
    }
    return <DonorLayout />;
};

const FullscreenProtectedRoute: React.FC = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

// ---- Lazy-loaded pages for code splitting ----
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const VolunteersPage = lazy(() => import('@/pages/volunteers/VolunteersPage'));
const CommitteesPage = lazy(() => import('@/pages/committees/CommitteesPage'));
const StocksPage = lazy(() => import('@/pages/stocks/StocksPage'));
const DonationsPage = lazy(() => import('@/pages/donations/DonationsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const ValidationQueuePage = lazy(() => import('@/pages/management/ValidationQueuePage'));
const AuditTrailPage = lazy(() => import('@/pages/management/AuditTrailPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const AboutPage = lazy(() => import('@/pages/about/AboutPage'));

// ---- Volunteer self-service pages ----
const MyProfilePage = lazy(() => import('@/pages/volunteer/MyProfilePage'));
const NewsPage = lazy(() => import('@/pages/volunteer/NewsPage'));
const CalendarPage = lazy(() => import('@/pages/volunteer/CalendarPage'));
const MyCommitteePage = lazy(() => import('@/pages/volunteer/MyCommitteePage'));
const MyComplaintsPage = lazy(() => import('@/pages/volunteer/MyComplaintsPage'));
const ResourcesPage = lazy(() => import('@/pages/volunteer/ResourcesPage'));
const YouthSpacePage = lazy(() => import('@/pages/volunteer/YouthSpacePage'));
const QuizPage = lazy(() => import('@/pages/volunteer/QuizPage'));
const DonationReceptionPage = lazy(() => import('@/pages/volunteer/DonationReceptionPage'));

// ---- Donor-specific pages ----
const DonorDashboardPage = lazy(() => import('@/pages/donor/DonorDashboardPage'));
const DonorMapPage = lazy(() => import('@/pages/donor/DonorMapPage'));
const MakeDonationPage = lazy(() => import('@/pages/donor/MakeDonationPage'));
const DonorReceiptsPage = lazy(() => import('@/pages/donor/DonorReceiptsPage'));
const DonorNotificationsPage = lazy(() => import('@/pages/donor/DonorNotificationsPage'));

// ---- Domain-specific pages ----
const SecourismePage = lazy(() => import('@/pages/domains/SecourismePage'));
const DiffusionPage = lazy(() => import('@/pages/domains/DiffusionPage'));
const JeunessePage = lazy(() => import('@/pages/domains/JeunessePage'));
const SantePage = lazy(() => import('@/pages/domains/SantePage'));
const SocialPage = lazy(() => import('@/pages/domains/SocialPage'));
const ImmigrationPage = lazy(() => import('@/pages/domains/ImmigrationPage'));
const VffPage = lazy(() => import('@/pages/domains/VffPage'));
const CatastrophesPage = lazy(() => import('@/pages/domains/CatastrophesPage'));
const DistributionMedicalePage = lazy(() => import('@/pages/domains/DistributionMedicalePage'));

// ---- Crisis Command Center ----
const RadarDashboardPage = lazy(() => import('@/pages/crisis/Dashboard'));
const CrisisRoomPage = lazy(() => import('@/pages/crisis/CrisisRoomPage'));

// ---- Reporting & Template Builder ----
const TemplateListPage = lazy(() => import('@/pages/templates/TemplateListPage'));
const TemplateBuilderPage = lazy(() => import('@/pages/templates/TemplateBuilderPage'));
const AdminReportListPage = lazy(() => import('@/pages/admin-reports/AdminReportListPage'));
const ReportFillPage = lazy(() => import('@/pages/admin-reports/ReportFillPage'));
const ReportDetailPage = lazy(() => import('@/pages/admin-reports/ReportDetailPage'));
const ReportingDashboardPage = lazy(() => import('@/pages/reports/ReportingDashboardPage'));
const ReportingListPage = lazy(() => import('@/pages/reports/ReportingListPage'));
const ReportingTemplatesPage = lazy(() => import('@/pages/reports/ReportingTemplatesPage'));
const ReportingNotificationsPage = lazy(() => import('@/pages/reports/ReportingNotificationsPage'));


export const router = createBrowserRouter([
    // ---- Landing / Public Routes (Homepage = default) ----
    {
        path: '/',
        element: <LandingLayout />,
        children: [
            { index: true, element: withLoader(<HomePage />) },
            { path: 'about', element: withLoader(<AboutPage />) },
        ],
    },

    // ---- Donor Space Routes (dedicated DonorLayout, DONOR role only) ----
    {
        path: '/donor',
        element: <DonorProtectedRoute />,
        children: [
            { index: true, element: <Navigate to="/donor/dashboard" replace /> },
            { path: 'dashboard', element: withLoader(<DonorDashboardPage />) },
            { path: 'map', element: withLoader(<DonorMapPage />) },
            { path: 'donate', element: withLoader(<MakeDonationPage />) },
            { path: 'receipts', element: withLoader(<DonorReceiptsPage />) },
            { path: 'notifications', element: withLoader(<DonorNotificationsPage />) },
            { path: 'news', element: withLoader(<NewsPage />) },
            { path: 'profile', element: withLoader(<MyProfilePage />) },
            { path: 'complaints', element: withLoader(<MyComplaintsPage />) },
        ],
    },

    // ---- App Routes (protected, with sidebar + header) ----
    {
        path: '/',
        element: <ProtectedRoute />,
        children: [
            { path: 'dashboard', element: withLoader(<DashboardPage />) },
            { path: 'volunteers', element: withLoader(<VolunteersPage />) },
            { path: 'committees', element: withLoader(<CommitteesPage />) },
            { path: 'stocks', element: withLoader(<StocksPage />) },
            { path: 'donations', element: withLoader(<DonationsPage />) },
            // Removed duplicate redirect
            { path: 'settings', element: <Navigate to="/volunteer/profile" replace /> },
            { path: 'validation-queue', element: withLoader(<ValidationQueuePage />) },
            { path: 'audit-logs', element: withLoader(<AuditTrailPage />) },

            // Volunteer routes
            { path: 'volunteer/profile', element: withLoader(<MyProfilePage />) },
            { path: 'volunteer/news', element: withLoader(<NewsPage />) },
            { path: 'volunteer/calendar', element: withLoader(<CalendarPage />) },
            { path: 'volunteer/committee', element: withLoader(<MyCommitteePage />) },
            { path: 'volunteer/complaints', element: withLoader(<MyComplaintsPage />) },
            { path: 'volunteer/resources', element: withLoader(<ResourcesPage />) },
            { path: 'volunteer/youth', element: withLoader(<YouthSpacePage />) },
            { path: 'volunteer/quiz', element: withLoader(<QuizPage />) },
            { path: 'volunteer/reception', element: withLoader(<DonationReceptionPage />) },
            // Domain-specific routes
            { path: 'secourisme', element: withLoader(<SecourismePage />) },
            { path: 'diffusion', element: withLoader(<DiffusionPage />) },
            { path: 'jeunesse', element: withLoader(<JeunessePage />) },
            { path: 'sante', element: withLoader(<SantePage />) },
            { path: 'social', element: withLoader(<SocialPage />) },
            { path: 'immigration', element: withLoader(<ImmigrationPage />) },
            { path: 'vff', element: withLoader(<VffPage />) },
            { path: 'catastrophes', element: withLoader(<CatastrophesPage />) },
            { path: 'distribution-medicale', element: withLoader(<DistributionMedicalePage />) },

            // Core Crisis Modules
            { path: 'radar', element: withLoader(<RadarDashboardPage />) },
            { path: 'crisis-room/:id', element: withLoader(<CrisisRoomPage />) },

            // Reporting — Hub unifié (point d'entrée principal)
            { path: 'reporting/dashboard', element: withLoader(<ReportingDashboardPage />) },
            { path: 'reporting/list', element: withLoader(<ReportingListPage />) },
            { path: 'reporting/templates', element: withLoader(<ReportingTemplatesPage />) },
            { path: 'reporting/notifications', element: withLoader(<ReportingNotificationsPage />) },
            { path: 'reporting/reports/:id', element: withLoader(<ReportDetailPage />) },
            { path: 'reporting/reports/:id/fill', element: withLoader(<ReportFillPage />) },
            
            // Redirect legacy paths to new paths
            { path: 'reports', element: <Navigate to="/reporting/dashboard" replace /> },
            { path: 'templates', element: <Navigate to="/reporting/templates" replace /> },
            { path: 'admin-reports', element: <Navigate to="/reporting/list" replace /> },
            { path: 'admin-reports/:id', element: <Navigate to="/reporting/reports/:id" replace /> },
            { path: 'admin-reports/:id/fill', element: <Navigate to="/reporting/reports/:id/fill" replace /> },
        ],
    },

    // ---- Template Builder (fullscreen — no sidebar) ----
    {
        element: <FullscreenProtectedRoute />,
        children: [
            { path: '/templates/new', element: withLoader(<TemplateBuilderPage />) },
            { path: '/templates/:id/edit', element: withLoader(<TemplateBuilderPage />) },
        ],
    },

    // ---- Fullscreen Crisis Views (protected, no main shell) ----
    {
        element: <FullscreenProtectedRoute />,
        children: [
            { path: '/radar/fullscreen', element: withLoader(<RadarDashboardPage />) },
            { path: '/crisis-room/:id/fullscreen', element: withLoader(<CrisisRoomPage />) },
        ],
    },

    // ---- Auth Routes (no sidebar, dark background) ----
    {
        element: <AuthLayout />,
        children: [
            { path: '/login', element: withLoader(<LoginPage />) },
            { path: '/register', element: withLoader(<RegisterPage />) },
        ],
    },

    // ---- 404 ----
    { path: '*', element: withLoader(<NotFoundPage />) },
]);
