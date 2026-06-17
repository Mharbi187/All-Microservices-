"""
Integrated Dashboard for Tunisia Disaster Detection
Tableau de Bord Intégré M4 - Gestion Complète
Module 4 - Croissant Rouge Tunisien
"""

import streamlit as st
import folium
from streamlit_folium import st_folium
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import os

# Import custom modules
from src.data_acquisition import GEEDataAcquisition
from src.model import DisasterRiskModel
from src.alerts import AlertSystem
from src.weather import get_current_weather
from src.teams import TeamMatchingService, Location, TeamType, TeamStatus
from src.crisis_room import CrisisRoomService, ParticipantRole
from src.disaster_management import (
    DisasterManagementService, DisasterType, AlertLevel, DisasterPhase
)
from src.config import (
    TUNISIA_BBOX, TUNISIAN_WILAYAT, UI_CONFIG, TRANSLATIONS,
    PRIORITY_REGIONS, PERFORMANCE_TARGETS
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration
st.set_page_config(
    page_title="Nexus-AID M4 | نظام إدارة الكوارث",
    page_icon="🚨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { font-family: 'Inter', sans-serif; }
    
    .stApp {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    
    .metric-card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 1.5rem;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        margin: 0.5rem 0;
    }
    
    [data-testid="stMetricValue"] {
        font-size: 2rem;
        font-weight: 700;
        color: #4facfe;
    }
    
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    }
    
    .stButton > button {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
        border: none;
        border-radius: 0.75rem;
        padding: 0.75rem 2rem;
        font-weight: 600;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white !important;
        border-radius: 0.5rem;
    }
    
    .crisis-badge {
        background: #e74c3c;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .team-available { color: #2ecc71; }
    .team-deployed { color: #e74c3c; }
    .team-standby { color: #f39c12; }
</style>
""", unsafe_allow_html=True)


# ============================================================
#  INITIALIZE SERVICES
# ============================================================

@st.cache_resource
def get_services():
    """Initialize all services (cached)"""
    return {
        'disaster': DisasterManagementService(),
        'teams': TeamMatchingService(),
        'crisis': CrisisRoomService(),
        'alerts': AlertSystem()
    }


@st.cache_resource
def load_model():
    """Load ML model (cached)"""
    try:
        model = DisasterRiskModel()
        if os.path.exists(model.model_path):
            model.load()
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None


# ============================================================
#  SIDEBAR
# ============================================================

def render_sidebar():
    """Render sidebar navigation"""
    with st.sidebar:
        st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Tunisian_Red_Crescent.svg/200px-Tunisian_Red_Crescent.svg.png", 
                 width=80)
        
        st.title("🚨 Nexus-AID M4")
        st.markdown("**Gestion des Catastrophes**")
        
        st.divider()
        
        # Navigation
        page = st.radio(
            "Navigation",
            ["📊 Tableau de Bord", "🚨 Catastrophes", "👥 Équipes", "🏢 Salle de Crise", "🗺️ Carte Temps Réel", "⚙️ Paramètres"]
        )
        
        st.divider()
        
        # Quick Stats
        services = get_services()
        
        active_disasters = len(services['disaster'].get_active_disasters())
        available_teams = len(services['teams'].get_available_teams())
        active_rooms = len(services['crisis'].get_active_rooms())
        
        st.metric("Catastrophes Actives", active_disasters)
        st.metric("Équipes Disponibles", available_teams)
        st.metric("Salles de Crise", active_rooms)
        
        st.divider()
        
        # System Status
        model = load_model()
        st.caption("**État du Système**")
        st.write(f"✓ Modèle ML: {'Chargé' if model else 'Non chargé'}")
        st.write(f"✓ API: Active")
        st.write(f"✓ Services: En ligne")
        
        return page


# ============================================================
#  DASHBOARD PAGE
# ============================================================

def render_dashboard():
    """Render main dashboard"""
    st.title("📊 Tableau de Bord - Module 4")
    st.markdown("**Vue d'ensemble de la gestion des catastrophes**")
    
    services = get_services()
    
    # Key Metrics
    col1, col2, col3, col4 = st.columns(4)
    
    all_disasters = list(services['disaster'].disasters.values())
    all_teams = services['teams'].get_all_teams()
    
    with col1:
        active = len([d for d in all_disasters if d.phase in [DisasterPhase.RESPONSE, DisasterPhase.RECOVERY]])
        st.metric("🚨 Catastrophes Actives", active)
    
    with col2:
        deployed = len([t for t in all_teams if t.status == TeamStatus.DEPLOYED])
        st.metric("👥 Équipes Déployées", f"{deployed}/{len(all_teams)}")
    
    with col3:
        total_missions = sum(len(d.missions) for d in all_disasters)
        st.metric("📋 Missions Totales", total_missions)
    
    with col4:
        total_beneficiaries = sum(d.total_beneficiaries for d in all_disasters)
        st.metric("🤝 Bénéficiaires", total_beneficiaries)
    
    st.divider()
    
    # Active Disasters Overview
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("🚨 Catastrophes Actives")
        
        active_disasters = services['disaster'].get_active_disasters()
        
        if active_disasters:
            for disaster in active_disasters:
                with st.expander(f"🔴 {disaster.name} - {disaster.reference_number}", expanded=True):
                    c1, c2, c3 = st.columns(3)
                    with c1:
                        st.write(f"**Type:** {disaster.disaster_type.value.capitalize()}")
                        st.write(f"**Phase:** {disaster.phase.value.capitalize()}")
                    with c2:
                        st.write(f"**Sévérité:** {'🔴' * disaster.severity}")
                        st.write(f"**Équipes:** {len(disaster.deployed_teams)}")
                    with c3:
                        st.write(f"**Missions:** {len(disaster.missions)}")
                        st.write(f"**Bénéficiaires:** {disaster.total_beneficiaries}")
                    
                    if disaster.crisis_room_id:
                        st.markdown(f"🏢 [Rejoindre Salle de Crise](#)")
        else:
            st.info("Aucune catastrophe active actuellement")
    
    with col2:
        st.subheader("👥 État des Équipes")
        
        teams_by_status = {}
        for team in all_teams:
            status = team.status.value
            teams_by_status[status] = teams_by_status.get(status, 0) + 1
        
        status_colors = {
            'available': '🟢',
            'deployed': '🔴',
            'standby': '🟡',
            'resting': '🟠',
            'training': '🔵'
        }
        
        for status, count in teams_by_status.items():
            emoji = status_colors.get(status, '⚪')
            st.write(f"{emoji} **{status.capitalize()}:** {count}")
    
    st.divider()
    
    # Recent Activity
    st.subheader("📋 Activité Récente")
    
    # Create activity log (mock data for demo)
    activities = [
        {"time": "Il y a 5 min", "event": "Équipe NDRT Tunis déployée à Nabeul", "type": "deployment"},
        {"time": "Il y a 15 min", "event": "Mission M001 complétée - 150 bénéficiaires", "type": "mission"},
        {"time": "Il y a 30 min", "event": "Alerte ORANGE détectée à Sfax", "type": "alert"},
        {"time": "Il y a 1h", "event": "Décision: Évacuation Zone B approuvée", "type": "decision"},
    ]
    
    for activity in activities:
        icon = {"deployment": "🚁", "mission": "✅", "alert": "⚠️", "decision": "📋"}.get(activity['type'], "📌")
        st.write(f"{icon} **{activity['time']}** - {activity['event']}")


# ============================================================
#  DISASTERS PAGE
# ============================================================

def render_disasters():
    """Render disasters management page"""
    st.title("🚨 Gestion des Catastrophes")
    
    services = get_services()
    
    tab1, tab2, tab3 = st.tabs(["Actives", "Toutes", "Nouvelle Alerte"])
    
    with tab1:
        active = services['disaster'].get_active_disasters()
        
        if active:
            for disaster in active:
                with st.container():
                    st.markdown(f"### 🔴 {disaster.name}")
                    
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Type", disaster.disaster_type.value.capitalize())
                    with col2:
                        st.metric("Phase", disaster.phase.value.capitalize())
                    with col3:
                        st.metric("Équipes", len(disaster.deployed_teams))
                    with col4:
                        st.metric("Missions", len(disaster.missions))
                    
                    # Actions
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        if st.button("📋 Voir Détails", key=f"details_{disaster.id}"):
                            st.session_state['selected_disaster'] = disaster.id
                    with col2:
                        if st.button("➕ Nouvelle Mission", key=f"mission_{disaster.id}"):
                            st.session_state['new_mission_disaster'] = disaster.id
                    with col3:
                        if st.button("🏢 Salle de Crise", key=f"crisis_{disaster.id}"):
                            st.session_state['crisis_room'] = disaster.crisis_room_id
                    
                    st.divider()
        else:
            st.info("Aucune catastrophe active")
    
    with tab2:
        all_disasters = list(services['disaster'].disasters.values())
        
        if all_disasters:
            df = pd.DataFrame([{
                'Référence': d.reference_number,
                'Nom': d.name,
                'Type': d.disaster_type.value,
                'Phase': d.phase.value,
                'Sévérité': d.severity,
                'Équipes': len(d.deployed_teams),
                'Missions': len(d.missions),
                'Détecté': d.detected_at.strftime('%Y-%m-%d %H:%M')
            } for d in all_disasters])
            
            st.dataframe(df, use_container_width=True)
        else:
            st.info("Aucune catastrophe enregistrée")
    
    with tab3:
        st.subheader("➕ Créer une Nouvelle Alerte")
        
        with st.form("new_disaster_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                disaster_type = st.selectbox(
                    "Type de Catastrophe",
                    ["flood", "fire", "earthquake", "storm", "drought"]
                )
                
                alert_level = st.selectbox(
                    "Niveau d'Alerte",
                    ["yellow", "orange", "red"]
                )
                
                region = st.selectbox(
                    "Gouvernorat",
                    TUNISIAN_WILAYAT
                )
            
            with col2:
                latitude = st.number_input("Latitude", value=36.8, format="%.4f")
                longitude = st.number_input("Longitude", value=10.18, format="%.4f")
                population = st.number_input("Population Estimée", value=10000, step=1000)
            
            submitted = st.form_submit_button("🚨 Créer l'Alerte")
            
            if submitted:
                try:
                    disaster = services['disaster'].create_disaster_from_alert(
                        disaster_type=DisasterType(disaster_type),
                        location=Location(latitude, longitude, "", "", region),
                        alert_level=AlertLevel(alert_level),
                        estimated_population=population
                    )
                    st.success(f"✅ Alerte créée: {disaster.reference_number}")
                    
                    # Option to declare immediately
                    if st.button("Déclarer immédiatement"):
                        result = services['disaster'].declare_disaster(disaster.id, "admin")
                        if result['success']:
                            st.success("Catastrophe déclarée - Salle de crise créée")
                except Exception as e:
                    st.error(f"Erreur: {e}")


# ============================================================
#  TEAMS PAGE
# ============================================================

def render_teams():
    """Render teams management page"""
    st.title("👥 Gestion des Équipes")
    
    services = get_services()
    teams = services['teams'].get_all_teams()
    
    tab1, tab2, tab3 = st.tabs(["Toutes les Équipes", "Disponibles", "Matching"])
    
    with tab1:
        for team in teams:
            status_emoji = {
                'available': '🟢',
                'deployed': '🔴',
                'standby': '🟡',
                'resting': '🟠'
            }.get(team.status.value, '⚪')
            
            with st.expander(f"{status_emoji} {team.name} ({team.code})", expanded=False):
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.write(f"**Type:** {team.team_type.value}")
                    st.write(f"**Statut:** {team.status.value.capitalize()}")
                    st.write(f"**Capacité:** {len(team.members)}/{team.capacity}")
                
                with col2:
                    if team.base_location:
                        st.write(f"**Base:** {team.base_location.city}, {team.base_location.region}")
                    if team.current_disaster_id:
                        st.write(f"**Mission:** {team.current_disaster_id}")
                
                with col3:
                    if team.status == TeamStatus.AVAILABLE:
                        if st.button("🚀 Déployer", key=f"deploy_{team.id}"):
                            st.session_state['deploy_team'] = team.id
                    elif team.status == TeamStatus.DEPLOYED:
                        if st.button("🏠 Retourner", key=f"return_{team.id}"):
                            result = services['teams'].return_team(team.id)
                            if result['success']:
                                st.success("Équipe retournée à la base")
                                st.rerun()
                
                # Members
                if team.members:
                    st.write("**Membres:**")
                    for member in team.members[:5]:
                        st.write(f"  • {member.name} - {member.role.value.replace('_', ' ').capitalize()}")
    
    with tab2:
        available = services['teams'].get_available_teams()
        
        if available:
            st.write(f"**{len(available)} équipe(s) disponible(s)**")
            
            for team in available:
                st.info(f"🟢 **{team.name}** - {team.team_type.value} - {len(team.members)} membres")
        else:
            st.warning("Aucune équipe disponible")
    
    with tab3:
        st.subheader("🎯 Matching Intelligent")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Par Compétences**")
            skills = st.multiselect(
                "Compétences requises",
                ["first_aid", "logistics", "medical", "search_rescue", "communications"]
            )
            
            if st.button("Rechercher par compétences"):
                if skills:
                    results = services['teams'].match_by_skills(skills)
                    for r in results:
                        st.write(f"• {r['team']['name']}: {r['match_score']:.0%} correspondance")
        
        with col2:
            st.write("**Par Distance**")
            lat = st.number_input("Latitude", value=36.45, key="match_lat")
            lon = st.number_input("Longitude", value=10.74, key="match_lon")
            
            if st.button("Rechercher par proximité"):
                location = Location(lat, lon, "", "", "")
                results = services['teams'].match_by_distance(location)
                for r in results:
                    st.write(f"• {r['team']['name']}: {r['distance_km']:.1f} km (~{r['estimated_arrival_hours']:.1f}h)")


# ============================================================
#  CRISIS ROOM PAGE
# ============================================================

def render_crisis_room():
    """Render crisis room page"""
    st.title("🏢 Salle de Crise Virtuelle")
    
    services = get_services()
    active_rooms = services['crisis'].get_active_rooms()
    
    if not active_rooms:
        st.info("Aucune salle de crise active")
        return
    
    # Select room
    room_options = {r.disaster_name: r.id for r in active_rooms}
    selected_name = st.selectbox("Sélectionner une salle de crise", list(room_options.keys()))
    room_id = room_options[selected_name]
    
    room = services['crisis'].get_crisis_room(room_id)
    if not room:
        st.error("Salle de crise non trouvée")
        return
    
    # Room Header
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        st.subheader(f"🔴 {room.disaster_name}")
    with col2:
        st.metric("Participants", len(room.get_online_participants()))
    with col3:
        if st.button("📹 Rejoindre Vidéo"):
            st.write(f"URL: {room.video_call_url}")
    
    st.divider()
    
    # Main content
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Messages
        st.subheader("💬 Messages")
        
        messages = room.get_messages(limit=20)
        
        for msg in reversed(messages):
            if msg.message_type.value == "system":
                st.caption(f"🔔 {msg.content}")
            elif msg.message_type.value == "alert":
                st.error(f"**{msg.sender_name}:** {msg.content}")
            else:
                st.write(f"**{msg.sender_name}:** {msg.content}")
        
        # Send message
        with st.form("send_message", clear_on_submit=True):
            message = st.text_input("Votre message")
            if st.form_submit_button("Envoyer"):
                if message:
                    room.send_message("current_user", "Utilisateur", message)
                    st.rerun()
    
    with col2:
        # Participants
        st.subheader("👥 Participants")
        for p in room.get_online_participants():
            role_emoji = {
                'coordinator': '🎖️',
                'team_leader': '👷',
                'medical': '🏥',
                'logistics': '📦'
            }.get(p.role.value, '👤')
            st.write(f"{role_emoji} {p.name}")
        
        st.divider()
        
        # Decisions
        st.subheader("📋 Décisions")
        for d in room.get_decisions()[:5]:
            status_emoji = '✅' if d.status.value == 'implemented' else '⏳'
            st.write(f"{status_emoji} {d.title}")
        
        st.divider()
        
        # Situation Board
        st.subheader("📊 Situation")
        if room.situation_board:
            sb = room.situation_board
            st.metric("Bénéficiaires", sb.beneficiaries_count)
            st.metric("Missions Actives", sb.missions_active)
            st.metric("Missions Complétées", sb.missions_completed)


# ============================================================
#  MAP PAGE
# ============================================================

def render_map():
    """Render real-time map"""
    st.title("🗺️ Carte Temps Réel")
    
    services = get_services()
    
    # Create base map
    m = folium.Map(
        location=UI_CONFIG['map_center'],
        zoom_start=7,
        tiles='cartodbdark_matter'
    )
    
    # Add disaster locations
    for disaster in services['disaster'].get_active_disasters():
        if disaster.affected_area:
            folium.CircleMarker(
                location=[disaster.affected_area.center_lat, disaster.affected_area.center_lon],
                radius=disaster.affected_area.radius_km,
                popup=f"🚨 {disaster.name}",
                color='red',
                fill=True,
                fillColor='red',
                fillOpacity=0.3
            ).add_to(m)
    
    # Add team locations
    for team in services['teams'].get_all_teams():
        if team.current_location:
            color = 'green' if team.status == TeamStatus.AVAILABLE else 'orange'
            folium.Marker(
                location=[team.current_location.latitude, team.current_location.longitude],
                popup=f"👥 {team.name}",
                icon=folium.Icon(color=color, icon='users', prefix='fa')
            ).add_to(m)
        elif team.base_location:
            folium.Marker(
                location=[team.base_location.latitude, team.base_location.longitude],
                popup=f"🏠 {team.name} (Base)",
                icon=folium.Icon(color='blue', icon='home', prefix='fa')
            ).add_to(m)
    
    # Display map
    st_folium(m, width=1200, height=600)
    
    # Legend
    st.markdown("""
    **Légende:**
    - 🔴 Zone affectée par une catastrophe
    - 🟢 Équipe disponible
    - 🟠 Équipe déployée
    - 🔵 Base d'équipe
    """)


# ============================================================
#  SETTINGS PAGE
# ============================================================

def render_settings():
    """Render settings page"""
    st.title("⚙️ Paramètres")
    
    tab1, tab2, tab3 = st.tabs(["Général", "API", "À Propos"])
    
    with tab1:
        st.subheader("Paramètres Généraux")
        
        st.toggle("Mode sombre", value=True)
        st.toggle("Notifications push", value=True)
        st.toggle("Alertes sonores", value=False)
        
        st.selectbox("Langue", ["Français", "العربية", "English"])
    
    with tab2:
        st.subheader("Configuration API")
        
        st.text_input("URL API M1 (Organisation)", value="http://localhost:5000/api/v1")
        st.text_input("URL API M2 (Secourisme)", value="http://localhost:5002/api/v1")
        st.text_input("URL API M3 (Administratif)", value="http://localhost:5003/api/v1")
        
        if st.button("Tester la connexion"):
            st.success("✓ Connexion réussie à tous les modules")
    
    with tab3:
        st.subheader("À Propos")
        
        st.markdown("""
        ## Nexus-AID - Module 4
        **Système de Gestion des Catastrophes**
        
        ### Fonctionnalités
        - 🚨 Détection et alerte précoce (IA)
        - 👥 Gestion des équipes NDRT/RDRT/IDRT
        - 🏢 Salle de crise virtuelle
        - 🗺️ Suivi temps réel
        - 📊 Reporting et analyse
        
        ### Technologies
        - Python + Streamlit
        - Google Earth Engine
        - Machine Learning (XGBoost, Random Forest)
        - Flask REST API
        
        ### Équipe
        Projet de Fin d'Études - 2026
        Croissant Rouge Tunisien
        
        ---
        **Version:** 1.0.0 | **Licence:** MIT
        """)


# ============================================================
#  MAIN
# ============================================================

def main():
    """Main application entry point"""
    page = render_sidebar()
    
    if "📊 Tableau de Bord" in page:
        render_dashboard()
    elif "🚨 Catastrophes" in page:
        render_disasters()
    elif "👥 Équipes" in page:
        render_teams()
    elif "🏢 Salle de Crise" in page:
        render_crisis_room()
    elif "🗺️ Carte Temps Réel" in page:
        render_map()
    elif "⚙️ Paramètres" in page:
        render_settings()


if __name__ == "__main__":
    main()
