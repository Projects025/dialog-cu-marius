import { differenceInYears } from 'date-fns';
import type { UserData } from '@/components/conversation/chat-view';

// Exemplu de matrice de risc (valori ilustrative per 1000 EUR asigurați)
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

    // Găsește cea mai apropiată rată pentru vârsta dată
    let closestRate = rates[rates.length - 1].rate;
    for (let i = rates.length - 2; i >= 0; i--) {
        if (age <= rates[i].age) {
            closestRate = rates[i].rate;
        } else {
            // Interpolare liniară simplă pentru vârste intermediare
            const lower = rates[i];
            const upper = rates[i+1];
            const ratio = (age - lower.age) / (upper.age - lower.age);
            closestRate = lower.rate + ratio * (upper.rate - lower.rate);
            break;
        }
    }
    return closestRate;
};


export const calculatePremium = (data: UserData) => {
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
