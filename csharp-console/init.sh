#!/usr/bin/env bash
# Usage: run from inside a freshly `dotnet new console` directory.
#   bash ~/Documents/Development/_template/csharp-console/init.sh
#
# Auto-detects project name and TargetFramework from the .csproj in the
# current directory, copies VS Code editor configs in, and
# replaces placeholders. Verifies the build at the end.

set -e

CSPROJ=$(ls *.csproj 2>/dev/null | head -n 1)
if [ -z "$CSPROJ" ]; then
    echo "Error: no .csproj found. Run from inside a project directory."
    exit 1
fi

PROJECT_NAME="${CSPROJ%.csproj}"
TARGET_FRAMEWORK=$(grep -oP '(?<=<TargetFramework>)[^<]+' "$CSPROJ" | head -n 1)
TEMPLATE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy template files into the new project
cp -r "$TEMPLATE_DIR/.vscode" .
mkdir -p Properties
cp "$TEMPLATE_DIR/Properties/launchSettings.json" Properties/

# Replace placeholders
find .vscode -type f -name "*.json" -exec sed -i "s/TemplateProject/$PROJECT_NAME/g" {} +
if [ -n "$TARGET_FRAMEWORK" ] && [ "$TARGET_FRAMEWORK" != "net10.0" ]; then
    sed -i "s|bin/Debug/net10.0|bin/Debug/$TARGET_FRAMEWORK|g" .vscode/launch.json
fi

# Verify the build still works after scaffolding
echo "Running dotnet build to verify..."
if dotnet build > /dev/null 2>&1; then
    echo "✓ Initialized $PROJECT_NAME (target: ${TARGET_FRAMEWORK:-net10.0}) — F5 will work in VS Code"
else
    echo "✗ Build failed after scaffolding. Inspect output of: dotnet build"
    exit 1
fi
