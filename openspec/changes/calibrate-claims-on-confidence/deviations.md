# Deviations from the change artifacts

## The rejected form for a supplied pass is a derivation property, not a schema field

The spec asked that a form attempting to supply a `pass` without agreement be
rejected. There is no such field in this codebase to reject. A journal step
carries `status: "pass"`, but that step is a record, not an authority: the
certification already derives its verdict from the gate and never reads the
journal's own status. Inventing an `assertions` field so a rejection could be
written would have created a new way to claim a pass rather than closing one.

What is implemented instead, and tested, is the property that makes the
shortcut impossible: `deriveClaimVerdict` takes evidence only, never a verdict,
and `ClaimOutcome` has no field through which a verdict could be supplied. A
parametrised test walks every combination of the three gate statuses and four
confidence inputs and asserts that `verified` occurs exactly when the gate
passed and the confidence cleared the threshold, so any future edit that lets a
verdict in fails that test.

## A hard deterministic result outranks the threshold

The spec ordered the derivation as threshold first, then command agreement. That
order made `failed` and `missing` unreachable: the local source reports zero for
a command that did not pass, so every failure fell below the threshold and became
`contested`. A command that reports `fail` is not a contestable question, it is a
settled negative, and no confidence revises it in either direction. The
implementation checks the command first, so `contested` now means exactly one
thing: the command said yes and the evidence does not support it. Two tests pin
this, one for a failing command with maximal confidence and one for a low
confidence that must not soften a failure into a contest.

## An explicit absence is not the same as an undeclared value

The first wiring read a supplied confidence with `declared ?? default`, which made
a source that returned nothing indistinguishable from a caller that declared
nothing, and silently fell back to the local source. That is the silent
degradation the spec forbids. The wiring now tests key presence, so an explicit
`undefined` produces `contested` with a stated reason, while an absent
confidence map uses the offline local source and keeps the default `certified`.

## Provider symbols are guarded by a source-text test

The spec asked for a test that fails if a provider type reaches the schema. Type
level assertions cannot see a `Record<string, number>` being repurposed, so the
guard reads the schema source and fails on a deny-list of provider symbols. It is
textual and therefore blunt, but it fails loudly at the moment of the mistake,
which is the behaviour worth having, and it names the symbol that leaked.

## No provider adapter is implemented

The change deliberately wires no remote call. `ClaimConfidenceSource` exists with
a `network` flag and the local implementation declares `network: false`, and a
test asserts that. The remote adapter is a separate change, because the local
gate is what keeps the gate reproducible offline and it should land and be used
before anything is sent anywhere.

## The supplied confidence was not validated, and a missing value fell through to verified

The review found the real bug this change was supposed to make impossible. Two
holes, both certified a claim:

- the confidence map arriving through `ReleaseVerificationInput` was typed but
  never parsed, so `{ confidence: 5, distribution: {} }`, a confidence with no
  distribution, and even a bare number all reached the derivation and verified a
  claim;
- the threshold guard read `if (confidence < threshold) contested`, and
  `undefined < 0.8` is `false`, so any value whose `confidence` field was absent
  skipped the contested branch and landed on `verified`. The guard was inverted
  for exactly the case it existed to catch.

The derivation is now total. It takes `confidence: unknown` and normalises it
through `readClaimConfidence`, so a malformed value becomes `unevaluated` and
then `contested` whatever the caller passes, and the reason distinguishes an
absent value from an unreadable one. Fourteen cases are pinned in
`claim-confidence.test.ts` as an explicit expected matrix, and ten malformed
inputs are asserted never to certify in `claim-confidence-untrusted.test.ts`,
including a bare number, a string, a boolean, `null` and `NaN`.

## The matrix test was tautological, so it is now a table

The first version of the exhaustive test computed its expectation with the same
formula as the implementation, so it could only ever agree with whatever the code
did. It asserts an explicit table of fourteen gate and confidence combinations
now, which fails when the behaviour changes rather than when the formula is
retyped.

## One test was removed as duplicate

`provider-confinement.test.ts` ran the same deny-list loop twice, once through
`it.each` and once in a hand-written loop over a one-element file list. The
hand-written loop is gone.
