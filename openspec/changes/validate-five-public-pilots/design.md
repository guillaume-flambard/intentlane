## Context

Two pilots exist. NetNewsWire is an RSS reader whose macOS surface is
Shortcuts-only, and IINA is a local media player. They are different domains,
but two data points do not make a method repeatable, and nothing has been
measured about how long either took.

The certification model changed underneath this change. `intentlane verify`
now certifies a **declared claim set**: deterministic claims are settled by a
command, observed claims only by a person. The IINA pilot certifies six
deterministic claims with nobody involved, because its claim set claims no
observed one. That model is what makes five pilots affordable, and it is also
what makes the old task list wrong: it asked every pilot for Spotlight and Siri
journeys, which is a person per pilot per surface.

## Goals / Non-Goals

**Goals:** prove or disprove that the integration method repeats, and produce the
numbers an offer can be priced from.

**Non-Goals:** claiming that Siri works on any of these apps, sending anything to
a maintainer, opening a pull request, or generalising beyond Apple-platform apps.

## Decisions

- A pilot is validated when its deterministic claim set is certified. The claim
  set is declared per pilot in a `pilot.yaml`, and the certificate is
  `intentlane verify --pilot <path> --strict` with every claim named. This is the
  same standard the IINA pilot meets, so the five pilots and IINA are comparable.
- **The deviation log is the measurement instrument for repeatability.** One
  versioned recipe, the ASRi integration method, is instantiated by each pilot.
  Every point where a pilot had to bend the recipe is recorded with the reason
  and the cost. Five pilots that need no deviation are a strong result; five
  pilots that each needed a different invention mean the recipe is not a method
  yet, and that is a finding worth as much as a success.
- **The effort measurement is the second instrument.** Per stage, per pilot: audit,
  contract, generation, mapping, tests, build, metadata, certification. Five data
  points per stage is enough to quote a range and to say which stage dominates.
  Without it, any price is a guess.
- The observed claims stay optional and are claimed on **at most one** pilot. The
  point of claiming one is to have an observation to show a buyer who asks about
  Siri, not to gate five pilots on five people.
- Keep the offer gate at **three independent, reproducible validations in
  different business domains**, and keep five as the research set. Lowering the
  gate would be self-serving; raising it would be unfalsifiable.
- A candidate is rejected during qualification, before any code, when its data
  cannot be safely represented or indexed. Rejecting early is a feature of the
  method, not a failure of the candidate.

## Risks / Trade-offs

- Certifying deterministic claims does not prove the system surface. The offer
  wording has to say precisely that, and the claims registry is where that line
  lives. The risk is a buyer reading "certified" as "Siri works", which is exactly
  why every certificate names its claims.
- Five pilots is a lot of evenings. The mitigation is the effort measurement: it
  makes the cost of the campaign itself visible, so it can be stopped or narrowed
  on evidence rather than on fatigue.
- Public forks of other people's applications carry licence and contribution
  constraints. Qualification records them, and no contact happens before a local
  proof exists.
- If the first two pilots need heavy deviations, the likely conclusion is that
  the method is not yet a method. The campaign is designed to be able to return
  that answer, which is why the deviation log is mandatory rather than optional.
