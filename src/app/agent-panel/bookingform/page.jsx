"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { LayoutDashboard, Ticket, Users, Globe, ExternalLink, Copy } from "lucide-react";
import CreateTripForm from "@/components/forms/CreateTripForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";

export default function AgentDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "trips"),
          where("agentId", "==", auth.currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setTrips(data);
      } catch (error) {
        console.error("Error fetching trips:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const copyLink = (id) => {
    const link = `${window.location.origin}/book/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 overflow-x-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-theme-dark flex items-center gap-2">
            <LayoutDashboard className="text-theme-primary" />
            Agent Portal
          </h1>
          <p className="text-slate-500 mt-1">Manage your railway group booking forms</p>
        </div>
        <CreateTripForm />
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Active Forms" value={trips.length} icon={<Ticket className="text-theme-primary" />} />
        <StatCard title="Total Passengers" value="--" icon={<Users className="text-theme-secondary" />} />
        <StatCard title="Network Status" value="Online" icon={<Globe className="text-green-500" />} />
      </div>

      {/* Trips List */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-theme-dark mb-4">Your Recent Trip Forms</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="group hover:shadow-xl transition-all border-none shadow-sm ring-1 ring-slate-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-theme-dark line-clamp-1">
                      {trip.tripName}
                    </CardTitle>
                    <span className="text-[10px] font-bold bg-theme-muted text-theme-primary px-2 py-1 rounded uppercase">
                      {trip.journeys?.length} Journeys
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-slate-500">
                      Created: {trip.createdAt?.toDate().toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => copyLink(trip.id)}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 bg-theme-muted text-theme-primary rounded-lg hover:bg-theme-primary hover:text-white transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </button>
                      <a
                        href={`/book/${trip.id}`}
                        target="_blank"
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400">No forms created yet. Click "Create New Form" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-theme-dark">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}