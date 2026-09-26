using UnityEngine;
namespace Karlstad.World
{
    public enum UseKind { Enter, Exit, Food, Beacon, Bus, Recruit, Guide, Evacuate, Claim }
    public class UsePoint : MonoBehaviour
    {
        public static readonly System.Collections.Generic.List<UsePoint> All = new System.Collections.Generic.List<UsePoint>();
        public UseKind Kind; public int Id, Building = -1; public string Label;
        void OnEnable() { All.Add(this); }
        void OnDisable() { All.Remove(this); }
        public static UsePoint Closest(Vector3 origin, int building)
        {
            UsePoint best=null; float d=3.25f*3.25f;
            foreach(var p in All) { if(p.Building!=building) continue; float n=(p.transform.position-origin).sqrMagnitude; if(n<d) {d=n;best=p;} }
            return best;
        }
    }
}
