using System.Net;
using Karlstad.Network;
using Karlstad.UI;
using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering.Universal;
namespace Karlstad
{
    public class GameBootstrap:MonoBehaviour
    {
        public static GameBootstrap Instance {get;private set;}
        public GameObject PlayerPrefab,ZombiePrefab,SessionPrefab;public Material[] Palette;public Camera MenuCamera;
        public UniversalRenderPipelineAsset Balanced,High,Battery;public int QualityMode=1;
        NetworkManager manager;UnityTransport transport;bool solo;float connectStarted;bool connecting;
        void Awake()
        {
            Instance=this;Application.targetFrameRate=60;QualitySettings.vSyncCount=0;Time.fixedDeltaTime=1f/50;
            Screen.autorotateToPortrait=false;Screen.autorotateToPortraitUpsideDown=false;Screen.autorotateToLandscapeLeft=true;Screen.autorotateToLandscapeRight=true;Screen.orientation=ScreenOrientation.AutoRotation;Screen.sleepTimeout=SleepTimeout.NeverSleep;
            SetQuality(1);
            Physics.IgnoreLayerCollision(8,8,true);Physics.IgnoreLayerCollision(8,9,true);Physics.IgnoreLayerCollision(9,9,true);
            manager=FindFirstObjectByType<NetworkManager>();transport=manager.GetComponent<UnityTransport>();
            manager.NetworkConfig.PlayerPrefab=PlayerPrefab;manager.NetworkConfig.TickRate=30;manager.NetworkConfig.ConnectionApproval=true;
            manager.NetworkConfig.EnableSceneManagement=false;manager.NetworkConfig.ProtocolVersion=1;
            manager.ConnectionApprovalCallback=Approve;manager.OnServerStarted+=ServerStarted;
            manager.OnClientDisconnectCallback+=ClientDisconnected;
            MobileHud.Build();gameObject.AddComponent<GameAudio>();gameObject.AddComponent<Atmosphere>();
            World.GridNavigation.Clear();
        }
        public void SetQuality(int mode)
        {QualityMode=mode;QualitySettings.renderPipeline=mode==0?Battery:mode==2?High:Balanced;Application.targetFrameRate=mode==0?30:60;}
        void Approve(NetworkManager.ConnectionApprovalRequest request,NetworkManager.ConnectionApprovalResponse response)
        {response.Approved=manager.ConnectedClients.Count<(solo?1:8);response.CreatePlayerObject=response.Approved;response.Pending=false;response.Reason=response.Approved?"":"Sessionen är full.";}
        void ServerStarted()
        {var g=Instantiate(SessionPrefab);g.GetComponent<NetworkObject>().Spawn();}
        public void StartSession(bool offline,bool host,string ip)
        {
            if(manager.IsListening||connecting)return;
            solo=offline;
            if(!host&&!IPAddress.TryParse((ip??"").Trim(),out _)){MobileHud.Instance.MenuStatus("Ange värdens lokala IP-adress på samma Wi-Fi.");return;}
            transport.SetConnectionData(host?"127.0.0.1":ip.Trim(),7777,offline?"127.0.0.1":"0.0.0.0");
            connectStarted=Time.unscaledTime;connecting=true;
            bool started=host?manager.StartHost():manager.StartClient();
            if(!started){connecting=false;MobileHud.Instance.MenuStatus("Kunde inte starta. Kontrollera anslutningen och port 7777.");}
            else MobileHud.Instance.MenuStatus(host?"Startar Karlstad …":"Ansluter till värden …");
        }
        void Update()
        {
            if(MenuCamera&&MenuCamera.enabled) {
                float t=(Mathf.Sin(Time.unscaledTime*.09f)+1)*.5f;
                MenuCamera.transform.position=Vector3.Lerp(new Vector3(-32,17,-38),new Vector3(4,12,83),t);
                MenuCamera.transform.LookAt(Vector3.Lerp(new Vector3(0,3,25),new Vector3(-24,4,107),t));
            }
            if(!connecting)return;if(MobilePlayer.Local){connecting=false;return;}
            if(Time.unscaledTime-connectStarted>12){manager.Shutdown();connecting=false;MobileHud.Instance.MenuStatus("Ingen anslutning. Kontrollera IP, samma Wi-Fi och värdens lokala nätverksbehörighet.");}
        }
        void ClientDisconnected(ulong id)
        {if(id!=manager.LocalClientId)return;TouchControls.Instance?.ResetInput();if(!manager.IsServer&&!connecting)LeaveSession();else if(connecting){connecting=false;MobileHud.Instance.MenuStatus("Anslutningen bröts. Kontrollera värdens adress och Wi-Fi.");}}
        public void LeaveSession(){if(manager)manager.Shutdown();StartCoroutine(Reload());}
        System.Collections.IEnumerator Reload(){yield return null;if(manager)Destroy(manager.gameObject);yield return null;SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);}
        void OnDestroy(){if(manager){manager.OnServerStarted-=ServerStarted;manager.OnClientDisconnectCallback-=ClientDisconnected;}if(Instance==this)Instance=null;}
        void OnApplicationPause(bool paused){TouchControls.Instance?.ResetInput();AudioListener.pause=paused;}
    }
}
