import { differenceInYears } from 'date-fns';
import type { UserData, FinancialData } from '@/components/conversation/chat-view';

// Matrice de risc actualizată (valori anuale per 1000 EUR asigurați)
const baseRiskMatrix = {
    male: [
        { maxAge: 29, rate: 3.5 },
        { maxAge: 39, rate: 5.0 },
        { maxAge: 49, rate: 9.5 },
        { maxAge: 59, rate: 20.0 },
    ],
    female: [
        { maxAge: 29, rate: 2.8 },
        { maxAge: 39, rate: 4.0 },
        { maxAge: 49, rate: 7.5 },
        { maxAge: 59, rate: 15.0 },
    ]
};

const getBaseRate = (age: number, gender: 'Masculin' | 'Feminin'): number => {
    const genderKey = gender === 'Masculin' ? 'male' : 'female';
    const rates = baseRiskMatrix[genderKey];
    
    const rateEntry = rates.find(r => age <= r.maxAge);
    
    // Dacă vârsta depășește maximul, folosim ultima rată (cea mai mare)
    return rateEntry ? rateEntry.rate : rates[rates.length - 1].rate;
};

export const calculatePremium = (data: UserData) => {
    if (!data.birthDate || !data.gender || !data.desiredSum) {
        return { annualPremium: 0, monthlyPremium: 0 };
    }
    const age = differenceInYears(new Date(), data.birthDate);

    // 1. Rata de Risc de Bază
    const baseRate = getBaseRate(age, data.gender);

    // 2. Multiplicator de Risc (Stil de Viață) - Actualizat
    const smokerMultiplier = data.isSmoker ? 2.0 : 1.0;

    // 3. Suma Asigurată / 1000
    const sumFactor = data.desiredSum / 1000;

    // 4. Formula Finală
    const annualPremium = baseRate * smokerMultiplier * sumFactor;
    const monthlyPremiumCalculated = annualPremium / 12;

    // Regulă de Business: Prima minimă este 100 EUR
    const finalMonthlyPremium = Math.max(100, monthlyPremiumCalculated);

    return {
        annualPremium,
        monthlyPremium: finalMonthlyPremium
    };
};

export const calculateDeficit = (data: FinancialData): number => {
    const { 
        protectionPeriod = 0,
        monthlyExpenses = 0,
        specificEventCosts = 0,
        futureProjects = 0,
        existingInsurance = 0,
        savings = 0
    } = data;

    const totalNeeds = (monthlyExpenses * protectionPeriod * 12) + specificEventCosts + futureProjects;
    const existingResources = existingInsurance + savings;
    
    const deficit = totalNeeds - existingResources;

    // Deficitul nu poate fi negativ.
    return Math.max(0, deficit);
};

export const calculateSavings = (data: Partial<FinancialData>): { monthlyContribution: number, targetAmount: number, years: number } => {
    const {
        targetAmount = 0,
        protectionPeriod = 0, // Reusing this field for years
        savings = 0
    } = data;

    const remainingAmount = targetAmount - savings;
    const totalMonths = protectionPeriod * 12;

    if (totalMonths <= 0) {
        return { monthlyContribution: 0, targetAmount, years: protectionPeriod };
    }

    const monthlyContribution = remainingAmount / totalMonths;

    return {
        monthlyContribution: Math.max(0, monthlyContribution),
        targetAmount,
        years: protectionPeriod,
    };
};
