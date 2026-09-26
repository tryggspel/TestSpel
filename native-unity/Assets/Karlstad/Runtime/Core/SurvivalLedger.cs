using System;
using System.Collections.Generic;
using System.Linq;

namespace Karlstad.Core
{
    // Session authority only. Clients never submit an XP amount.
    public sealed class SurvivalLedger
    {
        public const int TeamLimit = 4, ClaimCost = 600, GuestCost = 50, WalletLimit = 1000000;
        public sealed class Team { public int Id; public ulong Leader; public string Name; public int Wallet; public readonly HashSet<ulong> Members = new HashSet<ulong>(); }
        public sealed class Invite { public string Code; public ulong Guest; public int Team; public int Building; public double Expires; }
        sealed class Access { public int Owner; public double Until; }
        public readonly Dictionary<int, Team> Teams = new Dictionary<int, Team>();
        public readonly Dictionary<ulong, int> Membership = new Dictionary<ulong, int>();
        public readonly Dictionary<int, int> Owners = new Dictionary<int, int>();
        readonly Dictionary<string, Invite> invitations = new Dictionary<string, Invite>();
        readonly Dictionary<ulong, Dictionary<int, Access>> guestAccess = new Dictionary<ulong, Dictionary<int, Access>>();
        readonly HashSet<string> awards = new HashSet<string>();
        int nextTeam = 1;
        public int TeamOf(ulong player) => Membership.TryGetValue(player, out int id) ? id : 0;
        public Team Create(ulong player, string name)
        {
            if (Membership.ContainsKey(player)) return null;
            name = (name ?? "").Trim();
            if (name.Length < 2 || name.Length > 24 || name.Any(char.IsControl)) return null;
            var t = new Team { Id = nextTeam++, Leader = player, Name = name };
            t.Members.Add(player); Teams.Add(t.Id, t); Membership.Add(player, t.Id); return t;
        }
        bool CanJoin(ulong player) => !Teams.TryGetValue(TeamOf(player), out var t) || t.Members.Count == 1;
        string Issue(ulong guest, int team, int building, double now)
        {
            Prune(now);
            if (invitations.Count >= 128) return null;
            var code = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant();
            invitations.Add(code, new Invite { Code = code, Guest = guest, Team = team, Building = building, Expires = now + 120 });
            return code;
        }
        public string InviteToTeam(ulong leader, ulong guest, double now)
        {
            if (!Teams.TryGetValue(TeamOf(leader), out Team t) || t.Leader != leader || t.Members.Count >= TeamLimit || TeamOf(guest) == t.Id || !CanJoin(guest)) return null;
            return Issue(guest, t.Id, -1, now);
        }
        public bool AcceptTeam(ulong guest, string code, double now)
        {
            if (!Valid(guest, code, now, out Invite i) || i.Building != -1 || !CanJoin(guest)) return false;
            if (!Teams.TryGetValue(i.Team, out Team t) || t.Members.Count >= TeamLimit || TeamOf(guest) == t.Id) return false;
            if (Teams.TryGetValue(TeamOf(guest), out Team solo))
            {
                if (t.Wallet > WalletLimit - solo.Wallet) return false;
                t.Wallet += solo.Wallet;
                foreach (int b in Owners.Where(x => x.Value == solo.Id).Select(x => x.Key).ToArray()) Owners[b] = t.Id;
                Teams.Remove(solo.Id); Membership.Remove(guest);
            }
            t.Members.Add(guest); Membership.Add(guest, t.Id); invitations.Remove(code); return true;
        }
        // Server-issued unique event IDs make duplicated rewards idempotent.
        public bool Award(ulong player, string eventId, int amount)
        {
            if (string.IsNullOrEmpty(eventId) || amount <= 0 || amount > 1000 || awards.Count >= 8192 || awards.Contains(eventId) || !Teams.TryGetValue(TeamOf(player), out Team t)) return false;
            if (t.Wallet > WalletLimit - amount) return false;
            awards.Add(eventId); t.Wallet += amount; return true;
        }
        public bool Claim(ulong player, int building, bool inside, bool zoneClear)
        {
            if (building < 0 || building >= 7 || !inside || !zoneClear || Owners.ContainsKey(building) || !Teams.TryGetValue(TeamOf(player), out Team t) || t.Wallet < ClaimCost) return false;
            t.Wallet -= ClaimCost; Owners.Add(building, t.Id); return true;
        }
        public string InviteToShelter(ulong player, ulong guest, int building, double now)
        {
            int team = TeamOf(player);
            if (!Owners.TryGetValue(building, out int owner) || team == 0 || owner != team || TeamOf(guest) == team || !Membership.ContainsKey(guest)) return null;
            return Issue(guest, team, building, now);
        }
        public bool AcceptShelter(ulong guest, string code, double now)
        {
            if (!Valid(guest, code, now, out Invite i) || i.Building < 0 || !Owners.TryGetValue(i.Building, out int owner) || owner != i.Team) return false;
            if (!Teams.TryGetValue(TeamOf(guest), out Team payer) || payer.Wallet < GuestCost || payer.Id == owner) return false;
            payer.Wallet -= GuestCost; invitations.Remove(code);
            if (!guestAccess.ContainsKey(guest)) guestAccess[guest] = new Dictionary<int, Access>();
            guestAccess[guest][i.Building] = new Access { Owner = owner, Until = now + 180 }; return true;
        }
        bool Valid(ulong guest, string code, double now, out Invite invite)
        {
            invite = null; return code != null && invitations.TryGetValue(code, out invite) && invite.Guest == guest && now <= invite.Expires;
        }
        public bool Protected(ulong player, int building, double now)
        {
            if (!Owners.TryGetValue(building, out int owner)) return false;
            if (owner == TeamOf(player)) return true;
            return guestAccess.TryGetValue(player, out var access) && access.TryGetValue(building, out Access a) && a.Owner == owner && now <= a.Until;
        }
        public void Disconnect(ulong player)
        {
            if (Membership.TryGetValue(player, out int id) && Teams.TryGetValue(id, out Team t))
            {
                Membership.Remove(player); t.Members.Remove(player);
                if (t.Members.Count == 0) { Teams.Remove(id); foreach (int b in Owners.Where(x => x.Value == id).Select(x => x.Key).ToArray()) Owners.Remove(b); }
                else if (t.Leader == player) t.Leader = t.Members.Min();
            }
            guestAccess.Remove(player);
            foreach (string key in invitations.Where(x => x.Value.Guest == player || !Teams.ContainsKey(x.Value.Team)).Select(x => x.Key).ToArray()) invitations.Remove(key);
        }
        public void Prune(double now) { foreach (string key in invitations.Where(x => x.Value.Expires < now || !Teams.ContainsKey(x.Value.Team)).Select(x => x.Key).ToArray()) invitations.Remove(key); }
    }
}
