"""
Teams Management Module for Tunisia Disaster Detection
Gestion des Équipes NDRT/RDRT/IDRT
Module 4 - Croissant Rouge Tunisien
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import json
import os
import requests

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================
#  ENUMERATIONS
# ============================================================

class TeamType(Enum):
    """Types d'équipes de réponse aux catastrophes"""
    NDRT = "National Disaster Response Team"
    RDRT = "Regional Disaster Response Team"
    IDRT = "International Disaster Response Team"


class TeamStatus(Enum):
    """Statuts des équipes"""
    AVAILABLE = "available"
    STANDBY = "standby"
    DEPLOYED = "deployed"
    RESTING = "resting"
    TRAINING = "training"


class MemberRole(Enum):
    """Rôles des membres d'équipe"""
    TEAM_LEADER = "team_leader"
    MEDIC = "medic"
    LOGISTICS = "logistics"
    COMMUNICATIONS = "communications"
    SEARCH_RESCUE = "search_rescue"
    SHELTER = "shelter"
    WATSAN = "water_sanitation"


class SkillLevel(Enum):
    """Niveaux de compétence"""
    BASIC = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4


# ============================================================
#  DATA CLASSES
# ============================================================

@dataclass
class Location:
    """Localisation GPS"""
    latitude: float
    longitude: float
    address: str = ""
    city: str = ""
    region: str = ""


@dataclass
class Skill:
    """Compétence d'un membre"""
    name: str
    level: SkillLevel
    certified: bool = False
    expiry_date: Optional[datetime] = None


@dataclass
class TeamMember:
    """Membre d'une équipe de réponse"""
    id: str
    volunteer_id: str
    name: str
    phone: str
    email: str
    role: MemberRole
    skills: List[Skill] = field(default_factory=list)
    certifications: List[str] = field(default_factory=list)
    languages: List[str] = field(default_factory=list)
    is_available: bool = True
    current_location: Optional[Location] = None
    last_deployment_date: Optional[datetime] = None
    total_missions: int = 0
    performance_score: float = 0.0
    
    def to_dict(self) -> Dict:
        """Convertir en dictionnaire"""
        return {
            "id": self.id,
            "volunteer_id": self.volunteer_id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role.value,
            "skills": [{"name": s.name, "level": s.level.value} for s in self.skills],
            "certifications": self.certifications,
            "languages": self.languages,
            "is_available": self.is_available,
            "total_missions": self.total_missions,
            "performance_score": self.performance_score
        }
    
    def match_requirements(self, requirements: List[str]) -> float:
        """
        Calculer le score de correspondance avec les exigences
        
        Args:
            requirements: Liste des compétences requises
            
        Returns:
            Score de correspondance (0-1)
        """
        if not requirements:
            return 1.0
        
        skill_names = [s.name.lower() for s in self.skills]
        cert_names = [c.lower() for c in self.certifications]
        all_competencies = skill_names + cert_names
        
        matches = sum(1 for req in requirements if req.lower() in all_competencies)
        return matches / len(requirements)


@dataclass
class WellbeingStatus:
    """Statut de bien-être de l'équipe"""
    team_id: str
    fatigue_level: int  # 1-10
    morale: int  # 1-10
    health_issues: List[str] = field(default_factory=list)
    last_rest_date: Optional[datetime] = None
    recommended_action: str = ""
    checked_at: datetime = field(default_factory=datetime.now)
    
    def needs_rest(self) -> bool:
        """Vérifie si l'équipe a besoin de repos"""
        return self.fatigue_level >= 7 or self.morale <= 3
    
    def to_dict(self) -> Dict:
        return {
            "team_id": self.team_id,
            "fatigue_level": self.fatigue_level,
            "morale": self.morale,
            "health_issues": self.health_issues,
            "last_rest_date": self.last_rest_date.isoformat() if self.last_rest_date else None,
            "recommended_action": self.recommended_action,
            "needs_rest": self.needs_rest()
        }


@dataclass
class ResponseTeam:
    """Équipe de réponse aux catastrophes"""
    id: str
    name: str
    code: str
    team_type: TeamType
    status: TeamStatus = TeamStatus.AVAILABLE
    capacity: int = 10
    members: List[TeamMember] = field(default_factory=list)
    base_location: Optional[Location] = None
    current_location: Optional[Location] = None
    deployed_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    current_disaster_id: Optional[str] = None
    wellbeing: Optional[WellbeingStatus] = None
    
    def to_dict(self) -> Dict:
        base_location_name = None
        if self.base_location:
            base_location_name = (
                self.base_location.address
                or self.base_location.city
                or self.base_location.region
            )

        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "team_type": self.team_type.name,
            "team_type_label": self.team_type.value,
            "status": self.status.value,
            "capacity": self.capacity,
            "member_count": len(self.members),
            "members": [m.to_dict() for m in self.members],
            "base_location": {
                "lat": self.base_location.latitude,
                "lon": self.base_location.longitude,
                "address": self.base_location.address,
                "city": self.base_location.city,
                "region": self.base_location.region,
            } if self.base_location else None,
            "base_location_name": base_location_name,
            "deployed_at": self.deployed_at.isoformat() if self.deployed_at else None,
            "current_disaster_id": self.current_disaster_id,
            "wellbeing": self.wellbeing.to_dict() if self.wellbeing else None
        }
    
    def get_available_members(self) -> List[TeamMember]:
        """Obtenir les membres disponibles"""
        return [m for m in self.members if m.is_available]
    
    def deploy(self, disaster_id: str, location: Location) -> bool:
        """
        Déployer l'équipe sur une catastrophe
        
        Args:
            disaster_id: ID de la catastrophe
            location: Localisation du déploiement
            
        Returns:
            True si déployé avec succès
        """
        if self.status == TeamStatus.DEPLOYED:
            logger.warning(f"Team {self.id} is already deployed")
            return False
        
        self.status = TeamStatus.DEPLOYED
        self.current_disaster_id = disaster_id
        self.current_location = location
        self.deployed_at = datetime.now()
        self.returned_at = None
        
        logger.info(f"Team {self.name} deployed to disaster {disaster_id}")
        return True
    
    def return_to_base(self) -> bool:
        """Retourner à la base"""
        if self.status != TeamStatus.DEPLOYED:
            logger.warning(f"Team {self.id} is not deployed")
            return False
        
        self.status = TeamStatus.RESTING
        self.current_disaster_id = None
        self.current_location = self.base_location
        self.returned_at = datetime.now()
        
        # Mettre à jour les statistiques des membres
        for member in self.members:
            member.total_missions += 1
            member.last_deployment_date = datetime.now()
        
        logger.info(f"Team {self.name} returned to base")
        return True
    
    def check_wellbeing(self, fatigue: int, morale: int, issues: List[str] = None) -> WellbeingStatus:
        """
        Vérifier le bien-être de l'équipe
        
        Args:
            fatigue: Niveau de fatigue (1-10)
            morale: Niveau de moral (1-10)
            issues: Problèmes de santé éventuels
            
        Returns:
            Statut de bien-être
        """
        recommended = ""
        if fatigue >= 7:
            recommended = "Repos obligatoire de 24h recommandé"
        elif fatigue >= 5:
            recommended = "Rotation partielle conseillée"
        elif morale <= 3:
            recommended = "Support psychologique recommandé"
        else:
            recommended = "Continuer les opérations"
        
        self.wellbeing = WellbeingStatus(
            team_id=self.id,
            fatigue_level=fatigue,
            morale=morale,
            health_issues=issues or [],
            recommended_action=recommended
        )
        
        return self.wellbeing


# ============================================================
#  TEAM MATCHING SERVICE
# ============================================================

import time

class TeamMatchingService:
    """Service de matching des équipes avec les besoins"""
    
    def __init__(self):
        self.teams: List[ResponseTeam] = []
        self._load_from_db()

    def _sync_with_core_service(self, retries: int = 3, delay: int = 5) -> bool:
        """Synchronise les équipes depuis le Core Service (MS1) avec retry."""
        core_url = os.getenv("CORE_SERVICE_URL", "http://core-service:8080")
        for attempt in range(1, retries + 1):
            try:
                r = requests.get(f"{core_url}/api/v1/sync/teams", timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    self.teams = []
                    for t in data:
                        t_type = TeamType.IDRT
                        tt_raw = t.get("team_type")
                        if tt_raw == "NATIONAL": t_type = TeamType.NDRT
                        elif tt_raw == "REGIONAL": t_type = TeamType.RDRT
                        
                        loc_data = t.get("base_location", {})
                        loc = Location(
                            latitude=loc_data.get("lat", 36.8),
                            longitude=loc_data.get("lon", 10.18),
                            address=loc_data.get("name", "Unknown Base"),
                            city=loc_data.get("region", "Tunis"),
                            region=loc_data.get("region", "Tunis")
                        )
                        
                        team = ResponseTeam(
                            id=t.get("id"),
                            name=t.get("name"),
                            code=f"SYNC-{t.get('team_type', 'UNK')}",
                            team_type=t_type,
                            status=TeamStatus.AVAILABLE,
                            capacity=10,
                            base_location=loc
                        )
                        self.teams.append(team)
                    logger.info(f"Successfully synced {len(self.teams)} teams from Core Service MS1")
                    return True
                else:
                    logger.warning(f"Core Service returned HTTP {r.status_code} (attempt {attempt}/{retries})")
            except Exception as e:
                logger.warning(f"Attempt {attempt}/{retries} — Core Service unreachable: {e}")
            if attempt < retries:
                time.sleep(delay)
        logger.error(f"Core Service MS1 unreachable after {retries} attempts.")
        return False

    def refresh_from_core_service(self) -> bool:
        """Rafraîchir les équipes depuis MS1 (peut être appelé via un endpoint API)."""
        return self._sync_with_core_service()
    
    def _load_from_db(self):
        from src.database import SessionLocal, TeamState
        session = SessionLocal()
        try:
            states = session.query(TeamState).all()
            if states:
                self.teams = []
                for state in states:
                    t = self._dict_to_team(state.payload)
                    if t: self.teams.append(t)
                logger.info(f"Successfully loaded {len(self.teams)} teams from PostgreSQL")
            else:
                logger.info("Database empty. Attempting to sync with Core Service MS1...")
                self._sync_with_core_service()
        except Exception as e:
            logger.error(f"Failed to load teams from DB: {e}")
            self._sync_with_core_service()
        finally:
            session.close()

    def _persist_team(self, team: ResponseTeam):
        from src.database import SessionLocal, TeamState
        session = SessionLocal()
        try:
            state = session.query(TeamState).filter(TeamState.id == team.id).first()
            if state:
                state.payload = team.to_dict()
            else:
                state = TeamState(id=team.id, payload=team.to_dict())
                session.add(state)
            session.commit()
        except Exception as e:
            logger.error(f"Failed to persist team {team.id} to DB: {e}")
            session.rollback()
        finally:
            session.close()

    def _dict_to_team(self, d: Dict) -> ResponseTeam:
        try:
            loc = None
            if d.get("base_location"):
                bd = d["base_location"]
                loc = Location(bd.get("lat", 0), bd.get("lon", 0), bd.get("address", ""), bd.get("city", ""), bd.get("region", ""))
            
            cur_loc = None
            if d.get("current_location"):
                cd = d["current_location"]
                cur_loc = Location(cd.get("lat", 0), cd.get("lon", 0), cd.get("address", ""), cd.get("city", ""), cd.get("region", ""))
                
            members = []
            for m in d.get("members", []):
                mem = TeamMember(
                    id=m.get("id"), volunteer_id=m.get("volunteer_id", ""), name=m.get("name", ""),
                    phone=m.get("phone", ""), email=m.get("email", ""), 
                    role=MemberRole(m.get("role", "medic")), is_available=m.get("is_available", True)
                )
                members.append(mem)

            team_type_val = d.get("team_type", "NDRT")
            team_type_enum = TeamType.NDRT
            if team_type_val == "RDRT": team_type_enum = TeamType.RDRT
            elif team_type_val == "IDRT": team_type_enum = TeamType.IDRT
                
            team = ResponseTeam(
                id=d.get("id"), name=d.get("name"), code=d.get("code"),
                team_type=team_type_enum, status=TeamStatus(d.get("status", "available")),
                capacity=d.get("capacity", 10), base_location=loc, current_location=cur_loc,
                members=members
            )
            if d.get("deployed_at"): team.deployed_at = datetime.fromisoformat(d["deployed_at"])
            if d.get("returned_at"): team.returned_at = datetime.fromisoformat(d["returned_at"])
            if d.get("current_disaster_id"): team.current_disaster_id = d["current_disaster_id"]
            return team
        except Exception as e:
            logger.error(f"Error parsing team dict: {e}")
            return None
    
    def get_all_teams(self) -> List[ResponseTeam]:
        """Obtenir toutes les équipes"""
        return self.teams
    
    def get_team_by_id(self, team_id: str) -> Optional[ResponseTeam]:
        """Obtenir une équipe par ID"""
        for team in self.teams:
            if team.id == team_id:
                return team
        return None
    
    def get_available_teams(self) -> List[ResponseTeam]:
        """Obtenir les équipes disponibles"""
        return [t for t in self.teams if t.status == TeamStatus.AVAILABLE]
    
    def find_teams_by_type(self, team_type: TeamType) -> List[ResponseTeam]:
        """Trouver les équipes par type"""
        return [t for t in self.teams if t.team_type == team_type]
    
    def find_teams_by_region(self, region: str) -> List[ResponseTeam]:
        """Trouver les équipes par région"""
        return [t for t in self.teams if t.base_location and t.base_location.region.lower() == region.lower()]
    
    def match_by_skills(self, requirements: List[str]) -> List[Dict]:
        """
        Matcher les équipes par compétences requises
        
        Args:
            requirements: Liste des compétences requises
            
        Returns:
            Liste des équipes avec scores de correspondance
        """
        results = []
        
        for team in self.get_available_teams():
            # Calculer le score moyen des membres
            member_scores = []
            for member in team.get_available_members():
                score = member.match_requirements(requirements)
                member_scores.append(score)
            
            if member_scores:
                avg_score = sum(member_scores) / len(member_scores)
                results.append({
                    "team": team.to_dict(),
                    "match_score": avg_score,
                    "available_members": len(team.get_available_members()),
                    "matching_skills": requirements
                })
        
        # Trier par score décroissant
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results
    
    def match_by_distance(self, location: Location, max_distance_km: float = 200) -> List[Dict]:
        """
        Matcher les équipes par distance
        
        Args:
            location: Localisation de la catastrophe
            max_distance_km: Distance maximale en km
            
        Returns:
            Liste des équipes triées par distance
        """
        import math
        
        def haversine(lat1, lon1, lat2, lon2):
            """Calculer la distance entre deux points GPS"""
            R = 6371  # Rayon de la Terre en km
            d_lat = math.radians(lat2 - lat1)
            d_lon = math.radians(lon2 - lon1)
            a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            return R * c
        
        results = []
        
        for team in self.get_available_teams():
            if team.base_location:
                distance = haversine(
                    location.latitude, location.longitude,
                    team.base_location.latitude, team.base_location.longitude
                )
                
                if distance <= max_distance_km:
                    results.append({
                        "team": team.to_dict(),
                        "distance_km": round(distance, 2),
                        "estimated_arrival_hours": round(distance / 50, 1)  # 50 km/h moyenne
                    })
        
        # Trier par distance croissante
        results.sort(key=lambda x: x["distance_km"])
        return results
    
    def select_best_teams(self, 
                          disaster_location: Location,
                          requirements: List[str] = None,
                          count: int = 3) -> List[ResponseTeam]:
        """
        Sélectionner les meilleures équipes pour une catastrophe
        
        Args:
            disaster_location: Localisation de la catastrophe
            requirements: Compétences requises
            count: Nombre d'équipes à sélectionner
            
        Returns:
            Liste des meilleures équipes
        """
        # Combiner distance et compétences
        distance_results = self.match_by_distance(disaster_location)
        
        if requirements:
            skills_results = self.match_by_skills(requirements)
            skills_map = {r["team"]["id"]: r["match_score"] for r in skills_results}
        else:
            skills_map = {}
        
        # Score combiné: 60% distance, 40% compétences
        combined = []
        for dr in distance_results:
            team_id = dr["team"]["id"]
            skill_score = skills_map.get(team_id, 0.5)
            distance_score = 1 - (dr["distance_km"] / 200)  # Normaliser
            
            combined_score = 0.6 * distance_score + 0.4 * skill_score
            combined.append({
                "team_id": team_id,
                "combined_score": combined_score,
                "team": self.get_team_by_id(team_id)
            })
        
        combined.sort(key=lambda x: x["combined_score"], reverse=True)
        return [c["team"] for c in combined[:count] if c["team"]]
    
    def deploy_team(self, team_id: str, disaster_id: str, location: Location) -> Dict:
        """
        Déployer une équipe
        
        Args:
            team_id: ID de l'équipe
            disaster_id: ID de la catastrophe
            location: Localisation du déploiement
            
        Returns:
            Résultat du déploiement
        """
        team = self.get_team_by_id(team_id)
        if not team:
            return {"success": False, "error": "Team not found"}
        
        if team.deploy(disaster_id, location):
            self._persist_team(team)
            return {
                "success": True,
                "team": team.to_dict(),
                "deployed_at": team.deployed_at.isoformat()
            }
        else:
            return {"success": False, "error": "Team cannot be deployed"}
    
    def return_team(self, team_id: str) -> Dict:
        """Retourner une équipe à la base"""
        team = self.get_team_by_id(team_id)
        if not team:
            return {"success": False, "error": "Team not found"}
        
        if team.return_to_base():
            self._persist_team(team)
            return {
                "success": True,
                "team": team.to_dict(),
                "returned_at": team.returned_at.isoformat()
            }
        else:
            return {"success": False, "error": "Team is not deployed"}

    def release_teams_for_disaster(self, disaster_id: str) -> int:
        """Retourner toutes les équipes déployées sur une catastrophe spécifique"""
        count = 0
        for team in self.get_all_teams():
            if team.current_disaster_id == disaster_id and team.status != TeamStatus.AVAILABLE:
                if team.return_to_base():
                    self._persist_team(team)
                    count += 1
        return count


# ============================================================
#  TESTS
# ============================================================

def test_team_management():
    """Tester le module de gestion des équipes"""
    logger.info("Testing Team Management Module...")
    
    service = TeamMatchingService()
    
    # Test 1: Lister les équipes
    teams = service.get_all_teams()
    logger.info(f"Total teams: {len(teams)}")
    
    # Test 2: Équipes disponibles
    available = service.get_available_teams()
    logger.info(f"Available teams: {len(available)}")
    
    # Test 3: Matching par compétences
    requirements = ["first_aid", "logistics"]
    matches = service.match_by_skills(requirements)
    logger.info(f"Skill matches: {len(matches)}")
    for m in matches:
        logger.info(f"  - {m['team']['name']}: {m['match_score']:.2%}")
    
    # Test 4: Matching par distance (Gabès)
    gabes_location = Location(33.8815, 10.0982, "", "Gabès", "Gabès")
    distance_matches = service.match_by_distance(gabes_location)
    logger.info(f"Distance matches: {len(distance_matches)}")
    for m in distance_matches:
        logger.info(f"  - {m['team']['name']}: {m['distance_km']} km")
    
    # Test 5: Sélectionner les meilleures équipes
    best = service.select_best_teams(gabes_location, requirements, count=2)
    logger.info(f"Best teams selected: {len(best)}")
    
    # Test 6: Déployer une équipe
    if best:
        result = service.deploy_team(best[0].id, "disaster_test_001", gabes_location)
        logger.info(f"Deployment result: {result['success']}")
    
    logger.info("✓ Team Management tests completed!")
    return True


if __name__ == "__main__":
    test_team_management()
