"""
Dynamic Resource Requirement Estimation System
Calculates emergency resource needs based on disaster parameters and population impact
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
    """Emergency resource requirement"""
    resource_type: str
    quantity: float
    unit: str
    priority: int  # 1-5, 5 being highest
    deployment_time: timedelta
    cost_estimate_usd: float
    source_recommendations: List[str]


class ResourceEstimationEngine:
    """
    Advanced resource estimation for disaster response
    Based on population impact, disaster type, and severity
    """
    
    def __init__(self):
        # Resource unit costs (USD)
        self.unit_costs = {
            'medical_personnel': 500,  # Per person per day
            'rescue_personnel': 400,
            'emergency_shelter': 150,  # Per person capacity
            'food_ration': 5,  # Per person per day
            'water_liter': 0.5,
            'medical_kit': 100,
            'blanket': 10,
            'tent': 200,
            'ambulance': 50000,
            'fire_truck': 400000,
            'helicopter': 10000,  # Per hour
            'generator': 5000,
            'pump': 3000
        }
        
        # Standard requirements per person
        self.per_person_daily = {
            'water_liter': 15,
            'food_ration': 3,
            'medical_supplies_per_100': 5
        }
    
    def estimate_wildfire_resources(self,
                                    affected_area_km2: float,
                                    affected_population: int,
                                    fire_severity: str,
                                    duration_hours: int = 48) -> Dict[str, ResourceRequirement]:
        """
        Estimate resources needed for wildfire response
        
        Args:
            affected_area_km2: Fire extent in km²
            affected_population: Number of people affected
            fire_severity: 'low', 'moderate', 'high', 'critical'
            duration_hours: Expected duration
            
        Returns:
            Dictionary of resource requirements
        """
        resources = {}
        days = max(1, duration_hours / 24)
        
        # Fire suppression personnel
        firefighters_per_km2 = {'low': 2, 'moderate': 5, 'high': 10, 'critical': 15}
        num_firefighters = int(affected_area_km2 * firefighters_per_km2.get(fire_severity, 5))
        
        resources['firefighters'] = ResourceRequirement(
            resource_type='firefighters',
            quantity=num_firefighters,
            unit='personnel',
            priority=5,
            deployment_time=timedelta(hours=2),
            cost_estimate_usd=num_firefighters * self.unit_costs['rescue_personnel'] * days,
            source_recommendations=['Civil Protection', 'Volunteer Brigades', 'Military']
        )
        
        # Fire trucks
        trucks_needed = max(5, int(affected_area_km2 / 10))
        resources['fire_trucks'] = ResourceRequirement(
            resource_type='fire_trucks',
            quantity=trucks_needed,
            unit='vehicles',
            priority=5,
            deployment_time=timedelta(hours=1),
            cost_estimate_usd=trucks_needed * 2000,  # Deployment cost
            source_recommendations=['Fire Department', 'Regional Stations', 'Private']
        )
        
        # Aerial support (helicopters for large fires)
        if fire_severity in ['high', 'critical'] and affected_area_km2 > 20:
            helicopters = min(5, int(affected_area_km2 / 30))
            resources['helicopters'] = ResourceRequirement(
                resource_type='helicopters',
                quantity=helicopters,
                unit='aircraft',
                priority=4,
                deployment_time=timedelta(hours=3),
                cost_estimate_usd=helicopters * self.unit_costs['helicopter'] * duration_hours,
                source_recommendations=['Air Force', 'Private Aviation', 'International Aid']
            )
        
        # Evacuation & shelter
        if affected_population > 0:
            resources.update(self._estimate_evacuation_resources(affected_population, days))
        
        # Medical support
        if affected_population > 0:
            resources.update(self._estimate_medical_resources(
                affected_population, 
                injury_rate=0.05 if fire_severity in ['high', 'critical'] else 0.02
            ))
        
        # Water for firefighting
        water_tankers = max(3, int(affected_area_km2 / 5))
        resources['water_tankers'] = ResourceRequirement(
            resource_type='water_tankers',
            quantity=water_tankers,
            unit='vehicles',
            priority=4,
            deployment_time=timedelta(hours=2),
            cost_estimate_usd=water_tankers * 1000 * days,
            source_recommendations=['Municipal Water', 'Private Contractors', 'Military']
        )
        
        return resources
    
    def estimate_flood_resources(self,
                                 inundated_area_km2: float,
                                 affected_population: int,
                                 flood_depth_m: float,
                                 duration_days: int = 7) -> Dict[str, ResourceRequirement]:
        """
        Estimate resources needed for flood response
        
        Args:
            inundated_area_km2: Flooded area
            affected_population: People affected
            flood_depth_m: Average flood depth
            duration_days: Expected flood duration
            
        Returns:
            Dictionary of resource requirements
        """
        resources = {}
        
        # Rescue boats
        boats_needed = max(5, int(inundated_area_km2 / 2))
        resources['rescue_boats'] = ResourceRequirement(
            resource_type='rescue_boats',
            quantity=boats_needed,
            unit='boats',
            priority=5,
            deployment_time=timedelta(hours=2),
            cost_estimate_usd=boats_needed * 500 * duration_days,
            source_recommendations=['Coast Guard', 'Navy', 'Civil Protection', 'Private']
        )
        
        # Rescue personnel
        rescue_teams = max(10, int(affected_population / 100))
        resources['rescue_personnel'] = ResourceRequirement(
            resource_type='rescue_personnel',
            quantity=rescue_teams,
            unit='personnel',
            priority=5,
            deployment_time=timedelta(hours=1),
            cost_estimate_usd=rescue_teams * self.unit_costs['rescue_personnel'] * duration_days,
            source_recommendations=['Civil Protection', 'Military', 'Red Crescent']
        )
        
        # Water pumps
        pumps_needed = max(10, int(inundated_area_km2 * flood_depth_m / 2))
        resources['water_pumps'] = ResourceRequirement(
            resource_type='water_pumps',
            quantity=pumps_needed,
            unit='pumps',
            priority=4,
            deployment_time=timedelta(hours=6),
            cost_estimate_usd=pumps_needed * self.unit_costs['pump'],
            source_recommendations=['Fire Department', 'Construction Companies', 'Municipal']
        )
        
        # Generators (for pumps and shelters)
        generators = max(5, int(pumps_needed / 2))
        resources['generators'] = ResourceRequirement(
            resource_type='generators',
            quantity=generators,
            unit='units',
            priority=4,
            deployment_time=timedelta(hours=4),
            cost_estimate_usd=generators * self.unit_costs['generator'],
            source_recommendations=['Equipment Rental', 'Military', 'Private Sector']
        )
        
        # Evacuation & shelter
        if affected_population > 0:
            resources.update(self._estimate_evacuation_resources(affected_population, duration_days))
        
        # Medical support
        if affected_population > 0:
            resources.update(self._estimate_medical_resources(
                affected_population,
                injury_rate=0.03  # Flood-related injuries
            ))
        
        # Sanitation (critical for flood zones)
        portable_toilets = max(10, int(affected_population / 50))
        resources['portable_toilets'] = ResourceRequirement(
            resource_type='portable_toilets',
            quantity=portable_toilets,
            unit='units',
            priority=3,
            deployment_time=timedelta(hours=12),
            cost_estimate_usd=portable_toilets * 100 * duration_days,
            source_recommendations=['Sanitation Companies', 'Municipal Services', 'NGOs']
        )
        
        return resources
    
    def estimate_earthquake_resources(self,
                                      magnitude: float,
                                      affected_population: int,
                                      building_damage_percent: float) -> Dict[str, ResourceRequirement]:
        """
        Estimate resources for earthquake response
        
        Args:
            magnitude: Earthquake magnitude
            affected_population: People in affected zone
            building_damage_percent: Percentage of damaged buildings
            
        Returns:
            Dictionary of resource requirements
        """
        resources = {}
        days = 14  # Standard 2-week initial response
        
        # Search and rescue teams (critical first 72 hours)
        injury_rate = min(0.3, magnitude / 30)  # Higher magnitude = more injuries
        injured = int(affected_population * injury_rate)
        
        sar_teams = max(10, int(injured / 20))
        resources['search_rescue_teams'] = ResourceRequirement(
            resource_type='search_rescue_teams',
            quantity=sar_teams,
            unit='teams',
            priority=5,
            deployment_time=timedelta(hours=2),
            cost_estimate_usd=sar_teams * 5000 * 3,  # 72-hour critical period
            source_recommendations=['Civil Protection', 'Military', 'International USAR Teams']
        )
        
        # Medical facilities (field hospitals)
        field_hospitals = max(2, int(injured / 200))
        resources['field_hospitals'] = ResourceRequirement(
            resource_type='field_hospitals',
            quantity=field_hospitals,
            unit='facilities',
            priority=5,
            deployment_time=timedelta(hours=12),
            cost_estimate_usd=field_hospitals * 100000,
            source_recommendations=['Red Crescent', 'WHO', 'Military Medical', 'MSF']
        )
        
        # Heavy equipment (for debris removal)
        excavators = max(5, int(affected_population * building_damage_percent / 10000))
        resources['heavy_equipment'] = ResourceRequirement(
            resource_type='excavators_bulldozers',
            quantity=excavators,
            unit='machines',
            priority=4,
            deployment_time=timedelta(hours=6),
            cost_estimate_usd=excavators * 2000 * days,
            source_recommendations=['Construction Companies', 'Military Engineering', 'Public Works']
        )
        
        # Temporary shelters
        homeless = int(affected_population * building_damage_percent / 100)
        resources.update(self._estimate_evacuation_resources(homeless, days))
        
        # Medical resources
        resources.update(self._estimate_medical_resources(
            affected_population,
            injury_rate=injury_rate
        ))
        
        return resources
    
    def _estimate_evacuation_resources(self, population: int, days: int) -> Dict[str, ResourceRequirement]:
        """Estimate evacuation and shelter resources"""
        resources = {}
        
        # Emergency shelters
        shelter_capacity = max(100, int(population * 1.1))  # 10% buffer
        resources['emergency_shelter'] = ResourceRequirement(
            resource_type='emergency_shelter',
            quantity=shelter_capacity,
            unit='people_capacity',
            priority=5,
            deployment_time=timedelta(hours=4),
            cost_estimate_usd=shelter_capacity * self.unit_costs['emergency_shelter'],
            source_recommendations=['Schools', 'Sports Centers', 'Tents', 'Hotels']
        )
        
        # Tents (if permanent shelters insufficient)
        tents = max(50, int(population / 5))  # 5 people per tent
        resources['tents'] = ResourceRequirement(
            resource_type='tents',
            quantity=tents,
            unit='tents',
            priority=4,
            deployment_time=timedelta(hours=6),
            cost_estimate_usd=tents * self.unit_costs['tent'],
            source_recommendations=['Military', 'Red Crescent', 'UNHCR', 'Private Suppliers']
        )
        
        # Food
        food_rations = int(population * self.per_person_daily['food_ration'] * days)
        resources['food_rations'] = ResourceRequirement(
            resource_type='food_rations',
            quantity=food_rations,
            unit='meals',
            priority=5,
            deployment_time=timedelta(hours=8),
            cost_estimate_usd=food_rations * self.unit_costs['food_ration'],
            source_recommendations=['WFP', 'Red Crescent', 'Military Logistics', 'Local Suppliers']
        )
        
        # Water
        water_liters = int(population * self.per_person_daily['water_liter'] * days)
        resources['potable_water'] = ResourceRequirement(
            resource_type='potable_water',
            quantity=water_liters,
            unit='liters',
            priority=5,
            deployment_time=timedelta(hours=4),
            cost_estimate_usd=water_liters * self.unit_costs['water_liter'],
            source_recommendations=['UNICEF', 'Municipal Water', 'Bottled Water Suppliers']
        )
        
        # Blankets and bedding
        blankets = population * 2  # 2 per person
        resources['blankets'] = ResourceRequirement(
            resource_type='blankets',
            quantity=blankets,
            unit='blankets',
            priority=3,
            deployment_time=timedelta(hours=12),
            cost_estimate_usd=blankets * self.unit_costs['blanket'],
            source_recommendations=['Red Crescent', 'UNHCR', 'Local Donations']
        )
        
        return resources
    
    def _estimate_medical_resources(self, population: int, injury_rate: float) -> Dict[str, ResourceRequirement]:
        """Estimate medical resources"""
        resources = {}
        
        injured = int(population * injury_rate)
        
        # Medical personnel
        doctors_nurses = max(10, int(injured / 50))
        resources['medical_personnel'] = ResourceRequirement(
            resource_type='medical_personnel',
            quantity=doctors_nurses,
            unit='personnel',
            priority=5,
            deployment_time=timedelta(hours=2),
            cost_estimate_usd=doctors_nurses * self.unit_costs['medical_personnel'] * 7,
            source_recommendations=['Health Ministry', 'Red Crescent', 'MSF', 'Hospital Staff']
        )
        
        # Ambulances
        ambulances = max(5, int(injured / 100))
        resources['ambulances'] = ResourceRequirement(
            resource_type='ambulances',
            quantity=ambulances,
            unit='vehicles',
            priority=5,
            deployment_time=timedelta(hours=1),
            cost_estimate_usd=ambulances * 1000,  # Deployment cost
            source_recommendations=['Emergency Services', 'Red Crescent', 'Private Ambulances']
        )
        
        # Medical kits
        med_kits = max(50, int(population / 20))
        resources['medical_kits'] = ResourceRequirement(
            resource_type='medical_kits',
            quantity=med_kits,
            unit='kits',
            priority=4,
            deployment_time=timedelta(hours=6),
            cost_estimate_usd=med_kits * self.unit_costs['medical_kit'],
            source_recommendations=['WHO', 'UNICEF', 'Red Crescent', 'Pharmacies']
        )
        
        return resources
    
    def generate_procurement_plan(self, resources: Dict[str, ResourceRequirement]) -> pd.DataFrame:
        """
        Generate prioritized procurement plan
        
        Args:
            resources: Dictionary of resource requirements
            
        Returns:
            DataFrame with procurement plan
        """
        data = []
        for resource in resources.values():
            data.append({
                'Resource': resource.resource_type,
                'Quantity': resource.quantity,
                'Unit': resource.unit,
                'Priority': resource.priority,
                'Deployment Time (h)': resource.deployment_time.total_seconds() / 3600,
                'Cost (USD)': resource.cost_estimate_usd,
                'Sources': ', '.join(resource.source_recommendations[:2])
            })
        
        df = pd.DataFrame(data)
        df = df.sort_values('Priority', ascending=False)
        
        return df
    
    def calculate_total_cost(self, resources: Dict[str, ResourceRequirement]) -> float:
        """Calculate total estimated cost"""
        return sum(r.cost_estimate_usd for r in resources.values())


if __name__ == "__main__":
    # Test resource estimation
    engine = ResourceEstimationEngine()
    
    print("="*80)
    print("RESOURCE ESTIMATION SYSTEM TESTING")
    print("="*80)
    
    # Test 1: Wildfire
    print("\n1. WILDFIRE RESOURCE ESTIMATION")
    print("-"*80)
    wildfire_resources = engine.estimate_wildfire_resources(
        affected_area_km2=50,
        affected_population=5000,
        fire_severity='high',
        duration_hours=72
    )
    
    plan = engine.generate_procurement_plan(wildfire_resources)
    print(plan.to_string(index=False))
    print(f"\nTotal Estimated Cost: ${engine.calculate_total_cost(wildfire_resources):,.2f}")
    
    # Test 2: Flood
    print("\n\n2. FLOOD RESOURCE ESTIMATION")
    print("-"*80)
    flood_resources = engine.estimate_flood_resources(
        inundated_area_km2=30,
        affected_population=8000,
        flood_depth_m=2.5,
        duration_days=10
    )
    
    plan = engine.generate_procurement_plan(flood_resources)
    print(plan.to_string(index=False))
    print(f"\nTotal Estimated Cost: ${engine.calculate_total_cost(flood_resources):,.2f}")
    
    # Test 3: Earthquake
    print("\n\n3. EARTHQUAKE RESOURCE ESTIMATION")
    print("-"*80)
    earthquake_resources = engine.estimate_earthquake_resources(
        magnitude=6.5,
        affected_population=50000,
        building_damage_percent=30
    )
    
    plan = engine.generate_procurement_plan(earthquake_resources)
    print(plan.to_string(index=False))
    print(f"\nTotal Estimated Cost: ${engine.calculate_total_cost(earthquake_resources):,.2f}")
    
    print("\n" + "="*80)
    print("RESOURCE ESTIMATION COMPLETE")
    print("="*80)
