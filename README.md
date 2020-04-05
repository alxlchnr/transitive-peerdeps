CLI tool to automatically install the peerDependencies of your direct dependencies. It will search the package.json of your project, and then will check the package.json of your installed dependencies for listed peerDependencies.
These peerDependencies can then be installed via `npm install` command, if they are not already dependencies of your project.

When a peerDependency is referenced by several of your dependencies, only the newest version or version range will be applied.

## Usage

```
npm i -g transitive-peerdeps

// execute in the working directory of your project
transitive-peerdeps
```

## Prerequesities
Before executing ensure, that you have installed the dependencies/run `npm install` in the project.

## Options
* `--cwd`: Working directory, of where the tool should look for a package.json and checks for peerDependencies of your dependencies
* `--depFilter`: regex pattern to process only peerDependencies of dependencies matching the pattern
* `--peerDepFilter`: regex pattern to install only peerDependencies matching the pattern
* `--dryRun`: skip the install step. 
* `--force`: install peerDependencies regardless if they are already part of your package.json and therefore already installed.