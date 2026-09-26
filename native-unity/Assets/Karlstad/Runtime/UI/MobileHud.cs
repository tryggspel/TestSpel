using System;
using Karlstad.Network;
using Karlstad.World;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using Unity.Netcode;
namespace Karlstad.UI
{
    public class MobileHud:MonoBehaviour
    {
        public static MobileHud Instance {get;private set;}
        Font font;Sprite disc,solid;Transform safe;GameObject menu,game,teamPanel;Text status,mission,place,notice,health,energy,wallet,inviteLabel,teamList,useText;
        Image hpBar,enBar;Button useButton;InputField address;float noticeUntil;string invitationCode;bool invitationShelter;
        readonly ulong?[] inviteTargets=new ulong?[8];readonly Button[] teamInviteButtons=new Button[8],guestInviteButtons=new Button[8];
        readonly Color cream=new Color(.94f,.91f,.82f),amber=new Color(1,.77f,.32f),teal=new Color(.25f,.76f,.72f),panel=new Color(.035f,.07f,.095f,.92f);
        public static MobileHud Build()
        {
            var g=new GameObject("Karlstad · mobilgränssnitt",typeof(RectTransform),typeof(Canvas),typeof(CanvasScaler),typeof(GraphicRaycaster));
            g.GetComponent<Canvas>().renderMode=RenderMode.ScreenSpaceOverlay;var scaler=g.GetComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ScaleWithScreenSize;scaler.referenceResolution=new Vector2(1280,720);scaler.matchWidthOrHeight=1;
            var eventSystem=new GameObject("Touch events",typeof(EventSystem),typeof(InputSystemUIInputModule));eventSystem.GetComponent<InputSystemUIInputModule>().AssignDefaultActions();
            var h=g.AddComponent<MobileHud>();h.Create();return h;
        }
        void Awake(){Instance=this;font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");}
        void OnDestroy(){if(Instance==this)Instance=null;if(disc){Destroy(disc.texture);Destroy(disc);}if(solid)Destroy(solid);}
        void Create()
        {
            var texture=new Texture2D(128,128,TextureFormat.RGBA32,false);
            for(int y=0;y<128;y++)for(int x=0;x<128;x++){float d=Vector2.Distance(new Vector2(x+.5f,y+.5f),new Vector2(64,64));texture.SetPixel(x,y,new Color(1,1,1,Mathf.Clamp01(63.5f-d)));}
            texture.Apply();solid=Sprite.Create(Texture2D.whiteTexture,new Rect(0,0,Texture2D.whiteTexture.width,Texture2D.whiteTexture.height),new Vector2(.5f,.5f));disc=Sprite.Create(texture,new Rect(0,0,128,128),new Vector2(.5f,.5f));
            safe=Panel("Safe area",transform,new Color(0,0,0,0),Vector2.zero,Vector2.one);safe.gameObject.AddComponent<SafeArea>();
            var input=gameObject.AddComponent<TouchControls>();
            CreateMenu();CreateGame();CreateTeam();game.SetActive(false);teamPanel.SetActive(false);input.Blocked=true;
        }
        void CreateMenu()
        {
            menu=Panel("Start",safe,panel,Vector2.zero,Vector2.one).gameObject;
            TextAt("STADSÄVENTYR  /  ÖVERLEVNAD FÖR MOBIL",menu.transform,24,teal,26,642,970,35);
            TextAt("KARLSTAD",menu.transform,74,cream,25,544,930,88);
            TextAt("AFTER THE SUN",menu.transform,35,amber,29,492,900,48);
            TextAt("Staden. Solstrålarna. Ditt lag.",menu.transform,25,cream,30,432,850,45);
            TextAt("Utforska city eller aktivera Zombie Apocalypse.\n3 solfyrar · ett tryggt bo · försvarare från arenan",menu.transform,21,cream,32,352,930,67);
            ButtonAt("SPELA SOLO",menu.transform,32,245,315,66,()=>GameBootstrap.Instance.StartSession(true,true,"127.0.0.1"),amber);
            ButtonAt("VÄRD PÅ SAMMA WI-FI",menu.transform,365,245,385,66,()=>GameBootstrap.Instance.StartSession(false,true,"0.0.0.0"),teal);
            address=InputAt(menu.transform,"Värdens lokala IP, t.ex. 192.168.1.20",32,155,490,58);
            ButtonAt("ANSLUT TILL VÄRD",menu.transform,540,155,300,58,()=>GameBootstrap.Instance.StartSession(false,false,address.text),teal);
            status=TextAt("Lokal testsession · max 8 spelare, 4 per lag. Ingen internettjänst ansluten.",menu.transform,19,cream,32,83,1080,56);
            TextAt("EN KONSTNÄRLIG SPELTOLKNING AV KARLSTAD",menu.transform,16,new Color(.56f,.64f,.67f),32,34,1120,35);
        }
        void CreateGame()
        {
            game=Panel("Spel",safe,Color.clear,Vector2.zero,Vector2.one).gameObject;
            // Aim area behind all buttons. Each control owns exactly one pointer.
            var look=Panel("Sikta här",game.transform,Color.clear,new Vector2(.38f,0),new Vector2(1,1));look.GetComponent<Image>().raycastTarget=true;look.gameObject.AddComponent<TouchSurface>().Kind=SurfaceKind.Look;
            var header=Panel("Mission backing",game.transform,panel,new Vector2(0,.79f),new Vector2(.74f,1));header.GetComponent<Image>().raycastTarget=false;
            place=TextAt("KARLSTAD CITY",game.transform,21,teal,24,672,860,31);
            mission=TextAt("Välkommen",game.transform,24,cream,24,600,880,69);
            ButtonAnchored("ZOMBIE",game.transform,new Vector2(1,1),new Vector2(-122,-43),new Vector2(205,60),()=>MobilePlayer.Local?.ZombieRpc(),amber);
            ButtonAnchored("LAG",game.transform,new Vector2(1,1),new Vector2(-122,-112),new Vector2(205,54),ToggleTeam,teal);
            health=TextAt("HÄLSA 100",game.transform,21,cream,26,548,215,29);hpBar=Bar(game.transform,26,533,190,8,teal);
            energy=TextAt("SOLENERGI 100",game.transform,21,cream,245,548,225,29);enBar=Bar(game.transform,245,533,190,8,amber);
            wallet=TextAt("0 LAG-XP",game.transform,20,amber,480,543,320,40);
            var cross=TextAnchored("+",game.transform,31,cream,new Vector2(.5f,.5f),Vector2.zero,new Vector2(40,40));cross.alignment=TextAnchor.MiddleCenter;
            notice=TextAnchored("",game.transform,23,cream,new Vector2(.5f,.5f),new Vector2(0,108),new Vector2(800,90));notice.alignment=TextAnchor.MiddleCenter;
            var move=Control("RÖRELSE",game.transform,new Vector2(0,0),new Vector2(150,150),new Vector2(245,245),new Color(.09f,.17f,.19f,.45f),SurfaceKind.Move);
            var knob=Panel("Joystick knob",move,new Color(.84f,.83f,.7f,.65f),new Vector2(.5f,.5f),new Vector2(.5f,.5f));knob.sizeDelta=new Vector2(62,62);knob.GetComponent<Image>().raycastTarget=false;knob.GetComponent<Image>().sprite=disc;move.GetComponent<TouchSurface>().Knob=knob;
            TextAt("FULLT UTSLAG = SPRINT",game.transform,17,cream,30,20,350,27);
            Control("SOLSTRÅLE",game.transform,new Vector2(1,0),new Vector2(-128,153),new Vector2(156,156),new Color(.75f,.44f,.12f,.82f),SurfaceKind.Fire);
            Control("HOPPA",game.transform,new Vector2(1,0),new Vector2(-296,110),new Vector2(105,91),panel,SurfaceKind.Jump);
            Control("DUCKA",game.transform,new Vector2(1,0),new Vector2(-296,214),new Vector2(105,91),panel,SurfaceKind.Crouch);
            ButtonAnchored("SOLNOVA",game.transform,new Vector2(1,0),new Vector2(-128,292),new Vector2(155,69),()=>MobilePlayer.Local?.NovaRpc(),teal);
            useButton=ButtonAnchored("ANVÄND",game.transform,new Vector2(.5f,0),new Vector2(0,90),new Vector2(390,64),Use,amber);useText=useButton.GetComponentInChildren<Text>();
            TextAnchored("DRA MED HÖGER TUMME FÖR ATT SIKTA",game.transform,15,cream,new Vector2(1,0),new Vector2(-229,29),new Vector2(440,32));
        }
        void CreateTeam()
        {
            teamPanel=Panel("Lag och skydd",safe,panel,Vector2.zero,Vector2.one).gameObject;
            TextAt("DITT LAG / ERA TRYGGA BON",teamPanel.transform,31,cream,30,641,960,51);
            teamList=TextAt("",teamPanel.transform,23,cream,32,414,1050,210);
            TextAt("Välj en ansluten spelare. Lag: max 4. Gästskydd: 50 lag-XP, 3 minuter.\nDen som bjuds in måste själv acceptera i spelet.",teamPanel.transform,20,cream,32,326,1120,75);
            for(int i=0;i<8;i++) {int n=i;teamInviteButtons[i]=ButtonAt("Bjud in spelare "+(i+1),teamPanel.transform,32+(i%4)*294,240-(i/4)*60,280,50,()=>Invite(n,false),teal);}
            for(int i=0;i<8;i++) {int n=i;guestInviteButtons[i]=ButtonAt("Gästskydd → "+(i+1),teamPanel.transform,32+(i%4)*294,113-(i/4)*53,280,46,()=>Invite(n,true),amber);}
            inviteLabel=TextAt("",teamPanel.transform,21,amber,32,2,760,51);
            ButtonAt("ACCEPTERA",teamPanel.transform,806,8,195,45,Accept,teal);
            ButtonAnchored("STÄNG",teamPanel.transform,new Vector2(1,1),new Vector2(-116,-49),new Vector2(170,52),ToggleTeam,teal);
            ButtonAnchored("GRAFIK: VÄXLA",teamPanel.transform,new Vector2(1,1),new Vector2(-131,-174),new Vector2(220,48),()=>{var b=GameBootstrap.Instance;b.SetQuality((b.QualityMode+1)%3);Notice("Grafik: "+new[]{"Batteri · 30 fps mål","Balanserad · 60 fps mål","Hög · 60 fps mål"}[b.QualityMode]);},teal);
            ButtonAnchored("LÄMNA SESSION",teamPanel.transform,new Vector2(1,1),new Vector2(-131,-116),new Vector2(220,48),()=>GameBootstrap.Instance.LeaveSession(),cream);
        }
        void Invite(int slot,bool shelter)
        {
            // Slots map to current client IDs, including reconnects with IDs above 7.
            if(!inviteTargets[slot].HasValue||!MobilePlayer.Active.ContainsKey(inviteTargets[slot].Value)){Notice("Den spelaren är inte ansluten.");return;}
            MobilePlayer.Local?.InviteRpc(inviteTargets[slot].Value,shelter);
        }
        void Accept(){if(invitationCode==null)return;MobilePlayer.Local?.AcceptRpc(invitationCode,invitationShelter);invitationCode=null;inviteLabel.text="Inbjudan skickad för kontroll.";}
        public void Invitation(string code,bool shelter,string label){invitationCode=code;invitationShelter=shelter;inviteLabel.text=label;Notice(label+" · öppna LAG för att acceptera.");}
        public void EnterGame(){menu.SetActive(false);game.SetActive(true);TouchControls.Instance.Blocked=false;}
        public void MenuStatus(string text){status.text=text;}
        public void Notice(string text){notice.text=text;noticeUntil=Time.unscaledTime+5;}
        void ToggleTeam(){bool open=!teamPanel.activeSelf;teamPanel.SetActive(open);TouchControls.Instance.ResetInput();TouchControls.Instance.Blocked=open;}
        void Use()
        {
            var p=MobilePlayer.Local;if(!p)return;if(p.Health.Value<=0){p.RespawnRpc();return;}
            var point=UsePoint.Closest(p.transform.position,p.Building.Value);if(point)p.UseRpc((int)point.Kind,point.Id);
        }
        void Update()
        {
            var p=MobilePlayer.Local;if(!p)return;
            mission.text=p.Mission.Value.ToString();health.text="HÄLSA "+Mathf.CeilToInt(p.Health.Value);energy.text="SOLENERGI "+Mathf.CeilToInt(p.Energy.Value);
            hpBar.fillAmount=p.Health.Value/100;enBar.fillAmount=p.Energy.Value/100;wallet.text=p.Wallet.Value+" LAG-XP"+(p.Sheltered.Value?" · SKYDDAD":"");
            place.text=p.Building.Value>=0?PlaceCatalog.All[p.Building.Value].Name:"KARLSTAD CITY · "+(SessionAuthority.Instance&&SessionAuthority.Instance.Apocalypse.Value?"ZOMBIE APOCALYPSE":"STADSÄVENTYR");
            var point=UsePoint.Closest(p.transform.position,p.Building.Value);useButton.gameObject.SetActive(point||p.Health.Value<=0);useText.text=p.Health.Value<=0?"ÅTERUPPTA VID TORGET":point?point.Label:"";
            if(Time.unscaledTime>noticeUntil)notice.text="";
            if(teamPanel.activeSelf&&SessionAuthority.Instance) {
                var ids=System.Linq.Enumerable.ToArray(System.Linq.Enumerable.OrderBy(MobilePlayer.Active.Keys,k=>k));
                for(int i=0;i<8;i++) {
                    inviteTargets[i]=i<ids.Length?(ulong?)ids[i]:null;bool available=i<ids.Length&&ids[i]!=p.OwnerClientId;
                    teamInviteButtons[i].interactable=guestInviteButtons[i].interactable=available;
                    teamInviteButtons[i].GetComponentInChildren<Text>().text=i<ids.Length?"Bjud in spelare "+(ids[i]+1):"Ledig plats";
                    guestInviteButtons[i].GetComponentInChildren<Text>().text=i<ids.Length?"Gästskydd → "+(ids[i]+1):"–";
                }
                teamList.text=SessionAuthority.Instance.TeamSnapshot.Value+"\n\nDU ÄR SPELARE "+(p.OwnerClientId+1)+" · LAG "+p.TeamId.Value+"\nANSLUTNA: "+string.Join(", ",System.Linq.Enumerable.Select(MobilePlayer.Active.Keys,k=>(k+1).ToString()));
            }
        }
        RectTransform Panel(string name,Transform parent,Color color,Vector2 min,Vector2 max)
        {var g=new GameObject(name,typeof(RectTransform),typeof(Image));g.transform.SetParent(parent,false);var r=(RectTransform)g.transform;r.anchorMin=min;r.anchorMax=max;r.offsetMin=r.offsetMax=Vector2.zero;var image=g.GetComponent<Image>();image.color=color;image.raycastTarget=color.a>.05f;return r;}
        void Position(RectTransform r,Vector2 anchor,Vector2 pos,Vector2 size){r.anchorMin=r.anchorMax=anchor;r.pivot=new Vector2(.5f,.5f);r.anchoredPosition=pos;r.sizeDelta=size;}
        Text TextAt(string text,Transform parent,int size,Color color,float x,float y,float w,float h)=>TextAnchored(text,parent,size,color,Vector2.zero,new Vector2(x+w/2,y+h/2),new Vector2(w,h));
        Text TextAnchored(string text,Transform parent,int size,Color color,Vector2 anchor,Vector2 pos,Vector2 dimensions)
        {var g=new GameObject(text,typeof(RectTransform),typeof(Text));g.transform.SetParent(parent,false);Position((RectTransform)g.transform,anchor,pos,dimensions);var t=g.GetComponent<Text>();t.text=text;t.font=font;t.fontSize=size;t.color=color;t.raycastTarget=false;t.alignment=TextAnchor.MiddleLeft;t.horizontalOverflow=HorizontalWrapMode.Wrap;return t;}
        Button ButtonAt(string text,Transform parent,float x,float y,float w,float h,Action action,Color color)=>ButtonAnchored(text,parent,Vector2.zero,new Vector2(x+w/2,y+h/2),new Vector2(w,h),action,color);
        Button ButtonAnchored(string text,Transform parent,Vector2 anchor,Vector2 pos,Vector2 size,Action action,Color color)
        {var r=Panel(text,parent,color,anchor,anchor);Position(r,anchor,pos,size);r.GetComponent<Image>().raycastTarget=true;var b=r.gameObject.AddComponent<Button>();b.targetGraphic=r.GetComponent<Image>();b.onClick.AddListener(()=>action());var t=TextAnchored(text,r,21,new Color(.04f,.08f,.1f),new Vector2(.5f,.5f),Vector2.zero,size-new Vector2(14,4));t.alignment=TextAnchor.MiddleCenter;return b;}
        RectTransform Control(string label,Transform parent,Vector2 anchor,Vector2 pos,Vector2 size,Color color,SurfaceKind kind)
        {var r=Panel(label,parent,color,anchor,anchor);Position(r,anchor,pos,size);r.GetComponent<Image>().raycastTarget=true;r.GetComponent<Image>().sprite=disc;r.gameObject.AddComponent<TouchSurface>().Kind=kind;var t=TextAnchored(label,r,19,cream,new Vector2(.5f,.5f),Vector2.zero,size);t.alignment=TextAnchor.MiddleCenter;return r;}
        Image Bar(Transform parent,float x,float y,float w,float h,Color color)
        {var r=Panel("Status bar",parent,color,Vector2.zero,Vector2.zero);Position(r,Vector2.zero,new Vector2(x+w/2,y+h/2),new Vector2(w,h));var im=r.GetComponent<Image>();im.sprite=solid;im.type=Image.Type.Filled;im.fillMethod=Image.FillMethod.Horizontal;im.raycastTarget=false;return im;}
    }
}
