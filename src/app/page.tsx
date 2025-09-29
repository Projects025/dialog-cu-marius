
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LandingView from "@/components/conversation/landing-view";
import ChatView from "@/components/conversation/chat-view";
import type { Message, UserAction } from "@/components/conversation/chat-view";
import { 
    calculateBruteDeficit,
    calculateFinalDeficit,
    calculateHealthDeficit,
    calculateRetirementContribution,
    calculateStudiesContribution
} from "@/lib/calculation";
import type { FinancialData } from "@/lib/calculation";
import { format } from "date-fns";

// ===================================================================
// =========== PUNE AICI URL-ul GENERAT DE GOOGLE APPS SCRIPT ===========
// ===================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqIZZIbWwzeSvAUSrJlJ2ea47xYrA-V30DI-W3chduhknAV6yZ-BOQ176_vToc86pjtQ/exec";
// ===================================================================

async function sendDataToGoogleSheet(data: any) {
    // Creează o copie a datelor pentru a nu modifica originalul
    const dataToSend = { ...data };

    // Convertește array-urile în string-uri pentru a fi ușor de citit în Google Sheet
    if (Array.isArray(dataToSend.dramaticOptions)) {
        dataToSend.dramaticOptions = dataToSend.dramaticOptions.join(', ');
    }
    if (Array.isArray(dataToSend.priorities)) {
        dataToSend.priorities = dataToSend.priorities.join(', ');
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Necesar pentru a evita erorile CORS
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend) // Trimitem TOT obiectul de date
        });
    } catch (error) {
        console.error("Eroare la trimiterea datelor către Google Sheet:", error);
    }
}


type ConversationStep = {
    message: (data: any) => string;
    actionType: UserAction['type'] | 'calculation' | 'sequence' | 'end';
    options?: any;
    handler?: (response: any, data: any) => void;
    nextStep: (response?: any, data?: any) => string;
    autoContinue?: boolean;
    isProgressStep?: boolean;
    delay?: number;
};

type ConversationFlow = {
    [key: string]: ConversationStep;
};

const conversationFlows: { [key: string]: ConversationFlow } = {
    deces: {
        intro_analysis_1: {
            message: () => `Un deces afectează negativ pe multiple planuri, două dintre acestea fiind extrem de profunde și de durată - planul existențial (drama care însoțește pierderea persoanei dragi) și planul financiar (dispariția opțiunilor, apariția presiunilor financiare și a necesității de a ajusta nivelul de trai la noile realități).`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.intro_analysis_2'
        },
        intro_analysis_2: {
            message: () => `În momentele următoare, vom răspunde la 6 întrebări prin care să stabilim care este suma de bani de care ar avea nevoie familia pentru a ameliora impactul financiar negativ al decesului asupra...`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.intro_analysis_3'
        },
        intro_analysis_3: {
            message: () => `(1.) standardului de viață,
(2.) proiectelor în desfășurare și 
(3.) eventualelor credite / datorii.

Dacă ești pregătit/ă, haide să continuăm.`,
            actionType: 'buttons',
            options: ['Continuăm'],
            nextStep: () => 'deces.ask_period'
        },
        ask_period: {
            message: () => "1. În cazul unui posibil deces, care ar fi perioada de timp în care familia ta ar avea nevoie de susținere financiară pentru a-și menține nivelul de trai fără să fie nevoită să facă ajustări majore în stilul de viață (ex. vânzarea unor bunuri, ore suplimentare / al doilea job etc.)",
            actionType: 'buttons',
            isProgressStep: true,
            options: ['3 ani', '4 ani', '5 ani'],
            handler: (response, data) => { data.period = parseInt(response); },
            nextStep: () => 'deces.ask_monthly_sum'
        },
        ask_monthly_sum: {
            message: () => "Care ar fi suma lunară necesară (în lei) pentru acoperirea cheltuielilor lunare și menținerea actualului standard de viață?",
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Ex: 10000', type: 'number' },
            handler: (response, data) => { data.monthlySum = Number(response); },
            nextStep: () => 'deces.show_deficit_1_amount'
        },
        show_deficit_1_amount: {
            message: (data) => {
                const deficit1 = (data.monthlySum || 0) * (data.period || 0) * 12;
                return `<span class="text-2xl font-bold">${deficit1.toLocaleString('ro-RO')} lei</span>`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_deficit_1_explanation'
        },
        show_deficit_1_explanation: {
            message: (data) => `Această sumă reprezintă deficitul pentru ${data.period} ani pentru menținerea standardului de viață, respectiv pentru liniștea sufletească și confortul financiar necesar celor dragi care fac mai ușoară acomodarea la noua realitate.
<br><br>
Ești pregătit(ă) să mai facem un pas?`,
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_event_costs_intro'
        },
        ask_event_costs_intro: {
            message: () => "2. În cazul unui posibil deces, evenimentul în sine este însoțit de anumite cheltuieli (ex. înmormântare, taxe succesorale etc.)",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_event_costs_prompt'
        },
        ask_event_costs_prompt: {
            message: () => "Care ar fi această sumă?",
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Ex: 25000', type: 'number' },
            handler: (response, data) => { data.eventCosts = Number(response); },
            nextStep: () => 'deces.continue_prompt_1'
        },
        continue_prompt_1: {
            message: () => "Mergem mai departe?",
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_projects'
        },
        ask_projects: {
            message: () => "3. În cazul unui posibil deces, există anumite proiecte în desfășurare la acest moment care ar avea de suferit (ex. o construcție la stadiu „la roșu” sau un sport de performanță al copiilor sau alte proiecte care sunt susținute din finanțele tale lunare)? \n\n Care ar fi suma totală de bani (în lei) necesară finalizării acestor proiecte?",
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Ex: 250000', type: 'number' },
            handler: (response, data) => { data.projects = Number(response); },
            nextStep: () => 'deces.ask_debts'
        },
        ask_debts: {
            message: () => "4. În cazul unui posibil deces, rămân pe umerii familiei anumite responsabilități financiare de tip credite, datorii, obligații financiare etc.?\n\n Care ar fi suma de bani de care ar avea nevoie pentru a stinge aceste obligații (în lei)?",
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Ex: 400000', type: 'number' },
            handler: (response, data) => {
                data.debts = Number(response);
            },
            nextStep: () => 'deces.brute_deficit_intro'
        },
        brute_deficit_intro: {
            message: () => "Suma deficit totală este:",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_brute_deficit'
        },
        show_brute_deficit: {
            message: (data) => {
                data.bruteDeficit = calculateBruteDeficit(data);
                return `<span class="text-2xl font-bold">${data.bruteDeficit.toLocaleString('ro-RO')} lei</span>`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_insurance'
        },
        ask_insurance: {
            message: () => "5. În cazul unui posibil deces, familia ta ar beneficia de vreo asigurare de viață pe numele tău? Nu mă refer la acele asigurări care sunt cesionate în favoarea băncii, ci acele asigurări care să aibă ca beneficiar - familia ta.\n\nDacă da, care este suma de bani pe care ai tăi ar încasa-o dintr-o astfel de asigurare de viață (în lei)?",
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Ex: 125000', type: 'number' },
            handler: (response, data) => { data.existingInsurance = Number(response); },
            nextStep: () => 'deces.ask_savings'
        },
        ask_savings: {
            message: () => "6. În cazul unui posibil deces, familia ta ar putea accesa anumite economii sau ar putea apela la anumite investiții (ex. chirii, vânzarea unui imobil etc.)?\n\nDacă da, care este suma de bani disponibilă?",
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Ex: 75000', type: 'number' },
            handler: (response, data) => { data.savings = Number(response); },
            nextStep: () => 'deces.show_final_deficit_intro'
        },
        show_final_deficit_intro: {
            message: () => "Sumele rezultate din asigurări de viață cu beneficiar familia și sumele de bani rezultate din economii / investiții vor fi scăzute din suma-deficit calculată anterior.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_final_deficit_context_1'
        },
        show_final_deficit_context_1: {
            message: () => "Deficitul financiar cu care familia ta ar păși în acest viitor sumbru dacă n-ar mai putea conta pe sprijinul tău financiar este:",
             actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_final_deficit_amount'
        },
        show_final_deficit_amount: {
            message: (data) => {
                data.finalDeficit = calculateFinalDeficit(data);
                return `<span class="text-2xl font-bold">${data.finalDeficit.toLocaleString('ro-RO')} lei</span>`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_feeling_intro'
        },
        ask_feeling_intro: {
            message: () => `Cum ți se pare această sumă?`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_feeling_prompt'
        },
        ask_feeling_prompt: {
            message: () => `Care este sentimentul pe care îl simți acum?`,
            actionType: 'input',
            isProgressStep: true,
            options: { placeholder: 'Scrie aici...', type: 'text' },
            handler: (response, data) => { data.feeling = response; },
            nextStep: () => 'deces.ask_dramatic_options_intro'
        },
        ask_dramatic_options_intro: {
            message: () => "În acest scenariu de imaginație sumbru, ce opțiuni ar avea cei dragi ai tăi pentru a menține un oarecare echilibru în standardul de viață?",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_dramatic_options_prompt',
        },
        ask_dramatic_options_prompt: {
            message: () => "Bifează opțiunile realiste și cu care tu te simți confortabil pentru ai tăi:",
            actionType: 'interactive_scroll_list',
            isProgressStep: true,
            options: {
                options: [
                    'Să se mute cu părinții',
                    'Să se mute în alt oraș',
                    'Să muncească suplimentar sau la al doilea job (și să dispară din viața copiilor)',
                    'Să vândă din bunurile personale',
                    'Să vândă casa / apartamentul',
                    'Să reducă drastic cheltuieli / să renunțe la hobby-uri',
                    'Să renunțe la proiecte personale',
                    'Să amâne educația copiilor sau să se mulțumească cu foarte puțin',
                    'Să ceară în mod constant ajutor de la familiei și de la prieteni',
                    'Să renunțe la economiile / investițiile existente',
                    'Să se mute în locuință mai mică',
                    'Să accepte orice compromis major pentru a supraviețui financiar',
                    'Să se căsătorească din obligații financiare',
                    'Altceva'
                ],
                buttonText: "Am bifat"
            },
            handler: (response, data) => { data.dramaticOptions = response; },
            nextStep: () => 'deces.present_solution'
        },
        present_solution: {
            message: () => "Dacă nu ești foarte mulțumit cu opțiunile pe care familia ta le are pentru a menține standardul actual de viață, ai fi interesat să vezi o soluție personalizată care să ofere celor dragi ție o a doua șansă la o viață relativ normală, fără poveri financiare?\n\nPractic, o soluție prin care dragostea ta și grija ta pentru ei va continua chiar și după tine. \n\nPoți crea instant o moștenire care să îi ajute financiar pe cei dragi ție chiar și (mai ales!) în absența ta!",
            actionType: 'buttons',
            isProgressStep: true,
            options: ['Da', 'Nu'],
            nextStep: (response) => response === 'Da' ? 'deces.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
            message: () => "Am nevoie de datele tale de contact (nume, telefon, email), iar în cel mai scurt timp posibil, consultantul care ți-a dat acest link te va contacta pentru construirea soluției.\n\nDe asemenea, am rugămintea să semnezi și un acord GDPR care să îi permită consultantului să te contacteze într-un cadru legal.",
            actionType: 'form',
            isProgressStep: true,
            options: {
                fields: [
                    { name: 'name', placeholder: 'Nume Prenume', type: 'text', required: true },
                    { name: 'email', placeholder: 'Email', type: 'email', required: true },
                    { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
                ],
                gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
                buttonText: 'Trimite'
            },
            handler: (response, data) => {
                data.contact = response;
            },
            nextStep: () => 'deces.thank_you_contact'
        },
        thank_you_contact: {
            message: () => "Mulțumesc pentru că mi-ai răspuns la întrebări, te voi contacta în curând!\n\nCând preferi să fii contactat?",
            actionType: 'buttons',
            isProgressStep: true,
            options: ['Dimineața', 'După-masa', 'Seara'],
            handler: (response, data) => { 
                data.preferredContactTime = response; 
                sendDataToGoogleSheet(data);
            },
            nextStep: () => 'deces.thank_you_final'
        },
        thank_you_final: {
            message: () => ``,
            actionType: 'end',
            nextStep: () => ''
        }
    },
    boala_grava: {
        start_flow: {
            message: () => "Am înțeles. Protejarea stabilității tale financiare în fața provocărilor medicale este esențială.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'boala_grava.ask_monthly_need_health'
        },
        ask_monthly_need_health: {
            message: () => "Mai întâi, care este suma lunară (în €) de care ai avea nevoie pentru a acoperi cheltuielile curente dacă nu ai mai putea genera venit?",
            actionType: 'input',
            options: { placeholder: 'Ex: 1500', type: 'number' },
            handler: (response, data) => { data.monthlyNeed = Number(response); },
            nextStep: () => 'boala_grava.ask_recovery_period'
        },
        ask_recovery_period: {
            message: () => "Pentru ce perioadă (în luni) estimezi că ai avea nevoie de acest sprijin financiar pentru recuperare?",
            actionType: 'buttons',
            options: ['6 luni', '12 luni', '24 luni'],
            handler: (response, data) => { data.recoveryPeriod = parseInt(response); },
            nextStep: () => 'boala_grava.ask_medical_costs'
        },
        ask_medical_costs: {
            message: () => "Ce sumă unică (în €) estimezi că ar fi necesară pentru costuri medicale (tratamente, intervenții, medicamente) neacoperite de stat?",
            actionType: 'input',
            options: { placeholder: 'Ex: 20000', type: 'number' },
            handler: (response, data) => { data.medicalCosts = Number(response); },
            nextStep: () => 'boala_grava.ask_existing_savings_health'
        },
        ask_existing_savings_health: {
            message: () => "Ai deja o asigurare privată de sănătate sau economii dedicate pentru urgențe medicale? Dacă da, care este suma totală?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5000', type: 'number' },
            handler: (response, data) => { data.existingSavings = Number(response); },
            nextStep: () => 'boala_grava.show_health_deficit'
        },
        show_health_deficit: {
            message: (data) => {
                data.healthDeficit = calculateHealthDeficit(data);
                return `Am calculat. Necesarul financiar pentru a trece peste o perioadă dificilă este de ${data.healthDeficit.toLocaleString('ro-RO')} €.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'boala_grava.show_impact_health'
        },
        show_impact_health: {
            message: () => "A avea această siguranță înseamnă că te poți concentra 100% pe recuperare, fără stresul banilor și fără a afecta economiile familiei.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'boala_grava.ask_dob_health'
        },
        ask_dob_health: {
            message: () => "Pentru a-ți oferi o estimare de cost, mai am nevoie de data nașterii.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response; },
            nextStep: () => 'boala_grava.ask_solution_health'
        },
        ask_solution_health: {
            message: (data) => {
                data.premium = Math.max(25, Math.round(data.healthDeficit / 150)); // Simplified
                return `O asigurare de sănătate care să acopere un risc de ${data.healthDeficit.toLocaleString('ro-RO')} € ar avea un cost estimat de ${data.premium.toLocaleString('ro-RO')} € pe lună. Dorești să afli mai multe de la un consultant?`;
            },
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'boala_grava.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
             message: () => "Perfect. Pentru a stabili o discuție cu un consultant, te rog să completezi datele de mai jos. Acestea sunt confidențiale și vor fi folosite exclusiv în acest scop.",
            actionType: 'form',
            options: {
                fields: [
                    { name: 'name', placeholder: 'Nume', type: 'text', required: true },
                    { name: 'email', placeholder: 'Email', type: 'email', required: true },
                    { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
                ],
                gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
                buttonText: 'Trimite'
            },
            handler: (response, data) => {
                data.contact = response;
                sendDataToGoogleSheet(data);
            },
            nextStep: () => 'common.end_dialog_success'
        },
    },
    pensionare: {
        start_flow: {
            message: () => "Excelentă alegere! Planificarea pensiei este cheia unui viitor liniștit.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'pensionare.ask_desired_pension'
        },
        ask_desired_pension: {
            message: () => "Mai întâi, ce sumă lunară (în €) ți-ai dori să ai la pensie, în banii de azi?",
            actionType: 'input',
            options: { placeholder: 'Ex: 1500', type: 'number' },
            handler: (response, data) => { data.desiredPension = Number(response); },
            nextStep: () => 'pensionare.ask_retirement_age'
        },
        ask_retirement_age: {
            message: () => "La ce vârstă ți-ai dori să te pensionezi?",
            actionType: 'input',
            options: { placeholder: 'Ex: 65', type: 'number' },
            handler: (response, data) => { data.retirementAge = Number(response); },
            nextStep: () => 'pensionare.ask_current_savings_pension'
        },
        ask_current_savings_pension: {
            message: () => "Ai deja o sumă economisită special pentru pensie (Pilon 2, Pilon 3, alte investiții)? Dacă da, care este valoarea ei actuală?",
            actionType: 'input',
            options: { placeholder: 'Ex: 10000', type: 'number' },
            handler: (response, data) => { data.currentSavings = Number(response); },
            nextStep: () => 'pensionare.ask_dob_pension'
        },
        ask_dob_pension: {
            message: () => "Pentru a-ți oferi un plan, am nevoie și de data ta de naștere.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response; },
            nextStep: () => 'pensionare.show_retirement_plan'
        },
        show_retirement_plan: {
            message: (data) => {
                data.monthlyContribution = calculateRetirementContribution(data);
                return `Am calculat. Pentru a atinge obiectivul tău, ar fi necesar să economisești/investești aproximativ ${data.monthlyContribution.toLocaleString('ro-RO')} € pe lună, până la vârsta de pensionare.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'pensionare.ask_solution_pension'
        },
        ask_solution_pension: {
            message: () => "Vestea bună este că, prin instrumente de investiții inteligente, poți pune banii la treabă pentru tine. Dorești să discuți cu un consultant despre un plan de acumulare personalizat?",
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'pensionare.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
             message: () => "Perfect. Pentru a stabili o discuție cu un consultant, te rog să completezi datele de mai jos. Acestea sunt confidențiale și vor fi folosite exclusiv în acest scop.",
            actionType: 'form',
            options: {
                fields: [
                    { name: 'name', placeholder: 'Nume', type: 'text', required: true },
                    { name: 'email', placeholder: 'Email', type: 'email', required: true },
                    { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
                ],
                gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
                buttonText: 'Trimite'
            },
            handler: (response, data) => {
                data.contact = response;
                sendDataToGoogleSheet(data);
            },
            nextStep: () => 'common.end_dialog_success'
        },
    },
    studii_copii: {
        start_flow: {
            message: () => "O decizie minunată! Investiția în educația copiilor este cel mai de preț cadou.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'studii_copii.ask_studies_goal'
        },
        ask_studies_goal: {
            message: () => "Mai întâi, care este suma totală (în €) pe care estimezi că o vei avea nevoie pentru studiile copilului tău?",
            actionType: 'input',
            options: { placeholder: 'Ex: 50000', type: 'number' },
            handler: (response, data) => { data.studiesGoal = Number(response); },
            nextStep: () => 'studii_copii.ask_child_age'
        },
        ask_child_age: {
            message: () => "Care este vârsta actuală a copilului?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5', type: 'number' },
            handler: (response, data) => { data.childAge = Number(response); },
            nextStep: () => 'studii_copii.ask_current_savings_studies'
        },
        ask_current_savings_studies: {
            message: () => "Ai deja o sumă economisită special pentru acest scop? Dacă da, care este valoarea ei?",
            actionType: 'input',
            options: { placeholder: 'Ex: 2000', type: 'number' },
            handler: (response, data) => { data.currentSavings = Number(response); },
            nextStep: () => 'studii_copii.show_studies_plan'
        },
        show_studies_plan: {
            message: (data) => {
                data.monthlyContribution = calculateStudiesContribution(data);
                return `Am calculat. Pentru a atinge obiectivul tău până la majoratul copilului, ar fi necesar să economisești ${data.monthlyContribution.toLocaleString('ro-RO')} € pe lună.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'studii_copii.ask_solution_studies'
        },
        ask_solution_studies: {
            message: () => "Prin produse dedicate, cum ar fi asigurările de studii, poți asigura acest viitor chiar și în situații neprevăzute. Dorești să afli mai multe de la un consultant?",
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'studii_copii.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
             message: () => "Perfect. Pentru a stabili o discuție cu un consultant, te rog să completezi datele de mai jos. Acestea sunt confidențiale și vor fi folosite exclusiv în acest scop.",
            actionType: 'form',
            options: {
                fields: [
                    { name: 'name', placeholder: 'Nume', type: 'text', required: true },
                    { name: 'email', placeholder: 'Email', type: 'email', required: true },
                    { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
                ],
                gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
                buttonText: 'Trimite'
            },
            handler: (response, data) => {
                data.contact = response;
                sendDataToGoogleSheet(data);
            },
            nextStep: () => 'common.end_dialog_success'
        },
    },
    // Common steps
    common: {
        end_dialog_friendly: {
            message: () => "",
            actionType: 'end',
            nextStep: () => ''
        },
        end_dialog_success: {
            message: () => "",
            actionType: 'end',
            nextStep: () => ''
        }
    }
};

const introFlow: ConversationFlow = {
    intro_1: {
        message: () => `Viața produce pierderi financiare semnificative în patru situații majore.`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        nextStep: () => 'intro_2',
    },
    intro_2: {
        message: () => `Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile.`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        nextStep: () => 'intro_3',
    },
    intro_3: {
        message: () => `<strong>Previzibile:</strong> \n\n
1. Pensionarea - reducerea drastică a opțiunilor, a demnității și a statutului de susținător al familiei\n\n
2. Studiile copiilor - cheltuieli complexe, unele neanticipate, care pun presiune pe bugetul familiei`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        nextStep: () => 'intro_4',
    },
    intro_4: {
        message: () => `<strong>Imprevizibile:</strong> \n\n
1. Decesul - detonează standardul de viață, proiectele în desfășurare și viitorul copiilor \n\n
2. Bolile grave - Accident Vascular cerebral, Cancer, Infarct Miocardic, Transplant, etc,`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        nextStep: () => 'ask_priority',
    },
    ask_priority: {
        message: () => "Pentru care dintre aceste subiecte dorești să îți calculezi gradul de expunere financiară?",
        actionType: 'multi_choice',
        isProgressStep: true,
        options: [
            { label: 'Reducerea drastică a veniturilor la pensionare', id: 'pensionare', disabled: true },
            { label: 'Asigurarea viitorului copiilor', id: 'studii_copii', disabled: true },
            { label: 'Decesul spontan', id: 'deces', disabled: false },
            { label: 'Protecție în caz de boală gravă', id: 'boala_grava', disabled: true }
        ],
        handler: (response, data) => { data.priorities = response; },
        nextStep: (response) => {
            if (!response || response.length === 0) return 'common.end_dialog_friendly';
            // Prioritize 'deces'
            const selectedId = response.find((r: string) => r === 'deces') || response[0];
            
            switch (selectedId) {
                case 'deces':
                    return 'deces.intro_analysis_1';
                case 'boala_grava':
                    return 'boala_grava.start_flow';
                case 'pensionare':
                    return 'pensionare.start_flow';
                case 'studii_copii':
                    return 'studii_copii.start_flow';
                default:
                    return 'common.end_dialog_friendly';
            }
        }
    },
};

const allFlows = { ...introFlow, ...conversationFlows.deces, ...conversationFlows.boala_grava, ...conversationFlows.pensionare, ...conversationFlows.studii_copii, ...conversationFlows.common };

const PROGRESS_STEPS_IDS = Object.keys(allFlows).filter(key => allFlows[key].isProgressStep);
const TOTAL_STEPS = PROGRESS_STEPS_IDS.length;

const getStep = (stepId: string): ConversationStep | null => {
    if (!stepId) return null;
    
    const step = allFlows[stepId];
    if (step) {
        return step;
    }

    const [flow, stepKey] = stepId.split('.');
    
    if (flow && stepKey && conversationFlows[flow] && conversationFlows[flow][stepKey]) {
        return conversationFlows[flow][stepKey];
    }
    
    const commonStepKey = stepId.includes('.') ? stepId.split('.')[1] : stepId;
    if (conversationFlows.common[commonStepKey]) {
         return conversationFlows.common[commonStepKey];
    }

    console.error("Invalid stepId:", stepId);
    return null;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const calculateDynamicDelay = (text: string): number => {
    const BASE_DELAY = 600; 
    const WORDS_PER_SECOND = 5; 

    if (!text) return BASE_DELAY;

    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    const readingTime = (wordCount / WORDS_PER_SECOND) * 1000;
    
    return Math.min(BASE_DELAY + readingTime, 2500);
}


export default function Home() {
    const [view, setView] = useState<"landing" | "chat">("landing");
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
    const [progress, setProgress] = useState(0);
    const [isConversationDone, setIsConversationDone] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    
    const conversationIdRef = useRef(0);
    const currentStateRef = useRef<string | null>(null);
    const userDataRef = useRef<FinancialData>({});
    const currentProgressStep = useRef(0);

    const addMessage = useCallback((message: Omit<Message, "id" | "content">, content: string = "") => {
        const newMessage = { ...message, id: conversationIdRef.current++, content };
        setConversation((prev) => [...prev, newMessage]);
        return newMessage.id;
    }, []);
    
    const renderStep = useCallback(async (stepId: string) => {
        currentStateRef.current = stepId;
        const step = getStep(stepId);

        if (!step) {
            setIsTyping(false);
            setCurrentUserAction(null);
            return;
        }
        
        if (step.actionType === 'end') {
            setIsTyping(false);
            setIsConversationDone(true);
            setCurrentUserAction(null);
            return;
        }

        setCurrentUserAction(null);

        const messageContent = step.message(userDataRef.current);

        if (messageContent) {
            setIsTyping(true);
            await delay(step.delay || 1500);
            setIsTyping(false);
            addMessage({ author: "Marius", type: "text" }, messageContent);
            
            const dynamicDelay = calculateDynamicDelay(messageContent);
            await delay(dynamicDelay);
        }
        
        const actionOptions = step.options;

        if (step.autoContinue) {
             const nextStepId = step.nextStep();
             await renderStep(nextStepId);
        } else {
            setCurrentUserAction({ type: step.actionType, options: actionOptions });
        }
    }, [addMessage]);

    const processUserResponse = useCallback(async (response: any) => {
        setCurrentUserAction(null);

        if (!currentStateRef.current) {
            console.error("Cannot process response without a current state.");
            return;
        }

        const step = getStep(currentStateRef.current);
        if (!step) return;
        
        if (step.actionType === 'end') {
            setIsConversationDone(true);
            return;
        }

        if (step.isProgressStep) {
            currentProgressStep.current++;
            const newProgress = TOTAL_STEPS > 0 ? (currentProgressStep.current / TOTAL_STEPS) * 100 : 0;
            setProgress(newProgress);
        }
        
        const responseValue = (typeof response === 'object' && response !== null && response.label) ? response.label : response;
        
        let userMessageContent: string | null = null;

        if (typeof response === 'number') {
            userMessageContent = response.toLocaleString('ro-RO');
        } else if (typeof response === 'string' && response.trim() !== '') {
            userMessageContent = response;
        } else if (Array.isArray(response) && response.length > 0) {
            const labels = response.map(item => {
                if (typeof item === 'object' && item !== null && item.label) {
                    return item.label;
                }
                return item;
            });
            userMessageContent = labels.join(', ');
        } else if (response instanceof Date) {
            userMessageContent = format(response, "dd/MM/yyyy");
        } else if (typeof response === 'object' && response !== null) {
            if (response.name) { // Contact form
                userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
            } else if (response.label) { // Single choice from button list
                userMessageContent = response.label;
            }
        }
        
        if (userMessageContent !== null && (userMessageContent.trim() !== '' || typeof response === 'number')) {
             if (typeof response === 'number' && response === 0 && (step.options?.type === 'number' && step.options?.placeholder)) {
                 // Don't show '0' for optional numeric fields, let it be silent
             } else {
                 addMessage({ author: "user", type: "response" }, userMessageContent);
             }
        }
        
        if (step.handler) {
            const handlerResponse = Array.isArray(response) ? response.map(r => r.id || r) : (response.id || responseValue);
            step.handler(handlerResponse, userDataRef.current);
        }

        const nextStepId = step.nextStep(Array.isArray(response) ? response.map(r => r.id || r) : (response.id || responseValue), userDataRef.current);
        await renderStep(nextStepId);

    }, [addMessage, renderStep]);

    const startConversation = useCallback(() => {
        userDataRef.current = {};
        conversationIdRef.current = 0;
        currentProgressStep.current = 0;
        setProgress(0);
        setConversation([]);
        setIsConversationDone(false);
        renderStep('intro_1');
    }, [renderStep]);

    const handleStart = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            setView("chat");
            setIsFadingOut(false);
        }, 500);
    };

    useEffect(() => {
        if (view === 'chat' && conversation.length === 0) {
            startConversation();
        }
    }, [view, startConversation, conversation.length]);

    return (
        <>
            <div className="container mx-auto h-full max-h-[-webkit-fill-available] p-0 flex flex-col">
                {view === "landing" ? (
                    <LandingView onStart={handleStart} isFadingOut={isFadingOut} />
                ) : (
                    <ChatView
                        conversation={conversation}
                        userAction={currentUserAction}
                        onResponse={processUserResponse}
                        progress={progress}
                        isConversationDone={isConversationDone}
                        isTyping={isTyping}
                    />

                )}
            </div>
        </>
    );
}

    

    

    