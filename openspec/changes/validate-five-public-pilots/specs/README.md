# Campaign specs

The normative layer of the five-pilot campaign. Each spec says what must be true.
The files beside them say what was measured, and the specs cite those files rather
than repeating them.

Read this page first. It answers the questions in the order a reader asks them.

## The capability specs

| Spec | Governs |
| --- | --- |
| `pilot-campaign/spec.md` | What a validated pilot is, and what the campaign owes the offer |
| `pilot-recipe/spec.md` | The method, stage 0 to stage 8, as requirements with exit criteria |
| `pilot-stack-adaptation/spec.md` | What "adaptable to every stack" means as a claim that can be checked |
| `campaign-findings/spec.md` | What the pilots found, turned into requirements the method now carries |
| `campaign-open-work/spec.md` | What the campaign still owes, including what is blocked and who owns it |

## Where the measurements live

| Question | Spec | Record |
| --- | --- | --- |
| What is certified, and for what exactly | `pilot-campaign/spec.md` | `../../../../pilots/fsnotes/QUALIFICATION.md`, `../../../../pilots/handbrake/QUALIFICATION.md` |
| How a stage is run and when it is finished | `pilot-recipe/spec.md` | `../recipe.md` |
| What each pilot had to bend, and why | `pilot-recipe/spec.md` | `../deviations.md` |
| What each stage cost | `pilot-recipe/spec.md` | `../effort.md` |
| Which candidates qualified and why the others did not | `pilot-stack-adaptation/spec.md` | `../candidates.md` |
| What the method now requires because of a finding | `campaign-findings/spec.md` | this directory, one requirement per finding |
| What is left, and what is blocked | `campaign-open-work/spec.md` | `../tasks.md` |
| What the offer will say and cost | `pilot-campaign/spec.md` | `../results.md`, empty until the gate is met |
| How the plan is sequenced | none, it is a plan | `../tasks.md` |
| What the product promises outside the campaign | none, that is the product's own docs | `../../../../AUTOMATED-VERIFICATION.md`, `../../../../CLIENT-READY-V1.md`, `../../../../CLAIMS-REGISTRY.md` |

## State, in one paragraph

Two pilots are certified, FSNotes on a Swift target and HandBrake on an
Objective-C one, both with the same six deterministic claims and no observed claim.
The remaining three qualified candidates are Transmission, LuLu and Cyberduck, and
Cyberduck is last because a thin native shell over a Java application is where the
method may not apply. The offer gate needs three domains, so the campaign is one
pilot short of being able to price itself. Two decisions belong to the person
rather than to an agent and are still open: pushing branches to a public remote
whose range contains commercial material, and npm authentication.

## What is deliberately not here

No spec for the IINA pilot, which belongs to its own change. No spec for tool
changes outside this campaign, which live in their own changes. No merge of
`recipe.md` into a spec: the spec states the requirement, the recipe carries the
worked instruction, and merging them would lose the difference between what is
mandatory and what happened.
