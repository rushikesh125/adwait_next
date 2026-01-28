"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import toast from 'react-hot-toast';

// shadcn/ui
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// icons
import { BedDouble, Car, Mountain, Phone, CheckCircle, Clock, LayoutDashboard, ArrowRight, ChevronRight } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useSelector((state) => state.auth);
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("Not provided");
  const [stats] = useState({
    pendingBookings: 12,
    completedTrips: 24,
    activeCustomers: 8
  });

  useEffect(() => {
    if (user?.phone) setPhoneNumber(user.phone);
  }, [user]);

  const navigate = (path, label) => {
    toast.success(`Opening ${label}`);
    setTimeout(() => router.push(`/admin-panel/${path}`), 300);
  };

  if (!user || loading) {
    return (
      <Box className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="relative flex items-center justify-center">
          <CircularProgress size={60} thickness={2} sx={{ color: 'var(--color-theme-primary)' }} />
          <LayoutDashboard className="absolute w-6 h-6 text-slate-400" />
        </div>
        <p className="mt-4 text-slate-500 font-medium animate-pulse">Initializing Dashboard...</p>
      </Box>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfcfd] pb-12">
      {/* Decorative Background Element */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-theme-primary/10 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                System Live
              </Badge>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {phoneNumber}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, <span className="text-theme-primary">{user?.name}</span>
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Manage your tour operations and bookings from one central hub.
            </p>
          </div>

        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <ActionCard 
            title="Accommodation"
            description="Control hotel partnerships, room inventory, and meal preferences."
            icon={<BedDouble className="w-6 h-6" />}
          
            onClick={() => navigate("accommodations", "accommodations")}
          />

          <ActionCard 
            title="Transport"
            description="Monitor vehicle availability, driver routes, and fleet maintenance."
            icon={<Car className="w-6 h-6" />}


            onClick={() => navigate("transports", "Transport")}
          />

          <ActionCard 
            title="Activities"
            description="Schedule tour events, manage local guides, and guest itineraries."
            icon={<Mountain className="w-6 h-6" />}
     
            onClick={() => navigate("activities", "Activities")}
          />

        </div>
      </div>
    </div>
  );
};

/* --- Internal Helper Components (Standard JS) --- */

const StatItem = ({ label, value, color }) => (
  <div className="px-5 py-2 flex flex-col items-center">
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</span>
  </div>
);

const ActionCard = ({ title, description, icon, footerText, footerIcon, onClick }) => (
  <Card className="group border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
    <CardHeader className="space-y-4">
      <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl text-theme-primary group-hover:bg-theme-primary group-hover:text-white transition-colors duration-300">
        {icon}
      </div>
      <div>
        <CardTitle className="text-xl font-bold text-slate-800">{title}</CardTitle>
        <CardDescription className="text-slate-500 mt-2 line-clamp-2">
          {description}
        </CardDescription>
      </div>
    </CardHeader>
    
    <CardContent>
      {/* <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">
        <span className="w-4 h-4">{footerIcon}</span>
        {footerText}
      </div> */}
      
      <Button 
        onClick={onClick}
        className="w-full justify-between bg-slate-900 hover:bg-theme-primary text-white font-semibold py-6"
      >
        View & Manage
        <ChevronRight className="w-4 h-4" />
      </Button>
    </CardContent>
  </Card>
);

export default Dashboard;