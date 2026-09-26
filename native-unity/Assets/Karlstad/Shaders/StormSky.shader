Shader "Karlstad/StormSky"
{
    Properties { _Apocalypse("Apocalypse",Range(0,1))=0 }
    SubShader
    {
        Tags {"Queue"="Background" "RenderType"="Background" "PreviewType"="Skybox"}
        Cull Off ZWrite Off
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 direction : TEXCOORD0; };
            CBUFFER_START(UnityPerMaterial)
                float _Apocalypse;
            CBUFFER_END
            Varyings vert(Attributes v) { Varyings o; o.positionCS=TransformObjectToHClip(v.positionOS.xyz);o.direction=v.positionOS.xyz;return o; }
            float hash(float2 p) {return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
            float noise(float2 p){float2 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(hash(i),hash(i+float2(1,0)),f.x),lerp(hash(i+float2(0,1)),hash(i+1),f.x),f.y);}
            half4 frag(Varyings i):SV_Target
            {
                float3 d=normalize(i.direction);float h=saturate(d.y);
                float3 horizon=lerp(float3(.65,.75,.74),float3(.16,.24,.26),_Apocalypse);
                float3 zenith=lerp(float3(.15,.34,.43),float3(.016,.025,.046),_Apocalypse);
                float3 sky=lerp(horizon,zenith,pow(h,.5));
                float2 uv=d.xz/max(.18,d.y+.22)*2.2+_Time.y*float2(.007,.003);
                float n=noise(uv)*.58+noise(uv*2.1)*.28+noise(uv*4.2)*.14;
                float cloud=smoothstep(.44,.73,n)*smoothstep(-.05,.18,d.y);
                sky=lerp(sky,lerp(float3(.9,.86,.72),float3(.075,.09,.11),_Apocalypse),cloud*.83);
                return half4(sky,1);
            }
            ENDHLSL
        }
    }
}
