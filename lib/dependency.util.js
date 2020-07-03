const fs = require('fs')
const path = require('path')
const fromEntries = require('object.fromentries')
const dependencyTypes = require('./dependency-types')
const dependencyUtils = {}
dependencyUtils.filterDependencies = (
    packageJsonPath,
    dependencyType,
    filterRegexString
) => {
    const packageJson = require(packageJsonPath)
    const deps = Object.keys(packageJson[dependencyType] || {}).filter(
        (dep) => {
            const filter = toRegex(filterRegexString)
            if (!!filter) {
                return filter.test(dep)
            }
            return true
        }
    )
    return fromEntries(
        deps.map((dep) => [dep, packageJson[dependencyType][dep]])
    )
}
dependencyUtils.getDepsMatchingFilters = (
    packageJsonPath,
    dependencyType,
    filterRegexString
) => {
    if (fs.existsSync(packageJsonPath)) {
        return dependencyUtils.filterDependencies(
            packageJsonPath,
            dependencyType,
            filterRegexString
        )
    } else {
        console.error(`${packageJsonPath} does not contain a package.json file`)
        return null
    }
}
dependencyUtils.buildDependencyTree = (cwd, packageJsonPath, depFilter, peerDepFilter, dependencyType) => {
    let depsMatchingFilters = dependencyUtils.getDepsMatchingFilters(
        packageJsonPath,
        dependencyType,
        depFilter
    )
    let depTree = fromEntries(
        Object.keys(depsMatchingFilters).map((dep) => {
            const peerDeps = dependencyUtils.getDepsMatchingFilters(
                path.join(cwd, 'node_modules', dep, 'package.json'),
                dependencyTypes.peerDependencies,
                peerDepFilter
            )
            return [dep, peerDeps]
        })
    )
    return depTree
}

const toRegex = (aString) => {
    try {
        return new RegExp(aString)
    } catch (_) {
        return null
    }
}

module.exports = dependencyUtils
