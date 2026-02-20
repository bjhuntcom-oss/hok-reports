"use client";

import { BookOpen, Mic, FileText, Upload, Shield, Settings, HelpCircle, ExternalLink, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

const getSections = (locale: string) => [
  {
    id: "getting-started",
    icon: HelpCircle,
    title: locale === "en" ? "Getting Started" : "Prise en main",
    content: [
      {
        q: locale === "en" ? "How do I access the platform?" : "Comment accéder à la plateforme ?",
        a: locale === "en" ? "Log in using the email address and password provided by the Cabinet HOK administrator. If you don't have credentials yet, submit an access request from the login page." : "Connectez-vous à l'aide de l'adresse email et du mot de passe fournis par l'administrateur du Cabinet HOK. Si vous ne disposez pas encore d'identifiants, soumettez une demande d'accès depuis la page de connexion.",
      },
      {
        q: locale === "en" ? "What languages are supported?" : "Quelles sont les langues prises en charge ?",
        a: locale === "en" ? "The interface is available in French and English. The transcription engine supports French and English." : "L'interface est disponible en français et en anglais. Le moteur de transcription prend en charge le français et l'anglais.",
      },
      {
        q: locale === "en" ? "How do I change my password?" : "Comment modifier mon mot de passe ?",
        a: locale === "en" ? "Go to the 'My Profile' section from the sidebar or user menu at the top right. You will find the password change form there." : "Accédez à la section « Mon profil » depuis le menu latéral ou le menu utilisateur en haut à droite. Vous y trouverez le formulaire de modification du mot de passe.",
      },
    ],
  },
  {
    id: "sessions",
    icon: Mic,
    title: locale === "en" ? "Recording Sessions" : "Sessions d'enregistrement",
    content: [
      {
        q: locale === "en" ? "How do I create a new session?" : "Comment créer une nouvelle session ?",
        a: locale === "en" ? "Click on 'New Session' in the sidebar. Fill in the case information (title, client name, reference), then start the audio recording. You can pause and resume recording at any time." : "Cliquez sur « Nouvelle session » dans le menu latéral. Renseignez les informations du dossier (titre, nom du client, référence), puis démarrez l'enregistrement audio. Vous pouvez mettre en pause et reprendre l'enregistrement à tout moment.",
      },
      {
        q: locale === "en" ? "What audio formats are accepted?" : "Quels formats audio sont acceptés ?",
        a: locale === "en" ? "The integrated recording captures sound in WebM format. If you import a file, WAV, MP3, M4A, OGG and WebM formats are accepted. The recommended maximum size is 100 MB per file." : "L'enregistrement intégré capture le son au format WebM. Si vous importez un fichier, les formats WAV, MP3, M4A, OGG et WebM sont acceptés. La taille maximale recommandée est de 100 Mo par fichier.",
      },
      {
        q: locale === "en" ? "How do I find a past session?" : "Comment retrouver une session passée ?",
        a: locale === "en" ? "The session list is accessible from the 'Sessions' menu. Use the search bar to filter by title, client name or case reference. You can also filter by status." : "La liste des sessions est accessible depuis le menu « Sessions ». Utilisez la barre de recherche pour filtrer par titre, nom de client ou référence de dossier. Vous pouvez également filtrer par statut.",
      },
    ],
  },
  {
    id: "transcription",
    icon: FileText,
    title: locale === "en" ? "Transcription and Reports" : "Transcription et rapports",
    content: [
      {
        q: locale === "en" ? "How do I start a transcription?" : "Comment lancer une transcription ?",
        a: locale === "en" ? "From the session detail page, click on 'Start transcription'. The processing engine analyzes the audio recording and produces an accurate text transcription. The average time is two to three minutes for a one-hour recording." : "Depuis la page de détail d'une session, cliquez sur « Lancer la transcription ». Le moteur de traitement analyse l'enregistrement audio et produit une transcription textuelle fidèle. Le délai moyen est de deux à trois minutes pour un enregistrement d'une heure.",
      },
      {
        q: locale === "en" ? "How do I generate a report?" : "Comment générer un rapport ?",
        a: locale === "en" ? "Once the transcription is complete, click on 'Generate report'. Choose the desired format (brief, standard or detailed). The report contains a summary, key points, recommended actions and legal observations." : "Une fois la transcription terminée, cliquez sur « Générer le rapport ». Choisissez le format souhaité (bref, standard ou détaillé). Le rapport produit contient un résumé, les points clés, les actions recommandées et les observations juridiques.",
      },
      {
        q: locale === "en" ? "Can I edit a generated report?" : "Puis-je modifier un rapport généré ?",
        a: locale === "en" ? "Reports with 'draft' status can be regenerated. Once finalized, the report is locked to ensure document integrity. You can archive a finalized report if necessary." : "Les rapports au statut « brouillon » peuvent être régénérés. Une fois finalisé, le rapport est verrouillé pour garantir l'intégrité du document. Vous pouvez archiver un rapport finalisé si nécessaire.",
      },
    ],
  },
  {
    id: "import",
    icon: Upload,
    title: locale === "en" ? "File Import" : "Import de fichiers",
    content: [
      {
        q: locale === "en" ? "How do I import an existing audio file?" : "Comment importer un fichier audio existant ?",
        a: locale === "en" ? "From the session creation page, after filling in the case information, you can choose to import an audio file instead of using the integrated recording. Drag and drop the file or use the file selector." : "Depuis la page de création de session, après avoir renseigné les informations du dossier, vous pouvez choisir d'importer un fichier audio au lieu d'utiliser l'enregistrement intégré. Glissez-déposez le fichier ou utilisez le sélecteur de fichiers.",
      },
      {
        q: locale === "en" ? "Can I import multiple files for the same session?" : "Puis-je importer plusieurs fichiers pour une même session ?",
        a: locale === "en" ? "Each session is associated with a single audio recording. If your case has multiple recordings, create a separate session for each one." : "Chaque session est associée à un seul enregistrement audio. Si votre dossier comporte plusieurs enregistrements, créez une session distincte pour chacun d'entre eux.",
      },
    ],
  },
  {
    id: "admin",
    icon: Shield,
    title: locale === "en" ? "Administration" : "Administration",
    content: [
      {
        q: locale === "en" ? "How do I manage users?" : "Comment gérer les utilisateurs ?",
        a: locale === "en" ? "Administrators access the administration panel from the 'Administration' menu. You can view the user list, modify their roles, block or delete accounts, and track each collaborator's activity." : "Les administrateurs accèdent au panneau d'administration depuis le menu « Administration ». Vous pouvez y consulter la liste des utilisateurs, modifier leurs rôles, bloquer ou supprimer des comptes, et suivre l'activité de chaque collaborateur.",
      },
      {
        q: locale === "en" ? "How do I configure the processing engine?" : "Comment configurer le moteur de traitement ?",
        a: locale === "en" ? "Go to 'Settings' and enter the processing engine activation key in the dedicated section. This operation is reserved for administrators and should only be performed once." : "Rendez-vous dans « Paramètres » et renseignez la clé d'activation du moteur de traitement dans la section dédiée. Cette opération est réservée aux administrateurs et ne doit être effectuée qu'une seule fois.",
      },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: locale === "en" ? "Settings and Preferences" : "Paramètres et préférences",
    content: [
      {
        q: locale === "en" ? "How do I change the interface language?" : "Comment changer la langue de l'interface ?",
        a: locale === "en" ? "Use the language selector in the top bar or go to 'Settings'. The change is immediate and saved locally in your browser." : "Utilisez le sélecteur de langue dans la barre supérieure ou rendez-vous dans « Paramètres ». Le changement est immédiat et enregistré localement dans votre navigateur.",
      },
      {
        q: locale === "en" ? "Is my data secure?" : "Mes données sont-elles sécurisées ?",
        a: locale === "en" ? "All communications are encrypted. Data is stored on secure servers compliant with legal profession requirements. Access is strictly controlled by authentication and professional secrecy applies to all processed data." : "Toutes les communications sont chiffrées. Les données sont stockées sur des serveurs sécurisés conformes aux exigences de la profession d'avocat. L'accès est strictement contrôlé par authentification et le secret professionnel s'applique à l'ensemble des données traitées.",
      },
    ],
  },
];

export default function DocumentationPage() {
  const { locale } = useAppStore();
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = getSections(locale);
  const current = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {locale === "en" ? "Resources" : "Ressources"}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">
          {locale === "en" ? "Platform Documentation" : "Documentation de la plateforme"}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {locale === "en" ? "Complete user guide for HOK Reports. Browse the sections below to master all features." : "Guide d'utilisation complet de HOK Reports. Consultez les rubriques ci-dessous pour maîtriser l'ensemble des fonctionnalités."}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/platform-docs"
            className="inline-flex items-center gap-2 border border-black bg-black px-4 py-2 text-[11px] font-semibold tracking-wider text-white uppercase transition-colors hover:bg-neutral-800"
          >
            <ExternalLink size={13} />
            {locale === "en" ? "Full Technical Documentation" : "Documentation technique complète"}
          </Link>
          <a
            href="/docs/PLATFORM_DOCUMENTATION.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-4 py-2 text-[11px] font-semibold tracking-wider text-neutral-600 uppercase transition-colors hover:border-black hover:text-black"
          >
            <Download size={13} />
            {locale === "en" ? "Download PDF" : "Télécharger le PDF"}
          </a>
        </div>
      </div>

      <div className="flex gap-6">
        <nav className="w-56 flex-shrink-0 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-2.5 text-left text-[12px] font-medium transition-colors ${
                  activeSection === s.id
                    ? "border-black bg-neutral-100 text-black"
                    : "border-transparent text-neutral-400 hover:text-black"
                }`}
              >
                <Icon size={14} />
                {s.title}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
            <current.icon size={16} className="text-neutral-400" />
            <h2 className="text-[14px] font-semibold text-black">{current.title}</h2>
          </div>

          {current.content.map((item, i) => (
            <div key={i} className="border border-neutral-200 bg-white p-5">
              <p className="text-[13px] font-semibold text-black">{item.q}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
