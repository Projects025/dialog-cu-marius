import { differenceInYears } from 'date-fns';
import type { UserData, FinancialData } from '@/components/conversation/chat-view';

// Matrice de risc (valori ilustrative per 1000 EUR asigurați)
const baseRiskRate = {
    male: [
        { age: 25, rate: 0.7 },
        { age: 30, rate: 0.8 },
        { age: 35, rate: 1.1 },
        { age: 40, rate: 1.5 },
        { age: 45, rate: 2.5 },
        { age: 50, rate: 4.0 },
        { age: 55, rate: 6.5 },
        { age: 60, rate: 9.0 },
        { age: 65, rate: 12.0 },
    ],
    female: [
        { age: 25, rate: 0.5 },
        { age: 30, rate: 0.6 },
        { age: 35, rate: 0.9 },
        { age: 40, rate: 1.2 },
        { age: 45, rate: 1.8 },
        { age: 50, rate: 3.0 },
        { age: 55, rate: 5.0 },
        { age: 60, rate: 7.0 },
        { age: 65, rate: 10.0 },
    ]
};

const getBaseRate = (age: number, gender: 'Masculin' | 'Feminin'): number => {
    const genderKey = gender === 'Masculin' ? 'male' : 'female';
    const rates = baseRiskRate[genderKey];
    
    // Găsește prima rată unde vârsta este mai mare sau egală
    const rateEntry = rates.find(r => age <= r.age);
    
    if (rateEntry) {
        return rateEntry.rate;
    }
    
    // Dacă vârsta e mai mare decât maximul din tabel, folosim ultima valoare
    // sau extrapolăm, dar pentru simplitate folosim ultima.
    return rates[rates.length - 1].rate;
};

export const calculatePremium = (data: UserData) => {
    // Asigură-te că există o dată de naștere validă
    if (!data.birthDate) {
        return { annualPremium: 0, monthlyPremium: 0 };
    }
    const age = differenceInYears(new Date(), data.birthDate);

    // 1. Rata de Risc de Bază
    const baseRate = getBaseRate(age, data.gender);

    // 2. Multiplicator de Risc (Stil de Viață)
    const smokerMultiplier = data.isSmoker ? 1.8 : 1.0;

    // 3. Multiplicator de Durată
    let durationMultiplier = 1.0;
    if (data.insuranceDuration >= 30) {
        durationMultiplier = 1.2;
    } else if (data.insuranceDuration >= 20) {
        durationMultiplier = 1.1;
    }

    // 4. Suma Asigurată / 1000
    const sumFactor = data.desiredSum / 1000;

    // Formula Finală
    const annualPremium = baseRate * smokerMultiplier * durationMultiplier * sumFactor;
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

    // Deficitul nu poate fi negativ. Dacă resursele depășesc nevoile, plasa de siguranță este completă.
    return Math.max(0, deficit);
};
    