"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";

export default function Confidentialite() {
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
          Protection des données
        </p>
        <h1 className="mt-3 text-[28px] font-semibold text-black">Politique de confidentialité</h1>
        <div className="mt-2 h-px w-12 bg-black" />

        <div className="mt-12 space-y-10 text-[13px] leading-relaxed text-neutral-600">
          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              1. Responsable du traitement
            </h2>
            <p>
              Le responsable du traitement des données collectées via la plateforme
              HOK Reports est le Cabinet HOK, cabinet d&apos;avocats établi à Cotonou,
              République du Bénin, représenté par son dirigeant.
              Le Cabinet s&apos;engage à protéger la vie privée de ses utilisateurs
              conformément à la loi n° 2009-09 du 22 mai 2009 portant protection
              des données à caractère personnel en République du Bénin, à la loi
              n° 2017-20 du 20 avril 2018 portant Code du numérique, et aux
              dispositions de l&apos;Autorité de Protection des Données Personnelles (APDP).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              2. Données collectées
            </h2>
            <p>Dans le cadre de l&apos;utilisation de la plateforme, les données suivantes peuvent être collectées :</p>
            <ul className="mt-3 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span><span className="font-medium text-black">Données d&apos;identification :</span> nom, prénom, adresse email professionnelle</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span><span className="font-medium text-black">Données de connexion :</span> date et heure de connexion, adresse IP, journal d&apos;activité</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span><span className="font-medium text-black">Données métier :</span> enregistrements audio, transcriptions, rapports générés, notes de session</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span><span className="font-medium text-black">Données techniques :</span> type de navigateur, système d&apos;exploitation, préférences d&apos;interface</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              3. Finalités du traitement
            </h2>
            <p>Les données sont traitées pour les finalités suivantes :</p>
            <ul className="mt-3 space-y-2">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Gestion des comptes utilisateurs et authentification sécurisée</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Traitement des enregistrements audio et génération de transcriptions</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Production de rapports juridiques structurés</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Amélioration continue de la qualité du service</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-black" />
                <span>Administration et supervision de la plateforme</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              4. Base légale du traitement
            </h2>
            <p>
              Le traitement des données repose sur l&apos;exécution du contrat de travail
              ou de collaboration liant l&apos;utilisateur au Cabinet HOK, conformément
              aux articles 394 et suivants du Code du numérique béninois, ainsi que
              sur l&apos;intérêt légitime du Cabinet à assurer le bon fonctionnement de ses
              outils internes de productivité et le respect du secret professionnel
              tel que prévu par la loi n° 2014-20 portant réglementation de la
              profession d&apos;avocat au Bénin.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              5. Durée de conservation
            </h2>
            <p>
              Les données personnelles sont conservées pendant la durée de la relation
              contractuelle avec l&apos;utilisateur. À l&apos;issue de cette relation, les données
              sont archivées pour une durée conforme aux obligations légales applicables
              à la profession d&apos;avocat au Bénin et aux règles de conservation prévues
              par le Code du numérique, puis supprimées de manière sécurisée.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              6. Sécurité des données
            </h2>
            <p>
              Le Cabinet HOK met en œuvre des mesures techniques et organisationnelles
              appropriées pour protéger les données contre tout accès non autorisé,
              toute altération, divulgation ou destruction. Les communications sont
              chiffrées et les accès sont strictement contrôlés par authentification.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              7. Droits des utilisateurs
            </h2>
            <p>
              Conformément à la loi n° 2009-09 du 22 mai 2009 et au Code du numérique
              béninois, chaque utilisateur dispose des droits suivants sur ses données
              personnelles : droit d&apos;accès, de rectification, d&apos;effacement, de limitation
              du traitement, de portabilité et d&apos;opposition. Ces droits peuvent être
              exercés par courrier électronique à l&apos;adresse : dpo@cabinet-hok.bj.
              En cas de litige, l&apos;utilisateur peut saisir l&apos;Autorité de Protection
              des Données Personnelles (APDP) du Bénin.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              8. Cookies
            </h2>
            <p>
              La plateforme utilise des cookies strictement nécessaires à son
              fonctionnement (authentification, préférences de session). Des cookies
              analytiques optionnels peuvent être activés avec le consentement
              de l&apos;utilisateur. Les préférences de cookies sont modifiables à tout
              moment depuis le bandeau de consentement ou les paramètres du compte.
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
