# Objectif B1

Application de pratique du français (vocabulaire, expressions, conjugaison et connecteurs logiques) avec comptes élèves, historique et révision espacée.

## Développement

```sh
npm install
npm run dev
```

Copier `supabase/env.example` vers `.env` et renseigner les identifiants du projet Supabase. L'application fonctionne aussi en mode invité sans compte Supabase, mais ce mode ne sauvegarde ni préférences ni historique.

Vérifications locales :

```sh
npm run check
npm run test:unit -- --run
npx playwright test
npm run build
```

## Supabase

1. Créer un projet Supabase et copier son URL, sa clé anon/publishable et sa clé service role dans `.env`. La clé service role est réservée au serveur et ne doit jamais être exposée au navigateur.
2. Dans le SQL Editor du projet, exécuter le contenu de `supabase/migrations/20261030000000_initial_schema.sql`.
3. Dans Authentication, configurer l'URL du site et autoriser les callback URLs `http://localhost:5173/auth/callback**` et `https://<domaine-de-production>/auth/callback**`. Configurer un fournisseur SMTP pour la livraison des invitations et liens de récupération en production.
4. Créer/inviter le compte du professeur dans Authentication > Users. Une fois son profil créé, promouvoir ce compte dans le SQL Editor en remplaçant l'adresse ci-dessous par son adresse exacte :

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users
     where lower(email) = lower('professeur@example.org')
   );
   ```

   Vérifier qu'une seule ligne a été modifiée. Le professeur peut ensuite se connecter et inviter les élèves depuis **Administration**. Les élèves définissent leur mot de passe via le lien reçu par e-mail.

Les variables requises sont `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` et `SESSION_SECRET`. Ce dernier doit contenir au moins 32 octets aléatoires; il signe uniquement les sessions invité. Générer un secret avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Définir les mêmes variables privées dans l'environnement de déploiement Vercel. Le build Vercel sélectionne l'adapter Vercel automatiquement.

## Sortie de Google Sheets

Supabase est désormais la source de vérité pour les comptes, préférences, parties et révisions. L'ancien historique n'est volontairement pas importé. Garder une copie de la feuille comme archive, la passer en lecture seule et désactiver l'ancien déploiement Apps Script après validation de la bascule. `scripts/apps-script.gs` est conservé comme archive; l'application ne l'appelle plus.
