using System.Collections.Generic;
using Karlstad.World;
using Unity.Netcode;
using UnityEngine;
namespace Karlstad.Network
{
    public class ZombieActor : NetworkBehaviour
    {
        public static readonly List<ZombieActor> All=new List<ZombieActor>();
        public int InitialBuilding=-1;
        public readonly NetworkVariable<int> Building=new NetworkVariable<int>(-1);
        readonly NetworkVariable<Vector3> position=new NetworkVariable<Vector3>();
        readonly NetworkVariable<float> rotation=new NetworkVariable<float>();
        readonly NetworkVariable<double> stunnedUntil=new NetworkVariable<double>();
        public bool IsStunned=>NetworkManager&&NetworkManager.ServerTime.Time<stunnedUntil.Value;
        Vector3 next;float routeAt,attackAt;CharacterModel model;
        public override void OnNetworkSpawn()
        {All.Add(this);model=GetComponentInChildren<CharacterModel>();if(model)model.Zombie=true;if(IsServer){Building.Value=InitialBuilding;position.Value=transform.position;routeAt=Time.time+(NetworkObjectId%10)*.1f;}}
        public override void OnNetworkDespawn(){All.Remove(this);}
        public bool Stun(float duration)
        {if(!IsServer||IsStunned)return false;stunnedUntil.Value=NetworkManager.ServerTime.Time+duration;return true;}
        void Update()
        {
            if(!IsSpawned)return;
            if(IsServer) {
                var session=SessionAuthority.Instance;
                if(session&&!session.Victory.Value&&!IsStunned) {
                    MobilePlayer target=null;float best=28*28;
                    foreach(var p in MobilePlayer.Active.Values){float d=(p.transform.position-transform.position).sqrMagnitude;if(p.Health.Value>0&&!session.IsProtected(p)&&p.Building.Value==Building.Value&&d<best){best=d;target=p;}}
                    if(target) {
                        if(Time.time>=routeAt){routeAt=Time.time+.85f;next=GridNavigation.Next(transform.position,target.transform.position,GridNavigation.Region(Building.Value,transform.position));}
                        Vector3 delta=next-transform.position;delta.y=0;
                        if(delta.sqrMagnitude>.1f) {
                            Vector3 dir=delta.normalized;float step=(session.Elapsed.Value>90?3.5f:2.7f)*Time.deltaTime;
                            if(!Physics.SphereCast(transform.position+Vector3.up*.9f,.38f,dir,out _,step+.06f,1,QueryTriggerInteraction.Ignore))transform.position+=dir*Mathf.Min(step,delta.magnitude);
                            transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(dir),Time.deltaTime*9);
                        }
                        if(best<1.65f*1.65f&&Time.time>=attackAt&&!Physics.Linecast(transform.position+Vector3.up,target.transform.position+Vector3.up,1,QueryTriggerInteraction.Ignore)){attackAt=Time.time+1.2f;target.Damage(14);}
                    }
                }
                position.Value=transform.position;rotation.Value=transform.eulerAngles.y;
            } else {transform.position=Vector3.Lerp(transform.position,position.Value,1-Mathf.Exp(-18*Time.deltaTime));transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.Euler(0,rotation.Value,0),Time.deltaTime*15);}
            if(model)model.transform.localRotation=Quaternion.Euler(IsStunned?65:0,0,IsStunned?12:0);
        }
    }
}
