# Finish the Studio app

## Why

Le shell est une vraie app, pas une maquette: `Scripts/build-app.sh` assemble un
`.app` avec son Info.plist, ses resources et le moteur embarqué, six écrans
lisent des données réelles, et 86 tests la couvrent. Ce qui lui manque n'est pas
du volume, c'est de tenir ses promesses.

Trois pertes ont été trouvées en lisant le code plutôt qu'en le jugeant.

Premièrement, l'app déclare une localisation qu'elle n'a pas. `Info.plist` liste
`en` et `fr`, `fr.lproj/Localizable.strings` existe, et **10 de ses 12 chaînes
n'apparaissent nulle part dans le code**: aucun `LocalizedStringKey`, aucun
`String(localized:)`, et les écrans écrivent leurs libellés en clair. Un
utilisateur français voit de l'anglais dans une app qui annonce le français.

Deuxièmement, ces chaînes mortes décrivent un design disparu: `1 · Project and
result`, `2 · Running`, `3 · Result and proofs` sont les libellés d'un rail de
parcours en trois étapes. Le code a remplacé ce rail par un `switch` caché dans
`StudioView`, sans indicateur de progression. Le parcours est devenu invisible,
et M4, M5 et M6 vont ajouter des étapes à un switch qui n'en montre aucune.

Troisièmement, le plancher est macOS 14 alors que le système livré est macOS 27.
L'app se prive de toute la surface moderne de trois générations, dont Liquid
Glass, pour un support dont personne n'a besoin: le client ne l'installe pas,
c'est l'outil de l'opérateur qui envoie l'offre.

## What Changes

- **Plancher macOS 27, arm64 only.** `Package.swift` et `Info.plist` passent de
  14.0 à 27.0, et la décision est écrite dans `AGENTS.md` comme la base Apple 27
  l'exige. C'est la porte qui ouvre le reste.
- **La promesse de localisation est tenue ou retirée.** Elle est retirée pour
  l'instant: `fr.lproj` et l'entrée `fr` de `CFBundleLocalizations` partent, et
  `AGENTS.md` note que le shell est en anglais par choix et non par oubli.
  Localiser six écrans pour un outil à un opérateur n'achète rien avant le
  premier euro, et c'est une décision à reprendre plus tard, pas un trou à
  combler en silence.
- **Les scènes d'app existent.** Settings, About et Help, et un vrai menu de
  commandes avec les raccourcis du parcours, à la place d'un
  `CommandGroup` qui ne fait que supprimer New Item.
- **L'historique des projets existe.** Le bouton `Open recent` est aujourd'hui
  un stub désactivé qui promet "No run has been made from this application yet".
  Il devient une liste réelle de projets, et la fenêtre rouvre le dernier.
- **Le parcours redevient visible.** Un rail reprend la forme que les chaînes
  mortes décrivent, et il accueille les étapes que M4, M5 et M6 ajouteront.
- **Liquid Glass sur la couche fonctionnelle seulement.** Navigation et
  contrôles, jamais le contenu: le verre est un signal de couche, pas un
  matériau.

## Capabilities

### New Capabilities

- `studio-application`: L'application comme produit: plancher plateforme,
  scènes, historique, navigation visible, et promesse de localisation tenue.

### Modified Capabilities

- Aucun. Aucun des 12 contrats de.capacité ne change: ce change touche la
  surface de l'app, pas ce que le moteur affirme.

## Impact

`apps/studio` pour l'essentiel: `Package.swift`, `Resources/Info.plist`,
`Resources/`, `Sources/IntentLaneStudio/App.swift`, `Sources/StudioUI/`, et un
nouveau modèle d'historique dans `StudioCore`. `AGENTS.md` pour la décision de
plateforme. `Scripts/build-app.sh` est relu et non réécrit, il fait déjà le
travail d'assemblage.

**Hors périmètre.** Aucun changement de comportement du moteur, aucun nouveau
format de rapport, aucune modification des audits ou de leurs preuves. Le
rendu du livrable reste celui de `render-the-audit-deliverable`, et cette app
ne le réécrit pas.

**Écart de langue, comme pour M3.** La prose est en français, les requirements
sont en anglais pour rester dans la langue des douze specs déjà synchronisées.
