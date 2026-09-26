using UnityEngine;
namespace Karlstad.World
{
    public sealed class Place
    {
        public int Id; public string Name, Subtitle, Reference; public Vector3 Exterior, Interior;
        public Vector3 Entrance => Exterior + new Vector3(0, .12f, -10.6f);
        public Vector3 RoomEntry => Interior + new Vector3(0, .12f, -8);
        public Place(int id, string name, string subtitle, float x, float z, string reference)
        { Id=id; Name=name; Subtitle=subtitle; Exterior=new Vector3(x,0,z); Interior=new Vector3(id*70,0,700); Reference=reference; }
    }
    public static class PlaceCatalog
    {
        // Deliberately compressed game map. Visitor references inform character, not surveyed geometry.
        public static readonly Place[] All = {
            new Place(0,"DOMKYRKAN","Kyrkberget · ljus och skydd",32,55,"https://www.svenskakyrkan.se/karlstad/om-domkyrkan"),
            new Place(1,"BERGVIK","Shopping · mat · samlingsplats",-280,0,"https://bergvik.se/kopcentrumkarta/"),
            new Place(2,"HOTEL FRATELLI","Deli · restaurang · orangeri",-32,-30,"https://hotelfratelli.se/restauranger-och-barer/"),
            new Place(3,"SCANDIC KARLSTAD CITY","Lobby · restaurang",32,-30,"https://www.scandichotels.com/sv/hotell/scandic-karlstad-city"),
            new Place(4,"DUVAN","Två plan · galleria",32,12,"https://www.galleriaduvan.se/"),
            new Place(5,"SANDGRUND","Lars Lerin · konsthall",-28,106,"https://sandgrund.org/sandgrund/"),
            new Place(6,"O’LEARYS CITY","Mat · sport · tryggt bo",-32,12,"https://olearys.com/sv-se/karlstad/activities/"),
            new Place(7,"LÖFBERGS ARENA","Färjestad · hockeyförsvarare",250,40,"https://www.farjestadbk.se/arenaplan")
        };
        public static readonly Vector3[] Beacons = { new Vector3(0,0,15),new Vector3(0,0,60),new Vector3(-5,0,100) };
        public static Vector3 CentreSpawn => new Vector3(0,.15f,-30);
        public static Vector3 Stop => new Vector3(-13,0,-5);
        public static Vector3 BergvikStop => new Vector3(-280,0,-23);
        public static Vector3 ArenaStop => new Vector3(250,0,15);
    }
}
