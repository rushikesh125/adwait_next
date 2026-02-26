"use client";
import React, { useEffect, useState, use } from "react";
import { db } from "@/firebase/config";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, Users, Calendar, MapPin, 
  Download, Printer, Loader2, Phone, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import Link from "next/link";

export default function TripViewPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tripId = params.id;

  const [trip, setTrip] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Trip Metadata
        const tripSnap = await getDoc(doc(db, "trips", tripId));
        if (tripSnap.exists()) {
          setTrip(tripSnap.data());
        }

        // 2. Fetch Submissions filtered by tripId
        const submissionsRef = collection(db, "submissions");
        const q = query(
          submissionsRef, 
          where("tripId", "==", tripId),
          orderBy("submittedAt", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        const responseData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setResponses(responseData);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tripId]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Filtering Submissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/agent-panel/bookingform">
              <Button variant="outline" size="icon" className="rounded-xl bg-white shadow-sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {trip?.tripName || "Trip Manifest"}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded tracking-widest uppercase">
                  ID: {tripId.slice(0, 8)}
                </span>
                <p className="text-slate-400 text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {trip?.createdAt?.toDate().toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => window.print()} variant="outline" className="bg-white font-bold text-xs h-10 shadow-sm">
              <Printer className="w-4 h-4 mr-2" /> PRINT MANIFEST
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 px-6 shadow-lg shadow-slate-200">
              <Download className="w-4 h-4 mr-2" /> EXPORT EXCEL
            </Button>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatBox label="Total Passengers" value={responses.length} sub="Confirmed Bookings" />
          <StatBox label="Trip Status" value={trip?.status || "Draft"} sub="Current Visibility" highlight />
          <StatBox label="Agent ID" value={trip?.agentId?.slice(0, 8)} sub="Assigned Manager" />
          <StatBox label="Last Updated" value={responses.length > 0 ? "Just Now" : "No Data"} sub="Real-time Sync" />
        </div>

        {/* Responses Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-center font-black text-slate-400 text-[10px] uppercase">S.No</TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase py-4">Passenger Details</TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">Gender/Age</TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">Seat Preference</TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">Contact & Address</TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase text-right pr-8">Submission Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center opacity-40">
                      <Users size={48} className="mb-2" />
                      <p className="font-bold uppercase text-xs tracking-widest">No passengers have registered yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((res, index) => (
                  <TableRow key={res.id} className="hover:bg-blue-50/30 transition-colors border-slate-100">
                    <TableCell className="text-center font-black text-slate-300">
                      {(index + 1).toString().padStart(2, '0')}
                    </TableCell>
                    
                    <TableCell className="py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{res.name}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-tighter">
                          <Mail className="w-3 h-3" /> {res.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${res.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                          {res.gender?.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-600 border-l pl-2">
                          {res.age} YRS
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {res.preference || "Not Specified"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-500" /> {res.mobile}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium leading-tight max-w-[200px]">
                          {res.address}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-slate-900">
                          {res.submittedAt?.toDate().toLocaleDateString('en-GB')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {res.submittedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, highlight = false }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black leading-none mb-1 ${highlight ? 'text-blue-600' : 'text-slate-900'}`}>
        {value}
      </p>
      <p className="text-[10px] font-bold text-slate-300 uppercase">{sub}</p>
    </div>
  );
}