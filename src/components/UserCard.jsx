"use client";

import React, { useState } from "react";
import { 
  Mail, Phone, ShieldCheck, UserRound, 
  MoreHorizontal, Check, X, Ban, Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function UserRow({ user, type, onChange, onDelete }) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const getStatusBadge = (status) => {
    switch (status) {
      case "accepted": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Accepted</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      case "suspended": return <Badge className="bg-slate-700">Suspended</Badge>;
      default: return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>;
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    onChange(type, user.id, "rejected", rejectReason);
    setIsRejectModalOpen(false);
    setRejectReason("");
  };

  return (
    <>
      <tr className="group border-b hover:bg-slate-50/50 transition-colors">
        <td className="p-4 align-middle">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              {type === "admins" ? <ShieldCheck size={18} /> : <UserRound size={18} />}
            </div>
            <div>
              <div className="font-bold text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500 md:hidden">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="p-4 align-middle hidden md:table-cell">
          <div className="flex items-center text-sm text-slate-600">
            <Mail size={14} className="mr-2 opacity-50" /> {user.email}
          </div>
        </td>
        <td className="p-4 align-middle hidden sm:table-cell text-sm text-slate-600">
          {user.phone}
        </td>
        <td className="p-4 align-middle">
          {getStatusBadge(user.approved)}
        </td>
        <td className="p-4 align-middle text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user.approved !== "accepted" && (
                <DropdownMenuItem onClick={() => onChange(type, user.id, "accepted")} className="text-emerald-600">
                  <Check className="mr-2 w-4 h-4" /> Accept User
                </DropdownMenuItem>
              )}
              {user.approved === "pending" && (
                <DropdownMenuItem onClick={() => setIsRejectModalOpen(true)} className="text-amber-600">
                  <X className="mr-2 w-4 h-4" /> Reject User
                </DropdownMenuItem>
              )}
              {user.approved === "accepted" && (
                <DropdownMenuItem onClick={() => onChange(type, user.id, "suspended")} className="text-slate-600">
                  <Ban className="mr-2 w-4 h-4" /> Suspend User
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(type, user.id)} className="text-red-600">
                <Trash2 className="mr-2 w-4 h-4" /> Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Rejection Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application: {user.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Reason for Rejection</label>
            <Textarea 
              placeholder="Tell the user why their account was rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>Send Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}