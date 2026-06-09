import logging
from typing import List, Dict, Optional
from datetime import datetime
import enum
import uuid

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship, Session
from src.database import Base, SessionLocal

logger = logging.getLogger(__name__)

class CrisisRoomStatus(enum.Enum):
    INACTIVE = "inactive"
    ACTIVE = "active"
    STANDBY = "standby"
    CLOSED = "closed"

class MessageType(enum.Enum):
    TEXT = "text"
    ALERT = "alert"
    DECISION = "decision"
    UPDATE = "update"
    DOCUMENT = "document"
    SYSTEM = "system"

class DecisionStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"
    CANCELLED = "cancelled"

class ParticipantRole(enum.Enum):
    COORDINATOR = "coordinator"
    OBSERVER = "observer"
    TEAM_LEADER = "team_leader"
    LOGISTICS = "logistics"
    MEDICAL = "medical"
    COMMUNICATIONS = "communications"
    COMMANDER = "commander"
    FIELD_MEDIC = "field_medic"
    president = "president"
    vice_president = "vice_president"
    catastrophe_manager = "catastrophe_manager"
    volunteer = "volunteer"
    committee_member = "committee_member"
    ndrt_member = "ndrt_member"
    rdrt_member = "rdrt_member"

class Participant(Base):
    __tablename__ = "room_participants"
    user_id = Column(String, primary_key=True)
    room_id = Column(String, ForeignKey("crisis_rooms.id"), primary_key=True)
    name = Column(String)
    role = Column(SQLEnum(ParticipantRole))
    agency = Column(String, default="")
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)
    last_activity = Column(DateTime, default=datetime.utcnow)

    room = relationship("CrisisRoom", back_populates="participants")

    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "role": self.role.value if self.role else "",
            "agency": self.agency,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
            "is_online": self.is_online,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None
        }

class CrisisMessage(Base):
    __tablename__ = "crisis_messages"
    id = Column(String, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("crisis_rooms.id"))
    sender_id = Column(String)
    sender_name = Column(String)
    content = Column(Text)
    message_type = Column(SQLEnum(MessageType), default=MessageType.TEXT)
    sent_at = Column(DateTime, default=datetime.utcnow)
    read_by = Column(JSON, default=list)
    attachments = Column(JSON, default=list)
    priority = Column(Integer, default=0)

    room = relationship("CrisisRoom", back_populates="messages")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_name": self.sender_name,
            "content": self.content,
            "message_type": self.message_type.value if self.message_type else "",
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "read_by": self.read_by or [],
            "attachments": self.attachments or [],
            "priority": self.priority
        }

class CrisisDecision(Base):
    __tablename__ = "crisis_decisions"
    id = Column(String, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("crisis_rooms.id"))
    title = Column(String)
    description = Column(Text)
    rationale = Column(Text)
    priority = Column(Integer)
    made_by = Column(String)
    made_by_name = Column(String)
    status = Column(SQLEnum(DecisionStatus), default=DecisionStatus.PENDING)
    made_at = Column(DateTime, default=datetime.utcnow)
    implemented_at = Column(DateTime, nullable=True)
    implementation_notes = Column(Text, nullable=True)
    affected_teams = Column(JSON, default=list)

    room = relationship("CrisisRoom", back_populates="decisions")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "rationale": self.rationale,
            "priority": self.priority,
            "made_by": self.made_by,
            "made_by_name": self.made_by_name,
            "status": self.status.value if self.status else "",
            "made_at": self.made_at.isoformat() if self.made_at else None,
            "implemented_at": self.implemented_at.isoformat() if self.implemented_at else None,
            "affected_teams": self.affected_teams or []
        }

class SharedDocument(Base):
    __tablename__ = "crisis_documents"
    id = Column(String, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("crisis_rooms.id"))
    name = Column(String)
    file_type = Column(String)
    url = Column(String)
    uploaded_by = Column(String)
    uploaded_by_name = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    description = Column(Text, nullable=True)

    room = relationship("CrisisRoom", back_populates="documents")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "file_type": self.file_type,
            "url": self.url,
            "uploaded_by": self.uploaded_by,
            "uploaded_by_name": self.uploaded_by_name,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "description": self.description
        }

class SituationBoard(Base):
    __tablename__ = "situation_boards"
    crisis_room_id = Column(String, ForeignKey("crisis_rooms.id"), primary_key=True)
    team_positions = Column(JSON, default=dict)
    resource_status = Column(JSON, default=dict)
    alerts_summary = Column(JSON, default=dict)
    beneficiaries_count = Column(Integer, default=0)
    missions_active = Column(Integer, default=0)
    missions_completed = Column(Integer, default=0)
    last_updated_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("CrisisRoom", back_populates="situation_board")

    def to_dict(self) -> Dict:
        return {
            "crisis_room_id": self.crisis_room_id,
            "team_positions": self.team_positions or {},
            "resource_status": self.resource_status or {},
            "alerts_summary": self.alerts_summary or {},
            "beneficiaries_count": self.beneficiaries_count,
            "missions_active": self.missions_active,
            "missions_completed": self.missions_completed,
            "last_updated_at": self.last_updated_at.isoformat() if self.last_updated_at else None
        }

class CrisisRoom(Base):
    __tablename__ = "crisis_rooms"
    
    id = Column(String, primary_key=True, index=True)
    disaster_id = Column(String, index=True)
    disaster_name = Column(String)
    status = Column(SQLEnum(CrisisRoomStatus), default=CrisisRoomStatus.INACTIVE)
    activated_at = Column(DateTime, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    max_participants = Column(Integer, default=50)
    video_call_url = Column(String, default="")
    closed_by = Column(String, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    final_report = Column(Text, nullable=True)

    participants = relationship("Participant", back_populates="room", cascade="all", lazy="joined")
    messages = relationship("CrisisMessage", back_populates="room", cascade="all", lazy="joined")
    decisions = relationship("CrisisDecision", back_populates="room", cascade="all", lazy="joined")
    documents = relationship("SharedDocument", back_populates="room", cascade="all", lazy="joined")
    situation_board = relationship("SituationBoard", uselist=False, back_populates="room", cascade="all", lazy="joined")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "disaster_id": self.disaster_id,
            "disaster_name": self.disaster_name,
            "status": self.status.value if self.status else "",
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "participants_count": len(self.participants) if self.participants else 0,
            "messages_count": len(self.messages) if self.messages else 0,
            "decisions_count": len(self.decisions) if self.decisions else 0,
            "documents_count": len(self.documents) if self.documents else 0,
            "video_call_url": self.video_call_url,
            "closed_by": self.closed_by,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "final_report": self.final_report
        }

    def activate(self) -> bool:
        if self.status == CrisisRoomStatus.ACTIVE:
            return False
        self.status = CrisisRoomStatus.ACTIVE
        self.activated_at = datetime.utcnow()
        self.deactivated_at = None
        if not self.situation_board:
            self.situation_board = SituationBoard(crisis_room_id=self.id)
        self.video_call_url = f"https://meet.nexus-aid.me/crisis/{self.id}"
        self._add_system_message(f"🚨 Salle de crise activée pour: {self.disaster_name}")
        return True

    def deactivate(self) -> bool:
        if self.status != CrisisRoomStatus.ACTIVE:
            return False
        self.status = CrisisRoomStatus.CLOSED
        self.deactivated_at = datetime.utcnow()
        self._add_system_message("✅ Salle de crise fermée. Opérations terminées.")
        return True

    def _add_system_message(self, content: str):
        msg = CrisisMessage(
            id=str(uuid.uuid4()),
            room_id=self.id,
            sender_id="SYSTEM",
            sender_name="Système",
            content=content,
            message_type=MessageType.SYSTEM
        )
        self.messages.append(msg)
        return msg

    def add_participant(self, user_id: str, name: str, role: ParticipantRole, agency: str = ""):
        for p in self.participants:
            if p.user_id == user_id:
                p.is_online = True
                p.last_activity = datetime.utcnow()
                return p
        if len(self.participants) >= self.max_participants:
            raise ValueError("Maximum participants reached")
        
        p = Participant(user_id=user_id, room_id=self.id, name=name, role=role, agency=agency, is_online=True)
        self.participants.append(p)
        self._add_system_message(f"👤 {name} a rejoint la salle de crise")
        return p

    def send_message(self, sender_id: str, sender_name: str, content: str, message_type: MessageType = MessageType.TEXT, priority: int = 0):
        msg = CrisisMessage(
            id=str(uuid.uuid4()),
            room_id=self.id,
            sender_id=sender_id,
            sender_name=sender_name,
            content=content,
            message_type=message_type,
            priority=priority,
            sent_at=datetime.utcnow()
        )
        self.messages.append(msg)
        for p in self.participants:
            if p.user_id == sender_id:
                p.last_activity = datetime.utcnow()
                break
        return msg

    def get_online_participants(self):
        return [p for p in self.participants if p.is_online]

    def get_messages(self, limit=50):
        m = sorted(self.messages, key=lambda x: x.sent_at, reverse=True) if self.messages else []
        return m[:limit]
    
    def get_decisions(self, status=None):
        if not self.decisions: return []
        if status: return [d for d in self.decisions if d.status == status]
        return self.decisions


class CrisisRoomService:
    def __init__(self):
        pass

    def _get_session(self) -> Session:
        return SessionLocal()

    def create_crisis_room(self, disaster_id: str, disaster_name: str, explicit_id: str = None) -> CrisisRoom:
        room_id = explicit_id or f"crisis_{disaster_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        with self._get_session() as db:
            room = CrisisRoom(id=room_id, disaster_id=disaster_id, disaster_name=disaster_name)
            db.add(room)
            db.commit()
            db.refresh(room)
            return room
            
    def get_crisis_room(self, room_id: str) -> Optional[CrisisRoom]:
        db = self._get_session()
        room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
        db.close()
        return room

    def activate_room(self, room_id: str) -> Dict:
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return {"success": False, "error": "Room not found"}
            res = room.activate()
            if res:
                db.commit()
                db.refresh(room)
                return {"success": True, "room": room.to_dict(), "video_call_url": room.video_call_url}
            return {"success": False, "error": "Room already active"}

    def close_room(self, room_id: str, closed_by: str = None, final_report: str = None) -> Dict:
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return {"success": False, "error": "Room not found"}
            res = room.deactivate()
            if res:
                room.closed_by = closed_by
                room.final_report = final_report
                db.commit()
                db.refresh(room)
                
                # Libérer les équipes associées à cette catastrophe
                try:
                    from src.api import team_service
                    team_service.release_teams_for_disaster(room.disaster_id)
                except Exception as e:
                    logger.error(f"Failed to release teams for disaster {room.disaster_id}: {e}")
                
                return {"success": True, "room": room.to_dict()}
            return {"success": False, "error": "Room is not active"}

    def get_room_summary(self, room_id: str) -> Dict:
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return {"error": "Room not found"}
            return {
                "room": room.to_dict(),
                "participants": [p.to_dict() for p in room.get_online_participants()],
                "recent_messages": [m.to_dict() for m in room.get_messages(limit=20)],
                "pending_decisions": [d.to_dict() for d in room.get_decisions(DecisionStatus.PENDING)],
                "situation_board": room.situation_board.to_dict() if room.situation_board else None
            }

    def get_rooms_by_participant(self, user_id: str) -> List[Dict]:
        with self._get_session() as db:
            # On cherche toutes les salles qui ont ce participant
            rooms = db.query(CrisisRoom).join(Participant, CrisisRoom.id == Participant.room_id).filter(Participant.user_id == user_id).all()
            result = []
            for room in rooms:
                result.append({
                    "room": room.to_dict(),
                    "participants_count": len(room.participants) if room.participants else 0,
                    "situation_board": room.situation_board.to_dict() if room.situation_board else None
                })
            return result

    def handle_msg_transaction(self, room_id, sender_id, sender_name, content, message_type, priority=0):
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return None
            msg = room.send_message(sender_id, sender_name, content, message_type, priority)
            db.commit()
            db.refresh(msg)
            return msg

    def handle_participant_transaction(self, room_id, user_id, name, prole, agency):
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return None
            
            # Check for duplicate
            existing = db.query(Participant).filter(
                Participant.room_id == room_id,
                Participant.user_id == user_id
            ).first()
            
            if existing:
                raise Exception("DuplicateParticipant")
                
            room.add_participant(user_id, name, prole, agency)
            db.commit()
            return room

    def remove_participant(self, room_id: str, user_id: str) -> bool:
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return False
            participant = db.query(Participant).filter(Participant.room_id == room_id, Participant.user_id == user_id).first()
            if participant:
                db.delete(participant)
                room._add_system_message(f"L'utilisateur {participant.name} a été retiré de la salle de crise.")
                db.commit()
                return True
            return False

    def update_participant_role(self, room_id: str, user_id: str, new_role: ParticipantRole) -> bool:
        with self._get_session() as db:
            room = db.query(CrisisRoom).filter(CrisisRoom.id == room_id).first()
            if not room:
                return False
            participant = db.query(Participant).filter(Participant.room_id == room_id, Participant.user_id == user_id).first()
            if participant:
                participant.role = new_role
                room._add_system_message(f"Le rôle de l'utilisateur {participant.name} a été mis à jour.")
                db.commit()
                return True
            return False
