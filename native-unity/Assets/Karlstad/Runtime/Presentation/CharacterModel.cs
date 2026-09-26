using UnityEngine;
namespace Karlstad.World
{
    public class CharacterModel : MonoBehaviour
    {
        public Transform LeftArm,RightArm,LeftLeg,RightLeg; public bool Zombie,Hockey;
        Vector3 previous; float stride;
        public static CharacterModel Build(string name,Vector3 position,Transform parent,Material[] palette,bool hockey)
        {
            var g=new GameObject(name);g.transform.SetParent(parent,false);g.transform.localPosition=position;
            var model=g.AddComponent<CharacterModel>();model.Hockey=hockey;
            Material cloth=palette[(int)(hockey?WorldBuilder.M.Leaf:WorldBuilder.M.Purple)],skin=palette[(int)WorldBuilder.M.Plaster],dark=palette[(int)WorldBuilder.M.Dark];
            Piece("Vadderad jacka",g.transform,new Vector3(0,1.2f,0),new Vector3(.65f,.65f,.35f),cloth);
            Piece("Axelsöm",g.transform,new Vector3(0,1.48f,0),new Vector3(.77f,.12f,.4f),dark);
            Piece("Bröstpanel",g.transform,new Vector3(0,1.2f,.19f),new Vector3(.34f,.22f,.035f),palette[(int)WorldBuilder.M.Teal]);
            Piece("Bälte",g.transform,new Vector3(0,.89f,0),new Vector3(.59f,.1f,.37f),dark);
            Piece("Huvud",g.transform,new Vector3(0,1.79f,0),new Vector3(.39f,.44f,.38f),skin,PrimitiveType.Sphere);
            Piece(hockey?"Hjälm":"Hår",g.transform,new Vector3(0,1.98f,-.015f),new Vector3(.43f,.2f,.4f),dark,PrimitiveType.Sphere);
            for(int s=-1;s<=1;s+=2) {
                Piece("Öga",g.transform,new Vector3(s*.095f,1.83f,.184f),new Vector3(.045f,.035f,.025f),dark);
                var arm=Joint("Arm",g.transform,new Vector3(s*.41f,1.45f,0));
                Piece("Ärm",arm,new Vector3(0,-.24f,0),new Vector3(.22f,.5f,.24f),cloth);
                Piece("Hand",arm,new Vector3(0,-.56f,0),new Vector3(.18f,.2f,.19f),skin);
                var leg=Joint("Ben",g.transform,new Vector3(s*.18f,.87f,0));
                Piece("Byxa",leg,new Vector3(0,-.34f,0),new Vector3(.24f,.65f,.27f),dark);
                Piece("Sko",leg,new Vector3(0,-.77f,.06f),new Vector3(.26f,.2f,.43f),dark);
                if(s<0){model.LeftArm=arm;model.LeftLeg=leg;}else{model.RightArm=arm;model.RightLeg=leg;}
            }
            if(hockey) {var stick=Piece("Hockeyklubba",model.RightArm,new Vector3(0,-.6f,.18f),new Vector3(.05f,1.4f,.06f),palette[(int)WorldBuilder.M.Wood]);stick.transform.localEulerAngles=new Vector3(18,0,0);}
            model.previous=g.transform.position;return model;
        }
        static Transform Joint(string name,Transform parent,Vector3 p) {var t=new GameObject(name).transform;t.SetParent(parent,false);t.localPosition=p;return t;}
        public static GameObject Piece(string name,Transform parent,Vector3 p,Vector3 scale,Material m,PrimitiveType type=PrimitiveType.Cube)
        {var g=GameObject.CreatePrimitive(type);g.name=name;g.transform.SetParent(parent,false);g.transform.localPosition=p;g.transform.localScale=scale;g.GetComponent<Renderer>().sharedMaterial=m;var collider=g.GetComponent<Collider>();collider.enabled=false;if(Application.isPlaying)Object.Destroy(collider);else Object.DestroyImmediate(collider);return g;}
        void Update()
        {
            float moved=Vector3.Distance(transform.position,previous);previous=transform.position;stride+=moved*5;
            float swing=Mathf.Sin(stride)*Mathf.Min(26,moved/Mathf.Max(.001f,Time.deltaTime)*8);
            if(LeftLeg)LeftLeg.localRotation=Quaternion.Euler(swing,0,0);if(RightLeg)RightLeg.localRotation=Quaternion.Euler(-swing,0,0);
            if(LeftArm)LeftArm.localRotation=Quaternion.Euler(Zombie?-73:-swing,0,Zombie?-8:0);if(RightArm)RightArm.localRotation=Quaternion.Euler(Zombie?-79:swing,0,Zombie?8:0);
        }
    }
}
