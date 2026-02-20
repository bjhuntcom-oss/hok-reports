"use client";

import { Building2, Shield, Zap, Clock, FileText, Mic, Lock, Globe } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function AboutPage() {
  const { locale } = useAppStore();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {locale === "en" ? "Overview" : "Présentation"}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">
          {locale === "en" ? "About HOK Reports" : "À propos de HOK Reports"}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {locale === "en" ? "Discover the Cabinet HOK document management platform." : "Découvrez la plateforme de gestion documentaire du Cabinet HOK."}
        </p>
      </div>

      <div className="border border-neutral-200 bg-white p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-black">
            <span className="text-lg font-black text-white">H</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-black">HOK Reports</p>
            <p className="text-[11px] text-neutral-400">Version 1.0.0 — Cabinet HOK</p>
          </div>
        </div>
        <div className="mt-6 h-px bg-neutral-100" />
        <p className="mt-6 text-[13px] leading-relaxed text-neutral-600">
          {locale === "en" 
            ? "HOK Reports is an internal document management platform, designed and developed specifically for Cabinet HOK. It meets the daily needs of lawyers and collaborators in legal information processing: work session recording, automated transcription, structured report generation and secure archiving."
            : "HOK Reports est une plateforme de gestion documentaire interne, conçue et développée spécifiquement pour le Cabinet HOK. Elle répond aux besoins quotidiens des avocats et collaborateurs en matière de traitement de l'information juridique : enregistrement de sessions de travail, transcription automatisée, génération de comptes rendus structurés et archivage sécurisé."}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">
          {locale === "en"
            ? "The platform relies on a state-of-the-art language processing engine, seamlessly integrated to provide transcription accuracy and analysis quality tailored to the requirements of the legal profession."
            : "La plateforme s'appuie sur un moteur de traitement du langage de dernière génération, intégré de manière transparente pour offrir une précision de transcription et une qualité d'analyse adaptées aux exigences de la profession d'avocat."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          {
            icon: Mic,
            title: locale === "en" ? "Integrated Recording" : "Enregistrement intégré",
            desc: locale === "en" ? "Record your sessions directly from the platform. Clean interface, full audio flow control." : "Enregistrez directement vos sessions depuis la plateforme. Interface épurée, contrôle total du flux audio.",
          },
          {
            icon: FileText,
            title: locale === "en" ? "Accurate Transcription" : "Transcription fidèle",
            desc: locale === "en" ? "High-precision audio-to-text conversion. Support for French and English." : "Conversion audio-texte de haute précision. Prise en charge du français et de l'anglais.",
          },
          {
            icon: Zap,
            title: locale === "en" ? "Automated Reports" : "Rapports automatisés",
            desc: locale === "en" ? "Structured report generation: summary, key points, recommended actions, legal observations." : "Génération de rapports structurés : résumé, points clés, actions recommandées, observations juridiques.",
          },
          {
            icon: Clock,
            title: locale === "en" ? "Fast Processing" : "Traitement rapide",
            desc: locale === "en" ? "Average processing time under three minutes for a one-hour recording." : "Délai moyen de traitement inférieur à trois minutes pour un enregistrement d'une heure.",
          },
          {
            icon: Lock,
            title: locale === "en" ? "Guaranteed Confidentiality" : "Confidentialité garantie",
            desc: locale === "en" ? "Encrypted data, authenticated access, hosting compliant with professional secrecy requirements." : "Données chiffrées, accès authentifié, hébergement conforme aux exigences du secret professionnel.",
          },
          {
            icon: Shield,
            title: locale === "en" ? "Complete Administration" : "Administration complète",
            desc: locale === "en" ? "Centralized user management, activity tracking, access control and real-time supervision." : "Gestion centralisée des utilisateurs, suivi d'activité, contrôle des accès et supervision en temps réel.",
          },
          {
            icon: Globe,
            title: locale === "en" ? "Multilingual" : "Multilingue",
            desc: locale === "en" ? "Interface available in French and English." : "Interface disponible en français et en anglais.",
          },
          {
            icon: Building2,
            title: locale === "en" ? "Proprietary Solution" : "Solution propriétaire",
            desc: locale === "en" ? "Developed in-house by Cabinet HOK, the platform is tailored to the firm's business processes." : "Développée en interne par le Cabinet HOK, la plateforme est adaptée aux processus métier du cabinet.",
          },
        ].map((f) => (
          <div key={f.title} className="border border-neutral-200 bg-white p-5">
            <f.icon size={16} className="text-neutral-400" />
            <h3 className="mt-3 text-[12px] font-bold text-black">{f.title}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
          {locale === "en" ? "Contact and Support" : "Contact et support"}
        </h2>
        <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
          {locale === "en" 
            ? "For any technical questions or assistance requests, contact the platform administrator at the following address:"
            : "Pour toute question technique ou demande d'assistance, contactez l'administrateur de la plateforme à l'adresse suivante :"}
        </p>
        <p className="mt-2 text-[12px] font-medium text-black">
          support@cabinet-hok.fr
        </p>
        <p className="mt-4 text-[10px] text-neutral-300">
          &copy; {new Date().getFullYear()} Cabinet HOK. {locale === "en" ? "All rights reserved. Internal use only." : "Tous droits réservés. Usage interne exclusivement."}
        </p>
      </div>
    </div>
  );
}
