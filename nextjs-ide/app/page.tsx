"use client";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card } from "./components/ui/card";
import { Code2, Zap, Users, Plus } from "lucide-react";
import LoginModal from "./components/ui/LoginModal";
import RegisterModal from "./components/ui/RegisterModal";
import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  team?: { id: string; name: string };
}

interface Team {
  id: string;
  name: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [teamName, setTeamName] = useState("");
  const [createTeamName, setCreateTeamName] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Login first to join a team");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/team/join?teamName=${teamName}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join team");

      alert(`Joined team: ${data.team.name}`);
      setUser({ ...user, team: data.team }); // Update user state
      setTeamName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please login first to create a team");
      setShowCreateTeamModal(false);
      setShowLogin(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: createTeamName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create team");

      // Update user with new team info
      setUser({
        ...user,
        team: {
          id: data.team.id,
          name: data.team.name,
        },
      });

      alert(`Team "${data.team.name}" created successfully!`);
      setCreateTeamName("");
      setShowCreateTeamModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Code2 className="h-8 w-8 text-emerald-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Code in the Dark
              </span>
            </div>
            <div className="flex gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-slate-300">
                    Welcome, {user.name}
                    {user.team && ` - Team: ${user.team.name}`}
                  </span>
                  {!user.team && (
                    <Button
                      onClick={() => setShowCreateTeamModal(true)}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Team
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    onClick={() => setShowLogin(true)}
                  >
                    Login
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/20"
                    onClick={() => setShowRegister(true)}
                  >
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 blur-3xl"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNjIsMjU1LDIyOCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-emerald-500/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-slate-300">
              Live Coding Competition
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Code in the Dark
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-400 mb-4 max-w-3xl mx-auto">
            Challenge yourself to code without seeing the result
          </p>

          <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto">
            Test your HTML & CSS skills in real-time. No previews. No
            inspectors. Just pure coding instinct.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user ? (
              <>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-xl shadow-emerald-500/30 text-lg px-8 py-6"
                  onClick={() => setShowRegister(true)}
                >
                  Register Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 text-lg px-8 py-6"
                  onClick={() => setShowLogin(true)}
                >
                  Login
                </Button>
              </>
            ) : !user.team ? (
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/30 text-lg px-8 py-6"
                onClick={() => setShowCreateTeamModal(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your Team
              </Button>
            ) : (
              <div className="text-center">
                <p className="text-emerald-400 text-xl mb-4">
                  ✅ You&apos;re all set! Team: {user.team.name}
                </p>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-xl shadow-emerald-500/30 text-lg px-8 py-6"
                  onClick={() => {
                    // Navigate to IDE or dashboard
                    alert("Ready to start coding!");
                  }}
                >
                  Start Coding
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Join Team Section - Only show if user is logged in but doesn't have a team */}
      {user && !user.team && (
        <section id="join-team" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 p-8 sm:p-12 backdrop-blur-sm">
              <div className="text-center mb-8">
                <Users className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Join a <span className="text-emerald-400">Team</span>
                </h2>
                <p className="text-slate-400">
                  Enter your team name to join an existing team
                </p>
              </div>

              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Enter team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 h-12 text-lg"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-xl shadow-emerald-500/30 h-12 text-lg"
                >
                  Join Team
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                <p className="text-slate-400 text-sm mb-3">
                  Or create your own team
                </p>
                <Button
                  onClick={() => setShowCreateTeamModal(true)}
                  variant="outline"
                  className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Team
                </Button>
              </div>
            </Card>
          </div>
        </section>
      )}

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-emerald-400" />
              <span className="font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Code in the Dark
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2025 Code in the Dark. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="bg-slate-800 border-slate-700 p-6 w-96 mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Create New Team</h2>
            </div>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Team Name</label>
                <Input
                  type="text"
                  placeholder="Enter your team name"
                  value={createTeamName}
                  onChange={(e) => setCreateTeamName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              
              {error && <p className="text-red-400 text-sm">{error}</p>}
              
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateTeamModal(false);
                    setError("");
                    setCreateTeamName("");
                  }}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !createTeamName.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {loading ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Auth Modals */}
      {showLogin && (
        <LoginModal
          closeModal={() => setShowLogin(false)}
          onSwitchToRegister={() => setShowRegister(true)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
      )}
      {showRegister && (
        <RegisterModal
          closeModal={() => setShowRegister(false)}
          onSwitchToLogin={() => setShowLogin(true)}
          onRegisterSuccess={(userData) => setUser(userData)}
        />
      )}
    </div>
  );
}