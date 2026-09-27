# studio-protocol

One job: turn an engine artifact into an engine-agnostic shape a screen can read,
without inventing anything the artifact does not carry.

Nothing here calls the engine, reads the filesystem, parses YAML or runs a model.
The mapping is a pure function over an already-parsed value, and the source is
always the engine's own report. Everything a screen shows must be traceable to the
finding it came from.

The first consumer is the Studio capability map (`openspec/changes/
studio-capability-map`).
