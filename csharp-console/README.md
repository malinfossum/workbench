# csharp-console template

Editor configs for VS Code (F5 debug, build task). Rider needs no setup — it runs console apps out of the box.
Auto-scaffolds into a new project — no placeholders to remember.

## Use

```bash
# 1. Create a new console project
dotnet new console -n MyProject -o my-project
cd my-project

# 2. Initialize editor configs (auto-detects project name and TFM from .csproj)
bash ~/Documents/Development/_template/csharp-console/init.sh

# 3. Open and run
code .   # then press F5
```

## What it adds

- `Properties/launchSettings.json` — launch profile (args, env, working dir); used by `dotnet run` and the VS Code debugger
- `.vscode/launch.json` — F5 debug config for VS Code
- `.vscode/tasks.json` — `dotnet build` task for VS Code

## Optional alias

Add to `~/.bashrc` so `init.sh` is one word:

```bash
alias new-csharp='bash ~/Documents/Development/_template/csharp-console/init.sh'
```

Then the full workflow becomes: `dotnet new console -n MyProject -o my-project && cd my-project && new-csharp`.

## If you don't have bash

Copy `.vscode/` and `Properties/` into your new project manually, then find-replace
`TemplateProject` with your project name in `.vscode/launch.json` and `.vscode/tasks.json`.
