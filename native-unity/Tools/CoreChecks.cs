using System;
using Karlstad.Core;
public static class CoreChecks
{
    static int checks;
    static void Check(bool condition,string label){if(!condition)throw new Exception("FAIL: "+label);checks++;}
    static SurvivalLedger Fresh(){var l=new SurvivalLedger();l.Create(1,"Team Sol");l.Create(2,"Team Älv");return l;}
    public static void Main()
    {
        var l=Fresh();Check(l.Create(1,"Duplicate")==null,"one membership");Check(l.Create(3,"\n")==null,"invalid team name");
        Check(!l.Award(1,"invalid",-5)&&!l.Award(1,"invalid",1001),"reward limits");
        Check(l.Award(1,"beacon:1",700),"valid server reward");Check(!l.Award(1,"beacon:1",700),"reward replay");
        Check(!l.Claim(1,0,false,true),"must be inside");Check(!l.Claim(1,0,true,false),"room must be clear");Check(!l.Claim(1,7,true,true),"arena cannot be claimed");
        Check(l.Claim(1,0,true,true),"claim building");Check(l.Teams[l.TeamOf(1)].Wallet==100,"claim debits 600 once");Check(!l.Claim(1,0,true,true)&&l.Teams[l.TeamOf(1)].Wallet==100,"double claim");
        Check(l.Protected(1,0,0),"owner protected");Check(!l.Protected(2,0,0),"stranger not protected");
        string code=l.InviteToShelter(1,2,0,10);Check(code!=null,"owner may invite guest");Check(!l.AcceptShelter(1,code,11),"invitation recipient binding");Check(!l.AcceptShelter(2,code,11),"insufficient balance leaves invite valid");
        l.Award(2,"food-task",100);Check(l.AcceptShelter(2,code,12),"guest accepts and pays");Check(l.Teams[l.TeamOf(2)].Wallet==50,"guest price exactly 50");
        Check(!l.AcceptShelter(2,code,13),"no invitation replay");Check(l.Protected(2,0,191)&&!l.Protected(2,0,193),"guest expiry");
        code=l.InviteToShelter(1,2,0,20);Check(!l.AcceptShelter(2,code,141),"expired invite");
        code=l.InviteToTeam(1,2,20);Check(code!=null&&l.AcceptTeam(2,code,21),"merge solo into squad");Check(l.TeamOf(1)==l.TeamOf(2)&&l.Teams[l.TeamOf(1)].Wallet==150,"XP pooling preserves exact balance");
        Check(!l.AcceptTeam(2,code,22),"team invitation consumed");Check(l.InviteToTeam(2,3,30)==null,"only leader invites");
        l.Create(3,"Third");l.Create(4,"Fourth");l.Create(5,"Fifth");
        string third=l.InviteToTeam(1,3,30),fourth=l.InviteToTeam(1,4,30),fifth=l.InviteToTeam(1,5,30);
        Check(l.AcceptTeam(3,third,31)&&l.AcceptTeam(4,fourth,31),"fill squad");Check(!l.AcceptTeam(5,fifth,31),"capacity checked when accepting competing invites");
        l.Disconnect(1);Check(l.Teams[l.TeamOf(2)].Leader==2,"leader migration");Check(l.Protected(2,0,40),"claim survives leader disconnect");
        l.Disconnect(2);l.Disconnect(3);l.Disconnect(4);Check(!l.Owners.ContainsKey(0),"last disconnect releases claim");
        l=Fresh();l.Award(1,"a",700);l.Award(2,"b",600);l.Claim(1,0,true,true);l.Claim(2,1,true,true);code=l.InviteToTeam(1,2,0);l.AcceptTeam(2,code,1);Check(l.Owners[0]==l.Owners[1],"solo merge transfers owned building");
        l=Fresh();l.Award(1,"a",600);l.Claim(1,0,true,true);l.Award(2,"b",100);code=l.InviteToShelter(1,2,0,0);l.AcceptShelter(2,code,1);l.Disconnect(1);Check(!l.Protected(2,0,2),"guest protection ends when building released");
        l=Fresh();for(int i=0;i<1000;i++)l.Award(1,"cap:"+i,1000);Check(!l.Award(1,"overflow",1),"bounded wallet");
        MobileInputMath.Stick(2,0,100,out float x,out float y);Check(x==0&&y==0,"small radial deadzone");
        MobileInputMath.Stick(100,100,100,out x,out y);Check(Math.Abs(Math.Sqrt(x*x+y*y)-1)<.0001&&Math.Abs(x-y)<.0001,"diagonal does not move faster");
        MobileInputMath.Stick(100,0,100,out x,out y);Check(Math.Abs(x-1)<.0001&&y==0,"full rim full speed");
        MobileInputMath.Stick(float.NaN,0,100,out x,out y);Check(x==0&&y==0,"invalid touch rejected");
        Check(Math.Abs(MobileInputMath.LookDegrees(100,2000,1000)-MobileInputMath.LookDegrees(50,1000,500))<.0001,"same relative motion on different screen resolutions");
        Check(MobileInputMath.LookDegrees(float.PositiveInfinity,1000,500)==0,"invalid aim rejected");
        Console.WriteLine($"PASS: {checks} economy, invitation, disconnect and mobile input assertions");
    }
}
