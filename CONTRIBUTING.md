# Contributing to Discord+

Bug reports, fixes and new plugins are welcome. Discord+ is a fork of [Vencord](https://github.com/Vendicated/Vencord), so most of the code in `src/` is theirs, and the Discord+ parts are the plugins listed in the [README](README.md), the second-account window in `src/main/multiAccount.ts` and the backend in `server/`.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting a problem

Open an issue on [GitHub](https://github.com/rossinskiy/discord-plus/issues). Include your Discord build number (shown in the console on start), what you did, what you expected and what happened. For a crash, the red error from the console (`Ctrl+Shift+I`) helps the most.

Discord updates often change internal names and break plugins. If something stopped working after a Discord update, say so in the issue.

## Sending a change

1. Fork the repository and make a branch from `main`.
2. Set up the project as described on the [install page](https://discordplus.karatel.win/install), then run `pnpm build` after each change.
3. Check types and style before you push: `pnpm exec tsc --noEmit` and `pnpm exec eslint` on the files you touched.
4. Open a pull request against `main` and describe what changed and how you tested it in Discord.

Keep changes small and focused. For a big change, open an issue first so we can agree on it before you spend time.

## Writing a plugin

Plugins live in `src/plugins/<name>/`. Look at a small one such as `src/plugins/autoLeaveEmptyVC` for the structure. A few rules:

- Never commit secrets. Tokens and server addresses belong in the user's plugin settings, not in the code.
- Plugins that save data must send it only to a server the user configured.
- Do not add dependencies unless there is no sensible alternative.
- Say plainly in the description if a plugin carries a risk for the user's account.

## About AI-assisted code

Discord+ itself is vibe-coded, so AI help is fine here. You are still responsible for what you submit: run it, test it in Discord and be able to explain it. Untested generated code will be sent back.

## Contributing to Vencord instead

If your change belongs in Vencord itself, send it there and follow the [Vencord contribution guide](https://github.com/Vendicated/Vencord/blob/main/CONTRIBUTING.md). Its rules are stricter than ours. In particular, Vencord does not accept AI-generated contributions, niche plugins, or anything that automates actions on an account, so most Discord+ plugins would not be accepted there.
