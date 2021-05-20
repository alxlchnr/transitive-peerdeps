const path = require('path')
const minimist = require('minimist')
const treeify = require('treeify')
const installDependencies = require('./lib/npm-install.action')
const semver = require('semver')
const intersect = require('semver-intersect').intersect
const union = require('semver-intersect').union
const dependencyTypes = require('./lib/dependency-types')

function groupByDependencyName(depTree) {
    return Object.entries(depTree)
        .map((entry) => entry[1])
        .filter((peerDeps) => Object.keys(peerDeps).length > 0)
        .reduce((previousValue, currentValue) => {
            let newValue = previousValue

            for (const value of Object.keys(currentValue)) {
                if (!newValue[value] || !Array.isArray(newValue[value])) {
                    newValue[value] = []
                }
                newValue[value].push(currentValue[value])
            }
            return newValue
        }, {})
}

const buildDependencyTree = require('./lib/dependency.util').buildDependencyTree
const getDepsMatchingFilters = require('./lib/dependency.util')
    .getDepsMatchingFilters

function isVersionTag(prev) {
    return !semver.valid(prev) && !semver.validRange(prev)
}

const reduceVersions = (dep) => (prev, curr) => {
    if (semver.valid(prev) && semver.valid(curr)) {
        return semver.gt(curr, prev, {
            includePrerelease: true
        })
            ? curr
            : prev
    }
    if (isVersionTag(prev) && isVersionTag(curr)) {
        return curr
    }

    if (isVersionTag(prev) && !isVersionTag(curr)) {
        return curr
    }
    if (isVersionTag(curr) && !isVersionTag(prev)) {
        return prev
    }
    if (semver.valid(prev) && semver.validRange(curr)) {
        if (semver.outside(prev, semver.validRange(curr), '>')) {
            return prev
        }
        if (semver.outside(prev, semver.validRange(curr), '<')) {
            return curr
        }
    }
    if (semver.valid(curr) && semver.validRange(prev)) {
        if (semver.outside(curr, semver.validRange(prev), '>')) {
            return curr
        }
        if (semver.outside(curr, semver.validRange(prev), '<')) {
            return prev
        }
    }
    try {
        return intersect(prev, curr)
    } catch (_) {
        return union([prev], [curr]).reduce(reduceVersions(dep))
    }
}

function filterVersions(dependenciesToInstall) {
    Object.keys(dependenciesToInstall).forEach((dep) => {
        let validVersions = dependenciesToInstall[dep].filter(semver.coerce)
        if (validVersions.length === 0) {
            console.warn(`no valid versions for ${dep}: ${dependenciesToInstall[dep]}`)
            return
        }
        dependenciesToInstall[dep] = validVersions.reduce(
            reduceVersions(dep)
        )
    })
}

function filterAlreadyInstalledDeps(packageJsonPath, dependenciesToInstall, dependencyType) {
    const alreadyInstalledDependencies = getDepsMatchingFilters(
        packageJsonPath,
        dependencyType
    )
    Object.keys(dependenciesToInstall)
        .filter((dep) => {
            return !!alreadyInstalledDependencies[dep]
        })
        .forEach((dep) => delete dependenciesToInstall[dep])
}

module.exports = () => {
    const defaultArgs = { cwd: process.cwd() }
    const cliArgs = minimist(process.argv.slice(2))
    const args = Object.assign(defaultArgs, cliArgs)
    args.cwd = path.resolve(args.cwd)
    const packageJsonPath = path.join(args.cwd, 'package.json')
    let dependencyType = args.dev ? dependencyTypes.devDependencies : dependencyTypes.dependencies
    console.log(`Will use ${dependencyType} as scan and installation target`)
    const depTree = buildDependencyTree(
        args.cwd,
        packageJsonPath,
        args.depFilter,
        args.peerDepFilter,
        dependencyType
    )
    console.log('found following peerDependencies:')
    console.log(treeify.asTree(depTree, true))
    const dependenciesToInstall = groupByDependencyName(depTree)
    filterVersions(dependenciesToInstall)
    if (!args.force) {
        filterAlreadyInstalledDeps(packageJsonPath, dependenciesToInstall, dependencyType)
    }
    const installList = Object.entries(dependenciesToInstall).map((entry) =>
        entry.join('@')
    )
    if (installList.length > 0) {
        if (!!args.dryRun) {
            console.warn('dry run => will not install', ...installList)
            return
        }

        const { cwd } = args;

        // Legacy support for --dev argument
        if (args.dev) {
            args['save-dev'] = true;
        }

        // Remove custom arguments
        delete args.cwd
        delete args.depFilter
        delete args.peerDepFilter
        delete args.force
        delete args.dev
        delete args._

        console.log('will install', installList)
        installDependencies(installList, cwd, args)
    } else {
        console.log('no peerDependencies to install')
    }
}
