import { differenceInYears } from 'date-fns';
import type { UserData, FinancialData } from '@/components/conversation/chat-view';

// Matrice de risc actualizată (valori anuale per 1000 EUR asigurați)
const baseRiskMatrix = {
    male: [
        { maxAge: 29, rate: 1.2 },
        { maxAge: 39, rate: 2.0 },
        { maxAge: 49, rate: 4.5 },
        { maxAge: 59, rate: 9.0 },
    ],
    female: [
        { maxAge: 29, rate: 0.9 },
        { maxAge: 39, rate: 1.5 },
        { maxAge: 49, rate: 3.5 },
        { maxAge: 59, rate: 7.0 },
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
    if (!data.birthDate || !data.gender) {
        return { annualPremium: 0, monthlyPremium: 0 };
    }
    const age = differenceInYears(new Date(), data.birthDate);

    // 1. Rata de Risc de Bază
    const baseRate = getBaseRate(age, data.gender);

    // 2. Multiplicator de Risc (Stil de Viață) - Actualizat
    const smokerMultiplier = data.isSmoker ? 2.0 : 1.0;

    // 3. Suma Asigurată / 1000
    const sumFactor = data.desiredSum / 1000;

    // 4. Formula Finală (fără multiplicator de durată)
    const annualPremium = baseRate * smokerMultiplier * sumFactor;
    const monthlyPremium = annualPremium / 12;

    return {
        annualPremium,
        monthlyPremium
    };
};


export const calculateDeficit = (data: FinancialData): number => {
    const { 
        protectionPeriod = 0,
        monthlyExpenses = 0,
        totalDebts = 0,
        existingInsurance = 0,
        savings = 0
    } = data;

    const totalNeeds = (monthlyExpenses * protectionPeriod * 12) + totalDebts;
    const existingResources = existingInsurance + savings;
    
    const deficit = totalNeeds - existingResources;

    // Deficitul nu poate fi negativ.
    return Math.max(0, deficit);
};
    