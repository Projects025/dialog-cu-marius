import { differenceInYears } from 'date-fns';

// --- Tipuri de Date ---
export type FinancialData = {
    // Comun
    birthDate?: Date;
    contact?: { name: string, email: string, phone: string };

    // Flux Deces
    period?: number;
    monthlySum?: number;
    eventCosts?: number;
    projects?: number;
    debts?: number;
    existingInsurance?: number;
    savings?: number;
    premium?: number;
    
    // Flux Boala Grava
    monthlyNeed?: number;
    recoveryPeriod?: number;
    medicalCosts?: number;
    existingSavings?: number;

    // Flux Pensionare
    desiredPension?: number;
    retirementAge?: number;
    currentSavings?: number;
    
    // Flux Studii
    studiesGoal?: number;
    childAge?: number;
    // `currentSavings` is reused here

    // Sume calculate
    bruteDeficit?: number;
    finalDeficit?: number;
    healthDeficit?: number;
    monthlyContribution?: number;

    // Date calitative
    feeling?: string;
    dramaticOptions?: string[];
};

/**
 * Calculează deficitul brut pentru scenariul de deces.
 */
export const calculateBruteDeficit = (data: FinancialData): number => {
    const { 
        monthlySum = 0,
        period = 0,
        eventCosts = 0,
        projects = 0,
        debts = 0,
    } = data;

    const standardOfLivingDeficit = monthlySum * period * 12;
    const totalBruteDeficit = standardOfLivingDeficit + eventCosts + projects + debts;
    
    return Math.max(0, totalBruteDeficit);
};

/**
 * Calculează deficitul final pentru scenariul de deces.
 */
export const calculateFinalDeficit = (data: FinancialData): number => {
    // First calculate brute deficit
    const bruteDeficit = calculateBruteDeficit(data);
    data.bruteDeficit = bruteDeficit;
    
    const {
        existingInsurance = 0,
        savings = 0
    } = data;

    const finalDeficit = bruteDeficit - existingInsurance - savings;
    return Math.max(0, finalDeficit);
};

/**
 * Calculează deficitul pentru scenariul de boală gravă.
 */
export const calculateHealthDeficit = (data: FinancialData): number => {
    const {
        monthlyNeed = 0,
        recoveryPeriod = 0, // in months
        medicalCosts = 0,
        existingSavings = 0
    } = data;
    const totalNeed = (monthlyNeed * recoveryPeriod) + medicalCosts;
    const deficit = totalNeed - existingSavings;
    return Math.max(0, deficit);
};

/**
 * Calculează contribuția lunară necesară pentru pensionare.
 */
export const calculateRetirementContribution = (data: FinancialData): number => {
    const {
        desiredPension = 0,
        retirementAge = 0,
        currentSavings = 0,
        birthDate
    } = data;
    if (!birthDate || !retirementAge) return 0;

    const yearsToRetirement = retirementAge - differenceInYears(new Date(), birthDate);
    if (yearsToRetirement <= 0) return 0;

    // Assuming a 20-year retirement period
    const requiredCapital = desiredPension * 12 * 20;
    const capitalDeficit = requiredCapital - currentSavings;
    if (capitalDeficit <= 0) return 0;

    const monthlyContribution = capitalDeficit / (yearsToRetirement * 12);
    return Math.round(monthlyContribution);
};


/**
 * Calculează contribuția lunară necesară pentru studiile copilului.
 */
export const calculateStudiesContribution = (data: FinancialData): number => {
    const {
        studiesGoal = 0,
        childAge = 0,
        currentSavings = 0,
    } = data;

    const yearsToMajority = 18 - childAge;
    if (yearsToMajority <= 0) return 0;
    
    const studiesDeficit = studiesGoal - currentSavings;
    if (studiesDeficit <= 0) return 0;

    const monthlyContribution = studiesDeficit / (yearsToMajority * 12);
    return Math.round(monthlyContribution);
};
