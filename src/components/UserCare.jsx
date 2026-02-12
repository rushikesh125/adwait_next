"use client";

import React from "react";
import { 
  Mail, 
  Phone, 
  UserCircle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  MoreVertical,
  ShieldCheck,
  UserRound
} from "lucide-react";

// Shadcn Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserCard({ user, type, onChange, onDelete }) {
  const isApproved = user.approved;
  const isAdmin = type === "admins";

  return (
    <Card className="relative overflow-hidden border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white group">
      {/* Visual Indicator Top Bar */}
      <div className={`h-1 w-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`shrink-0 p-2.5 rounded-xl ${
              isApproved 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 truncate leading-none mb-1">
                {user.name}
              </h4>
              <Badge variant="outline" className="text-[10px] font-semibold h-5 px-1.5 uppercase bg-slate-50">
                {isAdmin ? "Admin" : "Agent"}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                    onDelete(type, user.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-center text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
            <Mail className="w-4 h-4 mr-2.5 text-slate-300" />
            <span className="truncate font-medium">{user.email}</span>
          </div>
          <div className="flex items-center text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
            <Phone className="w-4 h-4 mr-2.5 text-slate-300" />
            <span className="font-medium">{user.phone || "No phone listed"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
           <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`h-2 w-2 rounded-full ${isApproved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={`text-sm font-semibold ${isApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isApproved ? 'Active' : 'Pending'}
                </span>
              </div>
           </div>

          <Button
            size="sm"
            variant={isApproved ? "outline" : "default"}
            className={`rounded-full px-4 h-9 shadow-sm transition-all ${
              !isApproved 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
            onClick={() => onChange(type, user.id, !isApproved)}
          >
            {isApproved ? (
              <><XCircle className="w-4 h-4 mr-1.5 text-red-500" /> Suspend</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve</>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}