module.exports = {
    apps: [
        {
            name: "discord-plus-archive",
            script: "server.js",
            cwd: __dirname,
            env: {
                ARCHIVE_TOKEN: "replace-with-a-long-random-token",
                PORT: "8790"
            }
        }
    ]
};
