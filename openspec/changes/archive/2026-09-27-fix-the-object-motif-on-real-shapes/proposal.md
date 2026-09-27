## Why

The object motif was written against IINA's shape and was run on IINA. Running it on
the other two pilots found two faults, and both are the kind a single pilot cannot
expose.

**A declaration that continues on the next line is not seen.** FSNotes' `ViewController`
conforms to `NSOutlineViewDataSource` on the fourth line of its declaration. The motif
reads one line at a time, so it does not find the notebook list, which is the object the
pilot is about. It found `AboutViewController` instead, a list that has nothing to do
with the pilot, and reported it. A motif that names the wrong object is worse than one
that names none, because it looks like it worked.

**A discovery that cannot act is reported as a pass.** `analyse` passes whenever it
finds an object class, and on IINA one of seven was actionable. On a repository where
none is actionable it would still pass, with a number of zero in its own reason. Zero
actionable is not a partial success, it is the discovery finding nothing it can
integrate, and the step has to say so.

Neither fault is IINA's fault and neither is FSNotes' fault. They are the fault of a
motif that was proved on one repository and then trusted.

## What Changes

- The object motif reads a declaration as a whole, following continuations until the
  line that ends it.
- The proof points at the first line of the declaration, so a reader is sent to where the
  type is introduced rather than to a line in the middle of its protocol list.
- `analyse` is blocked when it finds object classes and none of them is actionable, and
  says which ones it found and why each was rejected.
- A support repository fixture reproducing the multi-line shape, so this cannot regress.

## What this does not do

- It does not add an Objective-C motif. HandBrake's list layer is Objective-C and is
  therefore out of reach of `analyse` today. That is a separate change with its own
  evidence, and pretending a Swift motif covers it would be the same error in a new
  place.
- It does not choose between several actionable candidates. That is the decision stage,
  and it is still not built.
- It does not change what an actionable object is. An identifier and an opening path,
  which is the same rule IINA satisfied.
