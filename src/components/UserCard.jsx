"use client";

import React, { useState } from "react";
import { Mail, Phone, ShieldCheck, UserRound, MoreHorizontal, Check, X, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import StatusBadge from "@/components/StatusBadge";

export default function UserRow({ user, type, onChange, onDelete }) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <>
      <tr className="group hover:bg-[#1E88E5]/5 transition-all">
        <td className="px-8 py-6 align-middle">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-2xl shadow-sm ${type === 'admins' ? 'bg-[#1E88E5]/10 text-[#1E88E5]' : 'bg-slate-100 text-slate-500'}`}>
              {type === "admins" ? <ShieldCheck size={22} /> : <UserRound size={22} />}
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-800 tracking-tight text-sm">{user.name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type.slice(0, -1)}</span>
            </div>
          </div>
        </td>
        <td className="px-8 py-6 align-middle hidden md:table-cell">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-[13px] font-medium text-slate-600">
              <Mail size={12} className="mr-2 text-slate-300" /> {user.email}
            </div>
            <div className="flex items-center text-[13px] font-medium text-slate-600">
              <Phone size={12} className="mr-2 text-slate-300" />
              {user.phone ? <a href={`tel:${user.phone}`} className="hover:text-theme-primary hover:underline">{user.phone}</a> : "---"}
            </div>
          </div>
        </td>
        <td className="px-8 py-6 align-middle">
          <StatusBadge
            status={user.approved || "pending"}
            fallback="Pending"
            className="px-3 py-1 text-[10px] font-black uppercase rounded-lg"
          />
        </td>
        <td className="px-8 py-6 align-middle text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-lg transition-all">
                <MoreHorizontal size={20} className="text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-200 shadow-2xl">
              <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Management</div>
              {user.approved !== "accepted" && (
                <DropdownMenuItem onClick={() => onChange(type, user.id, "accepted")} className="rounded-xl text-emerald-600 py-2.5 font-bold">
                  <Check className="mr-3 w-4 h-4" /> Approve
                </DropdownMenuItem>
              )}
              {user.approved === "pending" && (
                <DropdownMenuItem onClick={() => setIsRejectModalOpen(true)} className="rounded-xl text-amber-600 py-2.5 font-bold">
                  <X className="mr-3 w-4 h-4" /> Reject
                </DropdownMenuItem>
              )}
              {user.approved === "accepted" && (
                <DropdownMenuItem onClick={() => onChange(type, user.id, "suspended")} className="rounded-xl text-slate-600 py-2.5 font-bold">
                  <Ban className="mr-3 w-4 h-4" /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={() => onDelete(type, user.id)} className="rounded-xl text-red-600 py-2.5 font-bold">
                <Trash2 className="mr-3 w-4 h-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Reject Application</DialogTitle>
            <DialogDescription className="text-slate-500 pt-2">Provide a reason for declining <strong>{user.name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Textarea 
              placeholder="Reason for rejection..."
              className="min-h-[140px] rounded-2xl border-slate-200 focus:ring-2 focus:ring-[#1E88E5]"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 font-black shadow-lg shadow-red-500/20"
              onClick={() => {
                if (!rejectReason.trim()) return toast.error("Reason required");
                onChange(type, user.id, "rejected", rejectReason);
                setIsRejectModalOpen(false);
              }}
            >
              Reject User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
