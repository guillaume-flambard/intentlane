# Cyberduck, stage 0, and why the pilot has not started

- **Application**: Cyberduck, a macOS file transfer client
- **Revision**: `fc0d437`, "Merge pull request #18477 from iterate-ch/dependabot/maven/joda-time-joda-time-2.14.4"
- **Licence**: GPLv3
- **Platform audited**: macOS
- **Fifth pilot because**: it was the last named candidate for the third business
  domain, a file transfer client
- **Status**: not started. Stage 0 did not pass, so condition 1 is false and task
  4.3, or 4.2 if the answer to 4.1 is no, stays unticked.

## The good news first, and it is real

**Cyberduck has no deployment-target problem.** Its links run
`-target arm64-apple-macos27.0` and its nibs compile with
`--minimum-deployment-target 27.0`. It is the only candidate of the three that
already sits on Xcode 27's floor, which is what a project that keeps itself current
looks like.

Clean checkout, no submodules declared, 159 MB. Four targets, `app`, `libcore`,
`cli`, `docktile`, and a `Release` and a `Mac App Store` configuration.

## Blocker, the app cannot link because its own build has not run

```
ld: framework 'Sparkle' not found
ld: warning: search path '.../osx/target' not found
ld: warning: search path '.../core/dylib/target' not found
clang: error: linker command failed with exit code 1
```

Those two `target/` directories are Maven output directories, and `Sparkle` is the
update framework that Maven brings in. So the order the recipe already insists on,
the project's own build before the IDE build, is not optional here, it is the whole
build.

## Ce que le CI fait, et c'est la recette faisant autorité

`.github/workflows/deploy.yml` builds the artifacts:

| Step | What it needs |
|---|---|
| `Set up JDK` | `java-version: 21` |
| `cache: maven` | Maven |
| `Build with Maven` | `mvn --settings .github/maven-settings.xml --batch-mode` |
| `Copy Sparkle Updater Private Key (DSA)` | a key |
| `Copy Sparkle Updater Private Key (ED25519)` | a key |
| `Import Developer ID certificate` | a certificate |

## Les conditions d'entrée, une par une

| Condition | Verdict |
|---|---|
| Builds from a clean checkout | **Non**, and the gap is a prerequisite, not a setting. |
| Previous pilot certified | No. Transmission did not reach certification. |
| No known defect unfixed in reused code | Yes. Section 0 is closed. |

On this machine, `mvn` is **absent**, the JDK is **17** where the CI asks for
**21**, and the Developer ID certificate and the two Sparkle signing keys live in
the maintainers' CI secrets. Per the recipe, a missing system dependency is the
person's decision and not the pilot's, so this stops here and is named.

## 4.1, la question que la campagne posait avant ce pilote

Section 4.1 asks whether the native shell carries App Intents by the same path as
the other pilots, so that 4.2 can publish a method limit instead of a pilot. The
build failure answers it in the negative direction: the app target does not link,
so no shell can be observed and no App Intents surface can be read from a built
Cyberduck on this machine. That is a limit of the method, recorded as one, and it
is not the limit section 4.2 anticipated.

## Ce que cela dit de la campagne, et c'est le point important

Three candidates, three different reasons, one conclusion: **the third business
domain cannot be obtained from any of the three named candidates without either a
fork-local repair or an identity the pilot does not have.**

| Candidate | Why it stops |
|---|---|
| Transmission `48835c6` | the `dht` target produces no objects under Xcode 27, so `libdht.a` is never made |
| LuLu `7d2669e` | embeds a signed `Netiquette.app` that is not in the repository |
| Cyberduck `fc0d437` | needs Maven with JDK 21 and a Developer ID certificate held in CI secrets |

The offer gate asks for three reproducible validations in distinct domains. Two
are certified. The third has to come from somewhere that was not on the list, and
choosing it is a decision about what the campaign claims, not a build detail.
