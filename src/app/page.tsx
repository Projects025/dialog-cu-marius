
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
    actionType: UserAction['type'] | 'calculation' | 'sequence';
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
        intro_analysis_1: {
            message: () => `Un deces afecteaza negativ pe multiple planuri, doua dintre acestea fiind extrem de profunde si de durata - planul existential (drama care insoteste pierderea persoanei dragi) si planul financiar (disparitia optiunilor, aparitia presiunilor financiare si a necesitatii de a ajusta nivelul de trai la noile realitati).`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            delay: 1200,
            nextStep: () => 'deces.intro_analysis_2'
        },
        intro_analysis_2: {
            message: () => `In momentele urmatoare, vom raspunde la intrebari prin care sa stabilim care este suma de bani de care ar avea nevoie familia pentru a ameliora impactul financiar negativ al decesului asupra...`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            delay: 1200,
            nextStep: () => 'deces.intro_analysis_3'
        },
        intro_analysis_3: {
            message: () => `(1.) standardului de viata,
(2.) proiectelor in desfasurare si 
(3.) eventualelor credite / datorii.

Daca esti pregatit/a, haide sa continuam.`,
            actionType: 'buttons',
            options: ['Continuam'],
            nextStep: () => 'deces.ask_period'
        },
        ask_period: {
            message: () => "1. In cazul unui posibil deces, care ar fi perioada de timp in care familia ta ar avea nevoie de sustinere financiara pentru a-si mentine nivelul de trai fara sa fie nevoita sa faca ajustari majore in stilul de viata (ex. vanzarea unor bunuri, ore suplimentare / al doilea job etc.)",
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
            delay: 1500,
            nextStep: () => 'deces.show_deficit_1_explanation'
        },
        show_deficit_1_explanation: {
            message: (data) => `Aceasta suma reprezinta deficitul pentru ${data.period} ani pentru mentinerea standardului de viata, respectiv pentru linistea sufleteasca si confortul financiar necesar celor dragi care fac mai usoara acomodarea la noua realitate.
<br><br>
Esti pregatit(a) sa mai facem un pas?`,
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_event_costs_intro'
        },
        ask_event_costs_intro: {
            message: () => "2. In cazul unui posibil deces, evenimentul in sine este insotit de anumite cheltuieli (ex. inmormantare, taxe succesorale etc.)",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            delay: 800,
            nextStep: () => 'deces.ask_event_costs_prompt'
        },
        ask_event_costs_prompt: {
            message: () => "Care ar fi aceasta suma?",
            actionType: 'input',
            options: { placeholder: 'Ex: 25000', type: 'number', defaultValue: 0 },
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
            message: () => " 3. In cazul unui posibil deces, exista anumite proiecte in desfasurare la acest moment care ar avea de suferit (ex. o constructie la stadiu „la rosu” sau un sport de performanta al copiilor sau alte proiecte care sunt sustinute din finantele tale lunare)? \n\n Care ar fi suma totala de bani (in lei) necesara finalizarii acestor proiecte?",
            actionType: 'input',
            options: { placeholder: 'Ex: 250000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.projects = Number(response); },
            nextStep: () => 'deces.show_deficit_3_amount'
        },
        show_deficit_3_amount: {
             message: (data) => `<span class="text-2xl font-bold">${Number(data.projects).toLocaleString('ro-RO')} lei</span>`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            delay: 1500,
            nextStep: () => 'deces.ask_debts'
        },
        ask_debts: {
            message: () => "4. In cazul unui posibil deces, raman pe umerii familiei anumite responsabilitati financiare de tip credite, datorii, obligatii financiare etc.?\n\n Care ar fi suma de bani de care ar avea nevoie pentru a stinge aceste obligatii (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 400000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.debts = Number(response); },
            nextStep: () => 'deces.show_deficit_4_amount'
        },
        show_deficit_4_amount: {
            message: (data) => `<span class="text-2xl font-bold">${Number(data.debts).toLocaleString('ro-RO')} lei</span>`,
           actionType: 'buttons',
           options: [],
           autoContinue: true,
           delay: 1500,
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
            delay: 1500,
            nextStep: () => 'deces.ask_insurance'
        },
        ask_insurance: {
            message: () => "5. In cazul unui posibil deces, familia ta ar beneficia de vreo asigurare de viata pe numele tau? Nu ma refer la acele asigurari care sunt cesionate in favoarea bancii, ci acele asigurari care sa aiba ca beneficiar - familia ta.\n\nDaca da, care este suma de bani pe care ai tai ar incasa-o dintr-o astfel de asigurare de viata (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 125000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.existingInsurance = Number(response); },
            nextStep: () => 'deces.ask_savings'
        },
        ask_savings: {
            message: () => "6. In cazul unui posibil deces, familia ta ar putea accesa anumite economii sau ar putea apela la anumite investitii (ex. chirii, vanzarea unui imobil etc.)?\n\nDaca da, care este suma de bani disponibila?",
            actionType: 'input',
            options: { placeholder: 'Ex: 75000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.savings = Number(response); },
            nextStep: () => 'deces.show_final_deficit_intro'
        },
        show_final_deficit_intro: {
            message: () => "Sumele rezultate din asigurari de viata cu beneficiar familia si sumele de bani rezultate din economii / investitii vor fi scazute din suma-deficit calcultata anterior.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_final_deficit_context_1'
        },
        show_final_deficit_context_1: {
            message: () => "Deficitul financiar cu care familia ta ar pasi in acest viitor sumbru daca n-ar mai putea conta pe sprijinul tau financiar este:",
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
            delay: 1500,
            nextStep: () => 'deces.ask_feeling_buttons'
        },
        ask_feeling_buttons: {
            message: () => `Cum ti se pare aceasta suma? Care este sentimentul pe care il simti acum?`,
            actionType: 'input',
            options: { placeholder: 'Scrie aici...', type: 'text' },
            handler: (response, data) => { data.feeling = response; },
            nextStep: () => 'deces.ask_dramatic_options'
        },
        ask_dramatic_options: {
            message: () => "In acest scenariu de imaginatie sumbru, ce optiuni ar avea cei dragi ai tai pentru a mentine un oarecare echilibru in standardul de viata?\n\nBifeaza optiunile realiste si cu care tu te simti confortabil pentru ai tai:",
            actionType: 'interactive_scroll_list',
            options: {
                options: [
                    'Sa se mute cu parintii',
                    'Sa se mute in alt oras',
                    'Sa munceasca suplimentar sau la al doilea job (si sa dispara din viata copiilor)',
                    'Sa vanda din bunurile personale',
                    'Sa vanda casa / apartamentul',
                    'Sa reduca drastic cheltuieli / sa renunte la hobby-uri',
                    'Sa renunte la proiecte personale',
                    'Sa amane educatia copiilor sau sa se multumeasca cu foarte putin',
                    'Sa ceara in mod constant ajutor de la familiei si de la prieteni',
                    'Sa renunte la economiile / investitiile existente',
                    'Sa se mute in locuinta mai mica',
                    'Sa accepte orice compromis major pentru a supravietui financiar',
                    'Sa se casatoreasca din obligatii financiare',
                    'Altceva'
                ],
                buttonText: "Am bifat"
            },
            handler: (response, data) => { data.dramaticOptions = response; },
            nextStep: () => 'deces.present_solution'
        },
        present_solution: {
            message: () => "Daca nu esti foarte multumit cu optiunile pe care familia ta le are pentru a mentine standardul actual de viata, ai fi interesat sa vezi o solutie personalizata care sa ofere celor dragi tie o a doua sansa la o viata relativ normala, fara poveri financiare?\n\nPractic, o solutie prin care dragostea ta si grija ta pentru ei va continua chiar si dupa tine. \n\nPoti crea instant o mostenire care sa ii ajute financiar pe cei dragi tie chiar si (mai ales!) in absenta ta!",
            actionType: 'buttons',
            options: ['Da', 'Nu'],
            nextStep: (response) => response === 'Da' ? 'deces.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
            message: () => "Am nevoie de datele tale de contact (nume, telefon, email), iar in cel mai scurt timp posibil, consultantul care ti-a dat acest link te va contacta pentru construirea solutiei.\n\nDe asemenea, am rugamintea sa semnezi si un acord GDPR care sa ii permita consultantului sa te contacteze intr-un cadru legal.",
            actionType: 'form',
            options: {
                fields: [
                    { name: 'name', placeholder: 'Nume Prenume', type: 'text', required: true },
                    { name: 'email', placeholder: 'Email', type: 'email', required: true },
                    { name: 'phone', placeholder: 'Telefon', type: 'tel', required: true },
                ],
                gdpr: 'Sunt de acord cu prelucrarea datelor personale.',
                buttonText: 'Trimite'
            },
            handler: (response, data) => { data.contact = response; },
            nextStep: () => 'deces.thank_you_contact'
        },
        thank_you_contact: {
            message: () => "Multumesc pentru ca mi-ai raspuns la intrebari, te voi contacta in curand!\n\nCand preferi sa fii contactat?",
            actionType: 'buttons',
            options: ['Dimineata', 'Dupa-masa', 'Seara'],
            handler: (response, data) => { data.preferredContactTime = response; },
            nextStep: () => 'deces.thank_you_final'
        },
        thank_you_final: {
            message: () => `<div class="text-center w-full text-2xl font-bold">Multumesc!<br>O zi frumoasa!</div>`,
            actionType: 'end',
            nextStep: () => ''
        }
    },
    boala_grava: {
        start_flow: {
            message: () => "Am inteles. Protejarea stabilitatii tale financiare in fata provocarilor medicale este esentiala.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'boala_grava.ask_monthly_need_health'
        },
        ask_monthly_need_health: {
            message: () => "Mai intai, care este suma lunara (in €) de care ai avea nevoie pentru a acoperi cheltuielile curente daca nu ai mai putea genera venit?",
            actionType: 'input',
            options: { placeholder: 'Ex: 1500', type: 'number' },
            handler: (response, data) => { data.monthlyNeed = Number(response); },
            nextStep: () => 'boala_grava.ask_recovery_period'
        },
        ask_recovery_period: {
            message: () => "Pentru ce perioada (in luni) estimezi ca ai avea nevoie de acest sprijin financiar pentru recuperare?",
            actionType: 'buttons',
            options: ['6 luni', '12 luni', '24 luni'],
            handler: (response, data) => { data.recoveryPeriod = parseInt(response); },
            nextStep: () => 'boala_grava.ask_medical_costs'
        },
        ask_medical_costs: {
            message: () => "Ce suma unica (in €) estimezi ca ar fi necesara pentru costuri medicale (tratamente, interventii, medicamente) neacoperite de stat?",
            actionType: 'input',
            options: { placeholder: 'Ex: 20000', type: 'number' },
            handler: (response, data) => { data.medicalCosts = Number(response); },
            nextStep: () => 'boala_grava.ask_existing_savings_health'
        },
        ask_existing_savings_health: {
            message: () => "Ai deja o asigurare privata de sanatate sau economii dedicate pentru urgente medicale? Daca da, care este suma totala?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.existingSavings = Number(response); },
            nextStep: () => 'boala_grava.show_health_deficit'
        },
        show_health_deficit: {
            message: (data) => {
                data.healthDeficit = calculateHealthDeficit(data);
                return `Am calculat. Necesarul financiar pentru a trece peste o perioada dificila este de ${data.healthDeficit.toLocaleString('ro-RO')} €.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'boala_grava.show_impact_health'
        },
        show_impact_health: {
            message: () => "A avea aceasta siguranta inseamna ca te poti concentra 100% pe recuperare, fara stresul banilor si fara a afecta economiile familiei.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'boala_grava.ask_dob_health'
        },
        ask_dob_health: {
            message: () => "Pentru a-ti oferi o estimare de cost, mai am nevoie de data nasterii.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response; },
            nextStep: () => 'boala_grava.ask_solution_health'
        },
        ask_solution_health: {
            message: (data) => {
                data.premium = Math.max(25, Math.round(data.healthDeficit / 150)); // Simplified
                return `O asigurare de sanatate care sa acopere un risc de ${data.healthDeficit.toLocaleString('ro-RO')} € ar avea un cost estimat de ${data.premium.toLocaleString('ro-RO')} € pe luna. Doresti sa afli mai multe de la un consultant?`;
            },
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'boala_grava.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
             message: () => "Perfect. Pentru a stabili o discutie cu un consultant, te rog sa completezi datele de mai jos. Acestea sunt confidentiale si vor fi folosite exclusiv in acest scop.",
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
            message: () => "Excelenta alegere! Planificarea pensiei este cheia unui viitor linistit.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'pensionare.ask_desired_pension'
        },
        ask_desired_pension: {
            message: () => "Mai intai, ce suma lunara (in €) ti-ai dori sa ai la pensie, in banii de azi?",
            actionType: 'input',
            options: { placeholder: 'Ex: 1500', type: 'number' },
            handler: (response, data) => { data.desiredPension = Number(response); },
            nextStep: () => 'pensionare.ask_retirement_age'
        },
        ask_retirement_age: {
            message: () => "La ce varsta ti-ai dori sa te pensionezi?",
            actionType: 'input',
            options: { placeholder: 'Ex: 65', type: 'number' },
            handler: (response, data) => { data.retirementAge = Number(response); },
            nextStep: () => 'pensionare.ask_current_savings_pension'
        },
        ask_current_savings_pension: {
            message: () => "Ai deja o suma economisita special pentru pensie (Pilon 2, Pilon 3, alte investitii)? Daca da, care este valoarea ei actuala?",
            actionType: 'input',
            options: { placeholder: 'Ex: 10000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.currentSavings = Number(response); },
            nextStep: () => 'pensionare.ask_dob_pension'
        },
        ask_dob_pension: {
            message: () => "Pentru a-ti oferi un plan, am nevoie si de data ta de nastere.",
            actionType: 'date',
            handler: (response, data) => { data.birthDate = response; },
            nextStep: () => 'pensionare.show_retirement_plan'
        },
        show_retirement_plan: {
            message: (data) => {
                data.monthlyContribution = calculateRetirementContribution(data);
                return `Am calculat. Pentru a atinge obiectivul tau, ar fi necesar sa economisesti/investesti aproximativ ${data.monthlyContribution.toLocaleString('ro-RO')} € pe luna, pana la varsta de pensionare.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'pensionare.ask_solution_pension'
        },
        ask_solution_pension: {
            message: () => "Vestea buna este ca, prin instrumente de investitii inteligente, poti pune banii la treaba pentru tine. Doresti sa discuti cu un consultant despre un plan de acumulare personalizat?",
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'pensionare.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
             message: () => "Perfect. Pentru a stabili o discutie cu un consultant, te rog sa completezi datele de mai jos. Acestea sunt confidentiale si vor fi folosite exclusiv in acest scop.",
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
            message: () => "O decizie minunata! Investitia in educatia copiilor este cel mai de pret cadou.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'studii_copii.ask_studies_goal'
        },
        ask_studies_goal: {
            message: () => "Mai intai, care este suma totala (in €) pe care estimezi ca o vei avea nevoie pentru studiile copilului tau?",
            actionType: 'input',
            options: { placeholder: 'Ex: 50000', type: 'number' },
            handler: (response, data) => { data.studiesGoal = Number(response); },
            nextStep: () => 'studii_copii.ask_child_age'
        },
        ask_child_age: {
            message: () => "Care este varsta actuala a copilului?",
            actionType: 'input',
            options: { placeholder: 'Ex: 5', type: 'number' },
            handler: (response, data) => { data.childAge = Number(response); },
            nextStep: () => 'studii_copii.ask_current_savings_studies'
        },
        ask_current_savings_studies: {
            message: () => "Ai deja o suma economisita special pentru acest scop? Daca da, care este valoarea ei?",
            actionType: 'input',
            options: { placeholder: 'Ex: 2000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.currentSavings = Number(response); },
            nextStep: () => 'studii_copii.show_studies_plan'
        },
        show_studies_plan: {
            message: (data) => {
                data.monthlyContribution = calculateStudiesContribution(data);
                return `Am calculat. Pentru a atinge obiectivul tau pana la majoratul copilului, ar fi necesar sa economisesti ${data.monthlyContribution.toLocaleString('ro-RO')} € pe luna.`;
            },
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'studii_copii.ask_solution_studies'
        },
        ask_solution_studies: {
            message: () => "Prin produse dedicate, cum ar fi asigurarile de studii, poti asigura acest viitor chiar si in situatii neprevazute. Doresti sa afli mai multe de la un consultant?",
            actionType: 'buttons',
            options: ['Da, vreau detalii', 'Nu acum'],
            nextStep: (response) => response === 'Da, vreau detalii' ? 'studii_copii.ask_contact_details' : 'common.end_dialog_friendly'
        },
        ask_contact_details: {
             message: () => "Perfect. Pentru a stabili o discutie cu un consultant, te rog sa completezi datele de mai jos. Acestea sunt confidentiale si vor fi folosite exclusiv in acest scop.",
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
            message: () => "Am inteles. Iti multumesc pentru timpul acordat! Daca te razgandesti, stii unde ma gasesti.",
            actionType: 'end',
            nextStep: () => ''
        },
        end_dialog_success: {
            message: () => "Multumesc! Datele tale au fost inregistrate. Un consultant te va suna in curand. O zi excelenta!",
            actionType: 'end',
            nextStep: () => ''
        }
    }
};

const introFlow: ConversationFlow = {
    intro_1: {
        message: () => `Viata produce pierderi financiare semnificative in patru situatii majore.`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 1200,
        nextStep: () => 'intro_2',
    },
    intro_2: {
        message: () => `Dintre acestea, doua situatii sunt previzibile, precis asezate pe axa vietii, iar doua sunt total imprevizibile.`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 1200,
        nextStep: () => 'intro_3',
    },
    intro_3: {
        message: () => `<strong>Previzibile:</strong> \n\n
1. Pensionarea - reducerea drastica a optiunilor, a demnitatii si a statutului de sustinator al familiei\n\n
2. Studiile copiilor - cheltuieli complexe, unele neanticipate, care pun presiune pe bugetul familiei`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 1200,
        nextStep: () => 'intro_4',
    },
    intro_4: {
        message: () => `<strong>Imprevizibile:</strong> \n\n
1. Decesul - detoneaza standardul de viata, proiectele in desfasurare si viitorul copiilor \n\n
2. Bolile grave - Accident Vascular cerebral, Cancer, Infarct Miocardic, Transplant, etc,`,
        actionType: 'buttons',
        options: [],
        autoContinue: true,
        delay: 2500,
        nextStep: () => 'ask_priority',
    },
    ask_priority: {
        message: () => "Pentru care dintre aceste subiecte doresti sa iti calculezi gradul de expunere financiara?",
        actionType: 'multi_choice',
        options: [
            { label: 'Reducerea drastica a veniturilor la pensionare', id: 'pensionare', disabled: true },
            { label: 'Asigurarea viitorului copiilor', id: 'studii_copii', disabled: true },
            { label: 'Decesul spontan', id: 'deces', disabled: false },
            { label: 'Protectie in caz de boala grava', id: 'boala_grava', disabled: true }
        ],
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
    const commonStepId = stepId.includes('.') ? stepId.split('.')[1] : stepId;
    if (conversationFlows.common[commonStepId]) {
         return conversationFlows.common[commonStepId];
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

    const typeMessage = useCallback(async (text: string, messageId: number, baseDelay: number = 10) => {
        let currentText = '';
        let isTag = false;
        
        for (const char of text) {
            if (char === '<') isTag = true;
            
            currentText += char;
            
            if (char === '>') isTag = false;

            if (!isTag) {
                 updateMessage(messageId, currentText);
                 await new Promise(resolve => setTimeout(resolve, baseDelay));
            }
        }
         // Final update to ensure full content with tags is rendered instantly
        updateMessage(messageId, text);
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

            const typingDelay = step.delay === 1500 ? 50 : 10;
            await typeMessage(messageContent, messageId, typingDelay);
        }

        if (step.autoContinue) {
             const delay = step.delay || 1200;
             await new Promise(resolve => setTimeout(resolve, delay));
             const nextStepId = step.nextStep();
             renderStep(nextStepId);
        } else {
            setCurrentUserAction({ type: step.actionType, options: step.options });
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
        
        let userMessageContent: string | null = Array.isArray(response) 
            ? response.join(', ')
            : responseValue;

        if (typeof response === 'object' && response !== null) {
            if (response.name) {
                userMessageContent = `Nume: ${response.name}, Email: ${response.email}, Telefon: ${response.phone}`;
            } else if (response instanceof Date) {
                 userMessageContent = format(response, "dd/MM/yyyy");
            } else if (response.label) {
                userMessageContent = response.label;
            }
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

    

    