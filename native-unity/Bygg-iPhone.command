#!/bin/bash
# Körs på en Mac med aktiverad Unity-licens, iOS Build Support och Xcode.
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
EDITOR_VERSION="$(awk '/^m_EditorVersion:/ { print $2; exit }' "$PROJECT_DIR/ProjectSettings/ProjectVersion.txt")"
UNITY_BIN="${KARLSTAD_UNITY_EDITOR:-/Applications/Unity/Hub/Editor/$EDITOR_VERSION/Unity.app/Contents/MacOS/Unity}"
LOG_DIR="$PROJECT_DIR/Builds/Logs"

fail() { printf '\n%s\n' "$1" >&2; exit 1; }

[[ "$(uname -s)" == Darwin ]] || fail 'iPhone-bygget behöver köras på macOS med Xcode.'
[[ -x "$UNITY_BIN" ]] || fail "Unity $EDITOR_VERSION saknas. Installera versionen via Unity Hub med iOS Build Support. En annan installationsplats anges med KARLSTAD_UNITY_EDITOR."

UNITY_CONTENTS="$(cd -- "$(dirname -- "$UNITY_BIN")/.." && pwd)"
[[ -d "$UNITY_CONTENTS/PlaybackEngines/iOSSupport" ]] || fail 'Unitys iOS Build Support saknas. Lägg till modulen för denna editor i Unity Hub.'
command -v xcodebuild >/dev/null 2>&1 || fail 'Xcode saknas. Installera och öppna Xcode innan du kör bygget.'
xcodebuild -version >/dev/null 2>&1 || fail 'Aktiv utvecklarmiljö är inte fullständiga Xcode. Välj Xcode under Xcode → Settings → Locations → Command Line Tools.'
xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1 || fail 'Öppna Xcode och slutför dess första start innan du kör bygget. Skriptet accepterar inga licensvillkor åt dig.'
[[ ! -e "$PROJECT_DIR/Temp/UnityLockfile" ]] || fail 'Projektet är öppet i Unity. Stäng projektet innan du kör batchbygget.'

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"
run_unity() {
    local method="$1" log="$2"
    if ! "$UNITY_BIN" -batchmode -quit -nographics -buildTarget iOS \
        -projectPath "$PROJECT_DIR" -executeMethod "$method" -logFile "$log"; then
        tail -n 70 "$log" 2>/dev/null || true
        fail "Unity-steget misslyckades. Fullständig logg: $log"
    fi
}

printf 'Skapar Karlstad-scenen med Unity %s …\n' "$EDITOR_VERSION"
run_unity Karlstad.Editor.PrototypeBuilder.Generate "$LOG_DIR/ios-generate.log"
[[ -f "$PROJECT_DIR/Assets/Karlstad/Generated/KarlstadMobile.unity" ]] || fail 'Unity avslutades utan att spara spelscenen. Läs ios-generate.log.'
# Ny editorprocess läser den sparade Input System-inställningen före kompilering.
printf 'Exporterar spelet till Xcode …\n'
run_unity Karlstad.Editor.PrototypeBuilder.BuildIOS "$LOG_DIR/ios-export.log"

XCODE_PROJECT="$PROJECT_DIR/Builds/iOS/Unity-iPhone.xcodeproj"
[[ -d "$XCODE_PROJECT" ]] || fail 'Unity avslutades utan ett Xcode-projekt. Läs ios-export.log.'
printf '\nXcode-projektet är exporterat. Detta är ännu ingen installerad eller signerad app.\n'
printf 'I Xcode: välj Unity-iPhone → Signing & Capabilities → ditt Team.\n'
printf 'Anslut din iPhone, välj den som körmål och tryck Run (▶).\n'
printf 'Använd en unik Bundle Identifier om Xcode begär det.\n'
open -a Xcode "$XCODE_PROJECT"
