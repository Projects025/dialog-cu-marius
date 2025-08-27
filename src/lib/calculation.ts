import { differenceInYears } from 'date-fns';
import type { UserData } from '@/components/conversation/chat-view';

// Matrice de risc (valori anuale per 1000 EUR asigurați)
const baseRiskMatrix = {
    male: [
        { maxAge: 29, rate: 3.5 },
        { maxAge: 39, rate: 5.0 },
        { maxAge: 49, rate: 9.5 },
        { maxAge: 59, rate: 20.0 },
        { maxAge: 100, rate: 40.0 },
    ],
    female: [
        { maxAge: 29, rate: 2.8 },
        { maxAge: 39, rate: 4.0 },
        { maxAge: 49, rate: 7.5 },
        { maxAge: 59, rate: 15.0 },
        { maxAge: 100, rate: 30.0 },
    ]
};

// --- Tipuri de Date ---
export type FinancialData = {
    // Comun
    monthlyExpenses?: number;
    existingInsurance?: number;
    savings?: number;
    currentSavings?: number;
    birthDate?: Date;

    // Flux Deces
    protectionPeriodYears?: number;
    specificEventCosts?: number;
    futureProjects?: number;
    
    // Flux Boală Gravă
    protectionPeriodMonths?: number;
    medicalCosts?: number;
    
    // Flux Pensionare
    desiredRetirementIncome?: number;
    retirementAge?: number;

    // Flux Studii Copii
    targetAmount?: number;
    childAge?: number;
};

// --- Funcții Helper ---
const getBaseRate = (age: number, gender: 'Masculin' | 'Feminin'): number => {
    const genderKey = gender === 'Masculin' ? 'male' : 'female';
    const rates = baseRiskMatrix[genderKey];
    const rateEntry = rates.find(r => age <= r.maxAge);
    return rateEntry ? rateEntry.rate : rates[rates.length - 1].rate;
};

// --- Funcții de Calcul Principale ---

/**
 * Calculează prima de asigurare lunară pentru un risc dat (Deces sau Boală Gravă).
 */
export const calculatePremium = (data: UserData) => {
    if (!data.birthDate || !data.gender || !data.desiredSum) {
        return { monthlyPremium: 0 };
    }
    const age = differenceInYears(new Date(), data.birthDate);
    const baseRate = getBaseRate(age, data.gender);
    const smokerMultiplier = data.isSmoker ? 2.0 : 1.0;
    const sumFactor = data.desiredSum / 1000;
    const annualPremium = baseRate * smokerMultiplier * sumFactor;
    const monthlyPremiumCalculated = annualPremium / 12;

    // Prima minimă este 100 EUR
    return { monthlyPremium: Math.max(100, monthlyPremiumCalculated) };
};

/**
 * FLUX A: Calculează deficitul financiar în caz de deces.
 */
export const calculateDeathDeficit = (data: FinancialData): number => {
    const { 
        protectionPeriodYears = 0,
        monthlyExpenses = 0,
        specificEventCosts = 0,
        futureProjects = 0,
        existingInsurance = 0,
        savings = 0
    } = data;

    const totalNeeds = (monthlyExpenses * protectionPeriodYears * 12) + specificEventCosts + futureProjects;
    const existingResources = existingInsurance + savings;
    const deficit = totalNeeds - existingResources;
    return Math.max(0, deficit);
};

/**
 * FLUX B: Calculează necesarul financiar în caz de boală gravă.
 */
export const calculateCriticalIllnessDeficit = (data: FinancialData): number => {
    const {
        protectionPeriodMonths = 0,
        monthlyExpenses = 0,
        medicalCosts = 0,
        existingInsurance = 0 // Aici poate fi asigurare de sănătate sau economii
    } = data;
    
    const totalNeeds = (monthlyExpenses * protectionPeriodMonths) + medicalCosts;
    const deficit = totalNeeds - existingInsurance;
    return Math.max(0, deficit);
};

/**
 * FLUX C: Calculează contribuția lunară necesară pentru pensie.
 */
export const calculateRetirementNeeds = (data: FinancialData): { monthlyContribution: number } => {
    const {
        desiredRetirementIncome = 0,
        retirementAge = 0,
        currentSavings = 0,
        birthDate
    } = data;

    if (!birthDate || retirementAge <= 0) return { monthlyContribution: 0 };
    
    const age = differenceInYears(new Date(), birthDate);
    const yearsToRetirement = retirementAge - age;

    if (yearsToRetirement <= 0) return { monthlyContribution: 0 };

    const requiredCapital = desiredRetirementIncome * 12 * 20; // Capital necesar pentru 20 ani de pensie
    const capitalDeficit = requiredCapital - currentSavings;
    
    if (capitalDeficit <= 0) return { monthlyContribution: 0 };

    const totalMonths = yearsToRetirement * 12;
    const monthlyContribution = capitalDeficit / totalMonths;

    return { monthlyContribution: Math.max(0, monthlyContribution) };
};

/**
 * FLUX D: Calculează contribuția lunară necesară pentru studiile copilului.
 */
export const calculateChildStudiesNeeds = (data: FinancialData): { monthlyContribution: number } => {
    const {
        targetAmount = 0,
        childAge = 0,
        currentSavings = 0
    } = data;

    const yearsToMajority = 18 - childAge;
    if (yearsToMajority <= 0) return { monthlyContribution: 0 };

    const studiesDeficit = targetAmount - currentSavings;
    if (studiesDeficit <= 0) return { monthlyContribution: 0 };

    const totalMonths = yearsToMajority * 12;
    const monthlyContribution = studiesDeficit / totalMonths;

    return { monthlyContribution: Math.max(0, monthlyContribution) };
};
