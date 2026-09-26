using System.Collections.Generic;
using Karlstad.Core;
using Karlstad.UI;
using Karlstad.World;
using Unity.Collections;
using Unity.Netcode;
using UnityEngine;

namespace Karlstad.Network
{
    [RequireComponent(typeof(CharacterController))]
    public class MobilePlayer : NetworkBehaviour
    {
        public static readonly Dictionary<ulong,MobilePlayer> Active=new Dictionary<ulong,MobilePlayer>();
        public static MobilePlayer Local {get;private set;}
        public readonly NetworkVariable<Vector3> Position=new NetworkVariable<Vector3>();
        public readonly NetworkVariable<float> Facing=new NetworkVariable<float>();
        public readonly NetworkVariable<int> Building=new NetworkVariable<int>(-1);
        public readonly NetworkVariable<float> Health=new NetworkVariable<float>(100),Energy=new NetworkVariable<float>(100);
        public readonly NetworkVariable<int> TeamId=new NetworkVariable<int>(),Wallet=new NetworkVariable<int>(),Defenders=new NetworkVariable<int>();
        public readonly NetworkVariable<bool> Sheltered=new NetworkVariable<bool>(),VisitedArena=new NetworkVariable<bool>();
        public readonly NetworkVariable<FixedString512Bytes> Mission=new NetworkVariable<FixedString512Bytes>();
        public Transform Body; CharacterController controller;Camera eyes;LineRenderer beam;Transform projector;
        Vector2 serverMove;float serverYaw,serverPitch,yaw,pitch,vertical,sendAt,fireAt,beamUntil,damageAt;
        bool serverSprint,serverDuck,jumpQueued,registered;double inputAt,shotAt=-10,novaAt=-30;
        int stateSequence;float recoil; readonly List<Transform> companions=new List<Transform>();float guardAt;
        public Camera Eyes=>eyes;
        bool Zombie=>SessionAuthority.Instance&&SessionAuthority.Instance.Apocalypse.Value&&!SessionAuthority.Instance.Victory.Value;
        double Now=>NetworkManager.ServerTime.Time;
        public override void OnNetworkSpawn()
        {
            controller=GetComponent<CharacterController>();Active[OwnerClientId]=this;
            if(IsServer){Warp(PlaceCatalog.CentreSpawn+new Vector3((OwnerClientId%4)*1.4f,0,0),-1);}
            if(IsOwner) {
                Local=this;yaw=0;
                if(Body)foreach(var r in Body.GetComponentsInChildren<Renderer>())r.enabled=false;
                var cameraObject=new GameObject("FPS · lokal kamera");cameraObject.transform.SetParent(transform,false);cameraObject.transform.localPosition=Vector3.up*1.68f;
                eyes=cameraObject.AddComponent<Camera>();eyes.nearClipPlane=.045f;eyes.farClipPlane=210;eyes.fieldOfView=78;cameraObject.AddComponent<AudioListener>();
                if(GameBootstrap.Instance.MenuCamera){GameBootstrap.Instance.MenuCamera.enabled=false;var listener=GameBootstrap.Instance.MenuCamera.GetComponent<AudioListener>();if(listener)listener.enabled=false;}
                BuildProjector(cameraObject.transform);MobileHud.Instance?.EnterGame();
            }
            beam=new GameObject("Solstråle").AddComponent<LineRenderer>();beam.transform.SetParent(transform,false);beam.positionCount=2;beam.startWidth=.045f;beam.endWidth=.014f;beam.useWorldSpace=true;beam.sharedMaterial=GameBootstrap.Instance.Palette[(int)WorldBuilder.M.Neon];beam.enabled=false;
        }
        public override void OnNetworkDespawn()
        {Active.Remove(OwnerClientId);if(Local==this)Local=null;if(beam)Destroy(beam.gameObject);foreach(var c in companions)if(c)Destroy(c.gameObject);}
        void Update()
        {
            if(!IsSpawned)return;
            if(IsServer) {
                if(transform.position.y < -12)Warp(PlaceCatalog.CentreSpawn,-1);
                if(!registered&&SessionAuthority.Instance){SessionAuthority.Instance.Register(this);registered=true;}
                if(Now-shotAt>.65&&Energy.Value<100)Energy.Value=Mathf.Min(100,Energy.Value+24*Time.deltaTime);
                if(Health.Value>0&&Defenders.Value>0&&Zombie&&Time.time>=guardAt){guardAt=Time.time+2.2f;Defend();}
            }
            if(IsOwner) {
                var input=TouchControls.Instance;
                if(input&&Health.Value>0) {
                    Vector2 look=input.ConsumeLook();yaw=Mathf.Repeat(yaw+look.x,360);pitch=Mathf.Clamp(pitch-look.y,-76,76);
                    if(Time.unscaledTime>=sendAt){sendAt=Time.unscaledTime+1f/30;MoveRpc(input.Move,yaw,pitch,input.Sprint,input.Crouch,input.ConsumeJump());}
                    bool pressed=input.ConsumeFirePress();
                    if((input.Fire||pressed)&&Time.unscaledTime>=fireAt&&Zombie&&!input.Blocked&&Energy.Value>=9) {fireAt=Time.unscaledTime+.15f;recoil=.055f;GameAudio.Instance?.Shot();ShootRpc(yaw,pitch);}
                }
                if(eyes) {eyes.transform.localRotation=Quaternion.Euler(pitch,0,0);float targetEye=input&&input.Crouch?1.04f:1.68f;eyes.transform.localPosition=Vector3.Lerp(eyes.transform.localPosition,Vector3.up*targetEye,1-Mathf.Exp(-22*Time.deltaTime));}
                transform.rotation=Quaternion.Euler(0,yaw,0);recoil=Mathf.MoveTowards(recoil,0,Time.deltaTime*.6f);if(projector)projector.localPosition=new Vector3(.27f,-.25f,.45f-recoil);
            } else if(!IsServer){transform.position=Vector3.Lerp(transform.position,Position.Value,1-Mathf.Exp(-20*Time.deltaTime));transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.Euler(0,Facing.Value,0),1-Mathf.Exp(-18*Time.deltaTime));}
            if(beam)beam.enabled=Time.time<beamUntil;
            UpdateCompanions();
        }
        void FixedUpdate()
        {
            if(!IsSpawned||!controller)return;
            if(IsServer) {
                Vector2 axis=Now-inputAt>.3||Health.Value<=0?Vector2.zero:serverMove;
                Simulate(axis,serverYaw,serverSprint,serverDuck,jumpQueued);jumpQueued=false;
                Position.Value=transform.position;Facing.Value=serverYaw;transform.rotation=Quaternion.Euler(0,serverYaw,0);
            } else if(IsOwner) {
                var input=TouchControls.Instance;
                if(input&&Health.Value>0)Simulate(input.Move,yaw,input.Sprint,input.Crouch,input.PredictJump);
                // Prototype local prediction; LAN only. High-latency rewind/replay is a release gate.
                float error=Vector3.Distance(transform.position,Position.Value);
                if(error>3.5f)SetPosition(Position.Value);
                else if(error>.85f)controller.Move((Position.Value-transform.position)*Mathf.Min(1,Time.fixedDeltaTime*5));
            }
        }
        void Simulate(Vector2 axis,float angle,bool sprint,bool duck,bool jump)
        {
            float height=duck?1.2f:1.85f;
            if(!duck&&controller.height<1.7f&&Physics.CheckSphere(transform.position+Vector3.up*1.65f,.26f,1,QueryTriggerInteraction.Ignore))height=1.2f;
            controller.height=height;controller.center=Vector3.up*height*.5f;
            if(controller.isGrounded){vertical=-2;if(jump&&height>1.5f)vertical=6.5f;}
            vertical=Mathf.Max(-25,vertical-19*Time.fixedDeltaTime);
            var velocity=Quaternion.Euler(0,angle,0)*new Vector3(axis.x,0,axis.y)*(duck?2.6f:sprint?7.4f:5.2f);
            controller.Move((velocity+Vector3.up*vertical)*Time.fixedDeltaTime);
        }
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner,Delivery=RpcDelivery.Unreliable)]
        void MoveRpc(Vector2 axis,float angle,float aimPitch,bool sprint,bool duck,bool jump,RpcParams rpc=default)
        {
            if(rpc.Receive.SenderClientId!=OwnerClientId||!MobileInputMath.Finite(axis.x)||!MobileInputMath.Finite(axis.y)||!MobileInputMath.Finite(angle)||!MobileInputMath.Finite(aimPitch)||Mathf.Abs(angle)>3600||Mathf.Abs(aimPitch)>180)return;
            serverMove=Vector2.ClampMagnitude(axis,1);serverYaw=Mathf.Repeat(angle,360);serverPitch=Mathf.Clamp(aimPitch,-76,76);serverSprint=sprint;serverDuck=duck;jumpQueued|=jump;inputAt=Now;
        }
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)]
        void ShootRpc(float angle,float aimPitch,RpcParams rpc=default)
        {
            if(rpc.Receive.SenderClientId!=OwnerClientId||!Zombie||Health.Value<=0||Energy.Value<9||Now-shotAt<.135||!MobileInputMath.Finite(angle)||!MobileInputMath.Finite(aimPitch)||Mathf.Abs(angle)>3600||Mathf.Abs(aimPitch)>180)return;
            shotAt=Now;Energy.Value-=9;
            Vector3 from=transform.position+Vector3.up*(serverDuck?1.04f:1.68f),dir=Quaternion.Euler(Mathf.Clamp(aimPitch,-76,76),angle,0)*Vector3.forward,to=from+dir*48;
            if(Physics.Raycast(from,dir,out var hit,48,~0,QueryTriggerInteraction.Collide)) {
                to=hit.point;var target=hit.collider.GetComponentInParent<ZombieActor>();
                if(target&&target.Stun(7)) {SessionAuthority.Instance.StunReward(this,target);NoticeRpc("Träff · neutraliserad i 7 sekunder");}
            }
            ShotVisualRpc(from,to);
        }
        [Rpc(SendTo.ClientsAndHost,InvokePermission=RpcInvokePermission.Server)]
        void ShotVisualRpc(Vector3 from,Vector3 to)
        {if(beam){beam.SetPosition(0,IsOwner&&projector?projector.position+projector.forward*.55f:from);beam.SetPosition(1,to);beamUntil=Time.time+.08f;}if(!IsOwner)GameAudio.Instance?.Shot(.18f);}
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)]
        public void NovaRpc(RpcParams rpc=default)
        {
            if(rpc.Receive.SenderClientId!=OwnerClientId||!Zombie||Health.Value<=0||Energy.Value<30||Now-novaAt<14)return;
            novaAt=Now;Energy.Value-=30;
            foreach(var e in ZombieActor.All) {
                Vector3 d=e.transform.position-transform.position;
                if(e.Building.Value!=Building.Value||d.sqrMagnitude>81||Physics.Linecast(transform.position+Vector3.up,e.transform.position+Vector3.up,1,QueryTriggerInteraction.Ignore))continue;
                if(e.Stun(6))SessionAuthority.Instance.StunReward(this,e);
            }
            NoticeRpc("SOLNOVA · laddar om i 14 s");
        }
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)] public void UseRpc(int kind,int id,RpcParams rpc=default){if(rpc.Receive.SenderClientId==OwnerClientId)SessionAuthority.Instance?.Interact(this,kind,id);}
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)] public void ZombieRpc(RpcParams rpc=default){if(rpc.Receive.SenderClientId==OwnerClientId)SessionAuthority.Instance?.SetZombie(this);}
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)] public void InviteRpc(ulong guest,bool shelter,RpcParams rpc=default){if(rpc.Receive.SenderClientId==OwnerClientId)SessionAuthority.Instance?.Invite(this,guest,shelter);}
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)] public void AcceptRpc(string code,bool shelter,RpcParams rpc=default){if(rpc.Receive.SenderClientId==OwnerClientId)SessionAuthority.Instance?.Accept(this,code,shelter);}
        [Rpc(SendTo.Server,InvokePermission=RpcInvokePermission.Owner)] public void RespawnRpc(RpcParams rpc=default){if(rpc.Receive.SenderClientId==OwnerClientId&&Health.Value<=0){ResetRound();Warp(PlaceCatalog.CentreSpawn,-1);}}
        [Rpc(SendTo.Owner,InvokePermission=RpcInvokePermission.Server)] public void NoticeRpc(string text){MobileHud.Instance?.Notice(text);}
        [Rpc(SendTo.Owner,InvokePermission=RpcInvokePermission.Server)] public void InvitationRpc(string code,bool shelter,string label){MobileHud.Instance?.Invitation(code,shelter,label);}
        public void Damage(float amount)
        {
            if(!IsServer||!Zombie||Health.Value<=0||Sheltered.Value||Time.time<damageAt)return;
            damageAt=Time.time+.8f;Health.Value=Mathf.Max(0,Health.Value-amount);
        }
        public void ResetRound(){if(!IsServer)return;Health.Value=100;Energy.Value=100;Defenders.Value=0;VisitedArena.Value=false;shotAt=-10;damageAt=Time.time+3;}
        public void Warp(Vector3 position,int building)
        {if(!IsServer)return;Building.Value=building;SetPosition(position);Position.Value=position;serverMove=Vector2.zero;vertical=0;WarpRpc(position,++stateSequence);}
        [Rpc(SendTo.Owner,InvokePermission=RpcInvokePermission.Server)]void WarpRpc(Vector3 position,int sequence){SetPosition(position);vertical=0;TouchControls.Instance?.ResetInput();}
        void SetPosition(Vector3 p){if(!controller)controller=GetComponent<CharacterController>();controller.enabled=false;transform.position=p;controller.enabled=true;}
        void BuildProjector(Transform cameraTransform)
        {
            var g=new GameObject("Solprojektor · originalmodell");projector=g.transform;projector.SetParent(cameraTransform,false);
            var palette=GameBootstrap.Instance.Palette;
            CharacterModel.Piece("Projektorhus",projector,new Vector3(0,0,.1f),new Vector3(.19f,.16f,.42f),palette[(int)WorldBuilder.M.Dark]);
            CharacterModel.Piece("Solskena",projector,new Vector3(0,.1f,.16f),new Vector3(.08f,.035f,.48f),palette[(int)WorldBuilder.M.Brass]);
            CharacterModel.Piece("Ljuslins",projector,new Vector3(0,0,.34f),new Vector3(.13f,.1f,.035f),palette[(int)WorldBuilder.M.Neon]);
            CharacterModel.Piece("Grepp",projector,new Vector3(0,-.13f,0),new Vector3(.1f,.23f,.12f),palette[(int)WorldBuilder.M.Wood]);
            CharacterModel.Piece("Handsken",projector,new Vector3(0,-.19f,-.04f),new Vector3(.14f,.13f,.16f),palette[(int)WorldBuilder.M.Teal]);
        }
        void UpdateCompanions()
        {
            while(companions.Count<Defenders.Value) {var m=CharacterModel.Build("Hockeyförsvarare · följeslagare",transform.position,null,GameBootstrap.Instance.Palette,true);companions.Add(m.transform);}
            while(companions.Count>Defenders.Value){int i=companions.Count-1;Destroy(companions[i].gameObject);companions.RemoveAt(i);}
            for(int i=0;i<companions.Count;i++) {
                Vector3 target=transform.position+transform.right*(i==0?-1.4f:1.4f)-transform.forward*1.4f;
                companions[i].position=Vector3.Distance(companions[i].position,target)>12?target:Vector3.Lerp(companions[i].position,target,1-Mathf.Exp(-8*Time.deltaTime));
                companions[i].rotation=transform.rotation;
            }
        }
        void Defend()
        {
            ZombieActor best=null;float d=14*14;
            foreach(var e in ZombieActor.All){float n=(e.transform.position-transform.position).sqrMagnitude;if(e.Building.Value==Building.Value&&!e.IsStunned&&n<d&&!Physics.Linecast(transform.position+Vector3.up,e.transform.position+Vector3.up,1,QueryTriggerInteraction.Ignore)){best=e;d=n;}}
            if(best){best.Stun(4);ShotVisualRpc(transform.position+Vector3.up,best.transform.position+Vector3.up);}
        }
    }
}
