# EduShelf

Plateforme de gestion de documents pédagogiques

Construis une application web moderne de gestion, classement, consultation et partage de documents pédagogiques.

L'application doit être responsive et mobile-first, avec une expérience optimisée aussi bien pour desktop que pour smartphone/tablette.

1. Objectif

L'application permet aux utilisateurs :

d'importer différents types de documents ;

de classer les documents dans une arborescence pédagogique ;

de consulter les documents directement dans l'application ;

de rechercher et filtrer les documents ;

de gérer les droits d'accès selon les utilisateurs et les rôles ;

de partager certains documents ou catégories avec des utilisateurs autorisés.

L'interface doit être moderne, rapide, claire et adaptée à une utilisation scolaire/universitaire.

2. Arborescence des documents

Organiser les documents selon cette hiérarchie :

Niveau scolaire

Collège

Lycée

Université

Puis :

Matière

Mathématiques

Physique

Chimie

Français

Anglais

Histoire

Géographie

Informatique

etc.

Puis :

Type de contenu

Cours

Exercices

Corrigés

Examens

Fiches de révision

Annales

Autres

Exemple :

Lycée
 └── Mathématiques
      ├── Cours
      │    ├── Fonctions.pdf
      │    └── Dérivées.pdf
      ├── Exercices
      │    ├── Exercice_01.pdf
      │    └── Exercice_02.pdf
      └── Corrigés
           └── Corrige_01.pdf


L'utilisateur doit pouvoir naviguer dans cette arborescence facilement.

3. Upload de documents

Permettre l'import de plusieurs fichiers simultanément.

Types de fichiers à supporter :

PDF

images : JPG, JPEG, PNG, WEBP

vidéos : MP4, WEBM

documents Microsoft Office : DOC, DOCX, PPT, PPTX, XLS, XLSX

fichiers texte : TXT

éventuellement ZIP

Lors de l'upload, demander :

nom du document ;

niveau scolaire ;

matière ;

type de contenu ;

description ;

tags ;

auteur ;

éventuellement année scolaire.

Afficher :

progression de l'upload ;

taille du fichier ;

état de traitement ;

miniature lorsque disponible.

Prévoir également un système de drag & drop.

4. Lecteur intégré

L'utilisateur ne doit pas être obligé de télécharger le fichier pour le consulter.

Créer un lecteur intégré adapté au type de fichier.

PDF

Utiliser un lecteur PDF permettant :

zoom ;

recherche dans le document ;

navigation entre les pages ;

plein écran ;

téléchargement si autorisé.

Images

Afficher l'image avec :

zoom ;

rotation ;

plein écran.

Vidéos

Créer un lecteur vidéo avec :

lecture/pause ;

barre de progression ;

volume ;

plein écran ;

vitesse de lecture ;

reprise à la dernière position.

Documents Office

Prévoir une solution permettant de prévisualiser le document lorsque cela est techniquement possible.

Si le format ne peut pas être affiché directement dans le navigateur, proposer une conversion ou un téléchargement selon les permissions.

5. Recherche

Ajouter une recherche globale.

La recherche doit pouvoir trouver un document par :

nom ;

matière ;

niveau ;

type ;

auteur ;

tags ;

description.

Prévoir des filtres :

Niveau

Matière

Type

Format

Date d'ajout

Auteur

Ajouter éventuellement une recherche plein texte dans les PDF lorsque cela est possible.

6. Utilisateurs et rôles

Créer un système d'authentification.

Prévoir au minimum les rôles suivants :

Administrateur

Peut :

gérer tous les utilisateurs ;

créer/supprimer/modifier les catégories ;

importer des documents ;

supprimer des documents ;

modifier les permissions ;

consulter tous les documents ;

gérer les paramètres de l'application.

Enseignant

Peut :

importer des documents ;

modifier ses documents ;

supprimer ses documents ;

organiser ses documents ;

partager ses documents avec certaines classes/utilisateurs ;

consulter les documents auxquels il a accès.

Étudiant

Peut :

consulter les documents autorisés ;

rechercher ;

filtrer ;

lire les documents ;

télécharger uniquement les fichiers pour lesquels le téléchargement est autorisé.

Invité

Peut uniquement consulter les documents explicitement publics.

7. Permissions

Le système de permissions doit être granulaire.

Un document peut avoir une visibilité :

Public

Privé

Utilisateurs spécifiques

Groupe/classe

Niveau scolaire

Matière

Pour chaque document, permettre de définir :

read

download

edit

delete

share

Exemple :

Document : Mathématiques / Terminale / Dérivées.pdf

Étudiants :
✓ lecture
✓ téléchargement
✗ modification
✗ suppression

Professeur :
✓ lecture
✓ téléchargement
✓ modification
✓ partage

Administrateur :
✓ toutes les permissions


Les permissions doivent être vérifiées côté serveur, pas uniquement dans l'interface.

8. Groupes / classes

Permettre de créer des groupes :

Lycée
 ├── Seconde A
 ├── Seconde B
 ├── Première
 └── Terminale

Université
 ├── L1 Informatique
 ├── L2 Informatique
 ├── L3 Informatique
 └── Master


Un document peut être partagé avec un groupe.

Les utilisateurs appartenant au groupe obtiennent automatiquement les permissions configurées.

9. Dashboard

Créer un dashboard adapté au rôle de l'utilisateur.

Afficher par exemple :

documents récents ;

documents récemment consultés ;

catégories favorites ;

uploads récents ;

espace de stockage utilisé ;

groupes/classes ;

statistiques.

Pour un étudiant :

Bonjour !

Continuer la lecture
├── Cours de mathématiques
├── Physique
└── Algorithmique

Documents récents

Mes matières

Mes classes


10. Interface desktop

Sur desktop, utiliser une interface avec :

┌──────────────────────────────────────────────┐
│ Logo       Recherche              Profil    │
├────────────┬─────────────────────────────────┤
│            │                                 │
│ Dashboard  │       Contenu                   │
│ Documents  │                                 │
│ Collège    │                                 │
│ Lycée      │                                 │
│ Université │                                 │
│ Favoris    │                                 │
│            │                                 │
└────────────┴─────────────────────────────────┘


Utiliser une sidebar permettant de naviguer rapidement entre les niveaux, matières et catégories.

11. Interface mobile

L'application doit être réellement responsive et non simplement une version desktop réduite.

Sur mobile :

navigation simplifiée ;

bottom navigation ;

recherche facilement accessible ;

upload depuis la caméra ou la galerie ;

consultation des PDF et vidéos en plein écran ;

navigation par dossiers ;

boutons suffisamment grands pour une utilisation tactile.

Prévoir également une PWA installable sur smartphone et desktop.

12. Gestion des documents

Chaque document doit avoir une page détaillée contenant :

miniature ;

nom ;

type ;

taille ;

auteur ;

date de création ;

date de modification ;

niveau ;

matière ;

catégorie ;

tags ;

description ;

permissions ;

nombre de consultations ;

bouton ouvrir ;

bouton télécharger si autorisé ;

bouton partager si autorisé.

Ajouter :

favoris ;

historique de consultation ;

documents similaires.

13. Stockage

Utiliser un stockage objet adapté aux gros fichiers.

Ne jamais stocker directement les fichiers binaires dans la base de données.

La base de données doit stocker les métadonnées :

Document
- id
- name
- filename
- mime_type
- size
- storage_path
- thumbnail_path
- description
- level
- subject
- category
- author_id
- created_at
- updated_at


Prévoir également :

User
Role
Group
GroupMember
Document
DocumentPermission
Category
Subject
Upload
ViewHistory
Favorite


14. Sécurité

La sécurité est importante.

Mettre en place :

authentification sécurisée ;

contrôle d'accès côté serveur ;

permissions par document ;

permissions par groupe ;

URLs temporaires pour les fichiers privés ;

validation des types MIME ;

limitation de taille des fichiers ;

protection contre les uploads malveillants ;

antivirus/scanning des fichiers si possible ;

logs des accès ;

logs des téléchargements ;

suppression sécurisée.

Un utilisateur ne doit jamais pouvoir accéder à un fichier privé simplement en modifiant son URL.

15. Architecture technique

Utiliser une architecture moderne et maintenable.

Privilégier :

React

TypeScript

Tailwind CSS

composants UI modernes

PostgreSQL

stockage objet compatible S3

authentification sécurisée

API backend

architecture REST ou équivalente

L'application doit être conçue pour pouvoir évoluer jusqu'à plusieurs milliers d'utilisateurs et potentiellement plusieurs centaines de milliers de documents.

16. Performance

La plateforme doit rester fluide avec beaucoup de documents.

Prévoir :

pagination ;

lazy loading ;

virtualisation des longues listes ;

génération de thumbnails ;

cache ;

compression ;

uploads en plusieurs parties pour les gros fichiers ;

traitement asynchrone des vidéos et documents ;

CDN pour les fichiers publics ;

URLs signées pour les fichiers privés.

Ne jamais charger tous les documents d'une catégorie en une seule requête.

17. Design

Design moderne, sobre et professionnel.

Inspirations :

Google Drive

Notion

Dropbox

Moodle

Google Classroom

Mais ne pas copier leur interface.

Utiliser :

cartes de documents ;

icônes selon les formats ;

breadcrumbs ;

drag & drop ;

menus contextuels ;

aperçu rapide ;

animations légères ;

dark mode.

Le design doit être adapté à un usage éducatif.

18. Fonctionnalités supplémentaires à prévoir dans l'architecture

Même si elles ne sont pas toutes implémentées dans la première version, prévoir une architecture permettant d'ajouter :

OCR des documents scannés ;

recherche plein texte ;

transcription automatique des vidéos ;

génération automatique de résumés ;

extraction de texte des PDF ;

IA permettant de poser des questions sur un document ;

annotations ;

commentaires ;

partage par lien ;

notifications ;

versioning des documents ;

corbeille ;

restauration des fichiers supprimés.

19. Première version à développer

Commence par une MVP fonctionnelle, mais avec une architecture permettant d'ajouter les fonctionnalités avancées ultérieurement.

Priorité :

Authentification

Gestion utilisateurs/rôles

Gestion des niveaux

Gestion matières

Gestion cours/exercices

Upload de fichiers

Stockage sécurisé

Liste des documents

Lecteur PDF

Lecteur image

Lecteur vidéo

Recherche

Permissions

Groupes/classes

Interface responsive desktop/mobile

PWA

Ne génère pas uniquement une maquette. Les fonctionnalités principales doivent être réellement connectées au backend et à la base de données.

Avant de coder, définis le schéma de données, les relations et le modèle de permissions afin d'éviter de devoir reconstruire l'architecture ultérieurement.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://farax.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/40bda1b2-88f3-42c6-8030-7789daeecbd7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
