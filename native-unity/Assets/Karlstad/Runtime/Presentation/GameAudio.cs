using UnityEngine;
namespace Karlstad
{
    // Original synthesized score and effects; no commercial soundtrack assets.
    public class GameAudio:MonoBehaviour
    {
        public static GameAudio Instance {get;private set;}
        AudioSource drone,fx;AudioClip shot;float volume;
        void Awake()
        {
            Instance=this;drone=gameObject.AddComponent<AudioSource>();fx=gameObject.AddComponent<AudioSource>();drone.loop=true;drone.volume=0;
            const int rate=22050,seconds=8;float[] data=new float[rate*seconds];
            for(int i=0;i<data.Length;i++) {float t=i/(float)rate;float pulse=.62f+.38f*Mathf.Sin(2*Mathf.PI*t/4);data[i]=pulse*(Mathf.Sin(2*Mathf.PI*55*t)*.16f+Mathf.Sin(2*Mathf.PI*82.5f*t)*.09f+Mathf.Sin(2*Mathf.PI*110*t)*.04f);}
            drone.clip=AudioClip.Create("Karlstad · mörker över älven",data.Length,1,rate,false);drone.clip.SetData(data,0);drone.Play();
            float[] beam=new float[(int)(rate*.18f)];for(int i=0;i<beam.Length;i++){float t=i/(float)rate;beam[i]=Mathf.Sin(2*Mathf.PI*(1100*t-1700*t*t))*Mathf.Exp(-28*t)*.3f;}
            shot=AudioClip.Create("Solpuls",beam.Length,1,rate,false);shot.SetData(beam,0);
        }
        public void Shot(float strength=.6f){if(fx)fx.PlayOneShot(shot,strength);}
        void Update(){float target=Network.SessionAuthority.Instance&&Network.SessionAuthority.Instance.Apocalypse.Value?.42f:0;volume=Mathf.MoveTowards(volume,target,Time.deltaTime*.15f);drone.volume=volume;}
        void OnDestroy(){if(Instance==this)Instance=null;if(shot)Destroy(shot);if(drone&&drone.clip)Destroy(drone.clip);}
    }
}
