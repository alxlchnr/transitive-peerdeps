const spawn = require('cross-spawn')
const dependencyTypes = require('./dependency-types')
module.exports = (deps, cwd, dependencyType) => {

    let args = ['install', ...deps]
    if (dependencyType === dependencyTypes.devDependencies) {
        args = ['install', '-D', ...deps]
    }
    const npmInstall = spawn('npm', args, { cwd })

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
