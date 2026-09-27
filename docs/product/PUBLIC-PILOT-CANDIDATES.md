# Public pilot candidates

Research date: 23 September 2026. This is a shortlist of public, active
Apple-app projects with materially different business domains. It is a
training and evaluation shortlist, not permission to submit code, run against
real accounts, contact maintainers, or claim compatibility. Each project must
approve its own proposed scope before a pull request or external outreach.

## Requalification du 23 septembre 2026

La liste initiale était trop orientée « domaines intéressants » et pas assez
vers le coût d'une preuve locale. Elle est remplacée par l'ordre suivant :

| Ordre | Candidat | Ce que la preuve apporte | Pourquoi maintenant |
| --- | --- | --- | --- |
| 1 | NetNewsWire | contenu, recherche, ouverture d'une entité | pilote en cours |
| 2 | [IINA](https://github.com/iina/iina) | média local et navigation native macOS | aucune donnée de compte, cible macOS directe |
| 3 | [IceCubes](https://github.com/Dimillian/IceCubesApp) | publication et profil réseau, macOS/iOS/iPadOS | même socle sur plusieurs plateformes |
| 4 | Nextcloud iOS | fichier et dossier synchronisés | exige un serveur local et un compte de test |
| 5 | Home Assistant for Apple Platforms | graphe d'appareils, uniquement en lecture | domaine à conséquence élevée, donc dernier |

Bitwarden sort de la liste des pilotes publics. Il reste un exercice interne de
revue sécurité, avec données synthétiques seulement, et ne doit pas servir à
promouvoir le produit avant les quatre preuves moins sensibles.

Les sections historiques ci-dessous décrivent les candidats étudiés. Cette
table est l'ordre de travail faisant foi.

## Selection and operating rule

The five projects below are official public repositories with a documented
contribution path. They give IntentLane a varied test corpus: reading content,
cloud files, home control, federated social content, and a password vault.
They are deliberately ordered from lower to higher risk. We should seek three
independent, accepted **local validation** results before treating the product
claim as credible; acceptance of a pull request is a separate maintainer
decision.

For every candidate, work only with fixtures, an isolated local or staging
account, and an approved minimal projection. Never index secrets, access
tokens, full private content, or data from an account that the tester does not
own. An unresolved name must return no match and cause no navigation or state
change.

| Candidate | Domain | Repository evidence | Proposed order |
| --- | --- | --- | --- |
| NetNewsWire | RSS and reading | [Official repo](https://github.com/Ranchero-Software/NetNewsWire) | 1 |
| Nextcloud iOS | Cloud files | [Official repo](https://github.com/nextcloud/ios) | 2 |
| Home Assistant for Apple Platforms | Home automation | [Official repo](https://github.com/home-assistant/iOS) | 3 |
| Mastodon for iOS | Federated social client | [Official repo](https://github.com/mastodon/mastodon-ios) | 4 |
| Bitwarden iOS | Password manager and authenticator | [Official repo](https://github.com/bitwarden/ios) | 5 |

## 1. NetNewsWire: content and reading

- **Official repository:** [Ranchero-Software/NetNewsWire](https://github.com/Ranchero-Software/NetNewsWire).
- **Platforms and language:** its README describes a feed reader for macOS and
  iOS; the repository contains separate `Mac` and `iOS` application trees and
  an Xcode project. The repository publishes an [MIT license](https://github.com/Ranchero-Software/NetNewsWire/blob/main/LICENSE).
- **Business-logic hypothesis:** map an approved article projection with a
  stable article ID and title. Implement `.system.searchInApp` to open the
  existing search UI and `.system.open` to route an exact resolved article.
  Donate only explicitly approved articles to Spotlight.
- **Sensitive-data boundary:** do not index reader-view text, account tokens,
  feed credentials, unread state, or private-feed names without a maintainer
  decision. The local fixture is Alpha, Beta and Gamma, each with a distinct
  ID; invented titles must resolve to nothing.
- **Outreach/PR gate:** **explicit approval is required before coding a PR.**
  The project says to ask before starting a feature, discuss in its Work
  category, and proceed only after approval. See its
  [contribution instructions](https://github.com/Ranchero-Software/NetNewsWire/blob/main/CONTRIBUTING.md).
- **Why first:** it is the current proof target and has the lowest-risk
  read-only mapping of the set.

## 2. Nextcloud iOS: cloud files

- **Official repository:** [nextcloud/ios](https://github.com/nextcloud/ios).
- **Platforms and language:** the project identifies itself as the Nextcloud
  iOS app and ships an Xcode project, File Provider extensions, tests and
  Swift tooling. It is [GPLv3 with an Apple App Store exception](https://github.com/nextcloud/ios/blob/master/LICENSE.txt).
- **Business-logic hypothesis:** map an authorized file or folder using the
  server-side file identifier, display name and an approved, non-sensitive
  metadata projection. `.system.searchInApp` should route to its in-app file
  search; `.system.open` should navigate to a resolved local or remote item.
- **Sensitive-data boundary:** use a disposable self-hosted test server and
  test account. Do not donate file contents, share recipients, paths that leak
  personal structure, server URLs, tokens or offline cache metadata. Test
  deletion, logout and account removal by removing exact entity IDs from the
  index.
- **Outreach/PR gate:** a PR is possible only under the project process: open
  a corresponding issue, target `develop`, and sign off commits under its DCO.
  The repository also documents mockable unit tests and an isolated CI server.
  See [README contribution and testing rules](https://github.com/nextcloud/ios#how-to-contribute).
- **Why second:** it exercises account boundaries, synchronization and delete
  propagation without an action that mutates user data.

## 3. Home Assistant: home automation

- **Official repository:** [home-assistant/iOS](https://github.com/home-assistant/iOS).
- **Platforms and language:** the repository calls itself Home Assistant for
  Apple platforms, contains an Xcode project, Swift sources, tests and a Watch
  application tree, and is [Apache 2.0 licensed](https://github.com/home-assistant/iOS/blob/main/LICENSE.md).
- **Business-logic hypothesis:** begin with **read-only** search/open of a
  dashboard, area, device or entity description. Map the Home Assistant entity
  ID to a small display projection; route to the existing detail UI. Do not
  make any state-changing device command part of the first pilot.
- **Sensitive-data boundary:** use a local test Home Assistant instance with
  fake entities. A home graph can reveal occupancy, cameras, locks, alarm
  state, device names and location. Never index camera media, state history,
  long-lived tokens, addresses or control capabilities. Any future action must
  use exact target resolution, fresh authorization and an explicit in-app
  confirmation.
- **Outreach/PR gate:** maintainers must review it. Their contribution guide
  requires a fork, working tests and a PR; their AI policy requires the
  submitter to understand and explain every change and rejects autonomous-agent
  contributions. See [CONTRIBUTING](https://github.com/home-assistant/iOS/blob/main/CONTRIBUTING.md)
  and [AI policy](https://github.com/home-assistant/iOS/blob/main/AI_POLICY.md).
- **Why third:** it tests a complex entity graph and a high-consequence domain
  while keeping the initial scope safely read-only.

## 4. Mastodon for iOS: federated social content

- **Official repository:** [mastodon/mastodon-ios](https://github.com/mastodon/mastodon-ios).
- **Platforms and language:** the official iOS repository contains an Xcode
  project, `MastodonSDK`, intent, widget and test targets. It is
  [GPL-3.0 licensed, with a contributor licence agreement requirement](https://github.com/mastodon/mastodon-ios#license).
- **Business-logic hypothesis:** map a public or explicitly authorized status,
  profile or saved item by canonical server/object ID. Search should open the
  existing search experience; exact open should route to the selected status or
  profile. This tests remote identifiers, pagination and instance-scoped
  identity.
- **Sensitive-data boundary:** use a dedicated test account on a chosen test
  instance. Do not index direct messages, followers, private lists, access
  tokens, server session metadata or posts with limited visibility. Entity
  identity must include the server context so equally-shaped IDs cannot be
  confused across instances.
- **Outreach/PR gate:** **discuss first.** The project says major UI changes
  require core-team design review, asks contributors to use its issue process,
  test on iPhone and iPad, and wait for approval. See its
  [iOS contribution guide](https://github.com/mastodon/mastodon-ios/blob/develop/Documentation/CONTRIBUTING.md).
- **Why fourth:** it validates a networked, multi-tenant content model and
  localisation process while remaining read-only.

## 5. Bitwarden iOS: password vault and authenticator

- **Official repository:** [bitwarden/ios](https://github.com/bitwarden/ios).
- **Platforms and language:** the repository identifies itself as Bitwarden’s
  iOS Password Manager and Authenticator, lists iOS, iPad, iPhone and Swift,
  and includes iOS, AutoFill, share, notification and Watch targets. It is
  [GPL-3.0 licensed](https://github.com/bitwarden/ios/blob/main/LICENSE.txt).
- **Business-logic hypothesis:** this is a **security-boundary exercise**, not
  an initial discoverability feature. At most, map a deliberately synthetic
  vault-item label and opaque stable ID after app unlock, route it to an
  in-app item view, and make the index unavailable or cleared on lock. Do not
  implement retrieval of credentials, TOTP values, notes, URIs or autofill
  behaviour through a system surface.
- **Sensitive-data boundary:** test only with a disposable self-hosted or
  local test vault and fake credentials. Treat all vault metadata as sensitive.
  Never donate an item title, username, URL, attachment name, organisation
  membership or secret-derived field to Spotlight without written product and
  security approval. Lock, logout, account deletion and device transfer must
  be explicit index-removal tests.
- **Outreach/PR gate:** maintainer and security approval are required before
  proposing any feature. The repository welcomes code contributions on `main`
  but directs sensitive security reports to its private disclosure process;
  the policy requires testing only accounts you own or have explicit
  permission to use. See the [contribution documentation](https://contributing.bitwarden.com/contributing/),
  [repository README](https://github.com/bitwarden/ios#contribute), and
  [security policy](https://github.com/bitwarden/ios/blob/main/SECURITY.md).
- **Why fifth:** it is the strongest test of the product’s privacy model, but
  should be undertaken last and only after the other three pilots are proven.

## Validation and contact policy

1. Fork or clone locally only after reading the named contribution policy.
2. Make a minimal, reversible branch using mock data and a product-specific
   adapter. Do not publish or contact anyone yet.
3. Prove exact matching, no-match, add/update/remove indexing lifecycle and
   platform UI routing locally. Record platform, OS build, locale and test
   account class.
4. Obtain an internal review against the candidate’s security boundary.
5. For projects that permit it, first open the requested issue or design
   discussion. Only then offer a small PR with full local evidence and no
   marketing claims.

The first commercial claim should be bounded: IntentLane provides a generated
ASRi mapping seam and evidence workflow; the application owner retains control
over data selection, navigation, authorisation and any sensitive action.

## IINA second-pilot record

IINA is the selected second pilot. Its discovery and acceptance contract are
recorded in [PILOT-IINA-DISCOVERY.md](../pilots/PILOT-IINA-DISCOVERY.md). The scope is a
user-controlled local playback history, with no filesystem-path disclosure. It
remains a local pilot until IINA's requested design proposal is accepted.
