using UnityEngine;
namespace Karlstad.UI
{
    public class SafeArea:MonoBehaviour
    {
        Rect previous;int width,height;
        void Update(){if(previous==Screen.safeArea&&width==Screen.width&&height==Screen.height)return;previous=Screen.safeArea;width=Screen.width;height=Screen.height;var r=(RectTransform)transform;r.anchorMin=previous.position/new Vector2(width,height);r.anchorMax=(previous.position+previous.size)/new Vector2(width,height);r.offsetMin=r.offsetMax=Vector2.zero;}
    }
}
