// ============================================================
// NEXUS-AID — Ant Design Theme Configuration
// Custom theme tokens matching CRT branding palette
// ============================================================

import type { ThemeConfig } from 'antd';

// Brand Colors
const colors = {
    red: '#f10316',
    crimson: '#e23a4d',
    pink: '#ef7984',
    blush: '#f7b6b9',
    light: '#f7f8f6',
    dark: '#302d28',
    gray: '#bebdb9',
    mid: '#7a7774',
};

export const lightTheme: ThemeConfig = {
    token: {
        // Brand Colors
        colorPrimary: colors.red,
        colorInfo: colors.crimson,
        colorSuccess: '#16a34a',
        colorWarning: '#f59e0b',
        colorError: '#dc2626',
        colorLink: colors.crimson,

        // Typography
        fontFamily: "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 14,
        fontSizeHeading1: 30,
        fontSizeHeading2: 24,
        fontSizeHeading3: 20,
        fontSizeHeading4: 16,

        // Border & Radius
        borderRadius: 12,
        borderRadiusLG: 16,
        borderRadiusSM: 8,

        // Spacing
        padding: 16,
        paddingLG: 24,
        paddingSM: 12,
        paddingXS: 8,

        // Shadows
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        boxShadowSecondary: '0 4px 16px rgba(0,0,0,0.12)',

        // Layout
        colorBgContainer: '#ffffff',
        colorBgLayout: colors.light,
        colorText: colors.dark,
        colorTextSecondary: colors.mid,
        colorBorder: '#e5e5e5',
    },
    components: {
        Layout: {
            siderBg: colors.dark,
            headerBg: '#ffffff',
            bodyBg: colors.light,
        },
        Menu: {
            darkItemBg: colors.dark,
            darkSubMenuItemBg: '#28251f',
            darkItemSelectedBg: colors.red,
            darkItemHoverBg: 'rgba(241,3,22,0.15)',
            darkItemSelectedColor: '#ffffff',
        },
        Button: {
            primaryShadow: '0 4px 14px rgba(241,3,22,0.35)',
        },
        Card: {
            paddingLG: 24,
        },
        Table: {
            headerBg: '#fafafa',
            headerColor: colors.dark,
            rowHoverBg: '#fff5f5',
        },
        Input: {
            activeBorderColor: colors.red,
            hoverBorderColor: colors.pink,
        },
    },
};

export const darkTheme: ThemeConfig = {
    token: {
        ...lightTheme.token,
        colorBgContainer: '#1f1f1f',
        colorBgLayout: '#141414',
        colorBgElevated: '#2a2a2a',
        colorText: colors.light,
        colorTextSecondary: colors.gray,
        colorBorder: '#374151',
        colorBorderSecondary: '#2d2d2d',
    },
    components: {
        Layout: {
            siderBg: '#0d0d14',
            headerBg: '#1f1f1f',
            bodyBg: '#141414',
        },
        Menu: {
            darkItemBg: '#0d0d14',
            darkSubMenuItemBg: '#0a0a10',
            darkItemSelectedBg: colors.red,
        },
        Card: {
            paddingLG: 24,
        },
        Table: {
            headerBg: '#2a2a2a',
            headerColor: colors.light,
            rowHoverBg: '#2a1a1a',
        },
        Input: {
            activeBorderColor: colors.red,
            hoverBorderColor: colors.pink,
        },
    },
};
