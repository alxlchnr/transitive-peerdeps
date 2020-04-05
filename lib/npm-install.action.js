const spawn = require('cross-spawn')
module.exports = (deps, cwd) => {
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
