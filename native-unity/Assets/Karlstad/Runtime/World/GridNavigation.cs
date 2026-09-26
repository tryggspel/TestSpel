using System.Collections.Generic;
using UnityEngine;
namespace Karlstad.World
{
    // Cached occupancy grids and shared flow fields. One breadth-first pass per target cell,
    // instead of a full search per zombie. Layer 0 is static world; actors are excluded.
    public static class GridNavigation
    {
        sealed class Grid {public Vector3 Origin;public int W,H;public bool[] Open;public int Goal=-1;public int[] Next;}
        static readonly Dictionary<int,Grid> grids=new Dictionary<int,Grid>();
        const float Cell=1.4f;
        static readonly int[] DX={1,-1,0,0,1,1,-1,-1},DZ={0,0,1,-1,1,-1,1,-1};
        public static void Clear()=>grids.Clear();
        static Grid Get(int region)
        {
            if(grids.TryGetValue(region,out var result))return result;
            Vector3 centre;int w,h;
            if(region>=0){centre=PlaceCatalog.All[region].Interior;w=region==7?32:21;h=region==7?42:19;}
            else {centre=region==-2?PlaceCatalog.All[1].Exterior:region==-3?PlaceCatalog.All[7].Exterior:new Vector3(0,0,35);w=region==-1?96:50;h=region==-1?149:48;}
            var g=new Grid{Origin=centre-new Vector3(w*Cell/2,0,h*Cell/2),W=w,H=h,Open=new bool[w*h],Next=new int[w*h]};
            for(int z=0;z<h;z++)for(int x=0;x<w;x++) {
                Vector3 p=g.Origin+new Vector3((x+.5f)*Cell,0,(z+.5f)*Cell);
                g.Open[z*w+x]=!Physics.CheckCapsule(p+Vector3.up*.52f,p+Vector3.up*1.5f,.38f,1,QueryTriggerInteraction.Ignore)
                    &&Physics.Raycast(p+Vector3.up*.5f,Vector3.down,1.2f,1,QueryTriggerInteraction.Ignore);
            }
            grids.Add(region,g);return g;
        }
        public static int Region(int building,Vector3 p)=>building>=0?building:p.x<-180?-2:p.x>180?-3:-1;
        static int Node(Grid g,Vector3 p)
        {int x=Mathf.Clamp(Mathf.FloorToInt((p.x-g.Origin.x)/Cell),0,g.W-1),z=Mathf.Clamp(Mathf.FloorToInt((p.z-g.Origin.z)/Cell),0,g.H-1);return z*g.W+x;}
        static Vector3 Point(Grid g,int n)=>g.Origin+new Vector3((n%g.W+.5f)*Cell,.1f,(n/g.W+.5f)*Cell);
        static void Flow(Grid g,int goal)
        {
            for(int n=0;n<g.Next.Length;n++)g.Next[n]=-1;
            int[] queue=new int[g.Next.Length];int head=0,tail=0;queue[tail++]=goal;g.Next[goal]=goal;g.Goal=goal;
            while(head<tail) {
                int n=queue[head++],x=n%g.W,z=n/g.W;
                for(int i=0;i<8;i++) {
                    int nx=x+DX[i],nz=z+DZ[i];if(nx<0||nz<0||nx>=g.W||nz>=g.H)continue;int k=nz*g.W+nx;
                    if(!g.Open[k]||g.Next[k]>=0)continue;
                    if(i>=4&&(!g.Open[z*g.W+nx]||!g.Open[nz*g.W+x]))continue;
                    g.Next[k]=n;queue[tail++]=k;
                }
            }
        }
        public static Vector3 Next(Vector3 start,Vector3 target,int region)
        {
            Vector3 d=target-start;d.y=0;
            if(!Physics.SphereCast(start+Vector3.up*.9f,.42f,d.normalized,out _,d.magnitude,1,QueryTriggerInteraction.Ignore))return target;
            var g=Get(region);int a=Node(g,start),b=Node(g,target);
            if(g.Goal!=b)Flow(g,b);int next=g.Next[a];return next>=0?Point(g,next):start;
        }
    }
}
