#if UNITY_IOS
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;
using System.IO;
namespace Karlstad.Editor
{
    public static class IOSNetworkPermission
    {
        [PostProcessBuild(20)]
        public static void AddLocalNetworkPurpose(BuildTarget target,string path)
        {
            if(target!=BuildTarget.iOS)return;
            string file=Path.Combine(path,"Info.plist");var plist=new PlistDocument();plist.ReadFromFile(file);
            plist.root.SetString("NSLocalNetworkUsageDescription","Anslut till dina vänners Karlstad-spel på samma Wi-Fi.");plist.WriteToFile(file);
        }
    }
}
#endif
