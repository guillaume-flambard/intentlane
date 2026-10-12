## Why

Le generateur produit des protocoles, des queries, le cycle de vie d'indexation et les
annotations de schema. Il ne produit aucun harnais de test. L'auditor connait
`AppIntentsTesting` comme surface et le catalogue le liste, donc le manque est visible
sans etre comble, et c'est le seul endroit ou le generateur est en retard sur l'auditeur.

La couche de preuve qui manque est entre `metadata` et Siri humain. Les metadonnees
prouvent que l'intent est declare, pas que le systeme sait l'invoquer, resoudre une
entite, ni lire une propriete d'affichage exposee.
