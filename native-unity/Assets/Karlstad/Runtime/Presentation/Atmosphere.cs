using System.Collections.Generic;
using Karlstad.Network;
using Karlstad.World;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
namespace Karlstad
{
    public class Atmosphere:MonoBehaviour
    {
        Light sun;float blend;Volume volume;ColorAdjustments color;Vignette vignette;Bloom bloom;float nextCheck;
        readonly List<Renderer> citizens=new List<Renderer>();
        void Start()
        {
            sun=RenderSettings.sun;
            var go=new GameObject("URP · mobil färg och ljus");volume=go.AddComponent<Volume>();volume.isGlobal=true;volume.profile=ScriptableObject.CreateInstance<VolumeProfile>();
            color=volume.profile.Add<ColorAdjustments>(true);vignette=volume.profile.Add<Vignette>(true);bloom=volume.profile.Add<Bloom>(true);
            color.contrast.Override(13);bloom.threshold.Override(1.15f);bloom.intensity.Override(.27f);bloom.scatter.Override(.55f);vignette.smoothness.Override(.38f);
            foreach(var model in FindObjectsByType<CharacterModel>(FindObjectsSortMode.None))if(!model.GetComponentInParent<Unity.Netcode.NetworkObject>()&&!model.Hockey)citizens.AddRange(model.GetComponentsInChildren<Renderer>());
            RenderSettings.fog=true;RenderSettings.fogMode=FogMode.ExponentialSquared;
        }
        void Update()
        {
            bool night=SessionAuthority.Instance&&SessionAuthority.Instance.Apocalypse.Value&&!SessionAuthority.Instance.Victory.Value;
            blend=Mathf.MoveTowards(blend,night?1:0,Time.deltaTime*.6f);
            RenderSettings.fogColor=Color.Lerp(new Color(.55f,.66f,.68f),new Color(.09f,.15f,.18f),blend);
            RenderSettings.fogDensity=Mathf.Lerp(.0055f,.012f,blend);
            RenderSettings.ambientLight=Color.Lerp(new Color(.5f,.56f,.6f),new Color(.17f,.22f,.28f),blend);
            if(sun){sun.color=Color.Lerp(new Color(1,.88f,.65f),new Color(.5f,.65f,.85f),blend);sun.intensity=Mathf.Lerp(1.25f,.33f,blend);}
            if(RenderSettings.skybox)RenderSettings.skybox.SetFloat("_Apocalypse",blend);
            if(color){color.saturation.Override(Mathf.Lerp(4,-28,blend));color.postExposure.Override(Mathf.Lerp(.2f,-.05f,blend));vignette.intensity.Override(Mathf.Lerp(.15f,.29f,blend));}
            if(Time.unscaledTime>nextCheck) {nextCheck=Time.unscaledTime+.5f;foreach(var r in citizens)if(r)r.enabled=!night;}
            var p=MobilePlayer.Local;if(p&&p.Eyes)p.Eyes.GetUniversalAdditionalCameraData().renderPostProcessing=GameBootstrap.Instance.QualityMode>0;
        }
    }
}
