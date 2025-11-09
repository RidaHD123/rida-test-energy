import { LucideIcon } from 'lucide-react';

export type Language = 'FR' | 'EN' | 'ES' | 'DE' | 'NL' | 'NO';

export enum HeatingType {
  ELECTRICITY = 'HEATING_ELECTRICITY',
  GAS = 'HEATING_GAS',
  FUEL = 'HEATING_FUEL',
  WOOD = 'HEATING_WOOD',
  HEAT_PUMP = 'HEATING_HEATPUMP',
  OTHER = 'HEATING_OTHER',
}

export enum IncomeProfile {
  BLUE = 'BLUE',     // Très modestes
  YELLOW = 'YELLOW', // Modestes
  VIOLET = 'VIOLET', // Intermédiaires
  PINK = 'PINK',     // Supérieurs
}

export enum ClimateZone {
  H1 = 'H1',
  H2 = 'H2',
  H3 = 'H3',
}

export interface UserAnswers {
  // 0. Personal Information (Persistent Sidebar)
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;

  // 1. Status & Housing
  ownerStatus?: 'owner' | 'tenant_private' | 'tenant_social';
  houseType?: 'house' | 'apartment';
  propertyAge?: 'more_2y' | 'less_2y';
  residenceType?: 'primary' | 'secondary';

  // 2. Location & Household
  department?: string; // Derived from postalCode usually, kept for compatibility
  householdSize?: number;
  income?: number;
  region?: 'IDF' | 'OTHER'; // Île-de-France or Other

  // 3. Heating & Technical
  heatingType?: HeatingType;
  livingArea?: number; // Surface habitable
  hasExistingHeatPump?: boolean;

  // 4. Specific Technical (for ISO/CEE/SSC)
  atticArea?: number; // For ISO (>80m²)
  atticAccess?: 'trapdoor' | 'plain_foot' | 'none';
  roofOrientation?: 'SOUTH' | 'EAST' | 'WEST' | 'NORTH'; // For SSC
  roofSpaceAvailable?: boolean; // >8m² for SSC
}

export interface QuestionOption {
  value: string | boolean | number;
  labelKey: string;
  icon?: LucideIcon;
}

export interface QuestionConfig {
  id: keyof UserAnswers;
  type: 'radio' | 'select' | 'number' | 'department';
  questionKey: string;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  condition?: (answers: UserAnswers) => boolean;
  infoKey?: string;
  placeholderKey?: string;
  suffixKey?: string;
}

export interface AidSchemeResult {
  eligible: boolean;
  schemeNameKey: string;
  estimatedAid?: number;
  reasons: string[]; // List of translation keys for detailed justifications
}

export interface EligibilityResult {
  isGlobalEligible: boolean;
  incomeProfile: IncomeProfile;
  climateZone: ClimateZone;
  schemes: {
    mpr: AidSchemeResult; // MaPrimeRénov' (PAC/SSC)
    cee: AidSchemeResult; // CEE standard
    iso101: AidSchemeResult; // Isolation 1€ strict
    pac101: AidSchemeResult; // "PAC à 1€" marketing offer
    ssc: AidSchemeResult;    // Système Solaire Combiné
  };
}