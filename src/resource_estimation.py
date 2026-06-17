"""
Dynamic Resource Requirement Estimation System
Calculates emergency resource needs based on disaster parameters and population impact.
Strictly compliant with the IFRC Items Catalogue (https://itemscatalogue.redcross.int)
and SPHERE standards for humanitarian response.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ResourceRequirement:
    """Emergency resource requirement (IFRC standard)"""
    resource_code: str
    resource_name: str
    quantity: float
    unit: str
    priority: int  # 1-5, 5 being highest
    deployment_time: timedelta
    cost_estimate_usd: float
    source_recommendations: List[str]

class ResourceEstimationEngine:
    """
    Advanced resource estimation for disaster response.
    Fully compliant with the Croissant-Rouge Tunisien (CRT) & IFRC catalogue.
    """
    
    def __init__(self):
        # IFRC Standard Items Catalogue (https://itemscatalogue.redcross.int)
        # Unit costs (USD approximate equivalent for logistics projection)
        self.ifrc_catalogue = {
            # Relief Items (Shelter, NFI)
            'HSHETENTWPF': {'name': 'Tent, family, canvas, 16sqm', 'cost': 180.0, 'unit': 'tents'},
            'HSHEPLASWAO': {'name': 'Tarpaulin, woven plastic, 4x5m', 'cost': 12.0, 'unit': 'pieces'},
            'HBLKWOOLMD': {'name': 'Blanket, synthetic, medium thermal', 'cost': 6.0, 'unit': 'pieces'},
            'HKITKITCH1A': {'name': 'Kitchen set, type A, family of 5', 'cost': 30.0, 'unit': 'kits'},
            
            # WASH (Water, Sanitation, Hygiene)
            'HWATJERCFC10': {'name': 'Jerrycan, foldable, 10L', 'cost': 1.5, 'unit': 'pieces'},
            'HHYGKITFI': {'name': 'Hygiene parcel, 1 family, 1 month', 'cost': 25.0, 'unit': 'parcels'},
            'WWATKITTF2G': {'name': 'Water purification unit, 2m3/h', 'cost': 8500.0, 'unit': 'units'},
            
            # Health & Medical
            'MEDIKITEHK': {'name': 'IEHK2017 - Basic module (1000 people)', 'cost': 1200.0, 'unit': 'kits'},
            'MEDIKITCHO': {'name': 'Cholera kit, 100 cases', 'cost': 1500.0, 'unit': 'kits'},
            'HMEDNETSI145': {'name': 'Mosquito net, LLIN', 'cost': 3.0, 'unit': 'pieces'},
            
            # Food
            'FSTABSCUFBI': {'name': 'High Energy Biscuits (BP-5)', 'cost': 50.0, 'unit': 'cartons'}, # 50/carton
            
            # Deployment & Heavy duty (Custom CRT codes for local operation)
            'CRT_NDRT_TEAM': {'name': 'NDRT/RDRT Search & Rescue Team', 'cost': 500.0, 'unit': 'teams/day'},
            'CRT_MED_TEAM': {'name': 'Field Medical Team (Mobile Clinic)', 'cost': 800.0, 'unit': 'teams/day'},
            'CRT_AMB': {'name': 'Ambulance Deployment', 'cost': 1000.0, 'unit': 'vehicles/day'},
            'CRT_FIRE': {'name': 'Civil Protection Fire Truck', 'cost': 2500.0, 'unit': 'vehicles/day'},
            'CRT_HELI': {'name': 'Water Bomber Helicopter', 'cost': 10000.0, 'unit': 'hours'}
        }
        
        # SPHERE Standards for Red Cross (Humanitarian minimums)
        self.sphere = {
            'water_liters_per_person_day': 15,
            'food_kcal_per_person_day': 2100,
            'family_size': 5
        }
    
    def _create_req(self, code: str, qty: float, priority: int, hours_to_deploy: int, sources: List[str]) -> ResourceRequirement:
        item = self.ifrc_catalogue[code]
        # Quantities are ceiled to integers for logistical units
        qty = int(np.ceil(qty))
        return ResourceRequirement(
            resource_code=code,
            resource_name=item['name'],
            quantity=qty,
            unit=item['unit'],
            priority=priority,
            deployment_time=timedelta(hours=hours_to_deploy),
            cost_estimate_usd=qty * item['cost'],
            source_recommendations=sources
        )

    def estimate_wildfire_resources(self, affected_area_km2: float, affected_population: int, fire_severity: str, duration_hours: int = 48) -> Dict[str, ResourceRequirement]:
        resources = {}
        days = max(1, duration_hours / 24)
        
        # CRT NDRT Teams & Civil protection 
        team_density = {'low': 1, 'moderate': 2, 'high': 4, 'critical': 6}
        num_teams = max(1, int(affected_area_km2 * team_density.get(fire_severity, 2)))
        resources['fire_teams'] = self._create_req('CRT_NDRT_TEAM', num_teams * days, 5, 2, ['Croissant-Rouge Tunisien NDRT', 'Civil Protection'])
        
        trucks = max(2, int(affected_area_km2 / 5))
        resources['fire_trucks'] = self._create_req('CRT_FIRE', trucks * days, 5, 2, ['Civil Protection'])
        
        # Aerial support
        if fire_severity in ['high', 'critical'] and affected_area_km2 > 10:
            heli_hours = 8 * days  # 8 hours of flight per day
            resources['helicopters'] = self._create_req('CRT_HELI', heli_hours, 4, 4, ['Armée Nationale', 'Ministry of Interior'])
            
        if affected_population > 0:
            resources.update(self._estimate_ifrc_shelter_wash(affected_population, days))
            resources.update(self._estimate_medical_resources(affected_population, injury_rate=0.05 if fire_severity in ['high', 'critical'] else 0.02))
            
        return resources
    
    def estimate_flood_resources(self, inundated_area_km2: float, affected_population: int, flood_depth_m: float, duration_days: int = 7) -> Dict[str, ResourceRequirement]:
        resources = {}
        
        rescue_teams = max(2, int(affected_population / 500))
        resources['rescue_teams'] = self._create_req('CRT_NDRT_TEAM', rescue_teams * duration_days, 5, 2, ['Croissant-Rouge Tunisien RDRT', 'Navy', 'Civil Protection'])
        
        # Floods massively compromise WASH
        resources['purification'] = self._create_req('WWATKITTF2G', max(1, affected_population / 5000), 5, 12, ['IFRC ERU WASH', 'Croissant-Rouge Tunisien'])
        
        # Cholera prevention for stagnant water
        if duration_days > 3 and affected_population > 1000:
            resources['cholera_kit'] = self._create_req('MEDIKITCHO', max(1, affected_population / 5000), 4, 24, ['Croissant-Rouge Tunisien', 'WHO', 'Ministry of Health'])
        
        # Malaria/Dengue prevention
        resources['mosquito_nets'] = self._create_req('HMEDNETSI145', affected_population / 2, 3, 48, ['UNICEF', 'CRT Global Fund'])
        
        if affected_population > 0:
            resources.update(self._estimate_ifrc_shelter_wash(affected_population, duration_days))
            resources.update(self._estimate_medical_resources(affected_population, injury_rate=0.03))
            
        return resources
    
    def estimate_earthquake_resources(self, magnitude: float, affected_population: int, building_damage_percent: float) -> Dict[str, ResourceRequirement]:
        resources = {}
        days = 14
        
        injury_rate = min(0.3, (magnitude - 4.0) / 10) if magnitude > 4.0 else 0.01
        
        sar_teams = max(2, int(affected_population * building_damage_percent / 10000))
        resources['usar_teams'] = self._create_req('CRT_NDRT_TEAM', sar_teams * 7, 5, 2, ['International USAR', 'Civil Protection', 'CRT'])
        
        homeless = int(affected_population * (building_damage_percent / 100))
        if homeless > 0:
            resources.update(self._estimate_ifrc_shelter_wash(homeless, days, heavy_shelter=True))
            
        resources.update(self._estimate_medical_resources(affected_population, injury_rate=injury_rate))
        
        return resources
    
    def _estimate_ifrc_shelter_wash(self, population: int, days: int, heavy_shelter: bool = False) -> Dict[str, ResourceRequirement]:
        """Calculates Non-Food Items (NFI) and WASH based strictly on IFRC family scale"""
        resources = {}
        families = population / self.sphere['family_size']
        
        if heavy_shelter:
            resources['tents'] = self._create_req('HSHETENTWPF', families * 1.1, 5, 12, ['IFRC Logistics Hub', 'CRT Warehouses'])
        else:
            resources['tarpaulins'] = self._create_req('HSHEPLASWAO', families * 2, 4, 12, ['CRT Local Branches'])
            
        resources['blankets'] = self._create_req('HBLKWOOLMD', population * 2, 4, 12, ['CRT Regional Warehouses', 'UNHCR'])
        resources['jerrycans'] = self._create_req('HWATJERCFC10', families * 2, 4, 24, ['CRT WASH Division', 'UNICEF'])
        resources['hygiene_kits'] = self._create_req('HHYGKITFI', families, 4, 24, ['CRT WASH Division'])
        resources['kitchen_sets'] = self._create_req('HKITKITCH1A', families, 3, 48, ['CRT Warehouses'])
        resources['food_biscuits'] = self._create_req('FSTABSCUFBI', (population * days) / 50, 5, 12, ['WFP', 'Local Suppliers'])
        
        return resources
    
    def _estimate_medical_resources(self, population: int, injury_rate: float) -> Dict[str, ResourceRequirement]:
        """Calculates IEHK basic units and medical teams based on injuries"""
        resources = {}
        injured = population * injury_rate
        
        med_teams = max(1, int(injured / 100))
        resources['mobile_clinics'] = self._create_req('CRT_MED_TEAM', med_teams * 7, 5, 4, ['CRT Mobile Health', 'Ministry of Health'])
        
        ambulances = max(1, int(injured / 50))
        resources['ambulances'] = self._create_req('CRT_AMB', ambulances * 3, 5, 1, ['CRT SAMU', 'Ministry of Health'])
        
        # 1 Basic IEHK covers 1000 people
        iehk_units = max(1, population / 1000)
        resources['iehk_kits'] = self._create_req('MEDIKITEHK', iehk_units, 4, 12, ['CRT Central Pharmacy', 'WHO'])
        
        return resources
    
    def generate_procurement_plan(self, resources: Dict[str, ResourceRequirement]) -> pd.DataFrame:
        data = []
        for code, req in resources.items():
            data.append({
                'IFRC_Code': req.resource_code,
                'Item_Description': req.resource_name,
                'Quantity': req.quantity,
                'Unit': req.unit,
                'Priority': req.priority,
                'Deployment_H': req.deployment_time.total_seconds() / 3600,
                'Est_Cost_USD': req.cost_estimate_usd,
                'Sources': ', '.join(req.source_recommendations[:2])
            })
        
        df = pd.DataFrame(data)
        if not df.empty:
            df = df.sort_values(by=['Priority', 'Deployment_H'], ascending=[False, True])
        return df
    
    def calculate_total_cost(self, resources: Dict[str, ResourceRequirement]) -> float:
        return sum(r.cost_estimate_usd for r in resources.values())


if __name__ == "__main__":
    engine = ResourceEstimationEngine()
    print("="*80)
    print("IFRC COMPLIANT RESOURCE ESTIMATION (Croissant-Rouge Tunisien)")
    print("="*80)
    
    print("\n1. EARTHQUAKE (Mag 6.0, 10,000 people)")
    res = engine.estimate_earthquake_resources(6.0, 10000, 40)
    print(engine.generate_procurement_plan(res).to_string(index=False))
    print(f"Total IFRC Budget: ${engine.calculate_total_cost(res):,.2f}")
