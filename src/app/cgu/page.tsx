"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";

export default function CGU() {
  const { locale } = useAppStore();
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-neutral-200">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center bg-black">
              <span className="text-sm font-black text-white">H</span>
            </div>
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Cabinet HOK</span>
          </Link>
          <Link href="/login" className="text-[11px] font-medium text-neutral-400 hover:text-black">
            {locale === "en" ? "Back to login" : "Retour à la connexion"}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-[10px] font-semibold tracking-[0.3em] text-neutral-300 uppercase">
          Cadre contractuel
        </p>
        <h1 className="mt-3 text-[28px] font-semibold text-black">Conditions générales d&apos;utilisation</h1>
        <div className="mt-2 h-px w-12 bg-black" />

        <div className="mt-12 space-y-10 text-[13px] leading-relaxed text-neutral-600">
          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              1. Objet
            </h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU »)
              définissent les modalités d&apos;accès et d&apos;utilisation de la plateforme
              HOK Reports, outil interne de gestion documentaire développé par et
              pour le Cabinet HOK, cabinet d&apos;avocats inscrit au Barreau du Bénin,
              établi à Cotonou, République du Bénin.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              2. Acceptation des conditions
            </h2>
            <p>
              L&apos;accès à la plateforme implique l&apos;acceptation pleine et entière
              des présentes CGU. Tout utilisateur qui n&apos;accepte pas ces conditions
              doit s&apos;abstenir d&apos;utiliser la plateforme et en informer
              immédiatement l&apos;administrateur système.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              3. Comptes utilisateurs
            </h2>
            <p>
              Chaque utilisateur se voit attribuer un compte nominatif et personnel.
              L&apos;utilisateur est responsable de la confidentialité de ses identifiants
              de connexion et de toutes les actions effectuées depuis son compte.
              En cas de suspicion de compromission, l&apos;utilisateur doit en informer
              sans délai l&apos;administrateur de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              4. Utilisation autorisée
            </h2>
            <p>La plateforme est destinée exclusivement aux usages suivants :</p>
            <ul className="mt-3 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Enregistrement et archivage de sessions de travail (consultations, audiences, réunions)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Transcription automatisée d&apos;enregistrements audio</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Génération de rapports et comptes rendus structurés</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Consultation et exportation de l&apos;historique documentaire</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              5. Obligations de l&apos;utilisateur
            </h2>
            <p>L&apos;utilisateur s&apos;engage à :</p>
            <ul className="mt-3 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Utiliser la plateforme conformément à sa destination professionnelle</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Ne pas tenter de contourner les mesures de sécurité mises en place</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Signaler immédiatement tout dysfonctionnement ou faille de sécurité</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Respecter le secret professionnel applicable aux données traitées</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              6. Confidentialité des données traitées
            </h2>
            <p>
              Les enregistrements audio, transcriptions et rapports traités via
              la plateforme sont couverts par le secret professionnel tel que défini
              par la loi n° 2014-20 du 12 mai 2014 portant réglementation de la
              profession d&apos;avocat en République du Bénin. L&apos;utilisateur s&apos;interdit
              formellement de divulguer, copier ou transmettre ces données à des
              tiers non autorisés, sous peine de sanctions disciplinaires par le
              Barreau du Bénin et de poursuites judiciaires devant les juridictions
              compétentes de Cotonou.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              7. Disponibilité du service
            </h2>
            <p>
              Le Cabinet HOK s&apos;efforce d&apos;assurer une disponibilité optimale
              de la plateforme. Des interruptions programmées pour maintenance
              peuvent survenir et seront communiquées aux utilisateurs dans un
              délai raisonnable. Le Cabinet ne garantit pas une disponibilité
              ininterrompue du service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              8. Sanctions
            </h2>
            <p>
              Tout manquement aux présentes CGU peut entraîner la suspension
              immédiate du compte de l&apos;utilisateur, sans préjudice des éventuelles
              poursuites disciplinaires devant le Conseil de l&apos;Ordre du Barreau
              du Bénin ou judiciaires devant les tribunaux compétents de Cotonou
              que le Cabinet HOK se réserve le droit d&apos;engager, conformément aux
              dispositions du droit béninois et des Actes uniformes de l&apos;OHADA.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              9. Modification des CGU
            </h2>
            <p>
              Le Cabinet HOK se réserve le droit de modifier les présentes CGU
              à tout moment. Les utilisateurs seront informés de toute
              modification substantielle. La poursuite de l&apos;utilisation de la
              plateforme après notification vaut acceptation des CGU modifiées.
              Les présentes CGU sont régies par le droit béninois. Tout litige
              sera soumis à la compétence exclusive des tribunaux de Cotonou,
              République du Bénin.
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-neutral-100 pt-6 text-[10px] text-neutral-300">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
        </div>
      </div>
    </div>
  );
}
