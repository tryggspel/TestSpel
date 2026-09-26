using Karlstad.Core;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
namespace Karlstad.UI
{
    public class TouchControls : MonoBehaviour
    {
        public static TouchControls Instance {get;private set;}
        public Vector2 Move {get;private set;} public bool Fire {get;private set;} public bool Crouch {get;set;}
        public bool Blocked {get;set;} public float Sensitivity=1;
        public bool Sprint=>Move.magnitude>.92f&&!Crouch;
        Vector2 look;bool jump,predictJump;bool touchFire, keyboardMoving,firePressed;
        public bool PredictJump {get{bool value=predictJump;predictJump=false;return value;}}
        void Awake(){Instance=this;}
        void OnDestroy(){if(Instance==this)Instance=null;}
        public void SetMove(Vector2 value){Move=Blocked?Vector2.zero:value;}
        public void Aim(Vector2 pixels){if(!Blocked)look+=new Vector2(MobileInputMath.LookDegrees(pixels.x,Screen.width,Screen.height,Sensitivity),MobileInputMath.LookDegrees(pixels.y,Screen.width,Screen.height,Sensitivity));}
        public Vector2 ConsumeLook(){var result=look;look=Vector2.zero;return result;}
        public void SetFire(bool active){if(active&&!Blocked)firePressed=true;touchFire=active;Fire=active&&!Blocked;}
        public bool ConsumeFirePress(){bool value=firePressed;firePressed=false;return value;}
        public void Jump(){if(!Blocked){jump=true;predictJump=true;}}
        public bool ConsumeJump(){bool value=jump;jump=false;return value;}
        public void ResetInput(){Move=Vector2.zero;look=Vector2.zero;Fire=touchFire=jump=predictJump=firePressed=false;foreach(var s in GetComponentsInChildren<TouchSurface>(true))s.Release();}
        void OnApplicationFocus(bool focus){if(!focus)ResetInput();}
        void OnApplicationPause(bool pause){if(pause)ResetInput();}
        void Update()
        {
            if(Blocked){Move=Vector2.zero;Fire=false;return;}
            var k=Keyboard.current;
            if(k!=null) {
                Vector2 axis=new Vector2((k.dKey.isPressed?1:0)-(k.aKey.isPressed?1:0),(k.wKey.isPressed?1:0)-(k.sKey.isPressed?1:0));
                if(axis.sqrMagnitude>0){Move=Vector2.ClampMagnitude(axis,1);keyboardMoving=true;}
                else if(keyboardMoving){Move=Vector2.zero;keyboardMoving=false;}
                if(k.spaceKey.wasPressedThisFrame)Jump();if(k.cKey.wasPressedThisFrame)Crouch=!Crouch;
            }
            var mouse=Mouse.current;
            if(mouse!=null&&!Application.isMobilePlatform) {
                if(mouse.rightButton.isPressed)look+=mouse.delta.ReadValue()*.12f*Sensitivity;
                Fire=touchFire||(mouse.leftButton.isPressed&&mouse.rightButton.isPressed);
                if(k!=null&&k.fKey.isPressed)Fire=true;
            }
        }
    }
}
