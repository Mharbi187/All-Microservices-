import os
import uuid
import random
import psycopg2
from datetime import datetime

# Connect to the MS1 database
# In docker-compose, nexus-aid-db is exposed on 5433 for host, or 5432 internally.
conn = psycopg2.connect("postgresql://postgres:postgres@nexus-aid-db:5432/nexusaid_db")
cur = conn.cursor()

NAMES = ["Ahmed", "Mohamed", "Fatma", "Sonia", "Karim", "Youssef", "Amira", "Leila", "Ali", "Samir", "Nadia", "Sami"]
SURNAMES = ["Ben Salah", "Trabelsi", "Gharbi", "Souissi", "Hamdi", "Mansouri", "Khelifi", "Bouzid", "Touati", "Ayari"]
COMMITTEES = ["Tunis", "Sfax", "Sousse", "Gabes", "Jendouba"]
SPECIALTIES = ["Secouriste", "Logisticien", "Médecin", "Infirmier", "Coordinateur"]

def seed_ms1():
    try:
        print("Starting to seed MS1 database with NDRT and RDRT members...")
        # Get committee IDs if they exist in the DB
        cur.execute("SELECT id, name FROM committees")
        db_committees = cur.fetchall()
        
        # We want to create 3 to 7 members for NDRT and RDRT
        # First, NDRT (National) -> 5 members
        # Then, RDRT (Regional) -> 3 to 7 members per committee

        teams_to_create = [("NDRT", "National", random.randint(3, 7))]
        for c in COMMITTEES:
            teams_to_create.append(("RDRT", c, random.randint(3, 7)))

        for team_type, committee_name, count in teams_to_create:
            for i in range(count):
                user_id = str(uuid.uuid4())
                vol_id = user_id
                member_id = str(uuid.uuid4())
                
                name = f"{random.choice(NAMES)} {random.choice(SURNAMES)}"
                cin = f"{random.randint(10000000, 99999999)}"
                email = f"vol.{random.randint(1000, 99999)}@crt.tn"
                
                # Insert User
                cur.execute("""
                    INSERT INTO users (id, email, password, full_name, cin, user_type, account_status, created_at, updated_at, first_login_completed)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (user_id, email, "$2a$10$xyz", name, cin, "VOLUNTEER", "APPROVED", datetime.now(), datetime.now(), False))
                
                # Insert Volunteer
                # Use the first committee from db_committees if exists
                comm_id = db_committees[0][0] if db_committees else None
                cur.execute("""
                    INSERT INTO volunteers (id, date_adhesion, matricule, committee_id)
                    VALUES (%s, %s, %s, %s)
                """, (vol_id, datetime.now(), f"MAT-{random.randint(1000, 9999)}", comm_id))
                
                # Insert DisasterTeamMember
                cur.execute("""
                    INSERT INTO disaster_team_members (id, volunteer_id, team_type, specialty, status, joined_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (member_id, vol_id, team_type, random.choice(SPECIALTIES), "ACTIVE", datetime.now()))

        conn.commit()
        print("Seeding successful!")
    except Exception as e:
        conn.rollback()
        print(f"Error seeding: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_ms1()
