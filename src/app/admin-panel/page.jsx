"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";

// shadcn/ui
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// icons
import { BedDouble, Car, Mountain } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useSelector((state) => state.auth);
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("Not provided");

  useEffect(() => {
    if (user?.phone) setPhoneNumber(user.phone);
  }, [user]);

  const handleAccommodationAndMeals = () => router.push("/admin-panel/accomodations");
  const handleTransport = () => router.push("/admin-panel/transports");
  const handleActivity = () => router.push("/admin-panel/activities");

  if (!user || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={50} />
      </Box>
    );
  }

  return (
    <div className="min-h-screen bg-theme-muted/40 px-4 md:px-8 lg:px-16 py-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold text-theme-dark tracking-wide">
          Hello, <span className="text-theme-primary">{user?.name}</span>
        </h1>
        <p className="text-theme-dark/60 mt-1">
          Welcome to Adwait Tours Data Entry Panel
        </p>
        <p className="text-theme-dark/60 text-sm">
          Manage bookings, transport & activities with ease.
        </p>
      </div>

      <Separator className="my-6" />

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accommodation */}
        <Card className="border border-theme-primary/20 shadow-sm hover:shadow-md transition bg-white">
          <CardHeader className="flex flex-row items-center gap-3">
            <BedDouble className="w-6 h-6 text-theme-primary" />
            <div>
              <CardTitle className="text-lg text-theme-dark">Accommodation & Meals</CardTitle>
              <CardDescription className="text-sm text-theme-dark/60">
                Manage hotel bookings and guest preferences.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              className="bg-theme-primary hover:bg-theme-secondary text-white w-full mt-4"
              onClick={handleAccommodationAndMeals}
            >
              View More
            </Button>
          </CardContent>
        </Card>

        {/* Transport */}
        <Card className="border border-theme-primary/20 shadow-sm hover:shadow-md transition bg-white">
          <CardHeader className="flex flex-row items-center gap-3">
            <Car className="w-6 h-6 text-theme-primary" />
            <div>
              <CardTitle className="text-lg text-theme-dark">Transport</CardTitle>
              <CardDescription className="text-sm text-theme-dark/60">
                Organize vehicles & manage routes.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              className="bg-theme-primary hover:bg-theme-secondary text-white w-full mt-4"
              onClick={handleTransport}
            >
              View More
            </Button>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="border border-theme-primary/20 shadow-sm hover:shadow-md transition bg-white">
          <CardHeader className="flex flex-row items-center gap-3">
            <Mountain className="w-6 h-6 text-theme-primary" />
            <div>
              <CardTitle className="text-lg text-theme-dark">Activities</CardTitle>
              <CardDescription className="text-sm text-theme-dark/60">
                Plan activities & guest entertainment.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              className="bg-theme-primary hover:bg-theme-secondary text-white w-full mt-4"
              onClick={handleActivity}
            >
              View More
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
