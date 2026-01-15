"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Next.js routing
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Icons
import { 
  Loader2, 
  FileText, 
  Plus, 
  LayoutDashboard, 
  LogOut 
} from "lucide-react";

// Components
// Ensure these components are updated to accept props or work with Next.js
// import Create_new_package from "./agent_pages/Create_new_package";
// import MyQuotations from "./agent_pages/MyQuotations";
import { useSelector } from "react-redux";
import Create_new_package from "@/components/Create_new_package";

const AgentDashboard = () => {
  const { user,loading } = useSelector(state=>state.auth);
  const router = useRouter();
  
  // const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Package State
  const [checkInDate, setCheckInDate] = useState([]);
  const [saveChanges, setSaveChanges] = useState(false);
  const [checkOutDate, setCheckOutDate] = useState([]);

  // --- Handlers ---

  const handleTabChange = (tabName) => {
    if (activeTab === "create" && !saveChanges && showCreateForm) {
      const confirmChange = window.confirm(
        "You have unsaved changes. Do you want to discard them?"
      );
      if (!confirmChange) return;
    }

    setActiveTab(tabName);
    setShowCreateForm(false);
    setCheckInDate([]);
    setCheckOutDate([]);
    setSaveChanges(false);
  };

  const handleCreateClick = () => {
    setShowCreateForm(true);
    setCheckInDate([]);
    setSaveChanges(false);
  };

  // --- Effects ---

  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     if (!user) {
  //       setLoading(false); // Stop loading so we can redirect
  //       return;
  //     }

  //     try {
  //       const db = getFirestore();
  //       const userRef = doc(db, "users", user.uid);
  //       const userDoc = await getDoc(userRef);

  //       if (userDoc.exists()) {
  //         setUserData(userDoc.data());
  //       } else {
  //         console.error("No user data found.");
  //       }
  //     } catch (error) {
  //       console.error("Error fetching user data:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUserData();
  // }, [user]);

  // Handle Unsaved Changes Warning (Browser Level)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!saveChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveChanges]);

  // --- Render Guards ---

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-theme-muted/20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-theme-primary" />
          <p className="text-theme-secondary font-medium animate-pulse">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  // --- Main Render ---

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-theme-muted/30 to-gray-100 font-sans text-gray-800">
      
      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-10">
        
        {/* Glass Card Container */}
        <div className="overflow-hidden rounded-3xl bg-white/80 shadow-2xl backdrop-blur-xl ring-1 ring-black/5">
          
          {/* Header Section */}
          <header className="relative overflow-hidden bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to px-8 py-12 text-center text-white shadow-md">
            {/* Decorative Background Circles */}
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-theme-accent/20 blur-3xl"></div>

            <div className="relative z-10">
              <h1 className="mb-3 text-4xl font-extrabold tracking-tight md:text-5xl">
                Hello, {userData?.name || "Agent"}
              </h1>
              <p className="mx-auto max-w-2xl text-lg font-medium text-theme-muted opacity-90">
                Explore. Connect. Create extraordinary travel experiences with Adwait Tours!
              </p>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="flex justify-center border-b border-gray-100 bg-white/50 px-4 py-6">
            <div className="inline-flex rounded-xl bg-gray-100/80 p-1.5 shadow-inner">
              <button
                onClick={() => handleTabChange("create")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  activeTab === "create"
                    ? "bg-white text-theme-primary shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-theme-secondary"
                }`}
              >
                <Plus className="h-4 w-4" />
                Create Quotation
              </button>
              <button
                onClick={() => handleTabChange("my-quotations")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  activeTab === "my-quotations"
                    ? "bg-white text-theme-primary shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-theme-secondary"
                }`}
              >
                <FileText className="h-4 w-4" />
                My Quotations
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="min-h-[400px] p-6 md:p-10">
            
            {/* --- CREATE TAB CONTENT --- */}
            {activeTab === "create" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {!showCreateForm ? (
                  // Initial State: Prompt to create
                  <div className="flex flex-col items-center justify-center space-y-6 py-10 text-center">
                    <div className="rounded-full bg-theme-muted p-6 text-theme-primary">
                      <LayoutDashboard className="h-12 w-12" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">Start a New Journey</h2>
                      <p className="text-gray-500">
                        Start building customized travel packages for your clients. 
                        It's quick, easy, and completely flexible.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateClick}
                      className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-theme-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-theme-primary/30 transition-all duration-300 hover:bg-theme-secondary hover:shadow-xl hover:scale-[1.02]"
                    >
                      <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                      Create New Package
                    </button>
                  </div>
                ) : (
                  // Form State: The Create Package Form
                  <div className="w-full">
                    <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-theme-dark">New Quotation Details</h3>
                      <button 
                         onClick={() => handleTabChange("create")} // Resets via the logic in handleTabChange
                         className="text-sm text-gray-400 hover:text-red-500"
                      >
                        Cancel
                      </button>
                    </div>
                    <Create_new_package
                      user={user}
                      userData={userData}
                      checkInDate={checkInDate}
                      setCheckInDate={setCheckInDate}
                      saveChanges={saveChanges}
                      setSaveChanges={setSaveChanges}
                      checkOutDate={checkOutDate}
                      setCheckOutDate={setCheckOutDate}
                    />
                  </div>
                )}
              </div>
            )}

            {/* --- MY QUOTATIONS TAB CONTENT --- */}
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default AgentDashboard;