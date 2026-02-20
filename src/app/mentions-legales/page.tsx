"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";

export default function MentionsLegales() {
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
          Informations légales
        </p>
        <h1 className="mt-3 text-[28px] font-semibold text-black">Mentions légales</h1>
        <div className="mt-2 h-px w-12 bg-black" />

        <div className="mt-12 space-y-10 text-[13px] leading-relaxed text-neutral-600">
          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              1. Éditeur de la plateforme
            </h2>
            <p>
              La plateforme HOK Reports est éditée par le Cabinet HOK, cabinet d&apos;avocats
              inscrit au Barreau du Bénin, ci-après désigné « l&apos;Éditeur ».
            </p>
            <ul className="mt-3 space-y-1 text-[12px]">
              <li><span className="font-medium text-black">Raison sociale :</span> Cabinet HOK</li>
              <li><span className="font-medium text-black">Forme juridique :</span> Cabinet d&apos;avocats — Barreau du Bénin</li>
              <li><span className="font-medium text-black">Siège social :</span> Cotonou, République du Bénin</li>
              <li><span className="font-medium text-black">Téléphone :</span> +229 XX XX XX XX</li>
              <li><span className="font-medium text-black">Email :</span> contact@cabinet-hok.bj</li>
              <li><span className="font-medium text-black">Directeur de la publication :</span> Maître [Nom du Bâtonnier / Responsable]</li>
              <li><span className="font-medium text-black">RCCM :</span> RB/COT/XX/X-XXXXX</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              2. Hébergement
            </h2>
            <p>
              La plateforme est hébergée sur une infrastructure sécurisée conforme aux
              exigences de confidentialité propres à l&apos;exercice de la profession d&apos;avocat
              telles que définies par la loi n° 2014-20 du 12 mai 2014 portant réglementation
              de la profession d&apos;avocat en République du Bénin et le Règlement intérieur
              du Barreau du Bénin. Les données sont stockées sur des serveurs sécurisés
              conformes aux standards internationaux de protection des données.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              3. Propriété intellectuelle
            </h2>
            <p>
              L&apos;ensemble des éléments constituant la plateforme HOK Reports —
              architecture logicielle, interfaces, algorithmes de traitement,
              marques, logos et contenus — est la propriété exclusive du Cabinet HOK
              ou fait l&apos;objet de licences d&apos;exploitation dûment autorisées.
            </p>
            <p className="mt-3">
              Toute reproduction, représentation, modification, publication ou adaptation
              de tout ou partie de ces éléments, quel que soit le moyen ou le procédé
              utilisé, est strictement interdite sans l&apos;autorisation écrite préalable
              du Cabinet HOK.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              4. Accès à la plateforme
            </h2>
            <p>
              L&apos;accès à HOK Reports est strictement réservé aux collaborateurs
              et partenaires autorisés du Cabinet HOK. Chaque utilisateur dispose
              d&apos;un compte nominatif dont les identifiants sont personnels et
              incessibles. L&apos;Éditeur se réserve le droit de suspendre ou de
              supprimer tout compte en cas d&apos;utilisation non conforme.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              5. Responsabilité
            </h2>
            <p>
              Le Cabinet HOK met tout en œuvre pour assurer la disponibilité et le
              bon fonctionnement de la plateforme. Toutefois, l&apos;Éditeur ne saurait
              être tenu responsable des interruptions de service, des erreurs de
              traitement ou de toute perte de données résultant d&apos;un usage non
              conforme ou d&apos;un événement de force majeure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              6. Droit applicable
            </h2>
            <p>
              Les présentes mentions légales sont régies par le droit béninois,
              notamment la loi n° 2017-20 du 20 avril 2018 portant Code du numérique
              en République du Bénin, les Actes uniformes de l&apos;OHADA applicables,
              ainsi que la loi n° 2009-09 du 22 mai 2009 sur la protection des données
              à caractère personnel. Tout litige relatif à l&apos;utilisation de la plateforme
              sera soumis à la compétence exclusive des tribunaux de Cotonou, République du Bénin.
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
