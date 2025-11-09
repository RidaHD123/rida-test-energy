import { UserAnswers, EligibilityResult, IncomeProfile, ClimateZone, HeatingType, AidSchemeResult } from '../types';
import { ZONE_H1_DEPTS, ZONE_H2_DEPTS, INCOME_CEILINGS_2025, INCOME_INCREMENTS, DEPARTMENT_DB } from '../constants';

// Helper: Determine Climate Zone from Department
const getClimateZone = (deptStr: string | undefined): ClimateZone => {
  if (!deptStr) return ClimateZone.H3; // Default fallback
  // Ensure we handle 2-digit department codes correctly even if user typed more
  const dept = deptStr.padStart(2, '0').substring(0, 2).toUpperCase();
  if (DEPARTMENT_DB[dept]) {
      return DEPARTMENT_DB[dept].zone;
  }
  // Fallback to old lists if DB lookup fails for some reason
  if (ZONE_H1_DEPTS.includes(dept)) return ClimateZone.H1;
  if (ZONE_H2_DEPTS.includes(dept)) return ClimateZone.H2;
  return ClimateZone.H3;
};

// Helper: Determine Income Profile (ANAH 2025)
const getIncomeProfile = (region: 'IDF' | 'OTHER' | undefined, people: number | undefined, income: number | undefined): IncomeProfile => {
  if (!region || !people || income === undefined) return IncomeProfile.PINK; // Fail safe

  const safeRegion = region === 'IDF' ? 'IDF' : 'OTHER';
  const nb = Math.min(Math.max(1, people), 5); // Table goes up to 5 explicitly in our constant, then increments
  const extraPeople = Math.max(0, people - 5);

  const ceilings = INCOME_CEILINGS_2025[safeRegion];
  const increments = INCOME_INCREMENTS[safeRegion];

  // Calculate exact ceilings for this household size
  const blueLimit = ceilings[IncomeProfile.BLUE][nb - 1] + (extraPeople * increments[IncomeProfile.BLUE]);
  const yellowLimit = ceilings[IncomeProfile.YELLOW][nb - 1] + (extraPeople * increments[IncomeProfile.YELLOW]);
  const violetLimit = ceilings[IncomeProfile.VIOLET][nb - 1] + (extraPeople * increments[IncomeProfile.VIOLET]);

  if (income <= blueLimit) return IncomeProfile.BLUE;
  if (income <= yellowLimit) return IncomeProfile.YELLOW;
  if (income <= violetLimit) return IncomeProfile.VIOLET;
  return IncomeProfile.PINK;
};

export const calculateEligibility = async (answers: UserAnswers): Promise<EligibilityResult> => {
  // Simulate official API latency
  await new Promise(resolve => setTimeout(resolve, 800));

  // Use the department from the personal info sidebar first, fallback to wizard answer if any
  const deptInput = answers.department || answers.postalCode?.substring(0, 2);
  const zone = getClimateZone(deptInput);

  // Auto-determine region based on dept for IDF (75, 77, 78, 91, 92, 93, 94, 95)
  const idfDepts = ['75', '77', '78', '91', '92', '93', '94', '95'];
  const deptPrefix = (deptInput || '').substring(0, 2);
  const region = idfDepts.includes(deptPrefix) ? 'IDF' : 'OTHER';
  const profile = getIncomeProfile(region, answers.householdSize, answers.income);

  // --- SCHEME 1: PAC à 1€ (Marketing offer based on high MPR+CEE) ---
  // Strict Criteria: Blue Profile + H1/H2 + >130m² + Replace fossil fuel + Owner + House > 2y
  const pac101: AidSchemeResult = { eligible: false, schemeNameKey: 'scheme.pac101', reasons: [] };
  if (answers.heatingType === HeatingType.HEAT_PUMP) {
      pac101.reasons.push('reason.fail_already_pac');
  } else if (answers.heatingType === HeatingType.ELECTRICITY) {
      pac101.reasons.push('reason.fail_elec_heating');
  } else {
       pac101.reasons.push('reason.ok_heating_replace');
       if (answers.ownerStatus !== 'owner') pac101.reasons.push('reason.fail_tenant_social'); // Simplification for 1€ offer usually owners
       else pac101.reasons.push('reason.ok_owner');

       if (answers.houseType !== 'house') pac101.reasons.push('reason.fail_apartment');
       else if (answers.propertyAge === 'less_2y') pac101.reasons.push('reason.fail_new_build');
       else pac101.reasons.push('reason.ok_house_age');

       if ((answers.livingArea || 0) < 131) pac101.reasons.push('reason.fail_surface_low');
       else pac101.reasons.push('reason.ok_surface');

       if (profile !== IncomeProfile.BLUE) pac101.reasons.push('reason.fail_income_too_high');
       else pac101.reasons.push('reason.ok_income_blue');
  }
  pac101.eligible = pac101.reasons.every(r => r.startsWith('reason.ok'));


  // --- SCHEME 2: ISO 101 (Combles à 1€ - Strict) ---
  // Strict: H1 OR H2 (Updated per user req), Blue only, Owner/PrivateTenant, >80m² attic, access OK.
  const iso101: AidSchemeResult = { eligible: false, schemeNameKey: 'scheme.iso101', reasons: [] };
  if (answers.ownerStatus === 'tenant_social') iso101.reasons.push('reason.fail_tenant_social');
  else iso101.reasons.push('reason.ok_owner'); // owner or private tenant OK for CEE sometimes, let's assume strictly owner for 1€ to be safe, or allow private tenant.

  // EXTENDED VALIDITY TO H2
  if (zone !== ClimateZone.H1 && zone !== ClimateZone.H2) iso101.reasons.push('reason.fail_zone');
  else iso101.reasons.push('reason.ok_zone_eligible');

  if (profile !== IncomeProfile.BLUE) iso101.reasons.push('reason.fail_income_too_high');
  else iso101.reasons.push('reason.ok_income_blue');

  if ((answers.atticArea || 0) < 80 || answers.atticAccess === 'none') iso101.reasons.push('reason.fail_tech_iso');
  else iso101.reasons.push('reason.ok_tech_iso');
  iso101.eligible = iso101.reasons.every(r => r.startsWith('reason.ok'));


  // --- SCHEME 3: SSC (Solar) ---
  // Proposed if already has PAC. Needs roof.
  const ssc: AidSchemeResult = { eligible: false, schemeNameKey: 'scheme.ssc', reasons: [] };
  if (answers.heatingType !== HeatingType.HEAT_PUMP) {
       // Not the primary target for SSC substitute if they don't have PAC yet (usually we do PAC first)
       ssc.reasons.push('reason.fail_already_pac'); // Reusing this key to mean "PAC preferred first" in a way, or just hide it.
       // Actually, if they DON'T have PAC, we prefer PAC. If they DO have PAC, we propose SSC.
       // Let's just say ineligible if no PAC for this specific funnel.
  } else {
      // Has PAC, check roof
      if (!answers.roofSpaceAvailable || answers.roofOrientation === 'NORTH') ssc.reasons.push('reason.fail_tech_ssc');
      else ssc.reasons.push('reason.ok_tech_ssc');

      if (answers.ownerStatus !== 'owner') ssc.reasons.push('reason.fail_tenant_social');
      else ssc.reasons.push('reason.ok_owner');
  }
  // SSC is eligible if has PAC AND roof OK AND owner
  ssc.eligible = answers.heatingType === HeatingType.HEAT_PUMP && ssc.reasons.every(r => r.startsWith('reason.ok'));


  // --- STANDARD SCHEMES (Broader eligibility) ---
  const mpr: AidSchemeResult = { eligible: false, schemeNameKey: 'scheme.mpr', reasons: [] };
  // MPR is for owners, >2y (sometimes >15y for specific gestures, assume 2y for general).
  if (answers.ownerStatus === 'owner' && answers.propertyAge === 'more_2y') {
       mpr.eligible = true;
       mpr.reasons.push('reason.ok_owner', 'reason.ok_house_age');
  } else {
       mpr.eligible = false;
       if (answers.ownerStatus !== 'owner') mpr.reasons.push('reason.fail_tenant_social'); // broadly speaking
       if (answers.propertyAge !== 'more_2y') mpr.reasons.push('reason.fail_new_build');
  }

  const cee: AidSchemeResult = { eligible: false, schemeNameKey: 'scheme.cee', reasons: [] };
  // CEE is very broad, includes landlords, sometimes secondary (depending on obligated party).
  if (answers.propertyAge === 'more_2y') {
      cee.eligible = true;
      cee.reasons.push('reason.ok_house_age');
  } else {
      cee.reasons.push('reason.fail_new_build');
  }


  return {
    isGlobalEligible: pac101.eligible || iso101.eligible || ssc.eligible || mpr.eligible || cee.eligible,
    incomeProfile: profile,
    climateZone: zone,
    schemes: { pac101, iso101, ssc, mpr, cee }
  };
};