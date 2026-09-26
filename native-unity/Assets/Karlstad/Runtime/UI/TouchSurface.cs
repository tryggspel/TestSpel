using Karlstad.Core;
using UnityEngine;
using UnityEngine.EventSystems;
namespace Karlstad.UI
{
    public enum SurfaceKind {Move,Look,Fire,Jump,Crouch}
    public class TouchSurface:MonoBehaviour,IPointerDownHandler,IDragHandler,IPointerUpHandler
    {
        public SurfaceKind Kind;public RectTransform Knob;public float Radius=66;
        int finger=int.MinValue;Vector2 origin,previous;RectTransform rect;
        void Awake(){rect=(RectTransform)transform;}
        public void OnPointerDown(PointerEventData e)
        {
            if(finger!=int.MinValue||!TouchControls.Instance||TouchControls.Instance.Blocked)return;
            finger=e.pointerId;previous=e.position;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(rect,e.position,e.pressEventCamera,out origin);
            if(Kind==SurfaceKind.Fire)TouchControls.Instance.SetFire(true);
            if(Kind==SurfaceKind.Jump)TouchControls.Instance.Jump();
            if(Kind==SurfaceKind.Crouch)TouchControls.Instance.Crouch=!TouchControls.Instance.Crouch;
        }
        public void OnDrag(PointerEventData e)
        {
            if(e.pointerId!=finger)return;var controls=TouchControls.Instance;if(!controls)return;
            if(Kind==SurfaceKind.Move) {
                RectTransformUtility.ScreenPointToLocalPointInRectangle(rect,e.position,e.pressEventCamera,out var now);
                Vector2 delta=now-origin;MobileInputMath.Stick(delta.x,delta.y,Radius,out float x,out float y);controls.SetMove(new Vector2(x,y));
                if(Knob)Knob.anchoredPosition=Vector2.ClampMagnitude(delta,Radius);
            } else if(Kind==SurfaceKind.Look||Kind==SurfaceKind.Fire)controls.Aim(e.position-previous);
            previous=e.position;
        }
        public void OnPointerUp(PointerEventData e){if(e.pointerId==finger)Release();}
        public void Release()
        {
            if(finger!=int.MinValue&&TouchControls.Instance){if(Kind==SurfaceKind.Move)TouchControls.Instance.SetMove(Vector2.zero);if(Kind==SurfaceKind.Fire)TouchControls.Instance.SetFire(false);}
            finger=int.MinValue;if(Knob)Knob.anchoredPosition=Vector2.zero;
        }
        void OnDisable(){Release();}
    }
}
