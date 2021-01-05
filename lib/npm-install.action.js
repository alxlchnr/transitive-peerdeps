const spawn = require('cross-spawn')

module.exports = (deps, cwd, args) => {
    const argsArray = Object.keys(args).map((argKey) => `--${argKey}=${args[argKey]}`)
    const npmInstall = spawn('npm', ['install', ...deps, ...argsArray], { cwd })

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
