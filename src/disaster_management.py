"""
Disaster Management Module for Tunisia Disaster Detection
Gestion Complète des Catastrophes
Module 4 - Croissant Rouge Tunisien
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import json
import uuid

from src.teams import TeamMatchingService, ResponseTeam, Location, TeamStatus
from src.crisis_room import CrisisRoomService, CrisisRoom, ParticipantRole
from src.alerts import AlertSystem
from sqlalchemy import Column, String, DateTime, JSON
from src.database import Base, SessionLocal

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DisasterState(Base):
    __tablename__ = "disaster_states"
    id = Column(String, primary_key=True, index=True)
    payload = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================
#  ENUMERATIONS
# ============================================================

class DisasterType(Enum):
    """Types de catastrophes"""
    EARTHQUAKE = "earthquake"
    FLOOD = "flood"
    FIRE = "fire"
    STORM = "storm"
    DROUGHT = "drought"
    PANDEMIC = "pandemic"
    INDUSTRIAL = "industrial"
    CONFLICT = "conflict"


class DisasterPhase(Enum):
    """Phases d'une catastrophe"""
    DETECTED = "detected"
    DECLARED = "declared"
    RESPONSE = "response"
    RECOVERY = "recovery"
    CLOSED = "closed"


class AlertLevel(Enum):
    """Niveaux d'alerte"""
    GREEN = "green"
    YELLOW = "yellow"
    ORANGE = "orange"
    RED = "red"


class MissionStatus(Enum):
    """Statuts des missions"""
    PLANNED = "planned"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============================================================
#  DATA CLASSES
# ============================================================

@dataclass
class AffectedArea:
    """Zone affectée par une catastrophe"""
    center_lat: float
    center_lon: float
    radius_km: float
    governorate: str
    localities: List[str] = field(default_factory=list)
    estimated_population: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "center": {"lat": self.center_lat, "lon": self.center_lon},
            "radius_km": self.radius_km,
            "governorate": self.governorate,
            "localities": self.localities,
            "estimated_population": self.estimated_population
        }


@dataclass
class Mission:
    """Mission humanitaire"""
    id: str
    reference_number: str
    disaster_id: str
    objective: str
    description: str
    priority: int  # 1-5
    status: MissionStatus = MissionStatus.PLANNED
    assigned_team_id: Optional[str] = None
    assigned_team_name: Optional[str] = None
    target_location: Optional[Location] = None
    created_at: datetime = field(default_factory=datetime.now)
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_notes: str = ""
    beneficiaries_reached: int = 0
    resources_used: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "reference_number": self.reference_number,
            "disaster_id": self.disaster_id,
            "objective": self.objective,
            "description": self.description,
            "priority": self.priority,
            "status": self.status.value,
            "assigned_team_id": self.assigned_team_id,
            "assigned_team_name": self.assigned_team_name,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "beneficiaries_reached": self.beneficiaries_reached
        }
    
    def assign(self, team_id: str, team_name: str) -> bool:
        """Assigner une équipe à la mission"""
        if self.status != MissionStatus.PLANNED:
            return False
        
        self.assigned_team_id = team_id
        self.assigned_team_name = team_name
        self.assigned_at = datetime.now()
        self.status = MissionStatus.ASSIGNED
        return True
    
    def start(self) -> bool:
        """Démarrer la mission"""
        if self.status != MissionStatus.ASSIGNED:
            return False
        
        self.started_at = datetime.now()
        self.status = MissionStatus.IN_PROGRESS
        return True
    
    def complete(self, notes: str, beneficiaries: int, resources: Dict = None) -> bool:
        """Compléter la mission"""
        if self.status != MissionStatus.IN_PROGRESS:
            return False
        
        self.completed_at = datetime.now()
        self.completion_notes = notes
        self.beneficiaries_reached = beneficiaries
        self.resources_used = resources or {}
        self.status = MissionStatus.COMPLETED
        return True


@dataclass
class DisasterReport:
    """Rapport final de catastrophe"""
    id: str
    disaster_id: str
    disaster_name: str
    duration_days: int
    total_beneficiaries: int
    total_teams_deployed: int
    total_missions: int
    missions_completed: int
    missions_cancelled: int
    resources_distributed: Dict = field(default_factory=dict)
    lessons_learned: str = ""
    recommendations: str = ""
    generated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "disaster_id": self.disaster_id,
            "disaster_name": self.disaster_name,
            "duration_days": self.duration_days,
            "total_beneficiaries": self.total_beneficiaries,
            "total_teams_deployed": self.total_teams_deployed,
            "total_missions": self.total_missions,
            "missions_completed": self.missions_completed,
            "missions_cancelled": self.missions_cancelled,
            "resources_distributed": self.resources_distributed,
            "lessons_learned": self.lessons_learned,
            "recommendations": self.recommendations,
            "generated_at": self.generated_at.isoformat()
        }


@dataclass
class Disaster:
    """Catastrophe"""
    id: str
    reference_number: str
    name: str
    disaster_type: DisasterType
    severity: int  # 1-5
    phase: DisasterPhase = DisasterPhase.DETECTED
    alert_level: AlertLevel = AlertLevel.YELLOW
    affected_area: Optional[AffectedArea] = None
    estimated_damage_tnd: float = 0.0
    detected_at: datetime = field(default_factory=datetime.now)
    declared_at: Optional[datetime] = None
    declared_by: Optional[str] = None
    closed_at: Optional[datetime] = None
    missions: List[Mission] = field(default_factory=list)
    deployed_teams: List[str] = field(default_factory=list)
    crisis_room_id: Optional[str] = None
    total_beneficiaries: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "reference_number": self.reference_number,
            "name": self.name,
            "disaster_type": self.disaster_type.value,
            "severity": self.severity,
            "phase": self.phase.value,
            "alert_level": self.alert_level.value,
            "affected_area": self.affected_area.to_dict() if self.affected_area else None,
            "estimated_damage_tnd": self.estimated_damage_tnd,
            "detected_at": self.detected_at.isoformat(),
            "declared_at": self.declared_at.isoformat() if self.declared_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "missions_count": len(self.missions),
            "deployed_teams_count": len(self.deployed_teams),
            "crisis_room_id": self.crisis_room_id,
            "total_beneficiaries": self.total_beneficiaries
        }
    
    def declare(self, declared_by: str) -> bool:
        """Déclarer officiellement la catastrophe"""
        if self.phase != DisasterPhase.DETECTED:
            return False
        
        self.phase = DisasterPhase.DECLARED
        self.declared_at = datetime.now()
        self.declared_by = declared_by
        logger.info(f"Disaster {self.id} declared by {declared_by}")
        return True
    
    def start_response(self) -> bool:
        """Démarrer la phase de réponse"""
        if self.phase != DisasterPhase.DECLARED:
            return False
        
        self.phase = DisasterPhase.RESPONSE
        logger.info(f"Disaster {self.id} response phase started")
        return True
    
    def start_recovery(self) -> bool:
        """Démarrer la phase de récupération"""
        if self.phase != DisasterPhase.RESPONSE:
            return False
        
        self.phase = DisasterPhase.RECOVERY
        logger.info(f"Disaster {self.id} recovery phase started")
        return True
    
    def close(self) -> bool:
        """Clôturer la catastrophe"""
        if self.phase not in [DisasterPhase.RESPONSE, DisasterPhase.RECOVERY]:
            return False
        
        self.phase = DisasterPhase.CLOSED
        self.closed_at = datetime.now()
        logger.info(f"Disaster {self.id} closed")
        return True
    
    def add_mission(self, mission: Mission) -> None:
        """Ajouter une mission"""
        self.missions.append(mission)
    
    def get_active_missions(self) -> List[Mission]:
        """Obtenir les missions actives"""
        return [m for m in self.missions if m.status in [MissionStatus.ASSIGNED, MissionStatus.IN_PROGRESS]]
    
    def get_completed_missions(self) -> List[Mission]:
        """Obtenir les missions terminées"""
        return [m for m in self.missions if m.status == MissionStatus.COMPLETED]


# ============================================================
#  DISASTER MANAGEMENT SERVICE
# ============================================================

class DisasterManagementService:
    """Service de gestion des catastrophes"""

    def __init__(self,
                 team_service: TeamMatchingService | None = None,
                 crisis_service: CrisisRoomService | None = None,
                 alert_system: AlertSystem | None = None):
        self.disasters: Dict[str, Disaster] = {}
        self.team_service = team_service or TeamMatchingService()
        self.crisis_service = crisis_service or CrisisRoomService()
        self.alert_system = alert_system or AlertSystem()
        self._mission_counter = 0
        self._disaster_counter = 0
        self._load_disasters_from_db()

    def _get_session(self):
        return SessionLocal()

    def _persist_disaster(self, disaster: Disaster) -> None:
        snapshot = self._disaster_to_snapshot(disaster)
        with self._get_session() as db:
            row = db.query(DisasterState).filter(DisasterState.id == disaster.id).first()
            if row:
                row.payload = snapshot
            else:
                row = DisasterState(id=disaster.id, payload=snapshot)
                db.add(row)
            db.commit()

    def _load_disasters_from_db(self) -> None:
        with self._get_session() as db:
            for row in db.query(DisasterState).all():
                disaster = self._snapshot_to_disaster(row.payload)
                self.disasters[disaster.id] = disaster

    def _disaster_to_snapshot(self, disaster: Disaster) -> Dict:
        return {
            "id": disaster.id,
            "reference_number": disaster.reference_number,
            "name": disaster.name,
            "disaster_type": disaster.disaster_type.value,
            "severity": disaster.severity,
            "phase": disaster.phase.value,
            "alert_level": disaster.alert_level.value,
            "affected_area": {
                "center_lat": disaster.affected_area.center_lat if disaster.affected_area else None,
                "center_lon": disaster.affected_area.center_lon if disaster.affected_area else None,
                "radius_km": disaster.affected_area.radius_km if disaster.affected_area else None,
                "governorate": disaster.affected_area.governorate if disaster.affected_area else None,
                "localities": disaster.affected_area.localities if disaster.affected_area else [],
                "estimated_population": disaster.affected_area.estimated_population if disaster.affected_area else 0,
            } if disaster.affected_area else None,
            "estimated_damage_tnd": disaster.estimated_damage_tnd,
            "detected_at": disaster.detected_at.isoformat(),
            "declared_at": disaster.declared_at.isoformat() if disaster.declared_at else None,
            "declared_by": disaster.declared_by,
            "closed_at": disaster.closed_at.isoformat() if disaster.closed_at else None,
            "crisis_room_id": disaster.crisis_room_id,
            "total_beneficiaries": disaster.total_beneficiaries,
            "deployed_teams": disaster.deployed_teams,
            "missions": [
                {
                    "id": m.id,
                    "reference_number": m.reference_number,
                    "disaster_id": m.disaster_id,
                    "objective": m.objective,
                    "description": m.description,
                    "priority": m.priority,
                    "status": m.status.value,
                    "assigned_team_id": m.assigned_team_id,
                    "assigned_team_name": m.assigned_team_name,
                    "target_location": {
                        "latitude": m.target_location.latitude,
                        "longitude": m.target_location.longitude,
                        "address": m.target_location.address,
                        "city": m.target_location.city,
                        "region": m.target_location.region,
                    } if m.target_location else None,
                    "created_at": m.created_at.isoformat(),
                    "assigned_at": m.assigned_at.isoformat() if m.assigned_at else None,
                    "started_at": m.started_at.isoformat() if m.started_at else None,
                    "completed_at": m.completed_at.isoformat() if m.completed_at else None,
                    "completion_notes": m.completion_notes,
                    "beneficiaries_reached": m.beneficiaries_reached,
                    "resources_used": m.resources_used,
                }
                for m in disaster.missions
            ],
        }

    def _snapshot_to_disaster(self, payload: Dict) -> Disaster:
        area = None
        if payload.get("affected_area"):
            a = payload["affected_area"]
            area = AffectedArea(
                center_lat=a["center_lat"],
                center_lon=a["center_lon"],
                radius_km=a["radius_km"],
                governorate=a["governorate"],
                localities=a.get("localities", []),
                estimated_population=a.get("estimated_population", 0),
            )

        disaster = Disaster(
            id=payload["id"],
            reference_number=payload["reference_number"],
            name=payload["name"],
            disaster_type=DisasterType(payload["disaster_type"]),
            severity=payload["severity"],
            phase=DisasterPhase(payload["phase"]),
            alert_level=AlertLevel(payload["alert_level"]),
            affected_area=area,
            estimated_damage_tnd=payload.get("estimated_damage_tnd", 0.0),
            detected_at=datetime.fromisoformat(payload["detected_at"]),
            declared_at=datetime.fromisoformat(payload["declared_at"]) if payload.get("declared_at") else None,
            declared_by=payload.get("declared_by"),
            closed_at=datetime.fromisoformat(payload["closed_at"]) if payload.get("closed_at") else None,
            crisis_room_id=payload.get("crisis_room_id"),
            total_beneficiaries=payload.get("total_beneficiaries", 0),
            deployed_teams=payload.get("deployed_teams", []),
            missions=[],
        )

        for m in payload.get("missions", []):
            location = None
            if m.get("target_location"):
                l = m["target_location"]
                location = Location(
                    latitude=l["latitude"],
                    longitude=l["longitude"],
                    address=l.get("address", ""),
                    city=l.get("city", ""),
                    region=l.get("region", ""),
                )
            disaster.missions.append(
                Mission(
                    id=m["id"],
                    reference_number=m["reference_number"],
                    disaster_id=m["disaster_id"],
                    objective=m["objective"],
                    description=m["description"],
                    priority=m["priority"],
                    status=MissionStatus(m["status"]),
                    assigned_team_id=m.get("assigned_team_id"),
                    assigned_team_name=m.get("assigned_team_name"),
                    target_location=location,
                    created_at=datetime.fromisoformat(m["created_at"]),
                    assigned_at=datetime.fromisoformat(m["assigned_at"]) if m.get("assigned_at") else None,
                    started_at=datetime.fromisoformat(m["started_at"]) if m.get("started_at") else None,
                    completed_at=datetime.fromisoformat(m["completed_at"]) if m.get("completed_at") else None,
                    completion_notes=m.get("completion_notes", ""),
                    beneficiaries_reached=m.get("beneficiaries_reached", 0),
                    resources_used=m.get("resources_used", {}),
                )
            )
        return disaster
    
    def _generate_disaster_ref(self) -> str:
        """Générer un numéro de référence"""
        self._disaster_counter += 1
        return f"DIS-{datetime.now().year}-{self._disaster_counter:04d}"
    
    def _generate_mission_ref(self, disaster_ref: str) -> str:
        """Générer un numéro de mission"""
        self._mission_counter += 1
        return f"{disaster_ref}-M{self._mission_counter:03d}"
    
    def create_disaster_from_alert(self, 
                                    disaster_type: DisasterType,
                                    location: Location,
                                    alert_level: AlertLevel,
                                    estimated_population: int = 0,
                                    risk_score: float = 0.0) -> Disaster:
        """
        Créer une catastrophe à partir d'une alerte
        
        Args:
            disaster_type: Type de catastrophe
            location: Localisation
            alert_level: Niveau d'alerte
            estimated_population: Population estimée affectée
            risk_score: Score de risque (0-1)
            
        Returns:
            Nouvelle catastrophe créée
        """
        disaster_id = str(uuid.uuid4())
        ref = self._generate_disaster_ref()
        
        # Déterminer la sévérité basée sur le niveau d'alerte
        severity_map = {
            AlertLevel.GREEN: 1,
            AlertLevel.YELLOW: 2,
            AlertLevel.ORANGE: 3,
            AlertLevel.RED: 5
        }
        severity = severity_map.get(alert_level, 3)
        
        # Créer la zone affectée
        affected_area = AffectedArea(
            center_lat=location.latitude,
            center_lon=location.longitude,
            radius_km=10 if alert_level == AlertLevel.RED else 5,
            governorate=location.region,
            localities=[location.city] if location.city else [],
            estimated_population=estimated_population
        )
        
        # Créer la catastrophe
        name = f"{disaster_type.value.capitalize()} - {location.region} {datetime.now().strftime('%Y-%m-%d')}"
        disaster = Disaster(
            id=disaster_id,
            reference_number=ref,
            name=name,
            disaster_type=disaster_type,
            severity=severity,
            alert_level=alert_level,
            affected_area=affected_area
        )
        
        self.disasters[disaster_id] = disaster
        self._persist_disaster(disaster)
        logger.info(f"Disaster created: {ref} - {name}")
        
        return disaster
    
    def declare_disaster(self, disaster_id: str, declared_by: str) -> Dict:
        """
        Déclarer officiellement une catastrophe
        
        Args:
            disaster_id: ID de la catastrophe
            declared_by: Utilisateur qui déclare
            
        Returns:
            Résultat de la déclaration
        """
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"success": False, "error": "Disaster not found"}
        
        if not disaster.declare(declared_by):
            return {"success": False, "error": "Cannot declare disaster in current phase"}
        
        # Créer automatiquement une salle de crise
        crisis_room = self.crisis_service.create_crisis_room(disaster_id, disaster.name)
        disaster.crisis_room_id = crisis_room.id
        
        # Activer la salle de crise
        self.crisis_service.activate_room(crisis_room.id)
        
        # Démarrer la phase de réponse
        disaster.start_response()
        self._persist_disaster(disaster)
        
        return {
            "success": True,
            "disaster": disaster.to_dict(),
            "crisis_room_id": crisis_room.id,
            "crisis_room_url": crisis_room.video_call_url
        }
    
    def create_mission(self, disaster_id: str, objective: str, description: str,
                      priority: int, target_location: Location = None) -> Dict:
        """
        Créer une mission pour une catastrophe
        
        Args:
            disaster_id: ID de la catastrophe
            objective: Objectif de la mission
            description: Description détaillée
            priority: Priorité (1-5)
            target_location: Localisation cible
            
        Returns:
            Mission créée
        """
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"success": False, "error": "Disaster not found"}
        
        mission = Mission(
            id=str(uuid.uuid4()),
            reference_number=self._generate_mission_ref(disaster.reference_number),
            disaster_id=disaster_id,
            objective=objective,
            description=description,
            priority=priority,
            target_location=target_location
        )
        
        disaster.add_mission(mission)
        self._persist_disaster(disaster)
        
        return {
            "success": True,
            "mission": mission.to_dict()
        }
    
    def assign_team_to_mission(self, disaster_id: str, mission_id: str) -> Dict:
        """
        Assigner automatiquement la meilleure équipe à une mission
        
        Args:
            disaster_id: ID de la catastrophe
            mission_id: ID de la mission
            
        Returns:
            Résultat de l'assignation
        """
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"success": False, "error": "Disaster not found"}
        
        mission = next((m for m in disaster.missions if m.id == mission_id), None)
        if not mission:
            return {"success": False, "error": "Mission not found"}
        
        # Utiliser la localisation de la mission ou de la catastrophe
        location = mission.target_location
        if not location and disaster.affected_area:
            location = Location(
                disaster.affected_area.center_lat,
                disaster.affected_area.center_lon,
                "",
                "",
                disaster.affected_area.governorate
            )
        
        if not location:
            return {"success": False, "error": "No location available for matching"}
        
        # Trouver les meilleures équipes
        best_teams = self.team_service.select_best_teams(location, count=1)
        
        if not best_teams:
            return {"success": False, "error": "No available teams"}
        
        team = best_teams[0]
        
        # Assigner l'équipe à la mission
        if not mission.assign(team.id, team.name):
            return {"success": False, "error": "Cannot assign team to mission"}
        
        # Déployer l'équipe sur la catastrophe
        self.team_service.deploy_team(team.id, disaster_id, location)
        
        # Ajouter l'équipe à la liste des équipes déployées
        if team.id not in disaster.deployed_teams:
            disaster.deployed_teams.append(team.id)
        self._persist_disaster(disaster)
        
        return {
            "success": True,
            "mission": mission.to_dict(),
            "team": team.to_dict()
        }
    
    def start_mission(self, disaster_id: str, mission_id: str) -> Dict:
        """Démarrer une mission"""
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"success": False, "error": "Disaster not found"}
        
        mission = next((m for m in disaster.missions if m.id == mission_id), None)
        if not mission:
            return {"success": False, "error": "Mission not found"}
        
        if not mission.start():
            return {"success": False, "error": "Cannot start mission"}
        self._persist_disaster(disaster)
        
        return {
            "success": True,
            "mission": mission.to_dict()
        }
    
    def complete_mission(self, disaster_id: str, mission_id: str,
                        notes: str, beneficiaries: int, resources: Dict = None) -> Dict:
        """Compléter une mission"""
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"success": False, "error": "Disaster not found"}
        
        mission = next((m for m in disaster.missions if m.id == mission_id), None)
        if not mission:
            return {"success": False, "error": "Mission not found"}
        
        if not mission.complete(notes, beneficiaries, resources):
            return {"success": False, "error": "Cannot complete mission"}
        
        # Mettre à jour les bénéficiaires totaux
        disaster.total_beneficiaries += beneficiaries
        
        # Retourner l'équipe à la base
        if mission.assigned_team_id:
            self.team_service.return_team(mission.assigned_team_id)
        self._persist_disaster(disaster)
        
        return {
            "success": True,
            "mission": mission.to_dict()
        }
    
    def close_disaster(self, disaster_id: str, lessons_learned: str = "",
                       recommendations: str = "") -> Dict:
        """
        Clôturer une catastrophe et générer le rapport final
        
        Args:
            disaster_id: ID de la catastrophe
            lessons_learned: Leçons apprises
            recommendations: Recommandations
            
        Returns:
            Rapport final
        """
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"success": False, "error": "Disaster not found"}
        
        if not disaster.close():
            return {"success": False, "error": "Cannot close disaster"}
        
        # Fermer la salle de crise
        if disaster.crisis_room_id:
            self.crisis_service.close_room(disaster.crisis_room_id)
        
        # Calculer la durée
        duration = (disaster.closed_at - disaster.detected_at).days
        
        # Calculer les ressources totales
        total_resources = {}
        for mission in disaster.missions:
            for res, qty in mission.resources_used.items():
                total_resources[res] = total_resources.get(res, 0) + qty
        
        # Générer le rapport
        report = DisasterReport(
            id=str(uuid.uuid4()),
            disaster_id=disaster_id,
            disaster_name=disaster.name,
            duration_days=duration,
            total_beneficiaries=disaster.total_beneficiaries,
            total_teams_deployed=len(disaster.deployed_teams),
            total_missions=len(disaster.missions),
            missions_completed=len(disaster.get_completed_missions()),
            missions_cancelled=len([m for m in disaster.missions if m.status == MissionStatus.CANCELLED]),
            resources_distributed=total_resources,
            lessons_learned=lessons_learned,
            recommendations=recommendations
        )
        self._persist_disaster(disaster)
        
        return {
            "success": True,
            "disaster": disaster.to_dict(),
            "report": report.to_dict()
        }
    
    def get_active_disasters(self) -> List[Disaster]:
        """Obtenir les catastrophes actives"""
        return [d for d in self.disasters.values() 
                if d.phase in [DisasterPhase.DECLARED, DisasterPhase.RESPONSE, DisasterPhase.RECOVERY]]
    
    def get_disaster_dashboard(self, disaster_id: str) -> Dict:
        """
        Obtenir le tableau de bord d'une catastrophe
        
        Args:
            disaster_id: ID de la catastrophe
            
        Returns:
            Tableau de bord complet
        """
        disaster = self.disasters.get(disaster_id)
        if not disaster:
            return {"error": "Disaster not found"}
        
        return {
            "disaster": disaster.to_dict(),
            "missions": {
                "total": len(disaster.missions),
                "in_progress": len([m for m in disaster.missions if m.status == MissionStatus.IN_PROGRESS]),
                "completed": len(disaster.get_completed_missions()),
                "list": [m.to_dict() for m in disaster.missions]
            },
            "teams": {
                "deployed": len(disaster.deployed_teams),
                "list": [self.team_service.get_team_by_id(t).to_dict() 
                        for t in disaster.deployed_teams 
                        if self.team_service.get_team_by_id(t)]
            },
            "crisis_room": self.crisis_service.get_room_summary(disaster.crisis_room_id) if disaster.crisis_room_id else None,
            "beneficiaries": disaster.total_beneficiaries
        }


# ============================================================
#  TESTS
# ============================================================

def test_disaster_management():
    """Tester le module de gestion des catastrophes"""
    logger.info("Testing Disaster Management Module...")
    
    service = DisasterManagementService()
    
    # Test 1: Créer une catastrophe à partir d'une alerte
    nabeul_location = Location(36.4513, 10.7381, "Centre Nabeul", "Nabeul", "Nabeul")
    disaster = service.create_disaster_from_alert(
        disaster_type=DisasterType.FLOOD,
        location=nabeul_location,
        alert_level=AlertLevel.ORANGE,
        estimated_population=15000,
        risk_score=0.75
    )
    logger.info(f"Disaster created: {disaster.reference_number}")
    
    # Test 2: Déclarer la catastrophe
    result = service.declare_disaster(disaster.id, "user_coordinator_001")
    logger.info(f"Declaration result: {result['success']}")
    logger.info(f"Crisis room created: {result.get('crisis_room_id', 'N/A')}")
    
    # Test 3: Créer des missions
    mission1 = service.create_mission(
        disaster_id=disaster.id,
        objective="Évacuation Zone A",
        description="Évacuer les habitants de la zone A vers le centre d'accueil",
        priority=5,
        target_location=Location(36.46, 10.74, "", "", "Nabeul")
    )
    logger.info(f"Mission 1 created: {mission1['mission']['reference_number']}")
    
    mission2 = service.create_mission(
        disaster_id=disaster.id,
        objective="Distribution Eau",
        description="Distribuer de l'eau potable aux zones sinistrées",
        priority=4,
        target_location=Location(36.45, 10.73, "", "", "Nabeul")
    )
    logger.info(f"Mission 2 created: {mission2['mission']['reference_number']}")
    
    # Test 4: Assigner une équipe
    assign_result = service.assign_team_to_mission(disaster.id, mission1['mission']['id'])
    logger.info(f"Team assignment: {assign_result['success']}")
    if assign_result['success']:
        logger.info(f"Assigned team: {assign_result['team']['name']}")
    
    # Test 5: Démarrer la mission
    start_result = service.start_mission(disaster.id, mission1['mission']['id'])
    logger.info(f"Mission started: {start_result['success']}")
    
    # Test 6: Compléter la mission
    complete_result = service.complete_mission(
        disaster_id=disaster.id,
        mission_id=mission1['mission']['id'],
        notes="Évacuation complète, 250 personnes évacuées",
        beneficiaries=250,
        resources={"water_bottles": 500, "blankets": 100}
    )
    logger.info(f"Mission completed: {complete_result['success']}")
    
    # Test 7: Tableau de bord
    dashboard = service.get_disaster_dashboard(disaster.id)
    logger.info(f"Dashboard - Missions: {dashboard['missions']['total']}, Beneficiaries: {dashboard['beneficiaries']}")
    
    # Test 8: Clôturer la catastrophe
    close_result = service.close_disaster(
        disaster_id=disaster.id,
        lessons_learned="Coordination améliorée nécessaire entre équipes",
        recommendations="Renforcer les stocks de matériel d'évacuation"
    )
    logger.info(f"Disaster closed: {close_result['success']}")
    logger.info(f"Report generated: {close_result['report']['id']}")
    
    logger.info("✓ Disaster Management tests completed!")
    return True


if __name__ == "__main__":
    test_disaster_management()
