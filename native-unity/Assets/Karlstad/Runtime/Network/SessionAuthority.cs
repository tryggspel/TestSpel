using System;
using System.Collections.Generic;
using System.Linq;
using Karlstad.Core;
using Karlstad.World;
using Unity.Collections;
using Unity.Netcode;
using UnityEngine;

namespace Karlstad.Network
{
    public class SessionAuthority : NetworkBehaviour
    {
        public static SessionAuthority Instance {get;private set;}
        public readonly NetworkVariable<bool> Apocalypse=new NetworkVariable<bool>(false);
        public readonly NetworkVariable<float> Elapsed=new NetworkVariable<float>();
        public readonly NetworkVariable<int> BeaconMask=new NetworkVariable<int>();
        public readonly NetworkVariable<bool> Victory=new NetworkVariable<bool>();
        public readonly NetworkVariable<FixedString4096Bytes> TeamSnapshot=new NetworkVariable<FixedString4096Bytes>();
        public readonly SurvivalLedger Ledger=new SurvivalLedger();
        readonly Dictionary<ulong,double> lastUse=new Dictionary<ulong,double>();
        readonly HashSet<ulong> museumReward=new HashSet<ulong>();
        readonly List<ZombieActor> enemies=new List<ZombieActor>();
        readonly Dictionary<ulong,double> foodReady=new Dictionary<ulong,double>();
        int round;float snapshotAt;double pruneAt;
        public IEnumerable<MobilePlayer> Players=>MobilePlayer.Active.Values;
        double Now=>NetworkManager.ServerTime.Time;
        public override void OnNetworkSpawn()
        {
            Instance=this; if(IsServer) {NetworkManager.OnClientDisconnectCallback+=Disconnected;Refresh();}
        }
        public override void OnNetworkDespawn(){if(IsServer)NetworkManager.OnClientDisconnectCallback-=Disconnected;if(Instance==this)Instance=null;}
        void Disconnected(ulong id){Ledger.Disconnect(id);foodReady.Remove(id);lastUse.Remove(id);Refresh();}
        public void Register(MobilePlayer p)
        {
            if(!IsServer)return;
            Ledger.Create(p.OwnerClientId,"Solpatrull "+(p.OwnerClientId+1));Refresh();
        }
        public void SetZombie(MobilePlayer p)
        {
            if(!IsServer||p.OwnerClientId!=NetworkManager.ServerClientId) {p.NoticeRpc("Värden väljer spelläge för hela sessionen.");return;}
            Apocalypse.Value=!Apocalypse.Value;Elapsed.Value=0;BeaconMask.Value=0;Victory.Value=false;round++;
            foreach(var e in enemies)if(e&&e.IsSpawned)e.NetworkObject.Despawn(true);enemies.Clear();
            foreach(var player in Players){player.ResetRound();player.Warp(PlaceCatalog.CentreSpawn,-1);}
            if(Apocalypse.Value) {
                for(int i=0;i<12;i++)SpawnEnemy(new Vector3(i%2==0?-5:5,.1f,-12+i*10),-1);
                foreach(var place in PlaceCatalog.All.Where(x=>x.Id<7))for(int n=0;n<2;n++) SpawnEnemy(place.Interior+new Vector3(n==0?-3:3,.1f,5),place.Id);
                SpawnEnemy(new Vector3(-280,.1f,-18),-1);SpawnEnemy(new Vector3(250,.1f,7),-1);
            }
            Refresh();
        }
        void SpawnEnemy(Vector3 position,int building)
        {
            var g=Instantiate(GameBootstrap.Instance.ZombiePrefab,position,Quaternion.identity);
            var e=g.GetComponent<ZombieActor>();e.InitialBuilding=building;g.GetComponent<NetworkObject>().Spawn();enemies.Add(e);
        }
        void Update()
        {
            if(!IsServer)return;
            if(Apocalypse.Value&&!Victory.Value)Elapsed.Value+=Time.deltaTime;
            if(Time.unscaledTime>=snapshotAt){snapshotAt=Time.unscaledTime+.5f;Refresh();}
            if(Now>=pruneAt){pruneAt=Now+10;Ledger.Prune(Now);}
        }
        public bool IsProtected(MobilePlayer p)=>p.Building.Value>=0&&Ledger.Protected(p.OwnerClientId,p.Building.Value,Now);
        public bool ClearRoom(int building)=>!enemies.Any(e=>e&&e.Building.Value==building&&!e.IsStunned);
        public void StunReward(MobilePlayer p,ZombieActor zombie)
        {
            if(!IsServer)return;Ledger.Award(p.OwnerClientId,$"stun:{round}:{zombie.NetworkObjectId}",75);Refresh();
        }
        public void Interact(MobilePlayer p,int kind,int id)
        {
            if(!IsServer||p.Health.Value<=0||!Enum.IsDefined(typeof(UseKind),kind))return;
            ulong client=p.OwnerClientId;
            if(lastUse.TryGetValue(client,out double last)&&Now-last<.35)return;lastUse[client]=Now;
            var point=UsePoint.All.FirstOrDefault(x=>(int)x.Kind==kind&&x.Id==id&&x.Building==p.Building.Value&&(x.transform.position-p.transform.position).sqrMagnitude<3.5f*3.5f);
            if(!point){p.NoticeRpc("Gå närmare platsen.");return;}
            switch(point.Kind) {
                case UseKind.Enter: p.Warp(PlaceCatalog.All[id].RoomEntry,id);break;
                case UseKind.Exit: p.Warp(PlaceCatalog.All[id].Entrance+Vector3.back*1.5f,-1);break;
                case UseKind.Food:
                    if(foodReady.TryGetValue(client,out double ready)&&Now<ready){p.NoticeRpc("Provianten fylls på om "+Math.Ceiling(ready-Now)+" s.");break;}
                    if(Apocalypse.Value&&!IsProtected(p)&&!ClearRoom(p.Building.Value)){p.NoticeRpc("Neutralisera rummets zombies först.");break;}
                    foodReady[client]=Now+30;p.Health.Value=Mathf.Min(100,p.Health.Value+35);p.Energy.Value=100;p.NoticeRpc("Mat och vatten: +35 hälsa, full solenergi.");break;
                case UseKind.Beacon:
                    if(!Apocalypse.Value){p.NoticeRpc("Solfyrarna aktiveras i Zombie Apocalypse.");break;}
                    if((BeaconMask.Value&(1<<id))!=0){p.NoticeRpc("Solfyren är redan aktiv.");break;}
                    BeaconMask.Value|=1<<id;Ledger.Award(client,$"beacon:{round}:{id}",350);p.Energy.Value=100;p.Health.Value=Mathf.Min(100,p.Health.Value+20);p.NoticeRpc("Solfyr aktiverad · +350 gemensam XP");break;
                case UseKind.Claim:
                    bool claimed=Ledger.Claim(client,id,p.Building.Value==id,ClearRoom(id)||!Apocalypse.Value);
                    p.NoticeRpc(claimed?"Byggnaden är ert trygga bo.":"Kräver 600 lag-XP, fri byggnad och neutraliserade zombies.");Refresh();break;
                case UseKind.Bus:
                    p.Warp(id==0?PlaceCatalog.BergvikStop: id==1?PlaceCatalog.ArenaStop:PlaceCatalog.Stop+Vector3.back*3,-1);
                    if(id==1)p.VisitedArena.Value=true;p.NoticeRpc("Framme · fiktiv spelbuss, ingen aktuell tidtabell.");break;
                case UseKind.Recruit:
                    if(!Apocalypse.Value||!p.VisitedArena.Value){p.NoticeRpc("Ta spelbussen till arenan i zombieläget först.");break;}
                    p.Defenders.Value=2;p.NoticeRpc("Två hockeyförsvarare följer dig och skjuter solpulser.");break;
                case UseKind.Guide:
                    p.NoticeRpc("Fiktiv museivärd: Välkommen till Sandgrund. Följ älven tillbaka till solfyren.");
                    if(museumReward.Add(client))Ledger.Award(client,"museum:"+client,100);break;
                case UseKind.Evacuate:
                    bool shelter=Ledger.Owners.Values.Contains(Ledger.TeamOf(client));
                    if(Apocalypse.Value&&BeaconMask.Value==7&&shelter&&p.Defenders.Value>0&&Elapsed.Value>=150) {Victory.Value=true;p.NoticeRpc("GRYNING · laget har överlevt Karlstad!");Ledger.Award(client,"victory:"+round,900);}
                    else p.NoticeRpc("Kräver 3 solfyrar, ett tryggt bo, hockeyförsvarare och 150 s överlevnad.");break;
            }
            Refresh();
        }
        public void Invite(MobilePlayer p,ulong guest,bool shelter)
        {
            if(!IsServer||!MobilePlayer.Active.ContainsKey(guest))return;
            if(lastUse.TryGetValue(p.OwnerClientId,out double last)&&Now-last<.5)return;lastUse[p.OwnerClientId]=Now;
            string code=shelter?Ledger.InviteToShelter(p.OwnerClientId,guest,p.Building.Value,Now):Ledger.InviteToTeam(p.OwnerClientId,guest,Now);
            if(code==null){p.NoticeRpc(shelter?"Ni måste äga byggnaden. Gästen måste vara i ett annat lag.":"Bara lagledaren kan bjuda in en solospelare. Max 4 per lag.");return;}
            MobilePlayer.Active[guest].InvitationRpc(code,shelter,shelter?"Gästskydd · 50 lag-XP / 3 minuter":"Gå med i lag · din solo-XP slås ihop");
            p.NoticeRpc("Inbjudan skickad i spelet. Giltig i 2 minuter.");
        }
        public void Accept(MobilePlayer p,string code,bool shelter)
        {if(!IsServer||code==null||code.Length!=12)return;bool ok=shelter?Ledger.AcceptShelter(p.OwnerClientId,code,Now):Ledger.AcceptTeam(p.OwnerClientId,code,Now);p.NoticeRpc(ok?"Klart!":"Inbjudan har gått ut, är använd eller kraven uppfylls inte.");Refresh();}
        public string Mission(MobilePlayer p)
        {
            if(!Apocalypse.Value)return "STADSÄVENTYR · Besök Karlstads platser och möt museivärden.";
            if(Victory.Value)return "GRYNING · Ni klarade evakueringen.";
            if(p.Health.Value<=0)return "DU ÄR UTSLAGEN · Återuppta vid torget.";
            if(BeaconMask.Value!=7)return "01 · Tänd 3 solfyrar längs huvudgatan. +350 lag-XP per fyr.";
            if(!Ledger.Owners.Values.Contains(Ledger.TeamOf(p.OwnerClientId)))return "02 · Neutralisera ett rum. Säkra byggnaden för 600 lag-XP.";
            if(p.Defenders.Value==0)return "03 · Ta bussen till arenan. Rekrytera två hockeyförsvarare.";
            if(Elapsed.Value<150)return "04 · Överlev till gryningen. Håll laget i säkerhet.";
            return "05 · Tillbaka till Sandgrund. Aktivera EVAKUERING vid älven.";
        }
        public void Refresh()
        {
            if(!IsServer)return;
            foreach(var p in Players) {
                int team=Ledger.TeamOf(p.OwnerClientId);p.TeamId.Value=team;
                p.Wallet.Value=Ledger.Teams.TryGetValue(team,out var t)?t.Wallet:0;
                p.Sheltered.Value=IsProtected(p);
                p.Mission.Value=new FixedString512Bytes(Mission(p));
            }
            string s=string.Join("\n",Ledger.Teams.Values.OrderBy(t=>t.Id).Select(t=>$"{t.Name} · {t.Wallet} XP · {t.Members.Count}/4"));
            TeamSnapshot.Value=new FixedString4096Bytes(s);
        }
    }
}
