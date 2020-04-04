const path = require('path')
const minimist = require('minimist')
const micromatch = require('micromatch')
const treeify = require('treeify')
const spawn = require('cross-spawn')
const fs = require('fs')

const getDepsMatchingFilters = (
    packageJsonPath,
    dependencyType,
    globFilterString
) => {
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = require(packageJsonPath)
        const deps = Object.keys(packageJson[dependencyType] || {}).filter(
            (dep) => {
                if (!!globFilterString) {
                    let globPatterns = globFilterString
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    return micromatch.isMatch(dep, globPatterns)
                }
                return true
            }
        )
        return Object.fromEntries(
            deps.map((dep) => [dep, packageJson[dependencyType][dep]])
        )
    } else {
        console.error(`${packageJsonPath} does not contain a package.json file`)
        return null
    }
}

const installDependencies = (deps, cwd) => {
    const npmInstall = spawn('npm', ['install', ...deps], { cwd })

    npmInstall.stdout.on('data', (data) => {
        console.log(`${data}`)
    })

    npmInstall.stderr.on('data', (data) => {
        console.error(`${data}`)
    })

    npmInstall.on('error', (error) => {
        console.error(`${error}`)
    })

    npmInstall.on('close', (code) => {
        console.log(`npm install exited with code ${code}`)
    })
}


module.exports = () => {
    const defaultArgs = { cwd: process.cwd() }
    const cliArgs = minimist(process.argv.slice(2))
    const args = Object.assign(defaultArgs, cliArgs)
    let packageJsonPath = path.join(args.cwd, 'package.json')
    let globFilterString = args.depFilter
    let depsMatchingFilters = getDepsMatchingFilters(
        packageJsonPath,
        'dependencies',
        globFilterString
    )
    let depTree = Object.fromEntries(
        Object.keys(depsMatchingFilters).map((dep) => {
            const peerDeps = getDepsMatchingFilters(
                path.join(args.cwd, 'node_modules', dep, 'package.json'),
                'peerDependencies',
                args.peerDepFilter
            )
            return [dep, peerDeps]
        })
    )
    console.log('found following peerDependencies:')
    console.log(treeify.asTree(depTree, true))
    const dependenciesToInstall = Object.entries(depTree)
        .map((entry) => entry[1])
        .filter((peerDeps) => Object.keys(peerDeps).length > 0)
        .map((peerDeps) =>
            Object.keys(peerDeps).map(
                (depName) => `${depName}@${peerDeps[depName]}`
            )
        )
        .flat()
    if (dependenciesToInstall.length > 0) {
        if (!!args.dryRun) {
            console.warn('dry run => will not install', ...dependenciesToInstall)
            return
        }
        console.log('will install', dependenciesToInstall)
        installDependencies(dependenciesToInstall, args.cwd)
    } else {

        console.log('no peerDependencies to install')
    }
}
