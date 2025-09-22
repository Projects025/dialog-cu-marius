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

type ConversationStep = {
    message: (data: any) => string;
    actionType: UserAction['type'] | 'end' | 'calculation' | 'sequence';
    options?: any;
    handler?: (response: any, data: any) => void;
    nextStep: (response?: any, data?: any) => string;
    autoContinue?: boolean;
    delay?: number;
};

type ConversationFlow = {
    [key: string]: ConversationStep;
};

const conversationFlows: { [key: string]: ConversationFlow } = {
    deces: {
        start_flow: {
            message: () => "Ar fi de interes pentru tine sa vezi care este gradul de expunere financiara a familiei tale in cazul unui deces spontan?",
            actionType: 'buttons',
            options: ['Da', 'Nu'],
            nextStep: (response) => response === 'Da' ? 'deces.intro_analysis_1' : 'common.end_dialog_friendly'
        },
        intro_analysis_1: {
            message: () => `Un deces afecteaza negativ pe multiple planuri, doua dintre acestea fiind extrem de profunde si de durata - planul existential (drama care insoteste pierderea persoanei dragi) si planul financiar (disparitia optiunilor, aparitia presiunilor financiare si a necesitatii de a ajusta nivelul de trai la noile realitati).`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            delay: 1200,
            nextStep: () => 'deces.intro_analysis_2'
        },
        intro_analysis_2: {
            message: () => `In momentele urmatoare, vom raspunde la cateva intrebari prin care sa stabilim care este suma de bani de care ar avea nevoie familia pentru a ameliora impactul financiar negativ al decesului asupra...`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            delay: 1200,
            nextStep: () => 'deces.intro_analysis_3'
        },
        intro_analysis_3: {
            message: () => `(1.) standardului de viata,
(2.) proiectelor in desfasurare si 
(3.) a eventualelor credite / datorii.

Daca esti pregatit, haide sa continuam.`,
            actionType: 'buttons',
            options: ['Continuam'],
            nextStep: () => 'deces.ask_period'
        },
        ask_period: {
            message: () => "In cazul unui posibil deces, care ar fi perioada de timp in care familia ta ar avea nevoie de sustinere financiara pentru a mentine standardul de viata actual (fara alte ajustari dureroase)?",
            actionType: 'buttons',
            options: ['3 ani', '4 ani', '5 ani'],
            handler: (response, data) => { data.period = parseInt(response); },
            nextStep: () => 'deces.ask_monthly_sum'
        },
        ask_monthly_sum: {
            message: () => "Care ar fi suma lunara necesara (in lei) pentru acoperirea cheltuielilor lunare si mentinerea actualului standard de viata?",
            actionType: 'input',
            options: { placeholder: 'Ex: 10000', type: 'number' },
            handler: (response, data) => { data.monthlySum = Number(response); },
            nextStep: () => 'deces.show_deficit_1'
        },
        show_deficit_1: {
            message: (data) => {
                const deficit1 = (data.monthlySum || 0) * (data.period || 0) * 12;
                return `Avem o prima suma de bani, respectiv ${deficit1.toLocaleString('ro-RO')} lei, reprezentand nevoia de continuare a standardului de viata pe o perioada de ${data.period} ani. Esti pregatit(a) sa mai facem un pas?`;
            },
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_event_costs'
        },
        ask_event_costs: {
            message: () => "Ce suma de bani (in lei) ar trebui sa alocam pentru cheltuielile specifice unui astfel de eveniment (costuri de succesiune, taxe notariale, costuri de repatriere, etc)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 25000', type: 'number' },
            handler: (response, data) => { data.eventCosts = Number(response); },
            nextStep: () => 'deces.show_deficit_2'
        },
        show_deficit_2: {
            message: (data) => `Am adaugat si aceasta suma. Esti pregatit(a) sa mai facem un pas?`,
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_projects'
        },
        ask_projects: {
            message: () => "Exista proiecte in desfasurare (ex: educatia copiilor, avansuri pentru locuinte, etc) care ar trebui protejate? Daca da, care este suma necesara (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 250000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.projects = Number(response); },
            nextStep: () => 'deces.show_deficit_3'
        },
        show_deficit_3: {
             message: (data) => `Am adaugat si aceasta suma. Esti pregatit(a) sa mai facem un pas?`,
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_debts'
        },
        ask_debts: {
            message: () => "In cazul decesului, familia ar trebui sa gestioneze anumite credite / datorii (ipotecare, nevoi personale, etc)? Daca da, care este suma totala a acestora (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 400000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.debts = Number(response); },
            nextStep: () => 'deces.ask_show_brute_deficit'
        },
         ask_show_brute_deficit: {
            message: () => `Bun... Am adaugat si aceasta ultima suma. Avem cele patru sume-deficit. Esti pregatit(a) sa vezi care este suma-deficit totala?`,
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.show_brute_deficit'
        },
        show_brute_deficit: {
            message: (data) => {
                data.bruteDeficit = calculateBruteDeficit(data);
                return `Asadar, suma-deficit totala, adica suma de bani de care familia ar avea nevoie pentru a mentine standardul de viata, a continua proiectele si a acoperi datoriile, este de ${data.bruteDeficit.toLocaleString('ro-RO')} lei.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_insurance'
        },
        ask_insurance: {
            message: () => "In cazul unui deces, familia ta ar beneficia de vreo asigurare de viata (fie ea de sine statatoare, fie atasata unui credit)? Daca da, care este suma asigurata (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 125000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.existingInsurance = Number(response); },
            nextStep: () => 'deces.ask_savings'
        },
        ask_savings: {
            message: () => "In cazul unui deces, familia ta ar putea accesa anumite economii / investitii / lichiditati (conturi curente, depozite, etc)? Daca da, care este suma acestora (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 75000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.savings = Number(response); },
            nextStep: () => 'deces.show_final_deficit'
        },
        show_final_deficit: {
            message: (data) => {
                data.finalDeficit = calculateFinalDeficit(data);
                return `Am scazut din suma-deficit totala de ${data.bruteDeficit?.toLocaleString('ro-RO')} lei, suma asigurata de ${data.existingInsurance?.toLocaleString('ro-RO')} lei si suma economiilor de ${data.savings?.toLocaleString('ro-RO')} lei. Mostenirea financiara pe care ar primi-o familia ta, in cazul unui deces, este de fapt o mostenire-negativa. Asadar, suma-deficit finala este de: ${data.finalDeficit.toLocaleString('ro-RO')} lei.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_feeling'
        },
        ask_feeling: {
            message: () => `Cum ti se pare aceasta suma? Care este sentimentul pe care il simti acum?`,
            actionType: 'input',
             options: { placeholder: 'Scrie aici...', type: 'text' },
            handler: (response, data) => { data.feeling = response; },
            nextStep: () => 'deces.ask_dramatic_options'
        },
        ask_dramatic_options: {
            message: () => "In acest scenariu, fara o planificare financiara care sa anuleze aceasta mostenire-negativa, ce optiuni ar avea cei dragi pentru a acoperi deficitul de mai sus? Te rog sa bifezi optiunile pe care le consideri realiste...",
            actionType: 'interactive_scroll_list',
            options: {
                options: [
                    'Partenerul de viata isi ia al doilea job', 'Partenerul de viata vinde casa',
                    'Partenerul de viata vinde masina', 'Partenerul de viata renunta la concedii',
                    'Partenerul de viata face un credit de nevoi personale', 'Partenerul de viata se imprumuta la prieteni',
                    'Partenerul de viata se imprumuta la familie', 'Copiii renunta la meditatii',
                    'Copiii renunta la sport', 'Copiii renunta la facultate in strainatate',
                    'Copiii renunta la facultate in tara', 'Copiii se angajeaza imediat dupa liceu',
                    'Bunicii contribuie financiar masiv', 'Bunicii au grija de nepoti non-stop',
                    'Stilul de viata se reduce drastic'
                ],
                buttonText: "Am bifat"
            },
            handler: (response, data) => { data.dramaticOptions = response; },
            nextStep: () => 'deces.present_solution'
        },
        present_solution: {
            message: () => "Daca nu esti foarte multumit cu optiunile de mai sus, ai fi interesat sa vezi o solutie personalizata prin care sa anulezi complet aceasta mostenire-negativa si sa transferi riscul financiar catre o companie de asigurari?",
            actionType: 'buttons',
            options: ['Da', 'Nu'],
            nextStep: (response) => response === 'Da' ? 'deces.ask_dob' : 'common.end_dialog_friendly'
        },
        ask_dob: {
            message: () => "Pentru a-ți oferi o estimare de cost, mai am nevoie de câteva detalii. Te rog să selectezi data nașterii.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response; },
            nextStep: () => 'deces.ask_solution'
        },
        ask_solution: {
            message: (data) => {
                data.premium = Math.max(100, Math.round(data.finalDeficit / 250)); // Simplified calculation in EUR
                return `Pentru a acoperi complet deficitul de ${data.finalDeficit.toLocaleString('ro-RO')} lei, costul estimat al unei asigurări de viață pentru tine ar fi de aproximativ ${(data.premium / 5).toLocaleString('ro-RO')} € pe lună. Ai fi interesat să vezi o soluție personalizată?`;
            },
            actionType: 'buttons',
            options: ['Da, sunt interesat', 'Nu, mulțumesc'],
            nextStep: (response) => response === 'Da, sunt interesat' ? 'deces.ask_contact_details' : 'common.end_dialog_friendly'
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
            handler: (response, data) => { data.contact = response; },
            nextStep: () => 'common.end_dialog_success'
        },
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
            options: { placeholder: 'Ex: 5000', type: 'number', defaultValue: 0 },
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
                data.premium = Math.max(100, Math.round(data.healthDeficit / 150)); // Simplified
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
            handler: (response, data) => { data.contact = response; },
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
            options: { placeholder: 'Ex: 10000', type: 'number', defaultValue: 0 },
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
            handler: (response, data) => { data.contact = response; },
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
            options: { placeholder: 'Ex: 2000', type: 'number', defaultValue: 0 },
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
            handler: (response, data) => { data.contact = response; },
            nextStep: () => 'common.end_dialog_success'
        },
    },
    // Common steps
    common: {
        end_dialog_friendly: {
            message: () => "Am înțeles. Îți mulțumesc pentru timpul acordat! Dacă te răzgândești, știi unde mă găsești.",
            actionType: 'end',
            nextStep: () => ''
        },
        end_dialog_success: {
            message: () => "Mulțumesc! Datele tale au fost înregistrate. Un consultant te va suna în curând. O zi excelentă!",
            actionType: 'end',
            nextStep: () => ''
        }
    }
};

const introFlow: ConversationFlow = {
    intro_1: {
        message: () => `Viața produce pierderi financiare semnificative in patru situații majore.`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 1200,
        nextStep: () => 'intro_2',
    },
    intro_2: {
        message: () => `Dintre acestea, două situații sunt previzibile, precis așezate pe axa vieții, iar două sunt total imprevizibile (<span class="inline-block animate-subtle-wave">„ceasul rău, pisica neagră”</span>).`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 1200,
        nextStep: () => 'intro_3',
    },
    intro_3: {
        message: () => `<strong>Previzibile:</strong>
1. Pensionarea - reducerea drastică a optiunilor, a demnitatii si a statutului de sustinator al familiei
2. Studiile copiilor - cheltuieli complexe, unele neanticipate, care pun presiune pe bugetul familiei`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 1200,
        nextStep: () => 'intro_4',
    },
    intro_4: {
        message: () => `<strong>Imprevizibile:</strong>
1. Decesul - detonează standardul de viata, proiectele in desfasurare și viitorul copiilor
2. Bolile grave - nu decesul este cel mai rau eveniment care se poate intampla in viata unei familii`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 2500,
        nextStep: () => 'dramatic_pause',
    },
    dramatic_pause: {
        message: () => '', // No new message bubble
        actionType: 'buttons',
        options: ['Am înțeles'],
        nextStep: () => 'ask_priority',
    },
    ask_priority: {
        message: () => "Care dintre aceste subiecte ar fi de interes pentru tine la acest moment?",
        actionType: 'multi_choice',
        options: [
            { label: 'Reducerea drastica a veniturilor la pensionare', id: 'pensionare', disabled: true },
            { label: 'Asigurarea viitorului copiilor', id: 'studii_copii', disabled: true },
            { label: 'Decesul spontan', id: 'deces', disabled: false },
            { label: 'Protecție în caz de boală gravă', id: 'boala_grava', disabled: true }
        ],
        nextStep: (response) => {
            if (!response || response.length === 0) return 'common.end_dialog_friendly';
            // Prioritize 'deces'
            const selectedId = response.find((r: string) => r === 'deces') || response[0];
            
            switch (selectedId) {
                case 'deces':
                    return 'deces.start_flow';
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

const getStep = (stepId: string): ConversationStep | null => {
    if (!stepId) return null;

    if (introFlow[stepId]) {
        return introFlow[stepId];
    }
    
    const [flow, step] = stepId.split('.');
    
    if (flow && step && conversationFlows[flow] && conversationFlows[flow][step]) {
        return conversationFlows[flow][step];
    }
    
    // Check common flow last
    if (conversationFlows.common[flow]) {
         return conversationFlows.common[flow];
    }


    console.error("Invalid stepId:", stepId);
    return null;
}

export default function Home() {
    const [view, setView] = useState<"landing" | "chat">("landing");
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [currentUserAction, setCurrentUserAction] = useState<UserAction | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    
    const conversationIdRef = useRef(0);
    const currentStateRef = useRef<string | null>(null);
    const userDataRef = useRef<FinancialData>({});

    const addMessage = useCallback((message: Omit<Message, "id" | "content">, content: string = "") => {
        const newMessage = { ...message, id: conversationIdRef.current++, content };
        setConversation((prev) => [...prev, newMessage]);
        return newMessage.id;
    }, []);

    const updateMessage = useCallback((id: number, content: string) => {
        setConversation(prev => prev.map(msg => msg.id === id ? { ...msg, content } : msg));
    }, []);

    const typeMessage = useCallback(async (text: string, messageId: number, delay: number = 30) => {
        let currentText = '';
        for (const char of text) {
            if (char === '<') {
                const closingTagIndex = text.indexOf('>', text.indexOf(char));
                if (closingTagIndex !== -1) {
                    const tag = text.substring(text.indexOf(char), closingTagIndex + 1);
                    currentText += tag;
                    // Skip the loop ahead past this tag
                    // This is a simplification and might not handle all HTML cases.
                    text = text.substring(closingTagIndex + 1);
                    updateMessage(messageId, currentText + text); // Show rest of text at once
                    return; // Exit typing animation
                }
            }
            currentText += char;
            updateMessage(messageId, currentText);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }, [updateMessage]);
    
    const renderStep = useCallback(async (stepId: string) => {
        currentStateRef.current = stepId;
        const step = getStep(stepId);

        if (!step) {
            setIsTyping(false);
            setCurrentUserAction(null);
            return;
        }

        setCurrentUserAction(null);

        const messageContent = step.message(userDataRef.current);
        if (messageContent) {
            await new Promise(resolve => setTimeout(resolve, 800));
            setIsTyping(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const messageId = addMessage({ author: "Marius", type: "text" });
            setIsTyping(false);

            await typeMessage(messageContent, messageId);
        }

        if (step.autoContinue) {
             const delay = step.delay || 1200;
             await new Promise(resolve => setTimeout(resolve, delay));
             const nextStepId = step.nextStep();
             renderStep(nextStepId);
        } else {
            if (step.actionType === 'end') {
                setCurrentUserAction(null);
            } else {
                setCurrentUserAction({ type: step.actionType, options: step.options });
            }
        }
    }, [addMessage, typeMessage]);

    const processUserResponse = useCallback(async (response: any) => {
        setCurrentUserAction(null);

        if (!currentStateRef.current) {
            console.error("Cannot process response without a current state.");
            return;
        }

        const step = getStep(currentStateRef.current);
        if (!step) return;
        
        const responseValue = (typeof response === 'object' && response !== null && response.label) ? response.label : response;
        
        let userMessageContent = Array.isArray(response) 
            ? response.map(r => r.label || r).join(', ')
            : responseValue;

        if (typeof response === 'object' && response !== null && response.name) {
            userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
        } else if (response instanceof Date) {
            userMessageContent = format(response, "dd/MM/yyyy");
        }
        
        if (userMessageContent) {
            addMessage({ author: "user", type: "response" }, userMessageContent);
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
        setConversation([]);
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
        <div className="container mx-auto h-full max-h-[-webkit-fill-available] p-0 flex flex-col">
            {view === "landing" ? (
                <LandingView onStart={handleStart} isFadingOut={isFadingOut} />
            ) : (
                <ChatView
                    conversation={conversation}
                    userAction={currentUserAction}
                    onResponse={processUserResponse}
                    isTyping={isTyping}
                />
            )}
        </div>
    );
}
