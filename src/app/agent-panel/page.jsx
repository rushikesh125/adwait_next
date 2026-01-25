'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarPlus, 
  FileText, 
  PackagePlus, 
  LayoutDashboard, 
  UserCircle,
  LogOut
} from 'lucide-react';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Firebase Logic
import { getUserData } from '@/firebase/users';

// Custom Components
import Create_new_package from '@/components/Create_new_package';

const AgentDashboard = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useSelector(state => state.auth);
  
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  // Form State persistence (as per original logic)
  const [saveChanges, setSaveChanges] = useState(false);
  const [checkInDate, setCheckInDate] = useState([]);
  const [checkOutDate, setCheckOutDate] = useState([]);

  // Fetch User Data
  useEffect(() => {
    const initDashboard = async () => {
      if (!authLoading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        try {
          const data = await getUserData(user.uid);
          setUserData(data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsFetching(false);
        }
      }
    };

    initDashboard();
  }, [user, authLoading, router]);

  // Unsaved Changes Guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (showCreateForm && !saveChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveChanges, showCreateForm]);

  const handleTabChange = (tabName) => {
    if (activeTab === "create" && showCreateForm && !saveChanges) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return;
    }
    setActiveTab(tabName);
    setShowCreateForm(false);
  };

  if (authLoading || isFetching) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 w-ful">
      

      <main className="w-full mx-auto p-1 md:px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
     

          {/* Main Content Area */}
          <div className="col-span-full">
            <Tabs value={activeTab} className="w-full">
              <TabsList className="lg:hidden grid grid-cols-2 mb-6">
                <TabsTrigger value="create" onClick={() => handleTabChange("create")}>Create</TabsTrigger>
                <TabsTrigger value="my-quotations" onClick={() => handleTabChange("my-quotations")}>History</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-0 outline-none">
                <Card className="border-none shadow-md overflow-hidden">
                  <CardHeader className="border-b bg-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl text-theme-dark">Package Builder</CardTitle>
                        <CardDescription>Create a professional itinerary for your clients</CardDescription>
                      </div>
                      {!showCreateForm && (
                        <Button 
                          onClick={() => setShowCreateForm(true)}
                          className="bg-theme-primary hover:bg-theme-secondary text-white shadow-md transition-all hover:scale-105"
                        >
                          <PackagePlus className="mr-2 h-4 w-4" /> New Package
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <AnimatePresence mode="wait">
                      {!showCreateForm ? (
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-12 text-center"
                        >
                          <div className="bg-theme-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PackagePlus className="w-8 h-8 text-theme-primary" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900">No active draft</h3>
                          <p className="text-slate-500 max-w-xs mx-auto mt-2 mb-6">
                            Click the button above to start building a new customized travel quotation.
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-2 md:p-6"
                        >
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="my-quotations" className="mt-0">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Your Quotations</CardTitle>
                    <CardDescription>Manage and track your sent proposals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* <MyQuotations /> */}
                    <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                      Quotation list feature coming soon...
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

// Loading State Component
const DashboardSkeleton = () => (
  <div className="container mx-auto p-8 space-y-8">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-3 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="lg:col-span-9">
        <Skeleton className="h-[500px] w-full" />
      </div>
    </div>
  </div>
);

export default AgentDashboard;