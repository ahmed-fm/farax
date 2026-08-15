# Studia — Audit de l'existant et plan de mise en production réelle

## 0. GitHub

Le projet n'est pas encore relié à GitHub. La connexion se fait depuis Lovable via le bouton GitHub en haut à droite de l'éditeur (Connect to GitHub) : cela crée le dépôt et synchronise le code dans les deux sens. Aucune action de code n'est nécessaire de ma part.

## 1. Audit : ce qui est réel aujourd'hui vs simulé

Vérifié dans le code et dans la base.

Réel (branché sur la base et le stockage) :
- Tables : `profiles`, `user_roles`, `documents`, `document_permissions`, `groups`, `group_members`, `favorites`, `view_history`, `access_logs`, `subjects`, `categories`.
- Relations réelles par clés étrangères (documents → auteur, permissions → document/utilisateur/groupe, membres → groupe/utilisateur).
- Stockage : bucket privé `documents` (les fichiers ne sont pas en base). Lecture par URL signée temporaire.
- Permissions serveur : RLS activé + fonctions `can_read_document`, `can_download_document`, `is_admin`, `has_role`, `register_view` (SECURITY DEFINER, non appelables directement sauf les deux dernières).
- Authentification e-mail + Google, rôles admin/professeur/étudiant/invité créés à l'inscription.
- Recherche : filtres nom/description/tags/matière/niveau/type/auteur + pagination, vraie requête SQL.
- Favoris, historique de lecture, journal d'accès : réels.

Partiel ou simulé :
- Base vide : 0 document, 0 profil, 0 classe, 0 fichier. Rien n'a encore été testé avec de vraies données.
- Upload : un seul fichier à la fois, barre de progression factice (animation, pas la progression réseau), pas d'annulation, validation MIME uniquement sur l'extension déclarée par le navigateur.
- Lecteur PDF : simple `iframe` du navigateur — pas de pagination, zoom, ni recherche pilotés par l'application.
- Lecteur vidéo : balise HTML5 nue, pas de vitesse de lecture ni de reprise réellement enregistrée.
- Documents Office : aucun aperçu, seulement une icône.
- Classes : page en lecture seule, aucune création, aucun membre, aucune hiérarchie (Lycée → Terminale → Terminale A), aucun partage document ↔ classe.
- Permissions granulaires : la table existe mais aucune interface pour attribuer read/download/edit/delete/share.
- Édition et suppression de documents : absentes.
- Toute la logique passe par le client (aucune fonction serveur) : c'est acceptable car RLS protège, mais l'upload et les URLs signées doivent être durcis.
- PWA : manifeste et service worker présents, sans icônes ni écran de démarrage réels.

## 2. Ce que je vais construire

### Backend et base
- Hiérarchie de classes : `groups` gagne `parent_id` + `slug` (Lycée → Terminale → Terminale A), lecture récursive.
- Table `document_groups` (partage d'un document avec une ou plusieurs classes) et rôle de membre (`student` / `teacher`) dans `group_members`.
- Colonne `deleted_at` déjà présente : activation d'une vraie corbeille (masquée partout, restauration admin/auteur).
- Fonctions serveur (`createServerFn`) pour les opérations sensibles : émission d'URL signée après contrôle de permission, suppression fichier + ligne, mise à jour des permissions, statistiques admin.
- Politiques RLS mises à jour pour les nouveaux liens, avec GRANT explicites.
- Jeu de données de démonstration inséré en migration (classes, matières, quelques documents publics) pour que l'application ne soit pas vide.

### Upload réel
- Glisser-déposer + sélection multiple, file d'attente avec état par fichier.
- Progression réseau réelle (upload XHR/`fetch` avec suivi), annulation par fichier, reprise après erreur.
- Validation MIME par signature binaire (magic bytes) en plus du type déclaré, limite de taille configurable (par défaut 200 Mo, ajustable côté admin).
- Formats acceptés : PDF, JPG/JPEG, PNG, WEBP, MP4, WEBM, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT.
- Métadonnées communes appliquées au lot, puis ajustables document par document.

### Lecteurs
- PDF : `pdf.js` (react-pdf) avec pagination, zoom, recherche texte, plein écran, téléchargement conditionné à la permission.
- Images : zoom molette/pincement, déplacement, rotation, plein écran.
- Vidéos : lecteur HTML5 avec lecture/pause, volume, barre de progression, vitesse, plein écran et reprise à la position enregistrée dans `view_history`.
- Office : aperçu via l'embed Office Online alimenté par une URL signée temporaire ; si l'aperçu échoue ou si le partage externe est refusé, repli sur téléchargement/ouverture selon les droits. TXT : rendu direct.

### Permissions (RBAC + ACL)
- Matrice appliquée côté base : étudiant (lecture, téléchargement si autorisé), professeur (tout sur ses documents), admin (tout).
- Interface de partage par document : utilisateur, classe, niveau, matière, avec cases read/download/edit/delete/share.
- Aucun accès fichier sans passage par la vérification serveur : les URLs signées sont émises uniquement après contrôle, durée courte.

### Classes
- Création/édition de classes et sous-classes, ajout de professeurs et d'étudiants, documents rattachés à la classe.
- Vue classe : membres + documents partagés.

### Recherche
- Colonne `tsvector` générée (nom, description, tags) avec index GIN et tri par pertinence, tout en gardant les filtres existants ; structure prête pour indexer plus tard le texte extrait des PDF.

### Mobile / PWA
- Passage réel de chaque écran en 375 px : connexion, tableau de bord, navigation, recherche, upload, lecteurs, documents, classes, favoris — cibles tactiles, barres d'action collantes, lecteurs plein écran.
- Icônes 192/512, écran de démarrage, service worker mis à jour (cache des ressources statiques uniquement, jamais des documents privés).

### Audit final
Rapport livré en fin de travaux : fonctionnel (réel / mocké / implémenté), backend (tables, relations, API, stockage), sécurité (modèle de permissions, protection fichiers et API), frontend (pages, composants, responsive, lecteurs), puis la liste des extensions prêtes architecturalement (OCR, plein texte PDF, transcription vidéo, IA, annotations, commentaires, versioning, notifications, corbeille, partage par lien).

## 3. Ordre d'exécution

1. Migration base (hiérarchie classes, document_groups, recherche plein texte, RLS, données de démonstration).
2. Fonctions serveur (URL signée contrôlée, suppression, permissions, statistiques).
3. Upload multi-fichiers réel.
4. Lecteurs (PDF, image, vidéo, Office).
5. Gestion documents (édition, suppression, partage) et classes.
6. Recherche par pertinence.
7. Passe mobile + PWA, audit sécurité, rapport final.

## 4. Détails techniques

- Nouvelles dépendances : `react-pdf`/`pdfjs-dist` pour le PDF ; le reste s'appuie sur l'existant (React 19, TanStack Start/Router/Query, Tailwind v4, shadcn).
- Upload direct navigateur → stockage objet avec suivi de progression XHR ; chemin `"{userId}/{uuid}-{nom}"`, jamais de contenu binaire en base.
- Les fonctions serveur utilisent le middleware d'authentification : impossible de contourner par modification d'URL ou d'ID.
- Aperçu Office : l'embed Microsoft requiert que l'URL signée soit atteignable depuis leur service ; si vous préférez éviter cette exposition temporaire, je bascule sur téléchargement seul pour ces formats.
