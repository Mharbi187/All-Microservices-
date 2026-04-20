"""
REST API for Tunisia Disaster Detection Platform
API d'Intégration avec les Modules M1, M2, M3
Module 4 - Croissant Rouge Tunisien
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from functools import wraps
import logging
from datetime import datetime
import os

from src.disaster_management import (
    DisasterManagementService, DisasterType, AlertLevel
)
from src.teams import TeamMatchingService, Location, TeamType
from src.crisis_room import CrisisRoomService, ParticipantRole

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Initialize services
disaster_service = DisasterManagementService()
team_service = TeamMatchingService()
crisis_service = CrisisRoomService()


# ============================================================
#  AUTHENTICATION MIDDLEWARE (Mock)
# ============================================================

def require_auth(f):
    """Middleware d'authentification (à intégrer avec M1)"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        # Pour le développement, on accepte tout
        # En production, valider le JWT avec le service M1
        if not auth_header:
            # Mode développement: permettre l'accès
            request.user_id = "dev_user_001"
            request.user_name = "Développeur Test"
            request.user_role = "admin"
        else:
            # Parser le token et récupérer l'utilisateur
            # TODO: Intégrer avec le service d'authentification M1
            request.user_id = "user_001"
            request.user_name = "Utilisateur"
            request.user_role = "coordinator"
        
        return f(*args, **kwargs)
    return decorated


# ============================================================
#  HEALTH CHECK
# ============================================================

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Vérifier l'état de l'API"""
    return jsonify({
        "status": "healthy",
        "module": "M4 - Disaster Management",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })


# ============================================================
#  DISASTERS API
# ============================================================

@app.route('/api/v1/disasters', methods=['GET'])
@require_auth
def get_disasters():
    """Obtenir toutes les catastrophes"""
    phase = request.args.get('phase')
    
    disasters = list(disaster_service.disasters.values())
    
    if phase:
        disasters = [d for d in disasters if d.phase.value == phase]
    
    return jsonify({
        "count": len(disasters),
        "disasters": [d.to_dict() for d in disasters]
    })


@app.route('/api/v1/disasters/active', methods=['GET'])
@require_auth
def get_active_disasters():
    """Obtenir les catastrophes actives"""
    disasters = disaster_service.get_active_disasters()
    return jsonify({
        "count": len(disasters),
        "disasters": [d.to_dict() for d in disasters]
    })


@app.route('/api/v1/disasters/<disaster_id>', methods=['GET'])
@require_auth
def get_disaster(disaster_id):
    """Obtenir une catastrophe par ID"""
    disaster = disaster_service.disasters.get(disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404
    
    return jsonify(disaster.to_dict())


@app.route('/api/v1/disasters/<disaster_id>/dashboard', methods=['GET'])
@require_auth
def get_disaster_dashboard(disaster_id):
    """Obtenir le tableau de bord d'une catastrophe"""
    dashboard = disaster_service.get_disaster_dashboard(disaster_id)
    if "error" in dashboard:
        return jsonify(dashboard), 404
    
    return jsonify(dashboard)


@app.route('/api/v1/disasters', methods=['POST'])
@require_auth
def create_disaster():
    """Créer une catastrophe à partir d'une alerte"""
    data = request.get_json()
    
    required = ['disaster_type', 'latitude', 'longitude', 'region', 'alert_level']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    
    try:
        disaster_type = DisasterType(data['disaster_type'])
        alert_level = AlertLevel(data['alert_level'])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    
    location = Location(
        latitude=data['latitude'],
        longitude=data['longitude'],
        address=data.get('address', ''),
        city=data.get('city', ''),
        region=data['region']
    )
    
    disaster = disaster_service.create_disaster_from_alert(
        disaster_type=disaster_type,
        location=location,
        alert_level=alert_level,
        estimated_population=data.get('estimated_population', 0),
        risk_score=data.get('risk_score', 0.5)
    )
    
    return jsonify({
        "success": True,
        "disaster": disaster.to_dict()
    }), 201


@app.route('/api/v1/disasters/<disaster_id>/declare', methods=['POST'])
@require_auth
def declare_disaster(disaster_id):
    """Déclarer officiellement une catastrophe"""
    result = disaster_service.declare_disaster(disaster_id, request.user_id)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


@app.route('/api/v1/disasters/<disaster_id>/close', methods=['POST'])
@require_auth
def close_disaster(disaster_id):
    """Clôturer une catastrophe"""
    data = request.get_json() or {}
    
    result = disaster_service.close_disaster(
        disaster_id=disaster_id,
        lessons_learned=data.get('lessons_learned', ''),
        recommendations=data.get('recommendations', '')
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


# ============================================================
#  MISSIONS API
# ============================================================

@app.route('/api/v1/disasters/<disaster_id>/missions', methods=['GET'])
@require_auth
def get_missions(disaster_id):
    """Obtenir les missions d'une catastrophe"""
    disaster = disaster_service.disasters.get(disaster_id)
    if not disaster:
        return jsonify({"error": "Disaster not found"}), 404
    
    status = request.args.get('status')
    missions = disaster.missions
    
    if status:
        missions = [m for m in missions if m.status.value == status]
    
    return jsonify({
        "count": len(missions),
        "missions": [m.to_dict() for m in missions]
    })


@app.route('/api/v1/disasters/<disaster_id>/missions', methods=['POST'])
@require_auth
def create_mission(disaster_id):
    """Créer une mission"""
    data = request.get_json()
    
    required = ['objective', 'description', 'priority']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    
    target_location = None
    if 'latitude' in data and 'longitude' in data:
        target_location = Location(
            latitude=data['latitude'],
            longitude=data['longitude'],
            address=data.get('address', ''),
            city=data.get('city', ''),
            region=data.get('region', '')
        )
    
    result = disaster_service.create_mission(
        disaster_id=disaster_id,
        objective=data['objective'],
        description=data['description'],
        priority=data['priority'],
        target_location=target_location
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result), 201


@app.route('/api/v1/disasters/<disaster_id>/missions/<mission_id>/assign', methods=['POST'])
@require_auth
def assign_mission(disaster_id, mission_id):
    """Assigner automatiquement une équipe à une mission"""
    result = disaster_service.assign_team_to_mission(disaster_id, mission_id)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


@app.route('/api/v1/disasters/<disaster_id>/missions/<mission_id>/start', methods=['POST'])
@require_auth
def start_mission(disaster_id, mission_id):
    """Démarrer une mission"""
    result = disaster_service.start_mission(disaster_id, mission_id)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


@app.route('/api/v1/disasters/<disaster_id>/missions/<mission_id>/complete', methods=['POST'])
@require_auth
def complete_mission(disaster_id, mission_id):
    """Compléter une mission"""
    data = request.get_json()
    
    result = disaster_service.complete_mission(
        disaster_id=disaster_id,
        mission_id=mission_id,
        notes=data.get('notes', ''),
        beneficiaries=data.get('beneficiaries', 0),
        resources=data.get('resources')
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


# ============================================================
#  TEAMS API
# ============================================================

@app.route('/api/v1/teams', methods=['GET'])
@require_auth
def get_teams():
    """Obtenir toutes les équipes"""
    team_type = request.args.get('type')
    region = request.args.get('region')
    status = request.args.get('status')
    
    teams = team_service.get_all_teams()
    
    if team_type:
        try:
            tt = TeamType(team_type)
            teams = [t for t in teams if t.team_type == tt]
        except ValueError:
            pass
    
    if region:
        teams = [t for t in teams if t.base_location and t.base_location.region.lower() == region.lower()]
    
    if status:
        teams = [t for t in teams if t.status.value == status]
    
    return jsonify({
        "count": len(teams),
        "teams": [t.to_dict() for t in teams]
    })


@app.route('/api/v1/teams/available', methods=['GET'])
@require_auth
def get_available_teams():
    """Obtenir les équipes disponibles"""
    teams = team_service.get_available_teams()
    return jsonify({
        "count": len(teams),
        "teams": [t.to_dict() for t in teams]
    })


@app.route('/api/v1/teams/<team_id>', methods=['GET'])
@require_auth
def get_team(team_id):
    """Obtenir une équipe par ID"""
    team = team_service.get_team_by_id(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    
    return jsonify(team.to_dict())


@app.route('/api/v1/teams/match', methods=['POST'])
@require_auth
def match_teams():
    """Matcher les équipes avec les besoins"""
    data = request.get_json()
    
    results = []
    
    # Matching par compétences
    if 'skills' in data:
        results = team_service.match_by_skills(data['skills'])
    
    # Matching par distance
    elif 'latitude' in data and 'longitude' in data:
        location = Location(
            latitude=data['latitude'],
            longitude=data['longitude'],
            region=data.get('region', '')
        )
        results = team_service.match_by_distance(location, data.get('max_distance_km', 200))
    
    return jsonify({
        "count": len(results),
        "matches": results
    })


@app.route('/api/v1/teams/<team_id>/deploy', methods=['POST'])
@require_auth
def deploy_team(team_id):
    """Déployer une équipe"""
    data = request.get_json()
    
    required = ['disaster_id', 'latitude', 'longitude']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    
    location = Location(
        latitude=data['latitude'],
        longitude=data['longitude'],
        address=data.get('address', ''),
        city=data.get('city', ''),
        region=data.get('region', '')
    )
    
    result = team_service.deploy_team(team_id, data['disaster_id'], location)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


@app.route('/api/v1/teams/<team_id>/return', methods=['POST'])
@require_auth
def return_team(team_id):
    """Retourner une équipe à la base"""
    result = team_service.return_team(team_id)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result)


@app.route('/api/v1/teams/<team_id>/wellbeing', methods=['POST'])
@require_auth
def check_team_wellbeing(team_id):
    """Vérifier le bien-être d'une équipe"""
    data = request.get_json()
    
    team = team_service.get_team_by_id(team_id)
    if not team:
        return jsonify({"error": "Team not found"}), 404
    
    wellbeing = team.check_wellbeing(
        fatigue=data.get('fatigue', 5),
        morale=data.get('morale', 5),
        issues=data.get('health_issues', [])
    )
    
    return jsonify(wellbeing.to_dict())


# ============================================================
#  CRISIS ROOM API
# ============================================================

@app.route('/api/v1/crisis-rooms', methods=['GET'])
@require_auth
def get_crisis_rooms():
    """Obtenir toutes les salles de crise"""
    rooms = list(crisis_service.crisis_rooms.values())
    return jsonify({
        "count": len(rooms),
        "rooms": [r.to_dict() for r in rooms]
    })


@app.route('/api/v1/crisis-rooms/active', methods=['GET'])
@require_auth
def get_active_crisis_rooms():
    """Obtenir les salles de crise actives"""
    rooms = crisis_service.get_active_rooms()
    return jsonify({
        "count": len(rooms),
        "rooms": [r.to_dict() for r in rooms]
    })


@app.route('/api/v1/crisis-rooms/<room_id>', methods=['GET'])
@require_auth
def get_crisis_room(room_id):
    """Obtenir une salle de crise"""
    summary = crisis_service.get_room_summary(room_id)
    if "error" in summary:
        return jsonify(summary), 404
    
    return jsonify(summary)


@app.route('/api/v1/crisis-rooms/<room_id>/join', methods=['POST'])
@require_auth
def join_crisis_room(room_id):
    """Rejoindre une salle de crise"""
    data = request.get_json() or {}
    
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404
    
    try:
        role = ParticipantRole(data.get('role', 'observer'))
    except ValueError:
        role = ParticipantRole.OBSERVER
    
    participant = room.add_participant(
        user_id=request.user_id,
        name=request.user_name,
        role=role
    )
    
    return jsonify({
        "success": True,
        "participant": participant.to_dict(),
        "video_call_url": room.video_call_url
    })


@app.route('/api/v1/crisis-rooms/<room_id>/leave', methods=['POST'])
@require_auth
def leave_crisis_room(room_id):
    """Quitter une salle de crise"""
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404
    
    result = room.remove_participant(request.user_id)
    
    return jsonify({"success": result})


@app.route('/api/v1/crisis-rooms/<room_id>/messages', methods=['GET'])
@require_auth
def get_crisis_messages(room_id):
    """Obtenir les messages d'une salle de crise"""
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404
    
    limit = request.args.get('limit', 50, type=int)
    messages = room.get_messages(limit=limit)
    
    return jsonify({
        "count": len(messages),
        "messages": [m.to_dict() for m in messages]
    })


@app.route('/api/v1/crisis-rooms/<room_id>/messages', methods=['POST'])
@require_auth
def send_crisis_message(room_id):
    """Envoyer un message dans une salle de crise"""
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404
    
    data = request.get_json()
    
    if 'content' not in data:
        return jsonify({"error": "Message content required"}), 400
    
    message = room.send_message(
        sender_id=request.user_id,
        sender_name=request.user_name,
        content=data['content'],
        priority=data.get('priority', 0)
    )
    
    return jsonify({
        "success": True,
        "message": message.to_dict()
    }), 201


@app.route('/api/v1/crisis-rooms/<room_id>/decisions', methods=['POST'])
@require_auth
def record_decision(room_id):
    """Enregistrer une décision"""
    room = crisis_service.get_crisis_room(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404
    
    data = request.get_json()
    
    required = ['title', 'description', 'rationale', 'priority']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    
    decision = room.record_decision(
        title=data['title'],
        description=data['description'],
        rationale=data['rationale'],
        priority=data['priority'],
        made_by=request.user_id,
        made_by_name=request.user_name,
        affected_teams=data.get('affected_teams', [])
    )
    
    return jsonify({
        "success": True,
        "decision": decision.to_dict()
    }), 201


# ============================================================
#  INTEGRATION HOOKS (Pour M1, M2, M3)
# ============================================================

@app.route('/api/v1/hooks/alert', methods=['POST'])
def receive_alert_hook():
    """
    Webhook pour recevoir les alertes du système de monitoring
    Appelé automatiquement quand le modèle ML détecte un risque élevé
    """
    data = request.get_json()
    
    logger.info(f"Received alert hook: {data}")
    
    # Créer automatiquement une catastrophe si le risque est élevé
    if data.get('risk_score', 0) >= 0.7:
        try:
            disaster_type = DisasterType(data.get('hazard_type', 'flood'))
        except ValueError:
            disaster_type = DisasterType.FLOOD
        
        try:
            alert_level = AlertLevel.RED if data.get('risk_score', 0) >= 0.8 else AlertLevel.ORANGE
        except:
            alert_level = AlertLevel.ORANGE
        
        location = Location(
            latitude=data.get('latitude', 0),
            longitude=data.get('longitude', 0),
            region=data.get('region', 'Unknown')
        )
        
        disaster = disaster_service.create_disaster_from_alert(
            disaster_type=disaster_type,
            location=location,
            alert_level=alert_level,
            estimated_population=data.get('estimated_population', 0),
            risk_score=data.get('risk_score', 0.7)
        )
        
        return jsonify({
            "success": True,
            "action": "disaster_created",
            "disaster_id": disaster.id,
            "disaster_ref": disaster.reference_number
        }), 201
    
    return jsonify({
        "success": True,
        "action": "logged",
        "message": "Alert received but risk below threshold"
    })


@app.route('/api/v1/hooks/stock-update', methods=['POST'])
def receive_stock_update():
    """
    Webhook pour recevoir les mises à jour de stock du Module 1
    Permet de savoir les ressources disponibles pour les missions
    """
    data = request.get_json()
    
    logger.info(f"Received stock update from M1: {data}")
    
    # TODO: Mettre à jour les ressources disponibles
    
    return jsonify({
        "success": True,
        "message": "Stock update received"
    })


@app.route('/api/v1/hooks/emergency-session', methods=['POST'])
def receive_emergency_session():
    """
    Webhook pour recevoir les sessions d'urgence du Module 2
    Permet de coordonner les équipes si une victime est détectée
    """
    data = request.get_json()
    
    logger.info(f"Received emergency session from M2: {data}")
    
    # TODO: Créer une mission d'intervention si SAMU contacté
    
    return jsonify({
        "success": True,
        "message": "Emergency session received"
    })


# ============================================================
#  ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({"error": "Internal server error"}), 500


# ============================================================
#  MAIN
# ============================================================

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting M4 API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
