# PixelKit Labs Laya SDK

This folder is the standalone TypeScript SDK. Keep inference local. Do not add
a hosted API dependency or package model weights. Preserve the Apache-2.0
LICENSE and NOTICE, and mark files adapted from the upstream Laya project.

Run `npm run build`, `npm test -- --run`, and `npm run test:package` before
calling a change complete. Mobile behavior must be verified on the connected
Pixel with ARTEMIS before writing device automation tests or claiming device
parity. Record the exact checkpoint revision and measured latency, memory, and
answer differences for real-model comparisons.

Every code change bumps the patch version and adds a `CHANGELOG.md` entry.
Only a maintainer-requested version tag triggers npm publication. Keep the
CI and release checks aligned with the neighboring PixelKit Labs packages:
locked install, build, tests, packed consumer, tag/version check, and npm
provenance. Never tag or publish as part of a normal source push.
