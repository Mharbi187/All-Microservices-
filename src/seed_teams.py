import os
import json
import uuid
import random
from datetime import datetime, timedelta
from typing import List, Dict

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import Column, String, JSON
from src.database import Base, SessionLocal, engine, init_db, TeamState
from src.teams import (
    ResponseTeam, TeamMember, Location, TeamType, TeamStatus, MemberRole,
    Skill, SkillLevel, WellbeingStatus
)

# Initialize the database
init_db()

WILAYAS = [
    {"name": "Tunis", "lat": 36.8065, "lon": 10.1815},
    {"name": "Sfax", "lat": 34.7400, "lon": 10.7600},
    {"name": "Sousse", "lat": 35.8256, "lon": 10.6369},
    {"name": "Gabes", "lat": 33.8814, "lon": 10.0982},
    {"name": "Jendouba", "lat": 36.5011, "lon": 8.7802},
    {"name": "Bizerte", "lat": 37.2744, "lon": 9.8739},
    {"name": "Kairouan", "lat": 35.6781, "lon": 10.0963},
    {"name": "Nabeul", "lat": 36.4561, "lon": 10.7376},
    {"name": "Tataouine", "lat": 32.9297, "lon": 10.4518},
    {"name": "Gafsa", "lat": 34.4250, "lon": 8.7842},
]

NAMES = [
    "Ahmed", "Mohamed", "Fatma", "Sonia", "Karim", "Youssef", "Amira", "Leila", "Ali", "Samir",
    "Khaled", "Mouna", "Nadia", "Sami", "Rym", "Hichem", "Zied", "Asma", "Ines", "Walid"
]

SURNAMES = [
    "Ben Salah", "Trabelsi", "Gharbi", "Souissi", "Hamdi", "Mansouri", "Khelifi", "Bouzid", "Chaabane", "Touati",
    "Ayari", "Riahi", "Jelassi", "Zouari", "Ammar", "Mabrouk", "Mejri", "Baccouche", "Dridi", "Abid"
]

def generate_members(count: int) -> List[TeamMember]:
    members = []
    for i in range(count):
        role = random.choice(list(MemberRole))
        member = TeamMember(
            id=str(uuid.uuid4()),
            volunteer_id=f"V-{random.randint(1000, 9999)}",
            name=f"{random.choice(NAMES)} {random.choice(SURNAMES)}",
            phone=f"+2169{random.randint(1000000, 9999999)}",
            email=f"vol.{random.randint(1000,9999)}@crt.tn",
            role=role,
            skills=[Skill("first_aid", random.choice(list(SkillLevel)))],
            is_available=True
        )
        members.append(member)
    return members

def seed_database():
    session = SessionLocal()
    
    # Check if we already have teams
    count = session.query(TeamState).count()
    if count > 0:
        print(f"Database already contains {count} teams. Clearing old teams to re-seed...")
        session.query(TeamState).delete()
        session.commit()

    teams_to_insert = []

    # Generate 10 AVAILABLE teams
    for i in range(10):
        wilaya = random.choice(WILAYAS)
        team_type = random.choice(list(TeamType))
        code = f"{team_type.name}-{wilaya['name'][:3].upper()}-{i+1}"
        
        team = ResponseTeam(
            id=f"team_avail_{i}",
            name=f"{team_type.name} {wilaya['name']} {'Alpha' if i%2==0 else 'Bravo'}",
            code=code,
            team_type=team_type,
            status=TeamStatus.AVAILABLE,
            capacity=random.randint(8, 15),
            base_location=Location(wilaya["lat"], wilaya["lon"], f"Comité {wilaya['name']}", wilaya["name"], wilaya["name"]),
            members=generate_members(random.randint(5, 7))
        )
        
        teams_to_insert.append(team)

    # Generate 10 UNAVAILABLE teams
    unavailable_statuses = [TeamStatus.DEPLOYED, TeamStatus.RESTING, TeamStatus.STANDBY, TeamStatus.TRAINING]
    for i in range(10):
        wilaya = random.choice(WILAYAS)
        team_type = random.choice(list(TeamType))
        status = random.choice(unavailable_statuses)
        code = f"{team_type.name}-{wilaya['name'][:3].upper()}-U{i+1}"
        
        team = ResponseTeam(
            id=f"team_unavail_{i}",
            name=f"{team_type.name} {wilaya['name']} {'Charlie' if i%2==0 else 'Delta'}",
            code=code,
            team_type=team_type,
            status=status,
            capacity=random.randint(8, 15),
            base_location=Location(wilaya["lat"], wilaya["lon"], f"Comité {wilaya['name']}", wilaya["name"], wilaya["name"]),
            members=generate_members(random.randint(5, 7))
        )
        
        if status == TeamStatus.DEPLOYED:
            team.current_disaster_id = f"disaster_{random.randint(100, 999)}"
            team.deployed_at = datetime.now() - timedelta(hours=random.randint(2, 48))
            # Put them in a random location
            target_wilaya = random.choice(WILAYAS)
            team.current_location = Location(target_wilaya["lat"], target_wilaya["lon"], "", target_wilaya["name"], target_wilaya["name"])
        elif status == TeamStatus.RESTING:
            team.returned_at = datetime.now() - timedelta(hours=random.randint(1, 12))
            
        teams_to_insert.append(team)

    # Insert all teams
    for t in teams_to_insert:
        state = TeamState(
            id=t.id,
            payload=t.to_dict()
        )
        session.add(state)

    session.commit()
    print(f"Successfully inserted {len(teams_to_insert)} teams (10 available, 10 unavailable).")
    session.close()

if __name__ == "__main__":
    seed_database()
