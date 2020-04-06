const path = require('path')
const minimist = require('minimist')
const treeify = require('treeify')
const installDependencies = require('./lib/npm-install.action')
const semver = require('semver')
const intersect = require('semver-intersect').intersect
const union = require('semver-intersect').union

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

const reduceVersions = (dep) => (prev, curr) => {
    if (semver.valid(prev) && semver.valid(curr)) {
        return semver.gt(curr, prev, {
            includePrerelease: true,
        })
            ? curr
            : prev
    }
    if (!semver.valid(prev) && !semver.validRange(prev)) {
        if (semver.valid(curr) || semver.validRange(curr)) {
            return curr
        }
    }
    if (!semver.valid(curr) && !semver.validRange(curr)) {
        if (semver.valid(prev) || semver.validRange(prev)) {
            return prev
        }
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
        dependenciesToInstall[dep] = dependenciesToInstall[dep].reduce(
            reduceVersions(dep)
        )
    })
}

function filterAlreadyInstalledDeps(packageJsonPath, dependenciesToInstall) {
    const alreadyInstalledDependencies = getDepsMatchingFilters(
        packageJsonPath,
        'dependencies'
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
    const depTree = buildDependencyTree(
        args.cwd,
        packageJsonPath,
        args.depFilter,
        args.peerDepFilter
    )
    console.log('found following peerDependencies:')
    console.log(treeify.asTree(depTree, true))
    const dependenciesToInstall = groupByDependencyName(depTree)
    filterVersions(dependenciesToInstall)
    if (!args.force) {
        filterAlreadyInstalledDeps(packageJsonPath, dependenciesToInstall)
    }
    const installList = Object.entries(dependenciesToInstall).map((entry) =>
        entry.join('@')
    )
    if (installList.length > 0) {
        if (!!args.dryRun) {
            console.warn('dry run => will not install', ...installList)
            return
        }
        console.log('will install', installList)
        installDependencies(installList, args.cwd)
    } else {
        console.log('no peerDependencies to install')
    }
}
