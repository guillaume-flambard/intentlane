## 0. Method and measurement, before any candidate

- [ ] 0.1 Freeze the recipe as a versioned document, the ASRi integration method,
      with one section per stage: audit, contract, generation, mapping, tests,
      build, metadata, certification.
- [ ] 0.2 Create the deviation log format: pilot, stage, what the recipe said,
      what this pilot needed, why, and the extra effort.
- [ ] 0.3 Create the effort sheet: one row per stage per pilot, in minutes, with
      the tooling that recorded it.
- [ ] 0.4 Create the campaign results document, which will hold the pricing
      range, the deviation count and the domain spread, and nothing else.

## 1. Candidate qualification

- [ ] 1.1 Record five official public repositories, licences and contribution
      paths.
- [ ] 1.2 Classify the data sensitivity and an honest Siri AI hypothesis for each.
- [ ] 1.3 Reject a candidate when its data cannot be safely represented or
      indexed, and record the reason. A rejection is a valid outcome.

## 2. Local proof, per pilot

- [ ] 2.1 Run the read-only audit and record the exact revision and SDK.
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
