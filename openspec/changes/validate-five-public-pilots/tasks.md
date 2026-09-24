## 0. Method and measurement, before any candidate

- [x] 0.1 Freeze the recipe as a versioned document, the ASRi integration method,
      with one section per stage: audit, contract, generation, mapping, tests,
      build, metadata, certification. `recipe.md`, v1, with a command and an exit
      criterion per stage.
- [x] 0.2 Create the deviation log format: pilot, stage, what the recipe said,
      what this pilot needed, why, and the extra effort. `deviations.md`.
- [x] 0.3 Create the effort sheet: one row per stage per pilot, in minutes, with
      the tooling that recorded it. `effort.md`, with `not instrumented` where a
      stage predates the sheet, because a remembered number would corrupt it.
- [x] 0.4 Create the campaign results document, which will hold the pricing
      range, the deviation count and the domain spread, and nothing else.
      `results.md`, empty until the offer gate is met.

## 1. Candidate qualification

Screening record: `candidates.md`, with the revision, licence, contribution path,
audit result and data classification for every candidate, and the reason for each
rejection. Screening clones are in
`~/projects/active/apps/clients/intentlane-candidates`.

- [x] 1.1 Record nine official public repositories, licences and contribution
      paths. Five qualified: FSNotes (MIT), LuLu (GPLv3), HandBrake (GPLv2),
      Transmission (GPLv2 or GPLv3), Cyberduck (GPL). Four rejected with the
      reason: Krita, Zed, Ardour, CotEditor.
- [x] 1.2 Classify the data sensitivity and an honest Siri hypothesis for each.
      The hypothesis is deliberately not "Siri will work": it is whether the object
      has a stable opaque identifier, a user-visible title, and an action the
      system can expose without guessing. Discovery is `none` for all nine.
- [x] 1.3 Reject a candidate when its data cannot be safely represented or
      indexed, and record the reason. No candidate was rejected on sensitivity
      alone; the four rejections are on route, on an existing Shortcuts surface,
      and on a licence that complicates redistribution.
- [x] 1.4 Fix `intentlane audit` so a target that inherits SDKROOT from the project
      is read correctly, so the route cannot claim a native platform with no target
      for it, and so a missing directory is refused rather than reported as an
      empty success. Three tests, then the nine candidates re-measured with the
      fixed tool; the numbers are in `candidates.md`.
- [x] 1.5 Choose the first pilot and say why. **FSNotes goes first**, not
      HandBrake, because it is the only qualified candidate whose app target is
      Swift, so it is the only one that can run the recipe as written and make a
      zero-deviation result meaningful. HandBrake is second and becomes the first
      real test of step 4.1, the Objective-C path. Cyberduck stays last, because
      a thin Objective-C shell over a Java application is where the recipe may
      not apply at all. The four Objective-C targets are recorded in
      `candidates.md` and in `deviations.md`.

## 2. Local proof, per pilot

First pilot: **FSNotes `a96b9b5`**, macOS, the only Swift target among the
qualified candidates. Each stage is timed with a clock and every deviation is
logged before the next stage starts.

- [x] 2.1 Run the read-only audit and record the exact revision and SDK.
      FSNotes `a96b9b5`, tag `v7.3.4`, no submodules. macOS 27.0, Xcode
      `27A266a`, arm64, `en-US`, region `US`, five of nine conditions recorded.
      Route `native/high`, 229 Swift files in the macOS app target, 0 quality
      issues, data classified `sensitive, personal, public` with the privacy
      manifest reported missing. Recorded in `pilots/fsnotes/QUALIFICATION.md`.
- [ ] 2.2 Write the contract, declare the claim set in a `pilot.yaml`, and name
      the command that settles each application-owned claim.
- [ ] 2.3 Implement only a fixture-backed, minimal mapping in an isolated fork.
- [ ] 2.4 Split the mapping so the integration tests run without the app, the way
      the IINA pilot does. If it cannot be split, record that as a deviation.
- [ ] 2.5 Certify the claim set: `intentlane verify --pilot <path> --strict`
      passes, and the output names every claim.
- [ ] 2.6 Record the effort per stage and every deviation for this pilot.
- [ ] 2.7 Record the exact positive and the exact negative as tests, not as
      observations: the positive resolves and opens, the negative resolves
      nothing and opens nothing.

## 3. Observed claim, on at most one pilot

- [ ] 3.1 Choose the single pilot where a Siri observation has commercial value,
      and say why that one.
- [ ] 3.2 Claim `siri-conversation` explicitly, run the runbook, and record the
      observation in that pilot's ledger.
- [ ] 3.3 Do not make this a gate for the other four pilots.

## 4. Offer gate

- [ ] 4.1 Three independent, reproducible validations in different business
      domains, each certified and each with its deviation log and effort row.
- [ ] 4.2 Review the offer wording against the claims registry, so no line claims
      a system surface that no pilot observed.
- [ ] 4.3 Price the offer from the effort sheet, quoting a range, and name the
      stage that dominates.
- [ ] 4.4 Prepare, but do not send, maintainer-specific PR and outreach drafts.

## 5. Closing the loop

- [ ] 5.1 Amend the recipe with everything the five pilots taught, so the next
      client starts from version 2 rather than from version 1.
- [ ] 5.2 Publish the campaign results: the validated domains, the pricing range,
      the deviation count, and the two things that stayed unobserved.

## Notes

- Tasks 2.3 and 3.1 of the previous version required Spotlight and Siri journeys
  per pilot. They were replaced, because no public API settles them and a person
  per pilot per surface is the bottleneck this campaign must not recreate. The
  exact positive and negative are now tests, and the Siri observation happens at
  most once, on purpose.
- The gate is still three, and the research set is still five. Neither number was
  moved to make the campaign easier.
- The screening found three audit defects, recorded in `candidates.md`: a target
  inheriting SDKROOT from the project was not resolved, a repository with no
  target for the audited platform could still report `route: native`, and a
  missing directory produced a clean empty report. The first three are fixed; the
  remaining limitation is that no tool can tell a Quick Look helper from the
  application, so that judgement stays human.
