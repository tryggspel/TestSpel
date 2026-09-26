using System;
using System.IO;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
public static class SyntaxCheck
{
    public static int Main(string[] args)
    {
        int files=0,errors=0;
        foreach(string file in Directory.GetFiles(args[0],"*.cs",SearchOption.AllDirectories)) {
            var tree=CSharpSyntaxTree.ParseText(File.ReadAllText(file),new CSharpParseOptions(LanguageVersion.CSharp9),file);
            foreach(var d in tree.GetDiagnostics().Where(x=>x.Severity==DiagnosticSeverity.Error)){Console.WriteLine(d);errors++;}files++;
        }
        Console.WriteLine($"C# 9 syntax: {files} source files, {errors} errors (not a Unity API/build check)");return errors>0?1:0;
    }
}
