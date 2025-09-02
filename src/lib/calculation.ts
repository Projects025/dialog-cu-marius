import { differenceInYears } from 'date-fns';
import type { UserData } from '@/components/conversation/chat-view';

// --- Tipuri de Date ---
export type FinancialData = {
    // Comun
    birthDate?: Date;
    isSmoker?: boolean;
    contact?: { name: string, email: string, phone: string };

    // Flux Deces
    period?: number;
    monthlySum?: number;
    eventCosts?: number;
    projects?: number;
    debts?: number;
    existingInsurance?: number;
    savings?: number;

    // Sume calculate
    deficit1?: number;
    bruteDeficit?: number;
    finalDeficit?: number;

    // Date calitative
    feeling?: string;
    dramaticOptions?: string[];
};

/**
 * Calculează deficitul brut pe baza datelor colectate.
 */
export const calculateBruteDeficit = (data: FinancialData): number => {
    const { 
        monthlySum = 0,
        period = 0,
        eventCosts = 0,
        projects = 0,
        debts = 0
    } = data;

    const standardOfLivingDeficit = monthlySum * period * 12;
    const totalBruteDeficit = standardOfLivingDeficit + eventCosts + projects + debts;
    
    return Math.max(0, totalBruteDeficit);
};

/**
 * Calculează deficitul final scăzând resursele existente.
 */
export const calculateFinalDeficit = (data: FinancialData): number => {
    const {
        bruteDeficit = 0,
        existingInsurance = 0,
        savings = 0
    } = data;

    const finalDeficit = bruteDeficit - existingInsurance - savings;
    return Math.max(0, finalDeficit);
};

// Matrice de risc (valori anuale per 1000 EUR asigurați)
// Notă: Această matrice nu mai este folosită în logica actuală, dar este păstrată
// pentru referințe viitoare sau extinderea funcționalităților.
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
