# ADR-001: portable cc65/ca65/ld65 toolchain

Status: accepted

## Context

The project must build on macOS Apple Silicon, macOS Intel where supported, and
Windows. Native cc65 packages and ATR tools differ across hosts and versions.

The runtime is now a hybrid C/ASM build, so the toolchain has to cover `cc65`
for the high-level gameplay modules as well as `ca65`/`ld65` for the
hardware-critical kernel and the final image.

## Decision

Use the pinned `romdev-toolchain-cc65` package containing WebAssembly builds of
`cc65`, `ca65` and `ld65`. Node.js scripts mount inputs in the toolchain's
virtual file system, compile `src/c/*.c`, assemble and link the result together
with the ca65 sources, and build XEX/ATR without host-specific binary
utilities.

## Consequences

- Supported hosts produce deterministic, byte-identical output from the locked
  dependencies, C and ASM alike.
- The build requires Node.js 24 or newer and `npm install`/`npm ci`.
- Homebrew, Chocolatey, Python, and a system cc65 install are not required.
- A native cc65/ca65/ld65 compatibility path may be added later only if it
  preserves byte-identical output and validation.
- The portable deterministic-toolchain decision itself is unchanged; only the
  set of tools it covers grew with the hybrid architecture.
