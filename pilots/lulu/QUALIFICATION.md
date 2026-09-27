# LuLu pilot

- **Application**: LuLu, a macOS firewall
- **Revision**: `7d2669e`, shallow clone, no submodules, origin set to the real upstream
- **Licence**: GPL-3.0, read from the repository rather than assumed
- **Platform audited**: macOS
- **Fourth pilot, and the first that the toolchain can actually run**: measured,
  not assumed, by `scripts/can-this-build-compile-swift.sh` before a line of the
  pilot was written.

## Why this pilot, chosen by a measurement

Transmission is blocked and cannot receive generated Swift: its application
builds with CMake, and no released CMake compiles Swift against Xcode 27's
`swiftc`, which was proven from a CMake built from source rather than from two
packagings. The campaign needed to know whether that is Transmission's problem or
the method's, and the answer is that it is neither: it is the whole class of
CMake-built applications, so the next pilot has to be chosen on this axis rather
than on the order of a list.

LuLu answers `YES` on both signals, which is the first candidate to do so:

```
project:   xcode-project
toolchain: compiles-Swift
verdict:   YES. Both signals agree.
```

Against Transmission the same script answers `NO`. The app target here is 41
`.m` files and no Swift, so the defect Transmission shares is present, and unlike
Transmission the build can absorb the remedy.

**What the previous pilot's block does to this pilot.** The recipe's second entry
condition required the previous pilot to be certified. Transmission is not, so
that condition was amended rather than ignored, and the amendment is derived from
the reason the condition exists: it exists so that a defect is not left
attributable to the wrong pilot. Transmission's block produced **no finding in an
application at all**, because it is a toolchain limit proven from source, so
there is nothing here to misattribute. A pilot that had stopped on something it
found in the application would still block the next one, and that is the case the
condition was written for.

## The object, and why not the others

Not yet chosen, and deliberately. Task 3.1 is to classify sensitivity first and
to write what the object's names may carry, and the object follows from that
reading rather than preceding it. A firewall has rules, extensions, a log and a
set of blocked connections, and they do not have the same lifecycle: a rule is
written by the person, a log entry is transient, a connection is gone the moment
it ends.

## What is deliberately not written yet

The contract, the generated sources and the three suites belong to tasks 3.2 and
later. Nothing is written before the classification.
