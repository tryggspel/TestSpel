#!/usr/bin/env python3
"""Runs real pure-C# rule tests and C# syntax checks, without claiming a Unity build.
Usage: python3 Tools/verify.py --dotnet /absolute/path/to/dotnet
Requires a local .NET 8 SDK. No NuGet download, Unity licence or paid service.
"""
import argparse,glob,json,pathlib,shutil,subprocess
p=argparse.ArgumentParser();p.add_argument('--dotnet',required=True);args=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];host=pathlib.Path(args.dotnet).resolve();sdk=host.parent
compiler=sorted(sdk.glob('sdk/8.*/Roslyn/bincore/csc.dll'))[-1]
refroot=sorted(sdk.glob('packs/Microsoft.NETCore.App.Ref/8.*/ref/net8.0'))[-1]
refs=list(refroot.glob('*.dll'));out=root/'.verification';out.mkdir(exist_ok=True)
def build(name,sources,extra=()):
    rsp=out/(name+'.rsp');target=out/(name+'.dll')
    rsp.write_text('\n'.join(['-nologo','-langversion:9','-target:exe','-out:'+str(target)]+['-r:'+str(r) for r in [*refs,*extra]]+[str(s) for s in sources]))
    subprocess.run([str(host),str(compiler),'@'+str(rsp)],check=True)
    (out/(name+'.runtimeconfig.json')).write_text(json.dumps({'runtimeOptions':{'tfm':'net8.0','framework':{'name':'Microsoft.NETCore.App','version':'8.0.0'},'rollForward':'LatestPatch'}}))
    return target
rules=build('CoreChecks',[root/'Tools/CoreChecks.cs',root/'Assets/Karlstad/Runtime/Core/SurvivalLedger.cs',root/'Assets/Karlstad/Runtime/Core/MobileInputMath.cs'])
subprocess.run([str(host),str(rules)],check=True)
roslyn=[compiler.parent/'Microsoft.CodeAnalysis.dll',compiler.parent/'Microsoft.CodeAnalysis.CSharp.dll']
syntax=build('SyntaxCheck',[root/'Tools/SyntaxCheck.cs'],roslyn)
for dll in roslyn:shutil.copy2(dll,out/dll.name)
subprocess.run([str(host),str(syntax),str(root/'Assets')],check=True)
