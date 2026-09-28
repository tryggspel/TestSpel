#!/usr/bin/env python3
import json, math, subprocess, wave
from pathlib import Path
import numpy as np

SR=44100
OUT=Path("karlstad-city-mobile/audio")
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(240928)

def midi(n): return 440.0*2**((n-69)/12)

def env(n,a=.01,d=.08,s=.7,r=.12):
    A=max(1,int(a*SR));D=max(1,int(d*SR));R=max(1,int(r*SR))
    if A+D+R>=n:
        k=max(.1,(n-3)/(A+D+R));A=max(1,int(A*k));D=max(1,int(D*k));R=max(1,int(R*k))
    S=max(0,n-A-D-R);e=np.empty(n,np.float32);p=0
    e[p:p+A]=np.linspace(0,1,A,endpoint=False);p+=A
    e[p:p+D]=np.linspace(1,s,D,endpoint=False);p+=D
    if S:e[p:p+S]=s;p+=S
    e[p:]=np.linspace(s,0,n-p)
    return e

def pan(p):
    a=(np.clip(p,-1,1)+1)*np.pi/4
    return np.cos(a),np.sin(a)

def add(buf,sig,t,p=0,g=1):
    i=int(t*SR)
    if i>=len(buf): return
    n=min(len(sig),len(buf)-i)
    if n<=0:return
    l,r=pan(p);buf[i:i+n,0]+=sig[:n]*g*l;buf[i:i+n,1]+=sig[:n]*g*r

def osc(freq,dur,kind="saw",det=0):
    n=max(1,int(dur*SR));t=np.arange(n)/SR;f=freq*2**(det/1200);ph=2*np.pi*f*t
    if kind=="sine": y=np.sin(ph)
    elif kind=="triangle": y=2/np.pi*np.arcsin(np.sin(ph))
    elif kind=="square": y=np.sign(np.sin(ph))
    else:
        y=np.zeros(n)
        H=min(16,max(1,int((SR/2)//max(f,1))))
        for k in range(1,H+1): y+=np.sin(k*ph)/k
        y*=2/np.pi
    return y.astype(np.float32)

def onepole(y,cut):
    a=1-math.exp(-2*math.pi*cut/SR);out=np.empty_like(y);z=0.0
    for i,x in enumerate(y): z+=a*(float(x)-z);out[i]=z
    return out

def string(n,d):
    y=.58*osc(midi(n),d,"saw",-5)+.38*osc(midi(n),d,"saw",6)+.2*osc(midi(n+12),d,"triangle")
    y=onepole(y,1900);return y*env(len(y),.08,.18,.74,.28)

def guitar(n,d,muted=False):
    y=.62*osc(midi(n),d,"saw",-7)+.45*osc(midi(n),d,"square",4)+.2*osc(midi(n+12),d,"triangle")
    y=np.tanh(y*(4.4 if muted else 3.3));y=onepole(y,2500 if muted else 3400)
    e=env(len(y),.004,.05,.34 if muted else .62,.06 if muted else .16)
    if muted:e*=np.exp(-np.arange(len(y))/(SR*.16))
    return y*e

def bass(n,d,heavy=False):
    y=.62*osc(midi(n),d,"saw")+.55*osc(midi(n)/2,d,"square")
    y=np.tanh(y*(3.1 if heavy else 2.3));y=onepole(y,620 if heavy else 480)
    return y*env(len(y),.006,.08,.64,.08)

def lead(n,d):
    y=.55*osc(midi(n),d,"saw",-4)+.35*osc(midi(n),d,"triangle",7)
    y=onepole(y,2800);y*=1+.04*np.sin(2*np.pi*5.2*np.arange(len(y))/SR)
    return y*env(len(y),.012,.06,.72,.12)

def kick(d=.28):
    n=int(d*SR);t=np.arange(n)/SR;f=46+(125-46)*np.exp(-t/.035);ph=2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph)*np.exp(-t/.095)+.12*rng.normal(size=n)*np.exp(-t/.018)).astype(np.float32)

def snare(d=.22):
    n=int(d*SR);t=np.arange(n)/SR
    return (rng.normal(size=n)*np.exp(-t/.075)*.42+.22*np.sin(2*np.pi*180*t)*np.exp(-t/.1)).astype(np.float32)

def hat(openhat=False):
    d=.26 if openhat else .065;n=int(d*SR);t=np.arange(n)/SR
    y=rng.normal(size=n);y-=onepole(y,4800);y*=np.exp(-t/(.1 if openhat else .018))
    return (y*.22).astype(np.float32)

def tom(note=43,d=.32):
    n=int(d*SR);t=np.arange(n)/SR
    return (np.sin(2*np.pi*midi(note)*t)*np.exp(-t/.12)).astype(np.float32)

def crowd(note,d,vowel="oh"):
    f0=midi(note);n=int(d*SR);t=np.arange(n)/SR;y=np.zeros(n)
    forms={"oh":[(430,1),(820,.6),(2650,.22)],"ah":[(720,1),(1120,.55),(2500,.2)],"eh":[(530,1),(1780,.55),(2480,.22)]}[vowel]
    for h in range(1,22):
        fh=f0*h
        if fh>SR/2:break
        w=sum(a*np.exp(-.5*((fh-F)/(F*.14))**2) for F,a in forms)
        if w>1e-4:y+=w*np.sin(2*np.pi*fh*t+rng.uniform(0,2*np.pi))/h**.3
    return np.tanh(y*.85).astype(np.float32)*env(n,.05,.12,.8,.18)

def clap():
    n=int(.12*SR);y=np.zeros(n)
    for off in [0,.017,.036]:
        i=int(off*SR);m=n-i;t=np.arange(m)/SR
        y[i:]+=rng.normal(size=m)*np.exp(-t/.028)*.16
    return y.astype(np.float32)

def room(buf,wet=.15):
    out=buf.copy();mono=buf.mean(1)
    for d,g,p in [(.071,.22,-.55),(.113,.16,.48),(.173,.12,-.22),(.263,.09,.3),(.389,.055,-.4)]:
        s=int(d*SR)
        if s>=len(buf):continue
        l,r=pan(p);out[s:,0]+=mono[:-s]*g*l*wet*2.6;out[s:,1]+=mono[:-s]*g*r*wet*2.6
    return out

def master(x):
    x=np.tanh(x*1.08);pk=np.max(np.abs(x))+1e-9;x*=.92/max(.92,pk);return x.astype(np.float32)

def power(buf,root,t,d,g=.07,muted=True):
    add(buf,guitar(root,d,muted),t,-.65,g);add(buf,guitar(root+7,d,muted),t,.65,g*.82);add(buf,guitar(root+12,d,muted),t,-.12,g*.42)

HERO=[62,65,67,69,67,65,64,62,60,62,65,67,65,64,62,57]

def main_track():
    bpm=108;b=60/bpm;bars=16;buf=np.zeros((int(bars*4*b*SR),2),np.float32)
    roots=[38,41,36,43];chords=[[50,57,62,65],[53,60,65,69],[48,55,60,64],[55,62,67,71]]
    for bar in range(bars):
        st=bar*4*b;r=roots[bar%4]
        for j,n in enumerate(chords[bar%4]):add(buf,string(n+(12 if j>1 else 0),3.8*b),st,-.5+.33*j,.034)
        seq=[0,2] if bar<2 else [0,.75,1.5,2,2.75,3.5]
        for i,o in enumerate(seq):add(buf,bass(r+(7 if i==len(seq)-1 and bar%2 else 0),.44*b),st+o*b,-.05,.105)
        if bar<2:
            for o in [0,2]:add(buf,kick(),st+o*b,0,.48)
        else:
            for o in [0,1.5,2,3.5]:add(buf,kick(),st+o*b,0,.56)
            for o in [1,3]:add(buf,snare(),st+o*b,.04,.45)
            for e in range(8):add(buf,hat(),st+e*.5*b,.35 if e%2 else -.35,.24)
        if bar>=4:
            for i,o in enumerate([0,.75,1.5,2.5,3.25]):power(buf,r,st+o*b,(.26 if i!=2 else .44)*b,.066,i!=2)
        if bar in [3,7,11,15]:
            for k,(o,n) in enumerate([(3.1,45),(3.38,43),(3.64,40)]):add(buf,tom(n),st+o*b,-.25+.25*k,.3)
            add(buf,hat(True),st+3.84*b,.55,.35)
    for cyc in range(0,bars,4):
        st=cyc*4*b;boost=.78+.1*(cyc//4)
        for i,n in enumerate(HERO):
            add(buf,lead(n+12,.4*b),st+i*.5*b,.12,.072*boost)
            if i%4==0:add(buf,string(n,.34*b),st+i*.5*b+.06,-.22,.025)
    for base in [2,10]:
        st=base*4*b
        for n,o,d,v in [(57,0,.68,"oh"),(57,.78,.62,"oh"),(62,1.55,.82,"ah"),(60,2.62,.48,"eh"),(57,3.18,.9,"oh")]:
            for j,p in enumerate([-.75,-.38,0,.38,.75]):add(buf,crowd(n+(12 if j==0 else 0),d*b,v),st+o*b+j*.008,p,.013)
        add(buf,clap(),st+2.25*b,0,.6);add(buf,clap(),st+4*b,0,.55)
    return master(room(buf,.16))

def arena_track():
    bpm=108;b=60/bpm;bars=8;buf=np.zeros((int(bars*4*b*SR),2),np.float32)
    chords=[[50,57,62,65],[53,60,65,69],[48,55,60,64],[55,62,67,71]]
    for bar in range(bars):
        st=bar*4*b
        for j,n in enumerate(chords[bar%4]):add(buf,string(n+(12 if j>1 else 0),3.8*b),st,-.5+.33*j,.024)
        for o in [1,3]:add(buf,clap(),st+o*b,0,.45)
        if bar%2==0:
            for n,o,d,v in [(57,0,.68,"oh"),(57,.78,.62,"oh"),(62,1.55,.82,"ah"),(60,2.62,.48,"eh"),(57,3.18,.9,"oh")]:
                for j,p in enumerate([-.85,-.55,-.25,.05,.35,.65,.88]):add(buf,crowd(n+(12 if j in [0,4] else 0),d*b,v),st+o*b+j*.007,p,.010)
    return master(room(buf,.28))*.78

def transition_track():
    dur=3.1;buf=np.zeros((int(dur*SR),2),np.float32);n=int(2.6*SR);t=np.arange(n)/SR
    f=280+520*(.5-.5*np.cos(np.pi*t/2.6));ph=2*np.pi*np.cumsum(f)/SR
    s=(np.sin(ph)+.38*np.sin(ph*2.01))*np.minimum(1,t/.15)*np.maximum(0,1-(t/2.6)**3)
    add(buf,s.astype(np.float32),0,-.15,.16);add(buf,s.astype(np.float32),.03,.18,.11)
    add(buf,rng.normal(size=n).astype(np.float32)*np.linspace(.02,.18,n),0,0,.18)
    add(buf,kick(.6),2.45,0,.95);add(buf,bass(26,.55,True),2.43,0,.28);add(buf,clap(),2.52,0,.6)
    return master(room(buf,.18))

def zombie_track():
    bpm=144;b=60/bpm;bars=16;buf=np.zeros((int(bars*4*b*SR),2),np.float32);roots=[38,39,44,37]
    corrupt=[62,63,68,67,63,62,56,57,62,61,56,63,62,57,56,51]
    for bar in range(bars):
        st=bar*4*b;r=roots[bar%4];add(buf,bass(r-12,3.9*b,True),st,0,.09)
        for e in range(8):add(buf,kick(.23),st+e*.5*b,0,.59 if e%4==0 else .41);add(buf,hat(),st+e*.5*b,.45 if e%2 else -.45,.22)
        for o in [1,3]:add(buf,snare(),st+o*b,0,.59)
        for i,o in enumerate([0,.5,1,1.5,2.25,2.5,3.25,3.5]):power(buf,r,st+o*b,(.2 if i!=4 else .34)*b,.078,i!=4)
        if bar%4==3:
            power(buf,r+6,st+3.72*b,.2*b,.1,False)
            for k,(o,n) in enumerate([(3.05,43),(3.3,40),(3.55,38)]):add(buf,tom(n),st+o*b,-.3+.3*k,.4)
    for cyc in range(0,bars,4):
        st=cyc*4*b
        for i,n in enumerate(corrupt):add(buf,guitar(n+12,.32*b,False),st+i*.5*b,-.35 if i%2 else .35,.042)
    for base in [2,6,10,14]:
        st=base*4*b
        for n,o,d in [(45,0,1.5),(46,1.95,1.1),(41,3.55,1.6)]:
            for j,p in enumerate([-.65,-.2,.2,.65]):add(buf,crowd(n+(12 if j==0 else 0),d*b,"oh"),st+o*b+j*.03,p,.007)
    return master(room(buf,.2))

def write_mp3(name,buf,br):
    wav=OUT/(name+".wav");mp3=OUT/(name+".mp3")
    pcm=(np.clip(buf,-1,1)*32767).astype("<i2")
    with wave.open(str(wav),"wb") as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(wav),"-codec:a","libmp3lame","-b:a",br,"-ar","44100",str(mp3)],check=True)
    wav.unlink()
    return round(len(buf)/SR,3),mp3.stat().st_size

tracks={
 "karlstad-main":(main_track(),"128k"),
 "karlstad-arena-layer":(arena_track(),"112k"),
 "karlstad-zombie-transition":(transition_track(),"112k"),
 "karlstad-zombie-main":(zombie_track(),"128k"),
}
manifest={"version":1,"sample_rate":SR,"tracks":{}}
for name,(buf,br) in tracks.items():
    dur,size=write_mp3(name,buf,br)
    manifest["tracks"][name]={"file":name+".mp3","duration":dur,"bytes":size,"bitrate":br}
(OUT/"audio-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps(manifest,indent=2))
