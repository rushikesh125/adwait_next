"use client";
import React, { useEffect, useState, use } from "react";
import { db } from "@/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import {
  ArrowLeft,
  Users,
  Calendar,
  MapPin,
  Download,
  Printer,
  Loader2,
  Phone,
  Mail,
  Train,
  ArrowRight,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

export default function TripViewPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tripId = params.id;

  const [trip, setTrip] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tripSnap = await getDoc(doc(db, "trips", tripId));
        if (tripSnap.exists()) setTrip(tripSnap.data());

        const submissionsRef = collection(db, "submissions");
        const q = query(
          submissionsRef,
          where("tripId", "==", tripId),
          orderBy("submittedAt", "asc"),
        );

        const querySnapshot = await getDocs(q);
        setResponses(
          querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tripId]);
  const exportToExcel = () => {
    if (responses.length === 0) {
      toast.error("No data to export");
      return;
    }

    // 2. Prepare the data for Excel (Cleaning up the JSON)
    const excelData = responses.map((res, index) => ({
      "S.No": index + 1,
      "Passenger Name": res.name,
      Email: res.email,
      Gender: res.gender,
      Age: res.age,
      Mobile: res.mobile,
      "Seat Preference": res.preference || "None",
      Address: res.address,
      "Submission Date": res.submittedAt?.toDate().toLocaleDateString("en-GB"),
      "Submission Time": res.submittedAt?.toDate().toLocaleTimeString(),
    }));

    // 3. Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set Column Widths (Optional but makes it look professional)
    const columnWidths = [
      { wch: 5 }, // S.No
      { wch: 25 }, // Name
      { wch: 25 }, // Email
      { wch: 10 }, // Gender
      { wch: 5 }, // Age
      { wch: 15 }, // Mobile
      { wch: 20 }, // Preference
      { wch: 40 }, // Address
      { wch: 15 }, // Date
      { wch: 15 }, // Time
    ];
    worksheet["!cols"] = columnWidths;

    // 4. Create Workbook and Download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Passengers");

    // Use the trip name for the filename
    const fileName = `${trip?.tripName?.replace(/\s+/g, "_")}_Manifest.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success("Excel file downloaded!");
  };
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
          Loading Manifest...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/agent-panel/bookingform">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl bg-white shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                {trip?.tripName}
              </h1>
              <p className="text-slate-400 text-xs font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                <Calendar className="w-3 h-3" /> Created:{" "}
                {trip?.createdAt?.toDate().toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="bg-white font-bold text-xs h-10 px-4"
            >
              <Printer className="w-4 h-4 mr-2" /> PRINT
            </Button>
            <Button
              onClick={exportToExcel}
              className="bg-slate-900 text-white font-bold text-xs h-10 px-6"
            >
              <Download className="w-4 h-4 mr-2" /> EXPORT EXCEL
            </Button>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatBox
            label="Total Bookings"
            value={responses.length}
            sub="Passengers"
          />
          <StatBox
            label="Trip Status"
            value={trip?.status}
            sub="Current State"
            highlight
          />
          <StatBox
            label="Total Journey"
            value={trip?.journeys?.length || 0}
            sub="Train Connections"
          />
          <StatBox
            label="Created By"
            value={trip?.agentId?.slice(0, 8)}
            sub="Agent ID"
          />
        </div>

        {/* NEW: Journey Details Section */}
        <div className="mb-8">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
            Journey Itinerary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trip?.journeys?.map((j, idx) => (
              <div
                key={j.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Train size={60} />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                    Journey #{idx + 1}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {j.date}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      From
                    </p>
                    <p className="text-lg font-black text-slate-900 tracking-tight">
                      {j.from}
                    </p>
                  </div>
                  <ArrowRight className="text-slate-300 w-5 h-5 mt-4" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      To
                    </p>
                    <p className="text-lg font-black text-slate-900 tracking-tight">
                      {j.to}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Train
                    </p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {j.trainName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Number
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      {j.trainNo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Class/Seats
                    </p>
                    <p className="text-xs font-bold text-blue-600">
                      {j.class} • {j.seats}L
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Responses Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest">
              Passenger Manifest
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/30">
                <TableHead className="w-16 text-center font-black text-slate-400 text-[10px] uppercase">
                  S.No
                </TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">
                  Passenger
                </TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">
                  Gender/Age
                </TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">
                  Seat Preference
                </TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase">
                  Contact & Address
                </TableHead>
                <TableHead className="font-black text-slate-500 text-[10px] uppercase text-right pr-8">
                  Time Stamp
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest"
                  >
                    No Submissions Found
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((res, index) => (
                  <TableRow
                    key={res.id}
                    className="hover:bg-blue-50/20 transition-colors border-slate-100"
                  >
                    <TableCell className="text-center font-black text-slate-300">
                      {(index + 1).toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="font-bold text-slate-900 text-sm">
                        {res.name}
                      </p>
                      <p className="text-[11px] text-slate-400 lowercase">
                        {res.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded mr-2 ${res.gender === "Male" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"}`}
                      >
                        {res.gender?.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {res.age}y
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                        {res.preference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-0.5">
                        <Phone size={12} className="text-blue-500" />{" "}
                        {res.mobile}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {res.address}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <p className="text-[11px] font-black text-slate-900">
                        {res.submittedAt?.toDate().toLocaleDateString("en-GB")}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {res.submittedAt?.toDate().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-black leading-none mb-1 ${highlight ? "text-blue-600" : "text-slate-900"}`}
      >
        {value}
      </p>
      <p className="text-[10px] font-bold text-slate-300 uppercase">{sub}</p>
    </div>
  );
}
