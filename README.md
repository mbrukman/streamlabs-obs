# slobs-client
Electron client for the Streamlabs OBS streaming software.

## Dependencies

### Node OBS

Due to OBS containing files named `package.json`, it is not
currently possible to install `node-obs` via NPM. You will
need to install and compile it manually, and then symlink it
in the root of this directory: `./node-obs`.

Node OBS can be found here:
https://github.com/twitchalerts/node-obs

### Yarn

In order to ensure you are using the correct version of each
node module, you should use the yarn package manager. On OS X
you can install yarn via homebrew:

```
brew update
brew install yarn
```

For other platforms, check the yarn docs:
https://yarnpkg.com/en/docs/install

## Installation

First, make sure you have initialized git submodules:

```
git submodule update --init --recursive
```

Install all node modules via yarn:

```
yarn install
```

Then, compile assets with webpack:

```
yarn compile
```

## Starting

If you are using Visual Studio Code, you can start the app
using the built in debugger.

Otherwise, you can run the app with:

```
yarn start
```

## Streaming

The default config will stream to:
https://www.twitch.tv/slobstest

## Environment Variables

These variables can be used in development to force certain behavior.

`SLOBS_FORCE_AUTO_UPDATE`: Force the auto-updater to run in development. Normally
this would only run in production.

`SLOBS_CACHE_DIR`: Force a different location for the user data cache directory.

`SLOBS_DISABLE_MAIN_LOGGING`: Disable javascript logging in the main process.

## Packaging / Distributing

Currently only Windows x64 packaging is supported.

### Prerequesites

The packager will use whatever version of node-obs you have
checked out in the slobs directory (at `./node-obs`).  You
should make sure that node-obs is compiled correctly with 32-bit
and 64-bit plugins, and works properly with the currently checked
out version of `slobs-client`.  If you're releasing, that should
probably be the `master` branch.  You should probably try running
the app from your dev environment to make sure everything is
working before you start the release process.

### Bumping the Version

Before you release, you should bump the version.  This is done
manually (for now) by changing the version number in the `pakcage.json`.
Commit the changes to the `package.json`, tag the commit in the format
of `v0.0.1`, and push the commit and tag to the origin.

### Packaging and Deploying

Make sure the app is not running in your dev environment
before you start the packaging process.

You can package the app by running:

```
yarn package
```

This will package a distributable installer `.exe` to the `dist/`
directory.  There is also an unpacked version in `dist/win-unpacked`.

If you want to deploy the packaged installer such that it will be
picked up by the auto-updater, you can run:

```
yarn deploy
```

You should thoroughly test the packaged app before running this, since
all users will be forced to upgrade to this verion the next time they
start the app.

You should also make sure that the packager signed the executables.
This will only happen if you have `CSC_LINK` and `CSC_KEY_PASSWORD`
set in your environment.  Someone on the team can give these to you.

In order for this to work, you will need to have `AWS_ACCESS_KEY_ID`
and `AWS_SECRET_ACCESS_KEY` set in your environment. These values
are secret. If you need to set up your machine, ask someone on the
team who has them, or someone with admin access on our AWS account.

### Deploy Checklist

This is a checklist to run through every time you deploy.

- [ ] Merge staging into master on `slobs-client` and `node-obs`
- [ ] Check out `master` on `slobs-client`
- [ ] Check out `master` on `node-obs`
- [ ] Rebuild node-obs `yarn rebuild-node-obs`
- [ ] Compile assets `yarn compile`
- [ ] Run the test suite `yarn test`
- [ ] Change the version in `package.json`
- [ ] Commit and push
- [ ] Tag the repo `git tag 'v0.0.11'` and `git push --tags`
- [ ] Tag `node-obs` in the same way with the same version
- [ ] Remove the dist directory `rm -rf dist`
- [ ] Package the app `yarn package`
- [ ] Run the packaged version in `dist/win-unpacked` and make sure it runs
- [ ] Deploy the new version `yarn deploy`
