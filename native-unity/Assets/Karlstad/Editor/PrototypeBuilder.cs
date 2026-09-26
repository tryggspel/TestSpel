using System.IO;
using Karlstad.Network;
using Karlstad.World;
using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace Karlstad.Editor
{
    public static class PrototypeBuilder
    {
        const string Generated="Assets/Karlstad/Generated";
        const string Scene=Generated+"/KarlstadMobile.unity";
        [MenuItem("Karlstad/1. Generate mobile prototype")]
        public static void Generate()
        {
            if(EditorApplication.isPlaying)throw new System.InvalidOperationException("Stoppa Play innan generering.");
            if(!AssetDatabase.IsValidFolder(Generated))AssetDatabase.CreateFolder("Assets/Karlstad","Generated");
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var palette=WorldBuilder.MakeMaterials();
            for(int i=0;i<palette.Length;i++)palette[i]=Save(palette[i],Generated+"/"+palette[i].name+".mat");
            var balanced=Pipeline("Balanced",.9f,1024,42,true);
            var high=Pipeline("High",1f,2048,60,true);
            var battery=Pipeline("Battery",.75f,512,25,false);
            GraphicsSettings.defaultRenderPipeline=balanced;QualitySettings.renderPipeline=balanced;
            var sky=new Material(Shader.Find("Karlstad/StormSky")){name="Storm over Klarälven"};sky=Save(sky,Generated+"/StormSky.mat");RenderSettings.skybox=sky;
            var world=WorldBuilder.Build(palette);
            int meshIndex=0;
            foreach(var filter in world.GetComponentsInChildren<MeshFilter>())if(filter.sharedMesh&&!AssetDatabase.Contains(filter.sharedMesh))filter.sharedMesh=Save(filter.sharedMesh,Generated+"/Roof"+(meshIndex++)+".asset");
            var sunObject=new GameObject("Sol över Karlstad");var sun=sunObject.AddComponent<Light>();sun.type=LightType.Directional;sun.shadows=LightShadows.Soft;sun.intensity=1.25f;sunObject.transform.rotation=Quaternion.Euler(35,-40,0);RenderSettings.sun=sun;
            RenderSettings.ambientMode=AmbientMode.Flat;RenderSettings.ambientLight=new Color(.5f,.56f,.6f);
            var player=PlayerPrefab(palette);var zombie=ZombiePrefab(palette);var session=SessionPrefab();
            var prefabList=ScriptableObject.CreateInstance<NetworkPrefabsList>();
            prefabList.Add(new NetworkPrefab{Prefab=player});prefabList.Add(new NetworkPrefab{Prefab=zombie});prefabList.Add(new NetworkPrefab{Prefab=session});
            prefabList=Save(prefabList,Generated+"/NetworkPrefabs.asset");
            var managerObject=new GameObject("Session · NGO / UTP");var transport=managerObject.AddComponent<UnityTransport>();var manager=managerObject.AddComponent<NetworkManager>();
            manager.NetworkConfig=new NetworkConfig {NetworkTransport=transport,PlayerPrefab=player,TickRate=30,EnableSceneManagement=false,ConnectionApproval=true,ProtocolVersion=1};
            manager.NetworkConfig.Prefabs.NetworkPrefabsLists.Add(prefabList);
            var boot=new GameObject("Karlstad Native").AddComponent<GameBootstrap>();boot.PlayerPrefab=player;boot.ZombiePrefab=zombie;boot.SessionPrefab=session;boot.Palette=palette;boot.Balanced=balanced;boot.High=high;boot.Battery=battery;
            var camera=new GameObject("Intro · city panorama").AddComponent<Camera>();camera.transform.position=new Vector3(-15,15,-35);camera.transform.rotation=Quaternion.Euler(16,18,0);camera.farClipPlane=230;camera.gameObject.AddComponent<AudioListener>();camera.GetUniversalAdditionalCameraData().renderPostProcessing=true;boot.MenuCamera=camera;
            ConfigurePlayer();EditorSceneManager.SaveScene(SceneManager.GetActiveScene(),Scene);EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(Scene,true)};
            AssetDatabase.SaveAssets();AssetDatabase.Refresh();Selection.activeGameObject=boot.gameObject;
            Debug.Log("Karlstad Mobile genererad. Play startar menyn. Nativebygge kräver respektive Unity-plattformsmodul.");
        }
        static T Save<T>(T value,string path) where T:Object
        {
            var old=AssetDatabase.LoadAssetAtPath<T>(path);
            if(old){EditorUtility.CopySerialized(value,old);Object.DestroyImmediate(value);EditorUtility.SetDirty(old);return old;}
            AssetDatabase.CreateAsset(value,path);return value;
        }
        static UniversalRenderPipelineAsset Pipeline(string name,float scale,int shadow,float distance,bool post)
        {
            var renderer=ScriptableObject.CreateInstance<UniversalRendererData>();renderer.name=name+" Renderer";renderer=Save(renderer,Generated+"/"+name+"Renderer.asset");
            var asset=UniversalRenderPipelineAsset.Create(renderer);asset.name=name;asset.renderScale=scale;asset.msaaSampleCount=2;asset.supportsHDR=post;
            asset.shadowDistance=distance;asset.mainLightShadowmapResolution=shadow;asset.maxAdditionalLightsCount=2;
            var settings=new SerializedObject(asset);settings.FindProperty("m_AdditionalLightShadowsSupported").boolValue=false;settings.FindProperty("m_SoftShadowsSupported").boolValue=post;settings.ApplyModifiedPropertiesWithoutUndo();
            return Save(asset,Generated+"/"+name+".asset");
        }
        static GameObject PlayerPrefab(Material[] palette)
        {
            var g=new GameObject("MobilePlayer");g.layer=8;g.AddComponent<NetworkObject>();var controller=g.AddComponent<CharacterController>();controller.height=1.85f;controller.center=Vector3.up*.925f;controller.radius=.31f;controller.stepOffset=.28f;controller.slopeLimit=48;controller.minMoveDistance=0;
            var player=g.AddComponent<MobilePlayer>();player.Body=CharacterModel.Build("Överlevare",Vector3.zero,g.transform,palette,false).transform;
            var prefab=PrefabUtility.SaveAsPrefabAsset(g,Generated+"/MobilePlayer.prefab");Object.DestroyImmediate(g);return prefab;
        }
        static GameObject ZombiePrefab(Material[] palette)
        {
            var g=new GameObject("ZombieCitizen");g.layer=9;g.AddComponent<NetworkObject>();g.AddComponent<ZombieActor>();var col=g.AddComponent<CapsuleCollider>();col.height=1.95f;col.center=Vector3.up*.975f;col.radius=.4f;col.isTrigger=true;
            var model=CharacterModel.Build("Förvandlad stadsbo",Vector3.zero,g.transform,palette,false);model.Zombie=true;
            CharacterModel.Piece("Glödande öga L",model.transform,new Vector3(-.095f,1.83f,.204f),new Vector3(.055f,.04f,.02f),palette[(int)WorldBuilder.M.Neon]);
            CharacterModel.Piece("Glödande öga R",model.transform,new Vector3(.095f,1.83f,.204f),new Vector3(.055f,.04f,.02f),palette[(int)WorldBuilder.M.Neon]);
            var prefab=PrefabUtility.SaveAsPrefabAsset(g,Generated+"/ZombieCitizen.prefab");Object.DestroyImmediate(g);return prefab;
        }
        static GameObject SessionPrefab()
        {var g=new GameObject("SessionAuthority");g.AddComponent<NetworkObject>();g.AddComponent<SessionAuthority>();var prefab=PrefabUtility.SaveAsPrefabAsset(g,Generated+"/SessionAuthority.prefab");Object.DestroyImmediate(g);return prefab;}
        static void ConfigurePlayer()
        {
            PlayerSettings.companyName="Tryggspel";PlayerSettings.productName="Karlstad After the Sun";PlayerSettings.bundleVersion="0.1.0";PlayerSettings.colorSpace=ColorSpace.Linear;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android,"se.tryggspel.karlstad");PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS,"se.tryggspel.karlstad");
            PlayerSettings.defaultInterfaceOrientation=UIOrientation.AutoRotation;PlayerSettings.allowedAutorotateToLandscapeLeft=true;PlayerSettings.allowedAutorotateToLandscapeRight=true;PlayerSettings.allowedAutorotateToPortrait=false;PlayerSettings.allowedAutorotateToPortraitUpsideDown=false;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android,ScriptingImplementation.IL2CPP);PlayerSettings.SetScriptingBackend(NamedBuildTarget.iOS,ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;PlayerSettings.Android.minSdkVersion=AndroidSdkVersions.AndroidApiLevel26;PlayerSettings.iOS.targetOSVersionString="15.0";
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android,false);PlayerSettings.SetGraphicsAPIs(BuildTarget.Android,new[]{GraphicsDeviceType.Vulkan,GraphicsDeviceType.OpenGLES3});
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.iOS,false);PlayerSettings.SetGraphicsAPIs(BuildTarget.iOS,new[]{GraphicsDeviceType.Metal});
            // Use Input System only. Unity may request one editor restart after changing this project setting.
            var assets=AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset");
            if(assets.Length>0){var settings=new SerializedObject(assets[0]);var property=settings.FindProperty("activeInputHandler");if(property!=null){property.intValue=1;settings.ApplyModifiedPropertiesWithoutUndo();}}
        }
        [MenuItem("Karlstad/2. Build Android development APK")]
        public static void BuildAndroid()
        {if(!File.Exists(Scene))Generate();Directory.CreateDirectory("Builds/Android");Build(BuildTarget.Android,"Builds/Android/KarlstadMobile-dev.apk",BuildOptions.Development);}
        [MenuItem("Karlstad/3. Export iOS Xcode project")]
        public static void BuildIOS()
        {if(!File.Exists(Scene))Generate();Directory.CreateDirectory("Builds/iOS");Build(BuildTarget.iOS,"Builds/iOS",BuildOptions.None);}
        static void Build(BuildTarget target,string path,BuildOptions options)
        {
            if(!BuildPipeline.IsBuildTargetSupported(BuildTargetGroupFor(target),target))throw new System.InvalidOperationException("Installera Unitys byggmodul för "+target+" i Unity Hub.");
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{Scene},locationPathName=path,target=target,options=options});
            if(report.summary.result!=BuildResult.Succeeded)throw new System.InvalidOperationException("Nativebygget misslyckades: "+report.summary.result);
        }
        static BuildTargetGroup BuildTargetGroupFor(BuildTarget target)=>target==BuildTarget.iOS?BuildTargetGroup.iOS:BuildTargetGroup.Android;
    }
}
