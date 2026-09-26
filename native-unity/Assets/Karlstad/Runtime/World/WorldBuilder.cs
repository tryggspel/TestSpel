using UnityEngine;
using UnityEngine.Rendering;
using System.Collections.Generic;

namespace Karlstad.World
{
    // All geometry and artwork below are original procedural prototype assets.
    // Public visitor references are documented in Docs/PLATSUNDERLAG.md.
    public static class WorldBuilder
    {
        public enum M { Stone, Plaster, Brick, Asphalt, Brass, Dark, Glass, Wood, Leaf, White, Teal, Neon, Purple, Ice, Red }
        static Material[] materials; static Transform parent;
        public static Material[] MakeMaterials()
        {
            var colors = new[] {"#879399","#DFD5BF","#9D6857","#233039","#D5A65E","#18242D","#244958","#815D40","#2E5B49","#EEE5CE","#398C88","#FFD96A","#4E486E","#BBD9DA","#824740"};
            var result=new Material[colors.Length];
            for(int i=0;i<result.Length;i++) {
                ColorUtility.TryParseHtmlString(colors[i],out var c);
                var m=new Material(Shader.Find("Universal Render Pipeline/Lit")){ name=((M)i).ToString(),enableInstancing=true };
                m.SetColor("_BaseColor",c); m.SetFloat("_Smoothness",i==(int)M.Glass?.82f:.36f);
                m.SetFloat("_Metallic",i==(int)M.Brass?.65f:.05f);
                if(i==(int)M.Neon) {m.EnableKeyword("_EMISSION");m.SetColor("_EmissionColor",c*2.2f);}
                result[i]=m;
            }
            return result;
        }
        public static GameObject Build(Material[] palette)
        {
            materials=palette; var root=new GameObject("Karlstad · komprimerad spelkarta"); parent=root.transform;
            var city=new GameObject("City · offentliga fasadreferenser");city.transform.SetParent(parent);parent=city.transform;
            Box("Mark",new Vector3(0,-.35f,38),new Vector3(140,.7f,210),M.Stone);
            Border(new Vector3(0,0,38),140,210);
            Box("Drottninggatan",new Vector3(0,.015f,25),new Vector3(15,.05f,160),M.Asphalt);
            Box("Tingvallagatan",new Vector3(0,.025f,0),new Vector3(108,.05f,12),M.Asphalt);
            Box("Stora torget",new Vector3(0,.03f,38),new Vector3(35,.1f,25),M.Plaster);
            // Sidewalk curbs and slab rhythm remain visible at mobile distance.
            for(int z=-60;z<125;z+=3) for(int s=-1;s<=1;s+=2) {
                Box("Kantsten",new Vector3(s*8.3f,.12f,z),new Vector3(.35f,.25f,2.94f),M.Plaster);
                if(z%9==0) { Box("Övergångsställe",new Vector3(s*3,.07f,z),new Vector3(2.5f,.015f,.45f),M.White); }
            }
            Box("Klarälven",new Vector3(-61,-.1f,30),new Vector3(17,.08f,205),M.Teal,false);
            for(int z=-64;z<140;z+=4) { Box("Älvräcke",new Vector3(-50,1,z),new Vector3(.1f,1.6f,.1f),M.Dark); Box("Handledare",new Vector3(-50,1.6f,z),new Vector3(.12f,.12f,4),M.Brass,false); }
            for(int z=-55;z<130;z+=16) { Tree(new Vector3(-46,0,z)); Lamp(new Vector3(-10,0,z)); Lamp(new Vector3(10,0,z+7)); }
            for(int i=0;i<3;i++) Fountain(PlaceCatalog.Beacons[i],i);
            Bench(new Vector3(-6,0,40));Bench(new Vector3(6,0,48));
            BusStop(PlaceCatalog.Stop,0,"CITY → BERGVIK"); BusStop(PlaceCatalog.Stop+new Vector3(0,0,6),1,"CITY → ARENAN");
            Label("KARLSTAD",new Vector3(0,.08f,30),2.6f,M.Dark,new Vector3(90,0,0));
            foreach(var p in PlaceCatalog.All) {
                if(p.Id==1 || p.Id==7) {Box("Destinationskvarter",p.Exterior+new Vector3(0,-.35f,0),new Vector3(72,.7f,68),M.Stone);Border(p.Exterior,72,68);}
                Exterior(p); Interior(p);
            }
            parent=city.transform;
            BusStop(PlaceCatalog.BergvikStop,2,"BERGVIK → CITY");BusStop(PlaceCatalog.ArenaStop,3,"ARENAN → CITY");
            Marker("EVAKUERING",new Vector3(-9,0,104),UseKind.Evacuate,0,-1,M.Teal);
            // Historical characters are original stylized figures, not licensed likeness assets.
            CharacterModel.Build("Sola i Karlstad",new Vector3(-7,0,26),parent,palette,false);
            Label("SOLA I KARLSTAD",new Vector3(-7,2.7f,26),.35f,M.Brass);
            CharacterModel.Build("Gustaf Fröding",new Vector3(7,0,69),parent,palette,false);
            Label("GUSTAF FRÖDING",new Vector3(7,2.7f,69),.35f,M.Brass);
            return root;
        }
        static void Exterior(Place p)
        {
            var saved=parent; var r=new GameObject(p.Name+" · fasad");r.transform.SetParent(saved);parent=r.transform;
            Vector3 c=p.Exterior; float height=p.Id==0?13:p.Id==7?14:11;
            Box("Fasad",c+new Vector3(0,height/2,1),new Vector3(22,height,19),p.Id==0?M.Plaster:p.Id==2?M.Brick:M.Stone);
            Box("Sockel",c+new Vector3(0,.4f,-8.65f),new Vector3(22,.8f,.5f),M.Dark);
            Box("Taklist",c+new Vector3(0,height,-.2f),new Vector3(23,.55f,22),M.Plaster);
            for(int x=-8;x<=8;x+=4) for(int y=3;y<height;y+=3) {
                Box("Fönsteromfattning",c+new Vector3(x,y,-8.6f),new Vector3(2.4f,2.2f,.3f),M.Plaster);
                Box("Fönster",c+new Vector3(x,y,-8.8f),new Vector3(1.9f,1.7f,.12f),M.Glass);
                Box("Spröjs",c+new Vector3(x,y,-8.95f),new Vector3(.09f,1.7f,.1f),M.Brass,false);
            }
            Box("Entréportal",c+new Vector3(0,1.6f,-9.05f),new Vector3(3.2f,3.2f,.55f),M.Dark);
            Box("Entrébelysning",c+new Vector3(0,3.35f,-9.4f),new Vector3(3.4f,.08f,.16f),M.Neon,false);
            Label(p.Name,c+new Vector3(0,4.35f,-9.4f),p.Name.Length>19?.44f:.58f,M.White);
            Point(p.Name+" · gå in",p.Entrance,UseKind.Enter,p.Id,-1);
            if(p.Id==0) {
                Box("Domkyrkans torn",c+new Vector3(0,20,2),new Vector3(7,17,7),M.Plaster);
                Roof(c+new Vector3(0,29,2),new Vector3(7,7,7),M.Dark);
                Box("Kors",c+new Vector3(0,35,2),new Vector3(.25f,3,.25f),M.Brass,false);
                Box("Korsarm",c+new Vector3(0,35.5f,2),new Vector3(1.8f,.25f,.25f),M.Brass,false);
                for(int s=-1;s<=1;s+=2) Box("Korsarm kyrka",c+new Vector3(s*12,5,2),new Vector3(10,10,10),M.Plaster);
            }
            if(p.Id==5) {Box("Sandgrund · horisontellt skärmtak",c+new Vector3(0,3.8f,-11),new Vector3(27,.4f,6),M.Brass);}
            if(p.Id==7) { for(int x=-12;x<=12;x+=4) Box("Arenans ribbor",c+new Vector3(x,8,-9),new Vector3(.3f,16,.8f),M.White); Roof(c+new Vector3(0,16,1),new Vector3(25,4,25),M.Purple); }
            parent=saved;
        }
        static void Interior(Place p)
        {
            var saved=parent; var r=new GameObject(p.Name+" · publik spelinteriör");r.transform.SetParent(saved.parent);parent=r.transform;
            Vector3 c=p.Interior;
            float width=p.Id==7?42:26, depth=p.Id==7?56:24, height=p.Id==0?12:7;
            Box("Golv",c+new Vector3(0,-.15f,0),new Vector3(width,.3f,depth),p.Id==0?M.Stone:p.Id==7?M.Dark:M.Plaster);
            Box("Bakvägg",c+new Vector3(0,height/2,depth/2),new Vector3(width,height,.4f),M.Plaster);
            for(int s=-1;s<=1;s+=2) Box("Sidovägg",c+new Vector3(s*width/2,height/2,0),new Vector3(.4f,height,depth),M.Plaster);
            Box("Entrévägg",c+new Vector3(0,height/2,-depth/2),new Vector3(width,height,.4f),M.Dark);
            Box("Innertak",c+new Vector3(0,height,0),new Vector3(width,.25f,depth),p.Id==0?M.White:M.Dark);
            for(int x=-9;x<=9;x+=6) {
                Box("Takarmatur",c+new Vector3(x,height-.3f,0),new Vector3(2.2f,.08f,.45f),M.Neon,false);
                LightAt(c+new Vector3(x,height-1,0),new Color(1,.85f,.61f),3,15);
            }
            Label(p.Name,c+new Vector3(0,3.7f,-11.65f),.7f,M.White,new Vector3(0,180,0));
            Marker("UT TILL KARLSTAD",c+new Vector3(0,0,-9.8f),UseKind.Exit,p.Id,p.Id,M.Teal);
            if(p.Id<7) Marker("SÄKRA BYGGNAD · 600 XP",c+new Vector3(-9,0,-7),UseKind.Claim,p.Id,p.Id,M.Brass);
            if(p.Id==0) Church(c);
            else if(p.Id==1 || p.Id==4) Mall(c,p.Id);
            else if(p.Id==5) Gallery(c);
            else if(p.Id==6) SportsBar(c);
            else if(p.Id==7) Arena(c);
            else Hotel(c,p.Id);
            if(p.Id!=0) { Marker("MAT & VATTEN · +35 ENERGI",c+new Vector3(9,0,-4),UseKind.Food,p.Id,p.Id,M.Teal); }
            parent=saved;
        }
        static void Church(Vector3 c)
        {
            for(int z=-4;z<6;z+=3) for(int s=-1;s<=1;s+=2) {
                Box("Kyrkbänk",c+new Vector3(s*5,.55f,z),new Vector3(6,.25f,.75f),M.Wood);
                Box("Ryggstöd",c+new Vector3(s*5,1.15f,z-.3f),new Vector3(6,1,.15f),M.Wood);
            }
            Box("Kor",c+new Vector3(0,.25f,8),new Vector3(12,.5f,5),M.Stone);
            Box("Altare",c+new Vector3(0,1.1f,8),new Vector3(3,1.4f,1.3f),M.White);
            Box("Kors",c+new Vector3(0,5.2f,11.5f),new Vector3(.25f,3,.2f),M.Brass,false);
            Box("Korsarm",c+new Vector3(0,5.8f,11.5f),new Vector3(1.9f,.23f,.2f),M.Brass,false);
            for(int s=-1;s<=1;s+=2) for(int z=-6;z<11;z+=5) {
                Cylinder("Pelare",c+new Vector3(s*10,4.5f,z),new Vector3(.65f,4.5f,.65f),M.White);
                Box("Högt kyrkfönster",c+new Vector3(s*12.72f,6,z),new Vector3(.1f,5,2.2f),M.Glass,false);
            }
            for(int i=-5;i<=5;i++) Cylinder("Orgelpipa",c+new Vector3(i*.48f,5,-11.2f),new Vector3(.25f,1.5f+Mathf.Abs(i)*.13f,.25f),M.Brass,false);
            for(int z=-4;z<10;z+=6) {
                Cylinder("Ljuskrona",c+new Vector3(0,8,z),new Vector3(2.4f,.1f,2.4f),M.Brass,false);
                for(int n=0;n<8;n++) {float a=n*Mathf.PI/4; Box("Ljus",c+new Vector3(Mathf.Cos(a)*1.15f,8.3f,z+Mathf.Sin(a)*1.15f),new Vector3(.08f,.4f,.08f),M.Neon,false);}
            }
        }
        static void Mall(Vector3 c,int id)
        {
            for(int s=-1;s<=1;s+=2) for(int z=-4;z<9;z+=6) {
                Box("Butiksram",c+new Vector3(s*10.8f,2,z),new Vector3(3.5f,4,5),M.Dark);
                Box("Skyltfönster",c+new Vector3(s*8.95f,2,z),new Vector3(.12f,3.4f,4.5f),M.Glass);
                Label(z==2?"CAFÉ":"BUTIK",c+new Vector3(s*8.8f,4.4f,z),.4f,M.Brass,new Vector3(0,s*90,0));
                Bench(c+new Vector3(s*5,0,z));
            }
            if(id==4) {
                // Accessible upper gallery via ramp; prototype geometry, not an actual Duvan plan.
                Box("Övre galleri",c+new Vector3(0,3.1f,8.3f),new Vector3(18,.3f,4),M.Stone);
                Box("Räcke övervåning",c+new Vector3(0,3.8f,6.4f),new Vector3(18,1,.13f),M.Glass);
                var ramp=Box("Ramp till övre plan",c+new Vector3(-5,1.55f,1),new Vector3(3,.22f,12),M.Stone);ramp.transform.localEulerAngles=new Vector3(-15,0,0);
            } else {
                Box("Food court",c+new Vector3(0,1.2f,9),new Vector3(10,2.4f,2),M.Wood);
                Label("BERGVIK · MAT & MÖTEN",c+new Vector3(0,4,10.5f),.6f,M.Dark);
            }
        }
        static void Hotel(Vector3 c,int id)
        {
            Box("Reception / deli",c+new Vector3(0,1.1f,7.5f),new Vector3(8,2.2f,1.5f),id==2?M.Wood:M.Teal);
            for(int s=-1;s<=1;s+=2) for(int z=0;z<7;z+=5) { Sofa(c+new Vector3(s*7,0,z)); Table(c+new Vector3(s*7,0,z-2)); }
            for(int x=-8;x<=8;x+=4) {Tree(c+new Vector3(x,0,10));}
            if(id==2) {
                Label("ORANGERI · TOLKNING",c+new Vector3(0,4.6f,11.6f),.6f,M.Dark);
                for(int x=-9;x<12;x+=3) {Box("Orangeriets takribba",c+new Vector3(x,6.6f,3),new Vector3(.12f,.3f,17),M.Brass,false);}
            } else Label("KARLSTAD CITY · LOBBY",c+new Vector3(0,4.7f,11.6f),.6f,M.Dark);
        }
        static void Gallery(Vector3 c)
        {
            for(int s=-1;s<=1;s+=2) for(int z=-3;z<11;z+=5) {
                Box("Fri konstvägg",c+new Vector3(s*7,2,z),new Vector3(.18f,4,3),M.White);
                // Original abstract river panels. No Lars Lerin artworks copied or imitated.
                for(int n=0;n<5;n++) Box("Egen abstrakt älvpanel",c+new Vector3(s*6.86f,1.5f+n*.3f,z),new Vector3(.02f,.28f,2.1f),n%2==0?M.Teal:M.Stone,false);
            }
            CharacterModel.Build("Lars Lerin · fiktiv museivärd",c+new Vector3(2,0,7),parent,materials,false);
            Marker("MÖT LARS LERIN · FIKTIV VÄRD",c+new Vector3(2,0,5),UseKind.Guide,0,5,M.Brass);
            Bench(c+new Vector3(-3,0,0));Bench(c+new Vector3(3,0,0));
            Label("SANDGRUND · KONST & KLARÄLVEN",c+new Vector3(0,4.7f,11.6f),.5f,M.Dark);
        }
        static void SportsBar(Vector3 c)
        {
            Box("Bar",c+new Vector3(-8,1.1f,3),new Vector3(2,2.2f,11),M.Wood);
            for(int z=-2;z<9;z+=3) {Cylinder("Barstol",c+new Vector3(-5.5f,.65f,z),new Vector3(.8f,.65f,.8f),M.Dark);}
            for(int x=0;x<10;x+=4) {Table(c+new Vector3(x,0,-1));Sofa(c+new Vector3(x,0,1));}
            for(int x=-3;x<=9;x+=6) {
                Box("Sportskärm",c+new Vector3(x,4.1f,11.5f),new Vector3(4,2.2f,.12f),M.Dark,false);
                Box("Abstrakt rink",c+new Vector3(x,4.1f,11.4f),new Vector3(3.6f,1.8f,.05f),M.Teal,false);
            }
            Box("Bowlingbana",c+new Vector3(7,.04f,7),new Vector3(2.5f,.08f,7),M.Wood);
            for(int i=0;i<6;i++) Cylinder("Kägla",c+new Vector3(6.4f+(i%3)*.6f,.45f,9+(i/3)*.6f),new Vector3(.2f,.4f,.2f),M.White,false);
            Label("O’LEARYS · SAFE HOUSE",c+new Vector3(0,5.9f,11.5f),.7f,M.Brass);
        }
        static void Arena(Vector3 c)
        {
            Box("Isrink",c+new Vector3(0,.015f,6),new Vector3(25,.08f,31),M.Ice);
            for(int s=-1;s<=1;s+=2) {
                Box("Sarg",c+new Vector3(s*12.8f,.75f,6),new Vector3(.25f,1.5f,32),M.White);
                for(int row=0;row<4;row++) {
                    Box("Läktargradäng",c+new Vector3(s*(14+row*1.4f),row*.65f+.3f,6),new Vector3(1.4f,.6f,32),M.Stone);
                    for(int z=-8;z<23;z+=2) Box("Grönt arenastolsäte",c+new Vector3(s*(14+row*1.4f),row*.65f+.8f,z),new Vector3(.8f,.3f,.8f),M.Leaf,false);
                }
            }
            Box("Mittlinje",c+new Vector3(0,.063f,6),new Vector3(25,.012f,.18f),M.Red,false);
            for(int z=-1;z<16;z+=14) Box("Blålinje",c+new Vector3(0,.064f,z),new Vector3(25,.015f,.18f),M.Teal,false);
            for(int i=-1;i<=1;i+=2) CharacterModel.Build("Hockeyförsvarare",c+new Vector3(i*3,0,-6),parent,materials,true);
            Marker("REKRYTERA TVÅ FÖRSVARARE",c+new Vector3(0,0,-5),UseKind.Recruit,0,7,M.Teal);
            Label("FÄRJESTAD · SPELTOLKNING",c+new Vector3(0,5,27.5f),.8f,M.Leaf);
        }
        static void Fountain(Vector3 c,int id)
        {
            Cylinder("Solfyr · sockel",c+new Vector3(0,.2f,0),new Vector3(2,.2f,2),M.Stone);
            Cylinder("Solfyr · kärna",c+new Vector3(0,1,0),new Vector3(.3f,.7f,.3f),M.Neon,false);
            Marker("LADDA SOLFYR "+(id+1),c+new Vector3(0,0,-1.8f),UseKind.Beacon,id,-1,M.Brass);
        }
        static void BusStop(Vector3 c,int id,string label)
        {
            Bus(c+new Vector3(4,0,4));
            Box("Busskur · tak",c+new Vector3(0,2.8f,0),new Vector3(4.5f,.2f,2),M.Teal);
            for(int s=-1;s<=1;s+=2) Box("Busskur · stolpe",c+new Vector3(s*2,1.4f,0),new Vector3(.1f,2.8f,.1f),M.Brass);
            Marker(label,c+new Vector3(0,0,-1.6f),UseKind.Bus,id,-1,M.Teal);
        }
        static void Border(Vector3 c,float w,float d)
        {
            for(int s=-1;s<=1;s+=2){Box("Spelområdets staket",c+new Vector3(s*w/2,1.4f,0),new Vector3(.3f,2.8f,d),M.Leaf);Box("Spelområdets staket",c+new Vector3(0,1.4f,s*d/2),new Vector3(w,2.8f,.3f),M.Leaf);}
        }
        static void Bus(Vector3 c)
        {
            Box("Stadsbuss · originalmodell",c+new Vector3(0,1.7f,0),new Vector3(2.6f,2.8f,8),M.Teal);
            Box("Bussens vindruta",c+new Vector3(0,2.2f,-4.04f),new Vector3(2.2f,1.2f,.06f),M.Glass,false);
            Box("Bussens destination",c+new Vector3(0,3,-4.05f),new Vector3(2.1f,.28f,.05f),M.Neon,false);
            for(int side=-1;side<=1;side+=2)for(int z=-2;z<=2;z+=2) {
                Box("Bussfönster",c+new Vector3(side*1.32f,2.3f,z),new Vector3(.05f,1.2f,1.6f),M.Glass,false);
                if(z!=0){var wheel=Cylinder("Busshjul",c+new Vector3(side*1.3f,.65f,z),new Vector3(.95f,.17f,.95f),M.Dark,false);wheel.transform.eulerAngles=new Vector3(0,0,90);}
            }
        }
        static void Marker(string label,Vector3 c,UseKind kind,int id,int building,M material)
        {
            Box("Terminal",c+new Vector3(0,.75f,0),new Vector3(.7f,1.5f,.45f),M.Dark);
            Box("Terminal · lyslist",c+new Vector3(0,1.2f,-.24f),new Vector3(.58f,.28f,.03f),material,false);
            Label(label,c+new Vector3(0,2.2f,0),.29f,material);Point(label,c+new Vector3(0,0,-.7f),kind,id,building);
        }
        static void Point(string label,Vector3 c,UseKind kind,int id,int building)
        { var g=new GameObject(label);g.transform.SetParent(parent);g.transform.position=c;var p=g.AddComponent<UsePoint>();p.Kind=kind;p.Id=id;p.Building=building;p.Label=label; }
        static void Tree(Vector3 c)
        {Cylinder("Stam",c+new Vector3(0,1.6f,0),new Vector3(.3f,1.6f,.3f),M.Wood);for(int i=0;i<3;i++) Ball("Lövverk",c+new Vector3((i-1)*.65f,3.7f+i*.35f,0),new Vector3(2.6f,3,2.6f),M.Leaf);}
        static void Lamp(Vector3 c)
        {Cylinder("Gatlyktstolpe",c+new Vector3(0,2.7f,0),new Vector3(.13f,2.7f,.13f),M.Dark);Box("Lyktlykta",c+new Vector3(0,5.3f,0),new Vector3(.5f,.65f,.5f),M.Neon,false);}
        static void Bench(Vector3 c)
        {Box("Bänksits",c+new Vector3(0,.6f,0),new Vector3(2.8f,.15f,.65f),M.Wood);Box("Bänkrygg",c+new Vector3(0,1,.3f),new Vector3(2.8f,.75f,.1f),M.Wood);for(int s=-1;s<=1;s+=2)Box("Bänkben",c+new Vector3(s, .3f,0),new Vector3(.15f,.6f,.5f),M.Dark);}
        static void Sofa(Vector3 c)
        {Box("Soffa",c+new Vector3(0,.45f,0),new Vector3(2.8f,.8f,1),M.Leaf);Box("Soffrygg",c+new Vector3(0,1,.4f),new Vector3(2.8f,.8f,.2f),M.Leaf);}
        static void Table(Vector3 c)
        {Cylinder("Bordsskiva",c+new Vector3(0,.8f,0),new Vector3(1.4f,.08f,1.4f),M.Wood);Cylinder("Bordsfot",c+new Vector3(0,.4f,0),new Vector3(.2f,.4f,.2f),M.Brass);}
        static void LightAt(Vector3 c,Color color,float intensity,float range)
        {var g=new GameObject("Interiörljus · utan skugga");g.transform.SetParent(parent);g.transform.position=c;var l=g.AddComponent<Light>();l.type=LightType.Point;l.color=color;l.intensity=intensity;l.range=range;l.shadows=LightShadows.None;}
        public static GameObject Box(string name,Vector3 c,Vector3 scale,M m,bool collision=true) => Primitive(PrimitiveType.Cube,name,c,scale,m,collision);
        static GameObject Cylinder(string n,Vector3 c,Vector3 s,M m,bool collision=true)=>Primitive(PrimitiveType.Cylinder,n,c,s,m,collision);
        static GameObject Ball(string n,Vector3 c,Vector3 s,M m)=>Primitive(PrimitiveType.Sphere,n,c,s,m,false);
        static GameObject Primitive(PrimitiveType type,string name,Vector3 c,Vector3 scale,M m,bool collision)
        {
            var g=GameObject.CreatePrimitive(type);g.name=name;g.transform.SetParent(parent);g.transform.position=c;g.transform.localScale=scale;
            g.GetComponent<Renderer>().sharedMaterial=materials[(int)m];g.isStatic=true;
            if(!collision) Object.DestroyImmediate(g.GetComponent<Collider>());
            return g;
        }
        static void Roof(Vector3 c,Vector3 s,M m)
        {
            var g=new GameObject("Brutet tak");g.transform.SetParent(parent);g.transform.position=c;g.transform.localScale=s;
            var mesh=new Mesh();mesh.vertices=new[]{new Vector3(-.5f,0,-.5f),new Vector3(.5f,0,-.5f),new Vector3(.5f,0,.5f),new Vector3(-.5f,0,.5f),new Vector3(0,1,0)};
            mesh.triangles=new[]{0,4,1,1,4,2,2,4,3,3,4,0,0,1,2,0,2,3};mesh.RecalculateNormals();g.AddComponent<MeshFilter>().sharedMesh=mesh;g.AddComponent<MeshRenderer>().sharedMaterial=materials[(int)m];
        }
        static void Label(string text,Vector3 c,float size,M m,Vector3 rotation=default)
        {
            var g=new GameObject(text);g.transform.SetParent(parent);g.transform.position=c;g.transform.eulerAngles=rotation;
            var t=g.AddComponent<TextMesh>();t.text=text;t.fontSize=64;t.characterSize=size;t.anchor=TextAnchor.MiddleCenter;t.alignment=TextAlignment.Center;t.color=materials[(int)m].GetColor("_BaseColor");t.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");g.GetComponent<Renderer>().sharedMaterial=t.font.material;
        }
    }
}
