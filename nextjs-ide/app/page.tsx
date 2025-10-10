"use client";

import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card } from "./components/ui/card";
import { Code2, Zap, Users } from "lucide-react";
import LoginModal from "./components/ui/LoginModal";
import RegisterModal from "./components/ui/RegisterModal";

export default function Home() {
  const [teamName, setTeamName] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleJoinTeam = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Joining team:", teamName);
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
            </div>
          </div>
        </div>
      </nav>

      <section
        className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden min-h-screen flex items-center justify-center
"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 blur-3xl"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNjIsMjU1LDIyOCwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10 ">
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
          </div>
        </div>
      </section>

      <section id="join-team" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 p-8 sm:p-12 backdrop-blur-sm">
            <div className="text-center mb-8">
              <Users className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Join a <span className="text-emerald-400">Team</span>
              </h2>
              <p className="text-slate-400">
                Enter your team name to join or create a new team
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

            <div className="mt-8 pt-8 border-t border-slate-700">
              <p className="text-center text-slate-400 text-sm">
                Don&apos;t have a team yet? Register and we&apos;ll help you
                find teammates!
              </p>
            </div>
          </Card>
        </div>
      </section>

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
      {showLogin && (
        <LoginModal
          closeModal={() => setShowLogin(false)}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
      {showRegister && (
        <RegisterModal
          closeModal={() => setShowRegister(false)}
          onSwitchToLogin={() => setShowLogin(true)}
        />
      )}
    </div>
  );
}
