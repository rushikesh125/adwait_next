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
  deleteDoc,
  updateDoc,
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
  Trash2,
  AlertTriangle,
  Pencil,
  X,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GroupBookingPDF } from "@/components/forms/GroupBookingPDF";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

export default function TripViewPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tripId = params.id;

  const [trip, setTrip] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  // Edit dialog state
  const [editTarget, setEditTarget] = useState(null); // full passenger object
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

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

  const handleDeletePassenger = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "submissions", deleteTarget.id));
      setResponses((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} removed from manifest`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete passenger");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const openEditModal = (passenger) => {
    setEditTarget(passenger);
    setEditForm({
      name: passenger.name || "",
      email: passenger.email || "",
      gender: passenger.gender || "",
      age: passenger.age || "",
      mobile: passenger.mobile || "",
      preference: passenger.preference || "",
      address: passenger.address || "",
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "submissions", editTarget.id);
      await updateDoc(ref, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        gender: editForm.gender,
        age: editForm.age,
        mobile: editForm.mobile.trim(),
        preference: editForm.preference,
        address: editForm.address.trim(),
      });
      setResponses((prev) =>
        prev.map((r) =>
          r.id === editTarget.id ? { ...r, ...editForm } : r
        )
      );
      toast.success(`${editForm.name} updated successfully`);
      setEditTarget(null);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update passenger");
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  const exportToExcel = () => {
    if (responses.length === 0) {
      toast.error("No data to export");
      return;
    }

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

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const columnWidths = [
      { wch: 5 },
      { wch: 25 },
      { wch: 25 },
      { wch: 10 },
      { wch: 5 },
      { wch: 15 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Passengers");

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
            <PDFDownloadLink
              document={<GroupBookingPDF trip={trip} responses={responses} />}
              fileName={`${trip?.tripName?.replace(/\s+/g, "_")}_Group_Booking.pdf`}
            >
              {({ loading }) => (
                <Button
                  disabled={loading || responses.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-10 px-6"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  EXPORT RAILWAY PDF
                </Button>
              )}
            </PDFDownloadLink>
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

        {/* Journey Details Section */}
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
            <span className="ml-auto text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {responses.length} passenger{responses.length !== 1 ? "s" : ""}
            </span>
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
                <TableHead className="w-20 font-black text-slate-500 text-[10px] uppercase text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
                        {res.mobile ? <a href={`tel:${res.mobile}`} className="hover:text-theme-primary hover:underline">{res.mobile}</a> : "—"}
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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(res)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-blue-400 hover:text-blue-500 transition-colors"
                          title="Edit passenger"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({ id: res.id, name: res.name })
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer text-red-400 hover:text-red-500 transition-colors"
                          title="Remove passenger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Edit Passenger Modal ─────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="rounded-2xl border border-slate-200 shadow-xl max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <Pencil size={15} className="text-blue-500" />
                </div>
                Edit Passenger
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Editing details for{" "}
              <span className="font-bold text-slate-600">{editTarget?.name}</span>
            </p>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Name */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Full Name *
              </Label>
              <Input
                name="name"
                value={editForm.name || ""}
                onChange={handleEditFormChange}
                className="h-9 text-sm font-medium"
                placeholder="Passenger name"
              />
            </div>

            {/* Email */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Email
              </Label>
              <Input
                name="email"
                value={editForm.email || ""}
                onChange={handleEditFormChange}
                className="h-9 text-sm"
                placeholder="email@example.com"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Gender
              </Label>
              <select
                name="gender"
                value={editForm.gender || ""}
                onChange={handleEditFormChange}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Age
              </Label>
              <Input
                name="age"
                type="number"
                value={editForm.age || ""}
                onChange={handleEditFormChange}
                className="h-9 text-sm"
                placeholder="Age"
                min={1}
                max={120}
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Mobile
              </Label>
              <Input
                name="mobile"
                value={editForm.mobile || ""}
                onChange={handleEditFormChange}
                className="h-9 text-sm"
                placeholder="Mobile number"
              />
            </div>

            {/* Seat Preference */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Seat Preference
              </Label>
              <select
                name="preference"
                value={editForm.preference || ""}
                onChange={handleEditFormChange}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select</option>
                <option value="Lower">Lower</option>
                <option value="Middle">Middle</option>
                <option value="Upper">Upper</option>
              </select>
            </div>

            {/* Address */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Address
              </Label>
              <Input
                name="address"
                value={editForm.address || ""}
                onChange={handleEditFormChange}
                className="h-9 text-sm"
                placeholder="Full address"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-1">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={saving}
              className="rounded-xl text-xs font-bold h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 px-5"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : null}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl border border-slate-200 shadow-xl max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-red-50 p-2 rounded-xl">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <AlertDialogTitle className="text-base font-black text-slate-900">
                Remove Passenger?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
              This will permanently delete{" "}
              <span className="font-bold text-slate-800">
                {deleteTarget?.name}
              </span>{" "}
              from the manifest. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl text-xs font-bold h-9"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeletePassenger}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold h-9 px-5"
            >
              {deleting ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : (
                <Trash2 size={13} className="mr-1.5" />
              )}
              {deleting ? "Removing..." : "Yes, Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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