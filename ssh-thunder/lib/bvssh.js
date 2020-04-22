const tcp = require('tcp-port-used');
const {
    execFile,
    execFileSync
} = require('child_process');

execFile('./3rd/AutoBvSsh.exe').unref();

const checkPort = (exe, timeOutMs, listenPort) => new Promise((resolve) => {
    let timeout, interval;
    exe.unref();

    timeout = setTimeout(() => {
        clearInterval(interval);

        resolve({
            success: false,
            message: `checkPort time out`,
            errCode: 3,
            kill: exe.kill(9)
        });
    }, timeOutMs);

    interval = setInterval(() => tcp.waitUntilUsed(listenPort, 100, 1000)
        .then(() => {
            clearTimeout(timeout);
            clearInterval(interval);

            resolve({
                success: true,
                exe
            });
        }, (e) => e), 1000);

    exe.once('close', (code) => {
        clearTimeout(timeout);
        clearInterval(interval);

        console.log(`BvSsh.exe exited with code ${code}`);

        resolve({
            success: false,
            message: `BvSsh.exe exited with code ${code}`,
            errCode: 2
        });
    });
});

const runCmd = ({
    sshHost,
    sshUser,
    sshPassword,
    sshPort = 22,
    listenPort,
    hideAll = true
}) => {
    const args = [`-host=${sshHost}`, `-port=${sshPort}`, `-user=${sshUser}`, `-password=${sshPassword}`, "-loginOnStartup", "-exitOnLogout", `-baseRegistry=HKEY_CURRENT_USER\\Software\\SshThunder\\Bitvise\\${listenPort}`]

    if (hideAll) {
        args.concat(["-menu=small", "-hide=popups,trayLog,trayPopups,trayIcon"])
    }

    return execFile("./3rd/BvSsh.exe", args);
}

const createProfile = (listenPort, listenAddress) => {
    return execFileSync(`./3rd/BvSshProfileWrite.exe`, [listenPort, listenAddress])
}

const startBvSsh = async (sshHost, sshUser, sshPassword, listenPort = 1271, lastCallPid = null, timeOutMs = 10000, listenAddress = "127.0.0.1") => {
    if (lastCallPid) {
        try {
            process.kill(lastCallPid, 9);
        } catch (error) {
            // console.log(error)
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
        await createProfile(listenPort, listenAddress)
    } catch (error) {
        console.log(error.message);
    }

    const listenPortInUsed = await tcp.check(listenPort, '127.0.0.1') //.then(r => console.log);
    if (!listenPortInUsed) {
        const exe = await runCmd({
            sshHost,
            sshUser,
            sshPassword,
            listenPort
        });

        return checkPort(exe, timeOutMs, listenPort);
    } else {
        return {
            success: false,
            message: `Port ${listenPort} in use.`,
            errCode: 1
        }
    }
}

module.exports = {
    startBvSsh
}