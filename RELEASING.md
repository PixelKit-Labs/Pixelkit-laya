# Releasing @pixelkit-labs/laya

1. Update the README and changelog, then bump the package version for each change.
2. Run `npm ci`, `npm run verify`, and `npm pack --dry-run`.
3. Push source to `main` and wait for CI to pass.
4. When the maintainer requests an npm release, create and push `v<version>`.
   The release workflow checks the tag against `package.json` and publishes
   with npm provenance.

The GitHub repository needs the `PIXELKIT` npm granular publishing token as a
repository secret, matching the other PixelKit Labs packages. Manual workflow
dispatch checks that credential with `npm whoami`, then validates and packs;
no package is published by an ordinary source push.
