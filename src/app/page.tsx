
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
(3.) a eventualelor credite / datorii.

Daca esti pregatit, haide sa continuam.`,
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
            delay: 1500, // Slower typing for this
            nextStep: () => 'deces.show_deficit_1_explanation'
        },
        show_deficit_1_explanation: {
            message: (data) => `Aceasta suma reprezinta deficitul pentru ${data.period} ani pentru mentinerea standardului de viata, respectiv pentru linistea sufleteasca si confortul financiar necesar celor dragi care fac mai usoara acomodarea la noua realitate.
<br><br>
Esti pregatit(a) sa mai facem un pas?`,
            actionType: 'buttons',
            options: ['Da'],
            nextStep: () => 'deces.ask_event_costs'
        },
        ask_event_costs: {
            message: () => "Care este suma (în lei) necesară pentru a acoperi cheltuielile neprevăzute (ex. inmormantare, taxe succesorale etc.)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 25000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.eventCosts = Number(response); },
            nextStep: () => 'deces.show_deficit_2'
        },
        show_deficit_2: {
            message: (data) => `Am obtinut a doua suma de bani - ${Number(data.eventCosts).toLocaleString('ro-RO')} lei - care se va regasi in deficitul total cu care familia ta s-ar confrunta in absenta ta.\n\nMai avem doua sume.\n\nMergem mai departe?`,
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
             message: (data) => `Am obtinut a treia suma de bani - ${Number(data.projects).toLocaleString('ro-RO')} lei care va fi inclusa in deficitul financiar care ar ramane in urma ta.\n\nMai rezisti?\n\nMai ai un singur pas prin acest „coridor” intunecat, apoi se va vedea „luminita” :)`,
            actionType: 'buttons',
            options: ['Hai sa vedem!'],
            nextStep: () => 'deces.ask_debts'
        },
        ask_debts: {
            message: () => "In cazul unui posibil deces, raman pe umerii familiei anumite responsabilitati financiare de tip credite, datorii, obligatii financiare etc.?\n\nDaca ai vrea sa stingi aceste obligatii financiare astfel incat familia sa nu poarte aceasta povara financiara, care ar fi suma de bani de care ar avea nevoie (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 400000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.debts = Number(response); },
            nextStep: () => 'deces.ask_show_brute_deficit_intro'
        },
        ask_show_brute_deficit_intro: {
            message: () => `Bun... Avem cele patru sume-deficit.`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_show_brute_deficit_context_1'
        },
        ask_show_brute_deficit_context_1: {
             message: () => `Esti pregatit sa vezi suma-deficit totala? <br><br>Suma de bani de care familia ta ar avea nevoie in absenta ta pentru a-i ajuta financiar.`,
             actionType: 'buttons',
             options: ['Da'],
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
            nextStep: () => 'deces.ask_insurance_intro'
        },
        ask_insurance_intro: {
            message: () => "Bun! Pentru a avea o imagine clara si corecta a necesarului financiar, vom mai explora doua domenii care ajuta in astfel de situatii:",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_insurance_context'
        },
        ask_insurance_context: {
            message: () => `(1.) existenta unor asigurari de viata care acopera decesul din orice cauza si<br>(2.) existenta unor economii sau a unor investitii la care familia ar putea apela`,
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.ask_insurance'
        },
        ask_insurance: {
            message: () => "In cazul unui posibil deces, familia ta ar beneficia de vreo asigurare de viata pe numele tau? Nu ma refer la acele asigurari care sunt cesionate in favoarea bancii, ci acele asigurari care sa aiba ca beneficiar - familia ta.\n\nDaca da, care este suma de bani pe care ai tai ar incasa-o dintr-o astfel de asigurare de viata (in lei)?",
            actionType: 'input',
            options: { placeholder: 'Ex: 125000', type: 'number', defaultValue: 0 },
            handler: (response, data) => { data.existingInsurance = Number(response); },
            nextStep: () => 'deces.ask_savings'
        },
        ask_savings: {
            message: () => "In cazul unui posibil deces, familia ta ar putea accesa anumite economii sau ar putea apela la anumite investitii (ex. chirii, vanzarea unui imobil etc.)?\n\nDaca da, care este suma de bani disponibila din economii / investitii pentru perioada de tranzitie pe care ai mentionat-o anterior?",
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
            message: () => "Si acum... suma-deficit finala cu care familia ta ar pasi in acest viitor sumbru daca n-ar mai putea conta pe sprijinul tau financiar.",
             actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_final_deficit_context_2'
        },
        show_final_deficit_context_2: {
            message: () => "Practic, vorbim despre mostenirea-negativa pe care ai lasa-o celor dragi tie.",
            actionType: 'buttons',
            options: [],
            autoContinue: true,
            nextStep: () => 'deces.show_final_deficit_context_3'
        },
        show_final_deficit_context_3: {
            message: () => "Asadar, suma-deficit totala este:",
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
            actionType: 'buttons',
            options: ['Nu îmi place ce văd', 'Interesant'],
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
            message: () => "Daca nu esti foarte multumit cu optiunile pe care familia ta le are pentru a mentine standardul actual de viata, ai fi interesat sa vezi o solutie personalizata care sa ofere celor dragi tie o a doua sansa la o viata relativ normala, fara poveri financiare?\n\nPractic, o solutie prin care dragostea ta si grija ta pentru ei va continua chiar si dupa tine. Poti crea instant o mostenire care sa ii ajute financiar pe cei dragi tie cu acele sume de bani pe care le-ai fi asigurat tu daca n-am fi venit pe rand si n-am fi plecat pe sarite...",
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
            message: () => "Mulțumesc pentru că mi-ai răspuns la întrebări, te voi contacta în curând!\n\nCând preferi să fii contactat?",
            actionType: 'buttons',
            options: ['Dimineața', 'După-masa', 'Seara'],
            handler: (response, data) => { data.preferredContactTime = response; },
            nextStep: () => 'deces.thank_you_final'
        },
        thank_you_final: {
            message: () => `<div class="text-center w-full text-2xl font-bold">Mulțumesc!<br>O zi frumoasă!</div>`,
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
        nextStep: () => 'ask_priority',
    },
    ask_priority: {
        message: () => "Pentru care dintre aceste subiecte dorești să îți calculezi gradul de expunere financiară?",
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

    

    