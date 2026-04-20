// ============================================
// Types for the MS4 Radar API Response
// Multi-Source: GEE Satellite + USGS Seismic + OpenWeather
// ============================================

export interface WilayaCoordinates {
    lat: number;
    lon: number;
}

export interface SatelliteData {
    fire_count: number;
    max_frp: number;
    flood_area_km2: number;
    water_change_pct: number;
    precipitation_7d_mm: number;
    ndvi: number;
}

export interface WeatherData {
    temperature: number;
    wind_speed: number;
    humidity: number;
    precipitation?: number;
    is_raining?: boolean;
    condition?: string;
}

export interface SeismicData {
    max_magnitude: number;
}

export interface WilayaData {
    coordinates: WilayaCoordinates;
    satellite: SatelliteData;
    weather: WeatherData;
    seismic: SeismicData;
    risk_score: number;
    confidence_pct: number;
    is_high_risk: boolean;
    disaster_type: string;
    data_sources: string[];
    source_health?: {
        status: 'online' | 'offline' | 'degraded';
        chirps_lag_days?: number | null;
        precipitation_source?: string;
        missing_flags?: {
            precipitation?: boolean;
        };
    };
}

export interface DataSourceHealth {
    gee_satellite: 'online' | 'offline' | 'degraded';
    alphaearth: 'online' | 'offline' | 'degraded';
    usgs_seismic: 'online' | 'offline' | 'degraded';
    openweather: 'online' | 'offline' | 'degraded';
    chirps_lag_days?: number | null;
}

export interface EarthquakeEvent {
    magnitude: number;
    location: string;
    lat: number;
    lon: number;
    time: string;
}

export interface RadarResponse {
    timestamp: string | null;
    wilayats: Record<string, WilayaData>;
    daemon_status: 'running' | 'stale' | 'initializing' | 'unknown';
    daemon_uptime?: string;
    cycle?: number;
    data_sources?: DataSourceHealth;
    recent_earthquakes?: EarthquakeEvent[];
}

export type RoleType = 'NATIONAL' | 'REGIONAL';
